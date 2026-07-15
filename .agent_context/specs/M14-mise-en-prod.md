# M14 — Plan global de mise en production (OVH / Plesk)

**Date :** 2026-07-14 · **Statut :** proposé, en attente de validation PO
**Cible :** serveur OVH unique sous Plesk (32 Go RAM · 16 cœurs · 2 To), partagé avec **SSO** et **BRM**
(tous deux **hors Docker**). Docker n'héberge que les services partagés + l'app Guichet.

---

## 1. Architecture cible

```
Internet ──443──► Plesk / nginx  (TLS Let's Encrypt, domaines)
                      │ proxy → 127.0.0.1:8080
                      ▼
              proxy applicatif (conteneur, versionné dans le dépôt)
                      │              │
                   90%│              │10%      ← canary + bleu/vert
                      ▼              ▼
                [ app bleu ]   [ app vert ]     Next.js (jamais sur 0.0.0.0)
                      │
   ┌──────────────────┼───────────────┬──────────────────┐
   ▼                  ▼               ▼                  ▼
redis_cjs         neo4j-cjs         MinIO         MariaDB 10.11
(ACL `guichet`)  (Community,      (bucket        (instance Plesk,
                  neo4j+s TLS)     `guichet`,     sauvegardes Plesk)
                                   20 Gio)
   └──────────── réseau Docker partagé, aucun port publié ────────────┘
```

**Décisions arrêtées**
- **Pas de Swarm ni de Kubernetes.** Une seule machine, deux plateformes hors Docker : rien à orchestrer.
  Les 3 apports réels de Swarm (bascule sans coupure, secrets, rollback) sont obtenus avec Compose + proxy —
  et le proxy nous est de toute façon nécessaire pour le canary.
- **Base = instance MariaDB de Plesk (10.11.18)** — validé par une répétition réelle des 49 migrations.
  Argument décisif : les sauvegardes Plesk existent déjà. *La perte de données est irrattrapable ;
  une indisponibilité ne l'est pas.*
- **Neo4j Community** — `NEO4J_DATABASE` non défini en prod ⇒ base par défaut. **Zéro modification de code.**
- **Le proxy de routage vit dans notre dépôt**, pas dans l'interface Plesk : la logique de bascule doit être
  versionnée, revue en PR et rejouable à l'identique en staging.

---

## 2. Constats vérifiés (aucun supposé)

| # | Constat | Preuve |
|---|---|---|
| B1 | Migration `add_candidature_drafts` sans `COLLATE` → **échec en prod**. MariaDB 10.11 et 11 n'ont pas la même collation par défaut pour `utf8mb4` (`general_ci` vs `unicode_ci`) → clé étrangère refusée, `migrate deploy` s'arrête **base à moitié migrée** | 49 migrations rejouées sur un MariaDB 10.11.18 réel |
| B2 | **La CI teste MariaDB 11**, la prod sera en 10.11 → la CI est **aveugle** à B1 | `ci.yml:16` |
| B3 | Le compose déployé est celui de **dev** : `ALLOW_DEV_LOGIN=true` (**auth SSO contournée en prod**), base POC `yaye_poc_enriched`, Redis/Neo4j/MariaDB publiés sur `0.0.0.0`, mots de passe en dur | `docker-compose.yml` + `cd-deploy.yml` |
| B4 | Stockage fichiers = **Vercel Blob** (5 fichiers) → **CV et justificatifs cassés sur OVH** | `import { put } from '@vercel/blob'` |
| B5 | Clés Redis (`rl:*`, `llm:config`, `notif:*`, `vue:*`) **hors préfixe `guichet:`** → refusées par l'ACL ⇒ **rate-limiting et idempotence des webhooks KO** | inventaire des clés écrites |
| B6 | Le CD **ne déploie pas le tag** : l'image construite en CI n'est jamais poussée, le serveur fait `git pull origin main` et rebuild | `cd-deploy.yml` |
| B7 | **Migrations après bascule** (code neuf sur ancien schéma), ni smoke test ni rollback | `cd-deploy.yml` |
| B8 | **8 tâches planifiées portées par Vercel Cron** → sur OVH, **plus personne ne les exécute** : DLQ notifications, purge CV (**rétention CDP**), batch réservations, sync graphe, précalcul reco, éval | `vercel.json` |
| B9 | **Aucune sauvegarde** définie pour MinIO (CV = données personnelles), MariaDB, Neo4j | services livrés « persistants », ce qui n'est pas « sauvegardés » |

