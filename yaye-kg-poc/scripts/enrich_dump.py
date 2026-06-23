"""
Enrichissement SYNTHÉTIQUE du dump POC → base `yaye_poc_enriched`.

⚠️ Données FICTIVES de banc d'essai. But : densifier les ARÊTES du graphe ET
permettre une MESURE DE QUALITÉ DISCRIMINANTE (métriques IR contre vérité-terrain).

v3 — BRUIT RÉALISTE pour décorréler la vérité-terrain du signal observé :
- chaque user a un cluster PRIMAIRE (c1, vérité-terrain) + SECONDAIRE (c2) ;
- ses compétences observées = mélange c1 (60%) / c2 (25%) / aléatoire (15%) + SPARSITÉ ;
- les offres exigent des compétences cross-cluster (~moitié) → signal skill bruité ;
- candidatures = hot de c1 (70%) / hot de c2 (20%) / aléatoire (10%).
→ SkillMatch/Collaborative ne « gagnent » plus par construction : scores réalistes,
  qui bougent quand on change l'algo (mesure informative).

Vérité-terrain écrite dans poc_user_cluster(cjs_uid, cluster, cluster2) / poc_opp_cluster.
Seed fixe → reproductible. Relancer après re-clone de yaye_poc.
"""
import pymysql, uuid, json, random, datetime

random.seed(42)
NOW = datetime.datetime(2026, 6, 16, 12, 0, 0)

N_PROFILS     = 8000
INSCR_TOTAL   = 3000
N_ORGS        = 150
HOT_PER_CLUST = 12
CAND_PAR_USER = (2, 5)
SPARSE_FRAC   = 0.25     # part de profils « pauvres » (1-2 compétences)
W_C1, W_C2    = 0.60, 0.85   # seuils cumulés c1 / c2 (reste = aléatoire)
OPP_CROSS     = 0.55     # prob qu'une offre exige ≥1 compétence cross-cluster
DIPL_RATIO, EXP_RATIO, CERT_RATIO = 0.45, 0.35, 0.20

conn = pymysql.connect(host="127.0.0.1", port=3307, user="root", password="root",
                       database="yaye_poc_enriched", charset="utf8mb4", autocommit=False)
cur = conn.cursor(); cur.execute("SET FOREIGN_KEY_CHECKS=0")

def uid(): return str(uuid.uuid4())
def rdate(d=365): return NOW - datetime.timedelta(days=random.randint(1, d), minutes=random.randint(0, 1440))
def insert_many(sql, rows, size=2000, label=""):
    for i in range(0, len(rows), size): cur.executemany(sql, rows[i:i + size])
    conn.commit()
    if label: print(f"  {label:30} {len(rows):>7}")

cur.execute("SELECT id, libelle, categorie FROM skills")
by_cat = {}
for sid, lib, cat in cur.fetchall(): by_cat.setdefault(cat or "autre", []).append((sid, lib))
CATS = list(by_cat.keys())
REGIONS = ['Dakar','Thies','Diourbel','Fatick','Kaolack','Kaffrine','Louga',
           'Saint_Louis','Matam','Tambacounda','Kedougou','Kolda','Ziguinchor','Sedhiou']
RWEIGHTS = [30,15,8,5,7,4,5,8,3,4,2,4,3,2]
SECTEURS = ['Agriculture','Numerique','Entrepreneuriat','Citoyennete','Environnement','Sante','Education','Culture','Autre']
CAT_DOMAINE = {'agriculture':'Agriculture','digital':'Numerique','gestion':'Entrepreneuriat','metier_manuel':'Autre',
               'bureautique':'Education','communication':'Culture','vente_services':'Entrepreneuriat','linguistique':'Education'}
NIVEAUX = ['BFEM','BAC','BAC_PLUS_2','BAC_PLUS_3','BAC_PLUS_5']
SITUATIONS = ['demandeur_emploi','etudiant','salarie','independant','en_formation']

def two_clusters():
    c1 = random.choice(CATS)
    c2 = random.choice([c for c in CATS if c != c1])
    return c1, c2

def noisy_skills(c1, c2, n):
    out = []
    for _ in range(n):
        r = random.random()
        pool = by_cat[c1] if r < W_C1 else (by_cat[c2] if r < W_C2 else by_cat[random.choice(CATS)])
        out.append(random.choice(pool))
    return out

