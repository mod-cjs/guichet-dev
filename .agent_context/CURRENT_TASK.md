# CURRENT_TASK — GUIC-688 · Consultations multicanal (web · IA · WhatsApp)

**Spec** : `.agent_context/specs/GUIC-688-consultations-multicanal.md` · **Branche** : `feature/GUIC-688-consultations-multicanal` (depuis `dev`) · **JIRA** : [GUIC-688](https://consortiumjeunesse.atlassian.net/browse/GUIC-688) (Story, m13-data)

## Décisions PO
- **Nominatif** : `cjsUid` pour les connectés, `sujetHash` (SHA-256 salé) sinon. Jamais d'IP en clair.
- **Dédoublonnage** : 30 min, identique sur les 3 canaux.
- **Compteurs `vues`** : conservés comme cache dénormalisé, alimentés par le helper.
- **Rétention / purge / anonymisation** : **hors périmètre — on conserve tout, sans limite de durée**.
- **Programme / Organisation** : enum prévu, pas d'instrumentation (aucune page bénéficiaire).

## État
- [x] Ticket GUIC-688 créé + spec rédigée + branche créée depuis `dev`
- [x] Étape 1 — Schéma Prisma (3 enums + modèle `Consultation`) + migration SQL manuelle
- [x] Étape 2 — Socle `src/lib/analytics/consultations.ts` (RED → GREEN, 28 tests)
- [x] Étape 3 — Canal web (5 pages détail + route API + retrait des 2 compteurs, 12 tests)
- [x] Étape 4 — Canal IA (impressions via `executeToolCall` + `nodesReturned` + `?src=ia`, 7 tests)
- [x] Étape 5 — Canal WhatsApp (`?src=wa` sur les 4 familles de liens)
- [x] Durcissement : `after()` au lieu de `void` (perte d'écriture serverless) · user-agent dans le sujet anonyme ·
      sentinelle sur les 6 callsites · liens de notification WhatsApp · `from=reco` · impressions livres
- [x] tsc 0 erreur · lint sans nouveau warning · 163 tests ciblés verts · suite complète sans régression (27 suites
      rouges, toutes sur `pool timeout` faute de base locale — identiques à la ligne de base)
- [ ] **Migration NON appliquée** : MariaDB local éteint — `prisma migrate deploy` à jouer avant tout runtime
- [ ] PR vers `dev`

## Points d'attention
- `SHADOW_DATABASE_URL` absent de `.env`/`.env.local` et l'utilisateur MariaDB n'a pas `CREATE DATABASE` → `prisma migrate dev` échoue. Migration **écrite à la main** sur le modèle des 4 dernières : à confronter à `prisma migrate diff` dès que la base est joignable.
- 28 suites d'intégration rouges en local, toutes sur `pool timeout` (base éteinte) — indépendantes de ce ticket.
- Le compteur `Ressource.vues` va ralentir sa progression (garde Redis ajoutée) : attendu, à annoncer au PO.
- `CONSULTATION_HASH_SALT` à poser en production (documenté dans `.env.example`).

## Hors périmètre : dashboards · exports CSV · rollup journalier · retrait de `CentreEvent.centre_viewed` · rétention/purge.
