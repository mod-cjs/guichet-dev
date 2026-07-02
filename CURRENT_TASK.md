# CURRENT_TASK — Plan admin : Partenaires + RBAC conseiller (phase par phase)

**Contexte :** revue admin du 2026-07-02 — onglets manquants : Partenaires + gestion des rôles/droits conseiller.
**Vérif SSO (`cjs_auth`) :** rôles attribués côté SSO (GUIC-27/113/115 y vivent) ; le token expose `cjs_roles` mais **pas** de `centre_id`. → l'affiliation conseiller↔centre doit être **locale** (table `AgentCentre`).

## Plan (4 phases)
1. **Phase 1 — Partenaires (GUIC-510)** ← *en cours (cette branche)* : CRUD `Organisation` admin.
2. **Phase 2 — RBAC conseiller** : CRUD `AgentCentre` (rôle lu du SSO + centre local) + middleware isolation (GUIC-271/330/331 ; GUIC-329 re-cadré « centre local »).
3. **Phase 3 — Espace conseiller** (Epic GUIC-470 : dashboards 493/494, nav 501, notifs 500/320, responsive 502).
4. **Phase 4 — Droits conseiller sous validation** (GUIC-477 publications / GUIC-478 ressources).

## Phase 1 — livré (GUIC-510)
**Branche :** `feature/GUIC-510-partenaires` (depuis dev). **Pas de migration** (`Organisation` existe).
- **Actions** `src/app/admin/partenaires/actions.ts` : `basculerVerifiePartenaire` (bascule `estVerifie`) + `modifierPartenaire` (champs éditables). Audit `partenaire.verify` / `partenaire.update`.
- **UI** : page `/admin/partenaires` (liste + filtres vérifié + recherche + pagination), `AdminPartenairesTable` (badge Vérifié, toggle, Éditer modal, Détail), `PartenaireFormModal`, détail `/admin/partenaires/[id]` (coordonnées + opportunités liées).
- **Nav** : entrée sidebar « Partenaires » (Pilotage).
- **Vérifié** : tsc 0 · eslint 0 · 269 suites / 1896 tests verts. Nouveaux : actions (4), table (5), sidebar (1).

## Reste Phase 1
- [ ] PR vers dev (`Closes GUIC-510`). Puis enchaîner Phase 2.
