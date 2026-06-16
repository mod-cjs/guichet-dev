# 10 — Risques & conditions de réussite

> Évaluation : la conception (docs 00-09) est architecturalement saine mais reste un **cadrage**. Ce document fige les **5 risques** qui peuvent empêcher d'atteindre les exigences de la note, avec leur stratégie de mitigation. **À traiter avant le code du lot concerné.**

## Tableau de synthèse

| # | Risque | Sévérité | Exigence menacée | Statut |
|---|--------|----------|------------------|--------|
| R1 | Infra Neo4j absente / non confirmée | 🔴 Bloquant | Recherche NL + reco multi-entités | Ouvert — décision 3 |
| R2 | Compétences du jeune en Json non normalisé | 🔴 Élevé | Orientation active (gap de compétences) | Ouvert — à concevoir |
| R3 | Latence du pipeline multi-LLM sur WhatsApp | 🟠 Moyen | Canal asynchrone fluide | Pas de budget défini |
| R4 | Fiabilité détection intention / sélection outil | 🟠 Moyen | « Anticiper les besoins » | Aucun garde-fou conçu |
| R5 | PII dans `agent_logs` vs CDP | 🟠 Moyen | Conformité CDP | Trou : droit à l'oubli n'inclut pas `agent_logs` |
| R6 | Fuite inter-bénéficiaires via traversée du graphe | 🔴 Élevé | Isolation des données / CDP | Reco collaborative lit les arêtes d'autrui |

---

## R1 — Dépendance Neo4j (bloquant)

**Problème** : toute la valeur « recherche langage naturel + recommandation multi-entités » repose sur Neo4j, **absent du repo** (aucune dépendance) et dont l'infra (hébergement OVH, credentials) n'est **pas confirmée**.

**Condition de réussite** : ne **jamais** coupler en dur le service agent à Neo4j. Introduire un **port d'abstraction** :

```
interface GraphPort {
  search(intent, params, scope): Promise<GraphResult>   // scope = {cjsUid, role, centreId}
}
```
Deux implémentations :
- `Neo4jGraphAdapter` — templates Cypher (cible).
- `PrismaGraphAdapter` — **fallback** : reproduit les requêtes clés via Prisma (`@@fulltext` déjà présent sur `Opportunite`, relations FK, jointures). Couvre la recherche simple et le matching de base, **pas** les traversées profondes (reco collaborative dégradée).

**Phasage recommandé** :
1. v1.0 si Neo4j prêt → `Neo4jGraphAdapter`.
2. v1.0 si Neo4j pas prêt → `PrismaGraphAdapter` (recherche + matching simple), Neo4j en v1.1 sans toucher au service agent.

> Décision PO : confirmer l'infra Neo4j **ou** acter le démarrage en mode Prisma. Sans tranche, le Lot 1 est bloqué.

**Ce qui borne ce risque — l'invariant « read-model »** : Neo4j est une **vue dérivée**, Prisma reste la **source de vérité unique** (cf. [02-knowledge-graph-neo4j.md](./02-knowledge-graph-neo4j.md) §0). Conséquence : la cohérence à terme = **péremption temporaire reconstructible**, jamais perte/corruption ; le fallback Prisma est trivial puisqu'aucune donnée ne naît dans le graphe. **Condition de validité** : interdire en revue toute écriture native dans Neo4j, et router les lectures critiques temps réel vers Prisma (`get_realtime_data`).

---

## R2 — Normalisation des compétences (élevé)

**Problème** : `ProfilJeune.competences` est un **`Json` texte libre** (ex. `["JavaScript","gestion de projet"]`), tandis que les opportunités pointent vers des `Skill` normalisés (`slug`, `categorie`) via `OpportuniteSkill`. Sans pont entre les deux, la relation `MAITRISE` est inexploitable → le **« gap de compétences »** (fonctionnalité phare de l'orientation active, note §4.2) ne fonctionne pas.

**Condition de réussite** — pipeline de résolution `competences Json → Skill` :
1. **Référentiel d'alias** : table/map `alias → skillId` (« JS », « Javascript », « JavaScript » → même `Skill`).
2. **Résolution** au moment de la projection Neo4j : pour chaque compétence Json, match exact slug → sinon match alias → sinon match fuzzy (normalisation casse/accents) → sinon `non_resolu` (loggé pour curation admin).
3. **Sources additionnelles** : dériver des compétences depuis `CertificatMoodle.formation` et `Diplome.intitule` (relation `ATTESTE`).
4. **Curation** : exposer les `non_resolu` dans le panel admin pour enrichir le référentiel d'alias (boucle d'amélioration).

> Sans ce pipeline, livrer une version honnête : matching par **domaine/secteur** (`Domaine`, déjà normalisé) plutôt que par compétence fine, et l'annoncer comme tel.

---

## R3 — Latence du pipeline (moyen)

