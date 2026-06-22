"""
Mesure de QUALITÉ de la recommandation (évaluation offline) sur yaye_poc_enriched.

Vérité-terrain GRADUÉE = clusters latents injectés à l'enrichissement (que les
recommenders NE voient PAS) : cluster PRIMAIRE (rel=2) + SECONDAIRE (rel=1).
On mesure leur capacité à retrouver les offres pertinentes malgré le BRUIT
(compétences/candidatures partiellement cross-cluster).

Recommenders (top-K, offres non déjà candidatées) :
  • SkillMatch    : |compétences user ∩ compétences requises|  (graphe MAITRISE∩REQUIERT)
  • Collaborative : co-candidatures 2-hop                       (graphe A_POSTULE)
  • Popularity    : baseline non personnalisé
  • Random        : baseline plancher

Métriques @K moyennées : Precision (primaire) · nDCG gradué · MRR · HitRate · Couverture.
⚠️ Qualité ALGORITHMIQUE (recouvrement de structure latente), pas pertinence réelle.
"""
import pymysql, random, math, json, collections

random.seed(7)
K = 10
N_USERS = 800

conn = pymysql.connect(host="127.0.0.1", port=3307, user="root", password="root",
                       database="yaye_poc_enriched", charset="utf8mb4", autocommit=True)
cur = conn.cursor()

cur.execute("SELECT lower(libelle), id FROM skills"); lib2id = dict(cur.fetchall())
cur.execute("SELECT cjs_uid, cluster, cluster2 FROM poc_user_cluster")
user_c1, user_c2 = {}, {}
for u, c1, c2 in cur.fetchall(): user_c1[u] = c1; user_c2[u] = c2
cur.execute("SELECT opportunite_id, cluster FROM poc_opp_cluster"); opp_cluster = dict(cur.fetchall())
cluster_opps = collections.defaultdict(set)
for o, c in opp_cluster.items(): cluster_opps[c].add(o)
all_opps = list(opp_cluster)

cur.execute("SELECT cjs_uid, competences FROM profils_jeunes WHERE competences IS NOT NULL")
user_skills = {}
for u, comp in cur.fetchall():
    try: libs = json.loads(comp)
    except Exception: continue
    s = {lib2id[str(x).strip().lower()] for x in libs if str(x).strip().lower() in lib2id}
    if s: user_skills[u] = s

cur.execute("SELECT opportunite_id, skill_id FROM opportunites_skills WHERE requise=1")
skill2opps = collections.defaultdict(set)
for o, s in cur.fetchall(): skill2opps[s].add(o)

cur.execute("SELECT cjs_uid, opportunite_id FROM candidatures")
user_applied = collections.defaultdict(set); opp_app = collections.defaultdict(set)
for u, o in cur.fetchall(): user_applied[u].add(o); opp_app[o].add(u)
popularity = sorted(all_opps, key=lambda o: len(opp_app[o]), reverse=True)
conn.close()

def rec_skill(u, applied):
    sc = collections.Counter()
    for s in user_skills.get(u, ()):
        for o in skill2opps.get(s, ()):
            if o not in applied: sc[o] += 1
    return [o for o, _ in sc.most_common(K)]

def rec_collab(u, applied):
    nb = set()
    for o in applied: nb |= opp_app.get(o, set())
    nb.discard(u)
    if len(nb) > 400: nb = set(random.sample(list(nb), 400))
    sc = collections.Counter()
    for n in nb:
        for o in user_applied.get(n, ()):
            if o not in applied: sc[o] += 1
    return [o for o, _ in sc.most_common(K)]

def rec_pop(u, applied):
    out = []
    for o in popularity:
        if o not in applied: out.append(o)
        if len(out) == K: break
    return out

def rec_rand(u, applied):
    return random.sample([o for o in all_opps if o not in applied], K)

RECS = {"SkillMatch": rec_skill, "Collaborative": rec_collab, "Popularity": rec_pop, "Random": rec_rand}

def metrics(topk, relf, ideal):
    rels = [relf(o) for o in topk]
    prec = sum(1 for r in rels if r >= 2) / K            # précision sur le cluster PRIMAIRE
    hit = 1 if any(r >= 2 for r in rels) else 0
    rr = next((1 / (i + 1) for i, r in enumerate(rels) if r >= 2), 0.0)
    dcg = sum(r / math.log2(i + 2) for i, r in enumerate(rels))   # nDCG GRADUÉ (2/1/0)
    idcg = sum(r / math.log2(i + 2) for i, r in enumerate(ideal))
    return prec, (dcg / idcg if idcg else 0.0), rr, hit

cands = [u for u in user_c1 if u in user_skills and user_applied.get(u)]
sample = random.sample(cands, min(N_USERS, len(cands)))
print(f"Évaluation sur {len(sample)} bénéficiaires | K={K} | catalogue={len(all_opps)} | bruit ON\n")

agg = {n: collections.defaultdict(float) for n in RECS}
cover = {n: set() for n in RECS}
for u in sample:
    applied = user_applied[u]; c1, c2 = user_c1[u], user_c2[u]
    prim = cluster_opps[c1] - applied; sec = cluster_opps[c2] - applied
    if not prim: continue
    relf = lambda o: 2 if o in cluster_opps[c1] else (1 if o in cluster_opps[c2] else 0)
    ideal = ([2] * len(prim) + [1] * len(sec))[:K]
    for name, fn in RECS.items():
        p, n, rr, h = metrics(fn(u, applied), relf, ideal)
        a = agg[name]; a["P"] += p; a["nDCG"] += n; a["MRR"] += rr; a["Hit"] += h; a["N"] += 1
        cover[name] |= set(fn(u, applied))

print(f"{'Recommender':14} {'P@10':>7} {'nDCG@10':>8} {'MRR':>7} {'HitRate':>8} {'Couv.':>7}")
print("-" * 56)
for name in RECS:
    a = agg[name]; n = a["N"] or 1
    print(f"{name:14} {a['P']/n:>7.3f} {a['nDCG']/n:>8.3f} {a['MRR']/n:>7.3f} {a['Hit']/n:>8.3f} {len(cover[name])/len(all_opps):>7.3f}")
print("\nP@10 = part du top-10 dans le cluster PRIMAIRE · nDCG gradué (primaire=2, secondaire=1).")
print("Scores entre baselines (~0.1) et 1.0 ⇒ mesure DISCRIMINANTE : on peut comparer/optimiser les algos.")
