# CURRENT_TASK — Rapatriement GUIC-697 vers `dev` (PR corrective #342)

**Contexte** : PR #325 (GUIC-694, Lot 1) a mergé sur `dev` avant que PR #335 (GUIC-697,
Lots 5+6) ne merge dans `feature/GUIC-694-etl-lot1-exploitabilite` — qui n'avait alors plus
de PR ouverte vers `dev`. Le travail de GUIC-697 était donc orphelin (mergé nulle part
d'utile). Cette PR (#342, `feature/GUIC-694-etl-lot1-exploitabilite` → `dev`) le rapatrie.

## État
- [x] Diagnostic : `git merge-base --is-ancestor` a confirmé GUIC-697 absent de `dev`
- [x] PR #342 ouverte
- [x] `dev` mergé dans la branche pour résoudre les conflits — deux fichiers en collision :
  - `.agent_context/CURRENT_TASK.md` (ce fichier — doc de suivi, conflit attendu entre
    sessions parallèles)
  - `src/app/api/v1/export/counts/route.ts` : GUIC-696 (`dev`) a introduit le module
    partagé `since.ts` (S2/S3 — illisible/hors-plage) ; GUIC-697 (cette branche) avait
    implémenté D6 (`since` obligatoire) en ligne, avant que ce module n'existe sur sa base.
    **Résolu en combinant les deux** : `since` reste obligatoire (D6), validée par
    `parseSince()` partagé (S2/S3) — aucune régression d'un côté ni de l'autre.
- [ ] `npm run validate` après résolution, puis push et merge de #342

## Plan de durcissement ETL (spec `.agent_context/specs/M13-durcissement-etl.md` §5) — 5 PRs
Lot 1 GUIC-694 (#325, mergée `dev`) · Lot 2 GUIC-695 (#326, mergée `dev`) · Lots 3+4 GUIC-696
(#327, mergée `dev`) · Lots 5+6 GUIC-697 (#335, mergée dans la branche GUIC-694 — rapatriée
par #342) · Lot 7 GUIC-700 (#341, ouverte, à rebaser sur `dev` une fois #342 mergée).
