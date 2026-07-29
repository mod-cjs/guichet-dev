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
- [ ] Étape 1 — Schéma Prisma (3 enums + modèle `Consultation`) + migration SQL manuelle
- [ ] Étape 2 — Socle `src/lib/analytics/consultations.ts` (TDD RED → GREEN)
- [ ] Étape 3 — Canal web (5 pages détail + bascule des 2 compteurs existants)
- [ ] Étape 4 — Canal IA (impressions `tools.ts` + `nodesReturned` + `?src=ia`)
- [ ] Étape 5 — Canal WhatsApp (`?src=wa`)
- [ ] `npm run validate` vert

## Points d'attention
- `SHADOW_DATABASE_URL` absent de `.env`/`.env.local` et l'utilisateur MariaDB n'a pas `CREATE DATABASE` → `prisma migrate dev` échoue. Migration **écrite à la main** sur le modèle des 4 dernières.
- 13 tests rouges préexistants sur `dev` (mocks Prisma obsolètes) — ne pas les compter dans le résultat.
- Le compteur `Ressource.vues` va ralentir sa progression (garde Redis ajoutée) : attendu, à annoncer au PO.

## Hors périmètre : dashboards · exports CSV · rollup journalier · retrait de `CentreEvent.centre_viewed` · rétention/purge.
