# Revue adversariale — mise en prod phases 1-3 (avant revue du lead)

**Date :** 2026-07-14 · **Méthode :** on attaque notre propre travail pour l'invalider.
**Périmètre :** PR #250 (phase 1), #251 (phase 2), #252 (phase 3). **Aucun merge.**
Chaque finding est vérifié dans le code ou reproduit, pas supposé.

---

## F1 — 🟠 HAUT · Le justificatif de réservation n'est pas servi par un proxy autorisé

> **CORRECTION du 2026-07-14 (après vérification approfondie).** Le titre initial de ce finding
> (« photos + justificatifs cassés ») **surévaluait le volet photos** — je le rectifie honnêtement.

**Volet photos — NON, pas de régression (mon erreur initiale).** Le code route DÉJÀ les photos par
le proxy `/api/profil/photo/file` via le helper `getProfilePhotoUrl(cjsUid, hasPhoto)` : `ProfilHeader`
(commentaire GUIC-369 : « le photoUrl brut pointe sur un Blob privé non accessible directement → on
privilégie le proxy »), `Avatar`, `BenefSidebar`, `UserMenu`, et les pages `ma-carte` / `centres`
convertissent toutes en chemin proxy. Les `src={photoUrl}` bruts (`DashboardHero`, `MyCardCjs`) ne
sont utilisés **qu'en Storybook**, jamais dans une page. → **aucun correctif photo nécessaire.**

**Volet justificatif — OUI, bug réel, mais PRÉEXISTANT.** `ReservationCard:205` fait
`<a href={fichierJustifUrl}>` sur la valeur brute de `Reservation.justifFileUrl`. Or :
- la route justif n'a **jamais eu de GET proxy** (le commentaire « lecture via proxy GET ci-dessous »
  de `justif/upload/route.ts:9` est **mensonger** — il n'y a que le POST) ;
- le justif était déposé en `access: 'private'` sur Vercel → `href` vers un blob privé = **403 dans
  le navigateur**. Donc **ce téléchargement est cassé depuis qu'il est passé en privé.** Mon `s3://`
  ne casse pas une fonctionnalité qui marchait — il transforme un 403 en schéma non géré.
- CDP : même corrigé, un justificatif est un **document personnel** ; il doit être servi derrière un
  contrôle d'accès (propriétaire de la réservation OU conseiller du centre concerné).

**Correctif retenu (F1 réduit au justif).** Route proxy autorisée
`GET /api/reservations/[id]/justif` (propriétaire ou conseiller du centre, via `AgentCentre`) qui sert
le contenu via `stockagePour(ref)` — gère à la fois les `s3://` neufs et les URL Vercel héritées.
`ReservationCard` pointe sur cette route au lieu de la référence brute.

**Ce qui N'EST PAS touché** (vérifié) : `cvUrl` réutilisé dans la candidature (référence renvoyée au
serveur, relue via proxy recruteur) — round-trip, pas d'affichage direct.

---

## F2 — 🔴 HAUT, bloquant prod · Les conteneurs ne peuvent pas joindre les services en `127.0.0.1`

**Constat.** Depuis un conteneur, `127.0.0.1` désigne LE CONTENEUR, pas l'hôte. Or :

| Service | Adresse prévue | Joignable depuis notre conteneur ? |
|---|---|---|
| **MariaDB (Plesk)** | tourne sur l'HÔTE, `127.0.0.1:3306` | ❌ non |
| **MinIO** | `S3_ENDPOINT=http://127.0.0.1:9000` (loopback hôte) | ❌ non |
| Redis | `redis_cjs:6379` (nom de conteneur) | ✅ si même réseau Docker |
| Neo4j | `neo4j+s://graph.…:7687` (DNS public) | ✅ oui |

Le `docker-compose.prod.yml` ne déclare **ni `extra_hosts: host.docker.internal:host-gateway`**,
et le `migrate()` de `deploy.sh` tourne `--network cjs_services` sans accès hôte. **Donc la
migration ET l'app échouent à joindre la base et MinIO.** C'est bloquant au premier déploiement.

**À décider avec le lead** (une des trois voies) : (a) `extra_hosts` + `DATABASE_URL`/`S3_ENDPOINT`
en `host.docker.internal` ; (b) MariaDB/MinIO écoutent sur le bridge Docker ; (c) rattacher app +
MinIO au même réseau et adresser MinIO par son nom de conteneur. **Question infra, pas juste code.**

---

## F3 — 🟠 MOYEN · Le smoke test ne peut pas joindre l'app (aucun port publié)

`deploy.sh` teste `HEALTH_URL` **depuis l'hôte**, mais le compose de prod n'expose l'app qu'en
interne (`expose: 3000`, aucun `ports:`). Depuis l'hôte, `http://127.0.0.1:3000` ne répond pas →
le smoke test échouerait **même sur une app saine**, déclenchant un rollback à tort. Le proxy qui
rendrait l'app joignable est **GUIC-158** (non fait). Contrat à clarifier : `HEALTH_URL` doit
passer par le proxy Plesk, ou exécuter le test **dans** le réseau Docker.

---

## F4 — 🟠 MOYEN · Le déploiement peut ne pas trouver le tag

`cd-deploy.yml` fait `git fetch --quiet origin` puis `git checkout "<tag>"`. `git fetch origin`
ne récupère pas de façon fiable un tag léger `v*`. → checkout en échec, déploiement avorté.
**Correctif :** `git fetch --tags --quiet origin`.

---

## F5 — 🟡 FAIBLE, CDP · CV/photos déposés en `acces: 'public'`

Comportement d'origine **préservé** (pas changé en douce), mais un CV en `public` est accessible à
qui connaît/devine son URL. Déjà signalé dans la PR #251. **Décision produit à prendre.**

---

## Ce qui a résisté à l'attaque (vérifié OK — à ne pas « corriger »)

- **Sentinelle collation** (GUIC-562) : testée sur du SQL piégeux (`CHECK (json_valid(...))`,
  `DEFAULT CURRENT_TIMESTAMP(3)`) → extrait toujours le bon suffixe, flagge correctement. Robuste.
- **`keyPrefix` Redis** (GUIC-566) : aucune file BullMQ/bull dans le code → rien à casser ; le
  `multi()` du rate-limiting est bien préfixé (prouvé contre une vraie ACL).
- **Healthcheck du compose** : image `node:20-alpine` → `fetch` global disponible.
- **`deduceCvName`** : `new URL('s3://…','base')` → extrait le nom de fichier sans planter.
- **Garde-fous prod** (GUIC-564) : `assertConfigurationProduction` refuse bien au démarrage si
  `NEXTAUTH_URL` absent/non local ; la config dev (localhost) ne déclenche pas le refus.

---

## Verdict

| PR | Mergeable en l'état ? |
|---|---|
| **#250** (phase 1) | Oui — F4 (1 ligne) à corriger, sinon sain |
| **#251** (phase 2) | **NON** — F1 casse photos + justificatifs après bascule |
| **#252** (phase 3) | **NON en prod** — F2 bloque le déploiement, F3 fausse le smoke test |

**Priorité de correction :** F1 (photos/justif) → F2 (accès hôte) → F3/F4.