**Acquis** : `/api/health` existe déjà (point d'appui smoke test + monitoring) · le driver Neo4j
ne force pas `encrypted` ⇒ `neo4j+s://` fonctionne sans modification.

---

## 3. Le plan — 6 phases

### P0 — Prérequis serveur (côté infra / lead) — *bloque tout le reste*
- Base MariaDB Guichet créée en `utf8mb4` / `utf8mb4_unicode_ci` + utilisateur dédié.
- Domaine `guichet.*` dans Plesk + TLS Let's Encrypt + proxy vers `127.0.0.1:8080`.
- Pare-feu : MinIO (9000), Redis (6379), Neo4j (7687) **sur loopback uniquement**.
  **Le Neo4j Browser public (`graph.*`) doit être protégé.**
- Secrets déposés sur le serveur (fichier hors dépôt, permissions strictes, propriétaire dédié).
- Clé SSH de déploiement + secrets GitHub (`OVH_HOST`, `OVH_USER`, `OVH_SSH_KEY`).
- Registre d'images (GHCR) + jeton de lecture sur le serveur.
- **Décision Vertex AI** : projet GCP, compte de service, facturation — **seul coût récurrent réel, non chiffré**.

### P1 — Débloquer (🔴 rien ne part en prod avant) — *périmètre : code*
1. **Corriger la migration `add_candidature_drafts`** (collation explicite) + réconcilier les bases
   existantes (`prisma migrate resolve` — l'empreinte change).
2. **Aligner CI + compose sur MariaDB 10.11**, et ajouter une étape CI qui **rejoue les migrations à froid**
   sur une base vierge → sentinelle anti-régression pour cette classe de bug.
3. **Compose de production** : plus d'`ALLOW_DEV_LOGIN`, secrets hors dépôt, **aucun port publié**,
   rattachement au réseau Docker des services partagés, limites de ressources.

### P2 — Brancher les services du lead — *parallélisable avec P1 (périmètres disjoints)*
4. **Adaptateur de stockage objet MinIO/S3** — remplace Vercel Blob (CV, justificatifs, purge orphelins).
5. **Cloisonnement Redis** — `keyPrefix` ioredis + utilisateur ACL dans `REDIS_URL`.
6. **Neo4j Community** — ne pas définir `NEO4J_DATABASE`, `neo4j+s://`. (Config seule.)

### P3 — Fiabiliser la chaîne de déploiement
7. **Refonte du CD** : image construite **une fois**, poussée au registre, déployée **par son empreinte** ;
   **migrations AVANT bascule** (conteneur éphémère) ; **smoke test** sur `/api/health` ; **rollback**
   = repointer l'image précédente.
8. **Staging sur la même machine** (sous-domaine, base séparée, limites réduites) — coût 0 €, la RAM est là.

### P4 — Exploitation *(les deux premiers points sont les plus dangereux : ils échouent en silence)*
9. **Ordonnanceur de tâches** — cron/systemd appelant les 8 routes avec un secret.
   Sans lui : notifications en échec jamais rejouées, **CV orphelins jamais purgés (CDP)**, réservations
   non traitées, graphe figé.
10. **Sauvegardes** — MariaDB (Plesk), **MinIO (données personnelles)**, Neo4j (dérivé, moindre criticité).
    Copie hors-site + **exercice de restauration** — *une sauvegarde jamais restaurée n'est pas une sauvegarde*.
11. **Limites de ressources** (GUIC-543) — sur machine partagée, le Guichet ne doit **jamais** pouvoir
    emporter le SSO (donc le BRM).
12. **Rotation des logs** (GUIC-544) · **Monitoring Netdata** (GUIC-545) — avec un **canal d'alerte nommé** :
    un tableau de bord que personne ne regarde à 3 h du matin ne sert à rien.

### P5 — Répétition et go-live
13. **E2E Playwright dans la CI** (GUIC-153/154) sur les parcours critiques.
14. **Canary** 10 % → 50 % → 100 % via le proxy (GUIC-158).
15. **Runbook + rollback** (GUIC-159), incluant l'exercice de restauration.
16. **Go-live** (GUIC-160).

---

## 3 bis. Tickets (créés le 2026-07-14)

| Ticket | Phase | Sév. | Objet |
|---|---|---|---|
| **GUIC-573** | P0 | 🟠 | Prérequis serveur — base, domaine/TLS, pare-feu, secrets, accès CI |
| **GUIC-572** | P0 | 🟠 | **Vertex AI en prod** (décision PO confirmée) — projet GCP, compte de service, **quotas + budget d'alerte** |
| **GUIC-562** | P1 | 🔴 | Migration `candidature_drafts` — collation explicite *(bloque le go-live)* |
| **GUIC-563** | P1 | 🔴 | Aligner CI + compose sur MariaDB 10.11 + rejeu des migrations à froid |
| **GUIC-564** | P1 | 🔴 | Compose de production (`ALLOW_DEV_LOGIN`, ports exposés, secrets) |
| **GUIC-565** | P2 | 🔴 | Adaptateur MinIO/S3 (remplace Vercel Blob) |
| **GUIC-566** | P2 | 🔴 | Cloisonnement Redis (préfixe + ACL) |
| **GUIC-567** | P2 | 🟠 | Neo4j Community (config seule, zéro code) |
| **GUIC-568** | P3 | 🔴 | Refonte du CD — registre, migrations avant bascule, smoke test, rollback |
| **GUIC-569** | P3 | 🟠 | Staging sur le même serveur |
| **GUIC-570** | P4 | 🔴 | Ordonnanceur des 8 tâches planifiées (remplace Vercel Cron) |
| **GUIC-571** | P4 | 🔴 | Sauvegardes + **exercice de restauration** |
| **GUIC-574** | P4 | 🔴 | **Supervision des erreurs applicatives** — Netdata voit le CPU, pas un 500 |
| **GUIC-575** | P4 | 🔴 | **Sonde de disponibilité EXTERNE** — le monitoring interne meurt avec le serveur |
| **GUIC-576** | P4 | 🟠 | **Alerting et astreinte** — canal nommé, seuils, escalade |
| **GUIC-577** | P4 | 🟠 | **Relais SMTP et délivrabilité** (SPF/DKIM/DMARC) — sinon les emails partent en spam |

**Observabilité — le trou que les tickets existants ne couvraient pas.** GUIC-543/544/545 traitent
l'infrastructure (limites, logs, Netdata). Mais **Netdata ne voit pas une erreur 500** (→ GUIC-574),
**il tourne sur la machine qu'il surveille**, donc il se tait quand elle tombe (→ GUIC-575), et
**aucun canal d'alerte n'était nommé** — superviser sans réveiller personne est décoratif (→ GUIC-576).

**Tickets préexistants à rattacher** (leur périmètre est partiellement déjà livré dans le dépôt — à
mettre à jour plutôt qu'à dupliquer) : GUIC-542 (conteneurisation), GUIC-546 / GUIC-157 (CI/CD, superseded
par GUIC-568), GUIC-156 (provisionnement OVH, superseded par GUIC-573), GUIC-543/544/545 (durcissement,
phase 4), GUIC-153/154 (E2E en CI), GUIC-158 (canary), GUIC-159 (runbook), GUIC-160 (go-live).

## 3 ter. Observabilité — la pile retenue

**Le constat qui commande tout : l'application ne produit pas encore les signaux qu'on veut surveiller.**
Le `logger` émet bien du JSON structuré et pseudonymise (`hashId`, 143 appels) — c'est une vraie base.
Mais il n'y a **aucun `requestId`**, **aucune capture globale des erreurs** (pas d'`instrumentation.ts`,
pas de `global-error.tsx`) et **aucun log d'accès** (statut + latence). Donc : **une erreur 500 n'est
journalisée nulle part de façon fiable**, et **le taux de 5xx est incalculable** — alors que c'est
précisément le signal qui doit décider d'un rollback pendant le canary.

→ **GUIC-578 (socle d'observabilité applicatif) est le prérequis de GUIC-544, 545, 574 et 576.**
Installer des outils avant lui reviendrait à brancher des sondes sur un patient muet.

| Besoin | Outil | Coût |
|---|---|---|
| Métriques machine et conteneurs | **Netdata** (GUIC-545) | ~200 Mo RAM |
| Logs : collecte, recherche, **rétention** | **Loki + Grafana** (GUIC-544, réécrit) | ~700 Mo RAM |
| Erreurs applicatives | **Grafana sur `level=error`** — pas de service en plus tant que ça suffit (GUIC-574) | 0 |
| Alertes | **Grafana → canal nommé** ; WhatsApp Cloud API déjà disponible (GUIC-576) | 0 |
| Disponibilité | **Sonde externe** — ne fait que pinger une URL, aucune PII ne sort (GUIC-575) | 0 |

**Contrainte CDP, décisive dans ce choix :** Sentry, Datadog et Grafana Cloud sont des services
**étrangers**. Y envoyer nos logs, **même pseudonymisés**, constitue un transfert de données hors du
Sénégal pour une plateforme soumise à la CDP (22 000 jeunes). D'où l'auto-hébergé. Ce n'est pas
rédhibitoire — mais **cela se décide, cela ne se subit pas**.

**GUIC-544 a été réécrit** : son intitulé (« journalisation centralisée des conteneurs ») ne tenait pas
debout — notre seul conteneur est l'app, le SSO et le BRM ne sont pas dockerisés, et « rotation » n'est
pas « centralisation ».

## 4. Portes de sortie (rien ne passe sans)

- **P1 terminé** ⇒ sinon la mise en prod déploie une auth contournée et plante à mi-migration.
- **Sauvegarde restaurée avec succès au moins une fois** ⇒ sinon pas de go-live.
- **Smoke test vert sur staging avec l'image exacte** qui ira en prod.
- **Rollback exécuté au moins une fois en répétition** (pas seulement documenté).

## 5. Coûts

| Poste | Mensuel |
|---|---|
| Serveur OVH (déjà payé, 3 plateformes) | **0 €** marginal |
| GitHub Actions | 0 € dans les minutes incluses (à surveiller) |
| Registre d'images GHCR | ~1–2 € |
| Netdata (agent open source) · TLS Let's Encrypt | 0 € |
| Sauvegardes hors-site | ~2–5 € |
| **Vertex AI (Yaye en prod)** | **non chiffré — à décider** |

Tarifs à revalider (grilles GitHub/OVH évoluent). **Coût évité** : Neo4j Community ⇒ pas de licence Enterprise.

## 6. Risques assumés

- **Une seule machine pour trois plateformes = un seul point de panne.** Pas de haute disponibilité.
  La seule assurance réaliste : des **sauvegardes hors-site testées**. Le jour où un 2ᵉ serveur arrive,
  on rediscute d'un orchestrateur (k3s plutôt que Swarm).
- **Voisinage bruyant** : sans limites de ressources, un incident Guichet devient un incident SSO — donc BRM.