cur.execute("SELECT id FROM opportunites"); opp_ids = [r[0] for r in cur.fetchall()]
cur.execute("SELECT opportunite_id FROM opportunites_formation"); formation_ids = {r[0] for r in cur.fetchall()}
opp_cluster = {o: random.choice(CATS) for o in opp_ids}
cluster_opps = {}
for o, c in opp_cluster.items(): cluster_opps.setdefault(c, []).append(o)
hot = {c: random.sample(v, min(HOT_PER_CLUST, len(v))) for c, v in cluster_opps.items()}

print("ENRICHISSEMENT yaye_poc_enriched (v3 — bruit réaliste)")

cur.execute("DROP TABLE IF EXISTS poc_opp_cluster")
cur.execute("CREATE TABLE poc_opp_cluster (opportunite_id VARCHAR(36) PRIMARY KEY, cluster VARCHAR(40))")
insert_many("INSERT INTO poc_opp_cluster VALUES (%s,%s)", list(opp_cluster.items()), label="poc_opp_cluster")

dom_reg = [(CAT_DOMAINE.get(opp_cluster[o], 'Autre'), random.choices(REGIONS, weights=RWEIGHTS)[0], o) for o in opp_ids]
insert_many("UPDATE opportunites SET domaine=%s, region=%s WHERE id=%s", dom_reg, label="opportunites.domaine+region")

# opportunites_skills — base cluster + BRUIT cross-cluster (signal skill imparfait)
rows, seen = [], set()
for o in opp_ids:
    chosen = random.sample(by_cat[opp_cluster[o]], min(len(by_cat[opp_cluster[o]]), random.randint(2, 3)))
    if random.random() < OPP_CROSS:
        chosen = chosen + random.sample(by_cat[random.choice(CATS)], random.randint(1, 2))
    for sid, _ in chosen:
        if (o, sid) in seen: continue
        seen.add((o, sid)); rows.append((o, sid, 0 if (o in formation_ids and random.random() < 0.5) else 1))
insert_many("INSERT IGNORE INTO opportunites_skills (opportunite_id, skill_id, requise) VALUES (%s,%s,%s)", rows, label="opportunites_skills")

# tags + ETIQUETTE
TAGS = ['urgent','télétravail','diaspora','financé','certifiant','débutant accepté','femmes','jeunes','rural','international','sans diplôme','rémunéré']
tag_rows = [(uid(), t.replace(' ', '-').replace('é', 'e'), t, NOW) for t in TAGS]
insert_many("INSERT IGNORE INTO tags (id, slug, libelle, created_at) VALUES (%s,%s,%s,%s)", tag_rows, label="tags")
tag_ids = [r[0] for r in tag_rows]; ot, seen = [], set()
for o in opp_ids:
    for tid in random.sample(tag_ids, random.randint(1, 3)):
        if (o, tid) not in seen: seen.add((o, tid)); ot.append((o, tid))
insert_many("INSERT IGNORE INTO opportunites_tags (opportunite_id, tag_id) VALUES (%s,%s)", ot, label="opportunites_tags")

# profils_jeunes (compétences bruitées + sparsité) + vérité-terrain c1/c2
cur.execute("SELECT cjs_uid FROM utilisateurs WHERE cjs_uid NOT IN (SELECT cjs_uid FROM profils_jeunes) ORDER BY RAND() LIMIT %s", (N_PROFILS,))
users = [r[0] for r in cur.fetchall()]
user_c1, user_c2, user_profil, prof_rows, region_upd, uc_rows = {}, {}, {}, [], [], []
for u in users:
    c1, c2 = two_clusters(); user_c1[u], user_c2[u] = c1, c2; pid = uid(); user_profil[u] = pid
    n = random.randint(1, 2) if random.random() < SPARSE_FRAC else random.randint(4, 7)
    comps = list(dict.fromkeys(lib for _, lib in noisy_skills(c1, c2, n)))
    prof_rows.append((pid, u, json.dumps(comps, ensure_ascii=False), json.dumps([CAT_DOMAINE.get(c1, 'Autre')]),
                      random.choice(NIVEAUX), random.choice(SITUATIONS), random.randint(40, 100), 'public', NOW))
    region_upd.append((random.choices(REGIONS, weights=RWEIGHTS)[0], u)); uc_rows.append((u, c1, c2))