**Problème** : un message = détection intention (Groq) + sélection outil (Groq) + requête graphe + génération réponse (Groq) = **3 appels LLM + 1 requête graphe**. Sur WhatsApp (canal latence-sensible), aucun **budget de latence** n'est défini.

**Conditions de réussite** :
- Définir un **budget cible** (ex. < 3 s perçu sur WhatsApp, accusé de réception immédiat « Yaye réfléchit… » si dépassement).
- **Fusionner** détection d'intention + sélection d'outil en **un seul appel function-calling** (Groq choisit l'outil ET extrait les params en un tour) — réduit de 3 à 2 appels LLM.
- **Cache** Redis des requêtes graphe fréquentes (catalogue, dispo) ; le contexte 10 échanges est déjà en Redis.
- Mesurer `duree_ms` par étape via `agent_logs` (déjà prévu) → alerter si dépassement.

---

## R4 — Fiabilité intention / sélection d'outil (moyen)

**Problème** : aucun garde-fou si l'intention est ambiguë, si Groq choisit le mauvais outil ou hallucine des paramètres. Or « anticiper les besoins » exige une détection fiable.

**Conditions de réussite** :
- **Seuil de confiance** sur l'intention (`intention_detectee.confiance`, déjà au log) : sous le seuil → demander une clarification plutôt que d'agir.
- **Templates Cypher paramétrés** (jamais de Cypher libre généré par le LLM) — déjà le principe de la note, à **verrouiller** (whitelist de templates).
- **Fallback escalade** : après N échecs ou intention non résolue → `escalate_to_advisor` (l'escalade EST la soupape de sécurité).
- **Harnais d'évaluation** : jeu de ~50 messages réels annotés (intention attendue, outil attendu) rejoué en CI pour mesurer la précision avant chaque déploiement.

---

## R5 — PII dans `agent_logs` vs CDP (moyen)

**Problème** : `agent_logs.payload` stocke le **message brut** (donc potentiellement des données personnelles) sur 22 000 utilisateurs × 40-60 lignes/conversation. La conception dit « le droit à l'oubli anonymise visites et emprunts » mais **oublie `agent_logs`**, qui en contient pourtant le plus.

**Conditions de réussite** :
- **Minimisation** : ne pas stocker le message brut intégral si évitable ; tronquer/masquer les PII détectées (téléphone, email) dans le `payload`.
- **Droit à l'oubli** : étendre la propagation SSO → **anonymisation/purge de `agent_logs`** par `cjs_uid` (pas seulement visites/emprunts).
- **Rétention** : définir une durée (ex. 12 mois) + purge auto (comme `CentreEvent`), distincte de la rétention « transcript » lisible.
- **Accès** : restreindre la lecture des logs aux rôles autorisés (déjà invariant doc 07).

---

## R6 — Fuite inter-bénéficiaires via le graphe (élevé)

**Problème** : le graphe enrichi relie les `:Beneficiaire` à leurs données personnelles, et la **reco collaborative traverse les arêtes d'autres bénéficiaires** (`...<-[:A_POSTULE]-(autre:Beneficiaire)...`). Sans garde-fou, une requête pourrait exposer l'identité ou le profil d'un tiers.

**Conditions de réussite** (détaillées en [07-securite-conformite.md](./07-securite-conformite.md) §Isolation inter-bénéficiaires) :
- Un bénéficiaire ne matche que **son propre** nœud `:Beneficiaire` (par `cjsUid` du token).
- Requêtes traversant des tiers → **sortie agrégée/anonymisée uniquement** (jamais `autre.cjsUid`/attributs/nœud).
- **Whitelist de la clause `RETURN`** par template Cypher.
- Scope `{cjsUid, role, centreId}` injecté serveur, jamais par le LLM ni le client.
- Test de non-régression sécurité : rejouer des requêtes adverses (« montre-moi les candidatures de X ») et vérifier l'absence de fuite.

---

## Conditions de réussite — checklist Go / No-Go (avant Lot 1)

- [ ] **R1** — Infra Neo4j confirmée **ou** mode fallback Prisma acté + `GraphPort` posé.
- [ ] **R2** — Pipeline de normalisation des compétences conçu (ou périmètre matching réduit au domaine, assumé).
- [ ] **R3** — Budget de latence défini + fusion intention/outil en un appel.
- [ ] **R4** — Seuil de confiance + whitelist templates Cypher + fallback escalade.
- [ ] **R5** — `agent_logs` inclus dans le droit à l'oubli + rétention définie.
- [ ] **R6** — Whitelist `RETURN` + sortie agrégée pour les requêtes inter-bénéficiaires + test de non-régression sécurité.

> Tant que R1 et R2 ne sont pas levés, la **valeur différenciante de Yaye** (orientation active intelligente) n'est pas garantie. Les autres risques dégradent la qualité sans bloquer la livraison.
