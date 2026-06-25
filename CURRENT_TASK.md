# CURRENT_TASK — Lot 3 Bibliothèque physique + outils Yaye

**Epic** GUIC-274 · sous-tâches GUIC-341/342/343/344/345
**Branche** `feature/GUIC-341-bibliotheque-yaye` (depuis `dev`)
**Spec** `.agent_context/specs/M4-bibliotheque.md`
**Module** m4-centres (backend) + m12-ia (outils Yaye)

## Périmètre acté (PO 2026-06-25)
Backend complet (modèles + routes + UI) **puis** outils Yaye branchés dessus.
Dérogation assumée à « Yaye ne branche que de l'existant » (le backend biblio n'existe pas).

## État
- [x] Branche créée depuis dev
- [x] Tickets JIRA fetchés (epic + 5 sous-tâches, toutes « À faire »)
- [x] Spec rédigée + périmètre validé (PO)
- [x] 341 modèle + migration (`20260625120000_add_bibliotheque`)
- [x] 342 recherche + fiche (service + routes)
- [x] 343 emprunt/confirmation (scan badge staff)/retour + RBAC centre
- [x] Outils Yaye (search_library/borrow_book/get_active_loans) + system prompt
- [x] Neo4j : nœuds Livre/Exemplaire + CONTIENT/EST_LOCALISE_EN + projecteurs événementiels + reprojectAll
- [x] 344 front jeune (catalogue/fiche/emprunter/mes-emprunts) + UI staff (dashboard confirmer/retour + CRUD catalogue) + nav
- [x] 345 tests (service + outils Yaye = 19) + droit à l'oubli (purge historique emprunts webhook SSO)
- [x] tsc 0 · eslint 0 · tests biblio/graph/tools verts

## Reste (ops, hors code)
- [ ] Appliquer la migration : `prisma migrate deploy` en CI/prod (shadow DB local refusé → migration écrite à la main, validée par tsc/tests)
- [ ] PR vers dev + MAJ JIRA (GUIC-274/341/342/343/344/345 : À valider)

## Décisions actées (PO 2026-06-25)
1. ✅ Confirmation emprunt : **endpoint staff bibliothécaire réutilisant le scan badge existant** (`/api/cjs-card`).
2. ✅ Sync Neo4j biblio : **inclure maintenant** (CONTIENT/A_EXEMPLAIRE/EST_LOCALISE_EN + events emprunt_initie/retour_enregistre).
3. ✅ UI bibliothécaire : **complète** (CRUD catalogue + confirmation/retour) en plus de la page jeune.
