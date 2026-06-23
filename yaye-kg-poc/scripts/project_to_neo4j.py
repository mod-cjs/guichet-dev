"""
Runner headless : projette la base SQL (MARIADB_DATABASE du .env) vers Neo4j,
strictement comme le notebook (mêmes M.* / G.*), puis imprime les PREUVES de
pertinence (gap de compétences + reco collaborative). Rejouable (MERGE).
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
from src import mapping as M
from src import graph_loader as G

engine = G.mariadb_engine(); driver = G.neo4j_driver(); driver.verify_connectivity()
DB = os.environ.get("NEO4J_DATABASE", "neo4j")
def cy(q, **p):
    with driver.session(database=DB) as s:
        return [r.data() for r in s.run(q, **p)]
print("Source:", os.environ["MARIADB_DATABASE"], "| Neo4j:", os.environ["NEO4J_URI"])

# 0) graphe propre pour des comptes nets
cy("MATCH (n) DETACH DELETE n")

# A) contraintes
lk = {c["label"]: c["key"] for c in M.NODES.values()}
lk.update({"Opportunite": "id", "Salle": "id", "Vehicule": "id"})
for r in M.REIFIED_ENUMS.values(): lk[r["label"]] = r["key"]
G.ensure_constraints(driver, lk)

# B) nœuds simples
for cfg in M.NODES.values():
    df = G.read_table(engine, cfg["table"], list(cfg["props"])).rename(columns=cfg["props"])
    G.merge_nodes(driver, cfg["label"], cfg["key"], df.to_dict("records"))

# C) opportunités décompressées
df = G.read_table(engine, M.OPPORTUNITE_COMMON["table"], list(M.OPPORTUNITE_COMMON["props"])).rename(columns=M.OPPORTUNITE_COMMON["props"])
G.merge_nodes(driver, "Opportunite", "id", df.to_dict("records"))
for label, (table, props) in M.OPPORTUNITE_SUBTYPES.items():
    if table in G.list_tables(engine):
        d = G.read_table(engine, table, ["opportunite_id"] + list(props)).rename(columns={**props, "opportunite_id": "id"})
        G.merge_nodes(driver, "Opportunite", "id", d.to_dict("records"), extra_labels=[label])

# D) salles / véhicules
rc = M.RESSOURCE_CENTRE
drc = G.read_table(engine, rc["table"], list(rc["props"])).rename(columns=rc["props"])
for tv, lbl in rc["labels"].items():
    sub = drc[drc["type"] == tv]
    if len(sub): G.merge_nodes(driver, lbl, "id", sub.to_dict("records"))

# E) enums réifiés + liens RELEVE_DE / SITUE_A
def distinct(cols):
    v = set()
    for t, c in cols:
        if t in G.list_tables(engine):
            v |= {x for x in G.read_table(engine, t, [c])[c].dropna().unique()}
    return sorted(v)
for cfg in M.REIFIED_ENUMS.values():
    G.merge_nodes(driver, cfg["label"], cfg["key"], [{cfg["key"]: v} for v in distinct(cfg["from_columns"])])
for l in M.REIFIED_LINKS:
    if l["table"] in G.list_tables(engine):
        d = G.read_table(engine, l["table"], [l["id_col"], l["val_col"]]).dropna()
        G.merge_rels(driver, l["rel"], l["from_label"], l["id_col"], l["to_label"], l["to_key"],
                     [{"from": r[l["id_col"]], "to": r[l["val_col"]]} for r in d.to_dict("records")])

# F) relations FK
pj = G.read_table(engine, "profils_jeunes", ["id", "cjs_uid"])
P2U = dict(zip(pj["id"], pj["cjs_uid"]))
def proj_rel(s):
    if s["table"] not in G.list_tables(engine): return
    edge = s.get("edge_props", {})
    cols = list({s["fk_from"], s["fk_to"], *edge})
    w = " AND ".join(f"`{k}`='{v}'" for k, v in s["where"].items()) if s.get("where") else None
    d = G.read_table(engine, s["table"], cols, w)
    pairs = []
    for r in d.to_dict("records"):
        frm = P2U.get(r[s["fk_from"]]) if s.get("via_profil") else r[s["fk_from"]]
        if frm is None or r[s["fk_to"]] is None: continue
        p = {"from": frm, "to": r[s["fk_to"]]}; p.update({pr: r[c] for c, pr in edge.items()})
        pairs.append(p)
    G.merge_rels(driver, s["rel"], s["from"][0], s["from"][1], s["to"][0], s["to"][1], pairs)
for s in M.RELATIONS: proj_rel(s)

# F-bis) DEVELOPPE
ds = M.DEVELOPPE_SPEC
if ds["table"] in G.list_tables(engine) and "opportunites_formation" in G.list_tables(engine):
    fids = set(G.read_table(engine, "opportunites_formation", ["opportunite_id"])["opportunite_id"])
    d = G.read_table(engine, ds["table"], [ds["fk_from"], ds["fk_to"]], "`requise`=0")
    G.merge_rels(driver, "DEVELOPPE", "Opportunite", "id", "Competence", "id",
                 [{"from": r[ds["fk_from"]], "to": r[ds["fk_to"]]} for r in d.to_dict("records") if r[ds["fk_from"]] in fids])

# G) bénéficiaire enrichi + MAITRISE (Json competences)
prof = G.read_table(engine, "profils_jeunes", ["cjs_uid", "niveau_etude", "situation_emploi", "completion_score", "competences"])
G.merge_nodes(driver, "Beneficiaire", "cjsUid",
              prof.rename(columns={"cjs_uid": "cjsUid", "niveau_etude": "niveauEtude",
                                   "situation_emploi": "situationEmploi", "completion_score": "completionScore"})
              [["cjsUid", "niveauEtude", "situationEmploi", "completionScore"]].to_dict("records"))
sk = G.read_table(engine, "skills", ["id", "slug", "libelle"])
bylab = {str(s.libelle).strip().lower(): s.id for s in sk.itertuples()}
bysl = {str(s.slug).strip().lower(): s.id for s in sk.itertuples()}
mp = []
for r in prof.itertuples():
    if not isinstance(r.competences, str) or not r.competences.strip(): continue
    try: comps = json.loads(r.competences)
    except Exception: continue
    for c in comps or []:
        sid = bylab.get(str(c).strip().lower()) or bysl.get(str(c).strip().lower())
        if sid: mp.append({"from": r.cjs_uid, "to": sid})
G.merge_rels(driver, "MAITRISE", "Beneficiaire", "cjsUid", "Competence", "id", mp)

# G-bis) ATTESTE / PREPARE
idx = [(str(f).strip().lower(), s.id) for s in sk.itertuples() for f in (s.libelle, s.slug) if f]
def match(t):
    t = str(t).strip().lower()
    return list({sid for kw, sid in idx if kw and (kw == t or kw in t or t in kw)})
for d in M.DERIVED_MATCH:
    if d["table"] not in G.list_tables(engine): continue
    df = G.read_table(engine, d["table"], [d["id_col"], d["text_col"]]).dropna(subset=[d["text_col"]])
    G.merge_rels(driver, d["rel"], d["from_label"], d["id_col"], "Competence", "id",
                 [{"from": r[d["id_col"]], "to": sid} for r in df.to_dict("records") for sid in match(r[d["text_col"]])])

# ── PREUVES ────────────────────────────────────────────────────────────────
print("\n=== COMPTES NŒUDS/RELATIONS ===")
for lbl in ["Opportunite", "Beneficiaire", "Competence", "Organisation", "Evenement"]:
    print(f"  {lbl:14}", cy(f"MATCH (n:`{lbl}`) RETURN count(n) AS c")[0]["c"])
for rel in ["REQUIERT", "DEVELOPPE", "ETIQUETTE", "MAITRISE", "A_POSTULE", "PUBLIE", "SITUE_A", "ATTESTE", "A_OBTENU"]:
    print(f"  -[:{rel}]->", cy(f"MATCH ()-[r:`{rel}`]->() RETURN count(r) AS c")[0]["c"])

print("\n=== PREUVE 1 — Gap de compétences (un bénéficiaire réel) ===")
g = cy("""
  MATCH (b:Beneficiaire)-[:MAITRISE]->() WITH b LIMIT 1
  MATCH (o:Opportunite)-[:REQUIERT]->(req:Competence)
  WHERE NOT (b)-[:MAITRISE]->(req)
  WITH b, o, collect(DISTINCT req.libelle) AS manquantes
  WHERE size(manquantes) > 0 RETURN b.cjsUid AS user, o.titre AS offre, manquantes LIMIT 3""")
for r in g: print("  ", r["offre"][:40], "→ manque:", r["manquantes"])

print("\n=== PREUVE 2 — Reco collaborative (sortie AGRÉGÉE) ===")
rc2 = cy("""
  MATCH (b:Beneficiaire)-[:A_POSTULE]->() WITH b LIMIT 1
  MATCH (b)-[:A_POSTULE]->(:Opportunite)<-[:A_POSTULE]-(a:Beneficiaire)-[:A_POSTULE]->(reco:Opportunite)
  WHERE NOT (b)-[:A_POSTULE]->(reco)
  RETURN reco.titre AS titre, count(*) AS popularite ORDER BY popularite DESC LIMIT 5""")
for r in rc2: print("  ", r["popularite"], "×", r["titre"][:50])

driver.close(); print("\n✅ PROJECTION COMPLÈTE TERMINÉE")