insert_many("INSERT IGNORE INTO profils_jeunes (id, cjs_uid, competences, domaines_interet, niveau_etude, situation_emploi, completion_score, profile_visibility, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)", prof_rows, label="profils_jeunes")
insert_many("UPDATE utilisateurs SET region=%s WHERE cjs_uid=%s", region_upd, label="utilisateurs.region")
cur.execute("DROP TABLE IF EXISTS poc_user_cluster")
cur.execute("CREATE TABLE poc_user_cluster (cjs_uid VARCHAR(36) PRIMARY KEY, cluster VARCHAR(40), cluster2 VARCHAR(40))")
insert_many("INSERT INTO poc_user_cluster VALUES (%s,%s,%s)", uc_rows, label="poc_user_cluster")

# candidatures bruitées : hot c1 (70%) / hot c2 (20%) / aléatoire (10%)
cand, seen = [], set()
for u in users:
    c1, c2 = user_c1[u], user_c2[u]; targets = set()
    for _ in range(random.randint(*CAND_PAR_USER)):
        r = random.random()
        if r < 0.70 and hot.get(c1): targets.add(random.choice(hot[c1]))
        elif r < 0.90 and hot.get(c2): targets.add(random.choice(hot[c2]))
        else: targets.add(random.choice(opp_ids))
    for o in targets:
        if (u, o) in seen: continue
        seen.add((u, o)); cand.append((uid(), u, o, random.choice(['En_attente','Vue','Retenue','Refusee']), rdate()))
insert_many("INSERT IGNORE INTO candidatures (id, cjs_uid, opportunite_id, statut, soumise_a) VALUES (%s,%s,%s,%s,%s)", cand, label="candidatures")

# inscriptions
cur.execute("SELECT id FROM evenements"); ev_ids = [r[0] for r in cur.fetchall()]; insc, seen = [], set()
for u in random.sample(users, min(len(users), INSCR_TOTAL)) if ev_ids else []:
    e = random.choice(ev_ids)
    if (u, e) not in seen: seen.add((u, e)); insc.append((uid(), u, e, random.choice(['inscrit','present','liste_attente']), rdate(120)))
insert_many("INSERT IGNORE INTO inscriptions_evenements (id, cjs_uid, evenement_id, statut, inscrit_a) VALUES (%s,%s,%s,%s,%s)", insc, label="inscriptions_evenements")

# organisations + PUBLIE
cur.execute("SELECT DISTINCT organisation_libelle FROM opportunites WHERE organisation_libelle IS NOT NULL AND organisation_libelle<>'' LIMIT %s", (N_ORGS,))
libs = [r[0] for r in cur.fetchall()]
org_rows = [(uid(), random.choice(users), l[:200], random.choice(SECTEURS), random.choice(REGIONS), 1 if random.random() < 0.5 else 0, NOW) for l in libs]
insert_many("INSERT IGNORE INTO organisations (id, cjs_uid, nom, secteur, region, est_verifie, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)", org_rows, label="organisations")
insert_many("UPDATE opportunites SET organisation_id=%s WHERE organisation_libelle=%s", [(o[0], l) for o, l in zip(org_rows, libs)], label="opportunites.organisation_id")

# parcours
dipl, exp, cert = [], [], []
for u in users:
    pid, c = user_profil[u], user_c1[u]
    if random.random() < DIPL_RATIO:
        _, lib = random.choice(by_cat[c]); dipl.append((uid(), pid, f"Licence en {lib}"[:200], "UCAD", random.randint(2012, 2025), random.choice(NIVEAUX), NOW))
    if random.random() < EXP_RATIO:
        _, lib = random.choice(by_cat[c]); exp.append((uid(), pid, f"{lib} - junior"[:150], "Entreprise locale", rdate(1500), rdate(200), NOW))
    if random.random() < CERT_RATIO:
        _, lib = random.choice(by_cat[c]); cert.append((uid(), pid, "MOODLE-" + uid()[:12], lib, rdate(400), NOW))
insert_many("INSERT IGNORE INTO diplomes (id, profil_id, intitule, etablissement, annee_obtention, niveau, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)", dipl, label="diplomes")
insert_many("INSERT IGNORE INTO experiences (id, profil_id, poste, organisation, date_debut, date_fin, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)", exp, label="experiences")
insert_many("INSERT IGNORE INTO certificats_moodle (id, profil_id, moodle_cert_id, formation, obtenu_le, created_at) VALUES (%s,%s,%s,%s,%s,%s)", cert, label="certificats_moodle")

cur.execute("SET FOREIGN_KEY_CHECKS=1"); conn.commit(); conn.close()
print("ENRICHISSEMENT v3 TERMINÉ ✅  (bruit réaliste + vérité-terrain c1/c2)")
