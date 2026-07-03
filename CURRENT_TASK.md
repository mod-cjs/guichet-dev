# CURRENT_TASK — GUIC-503 Éditeur de texte riche mutualisé

**Branche :** `feature/GUIC-504-editeur-riche-contenus` (depuis `dev`)
**Spec :** `.agent_context/specs/M8-editeur-riche.md`
**Story :** GUIC-503 · Sous-tâches GUIC-504→509 · englobe GUIC-422

## Décisions PO (2026-07-03)
- Périmètre : **6 formulaires** (opportunité, offre recruteur, événement, ressource, partenaire, profil entreprise + ressource centre).
- Stockage : **HTML sanitisé** dans `description` existante — pas de migration.
- Champs `mission`/`profilRecherche`/`conditions` : **éditables** (pilote opportunité).

## Phase A — Socle ✅ TERMINÉE
- [x] Deps Tiptap (react/pm/starter-kit/link/image/placeholder) + `sanitize-html` (isomorphic-dompurify écarté : jsdom casse Jest)
- [x] `src/lib/rich-html.ts` (pur, client-safe) + `src/lib/sanitize-html.ts` (serveur) + tests anti-XSS 12/12 (GUIC-506/505)
- [x] `src/components/ui/RichContent/` (rendu HTML + fallback texte plat) + tests 4/4 (GUIC-505)
- [x] `src/styles/rich-prose.css` — styles bridés `gj-prose` (GUIC-507)
- [x] `src/components/ui/RichTextEditor/` bridé CJS + story 3 variants (GUIC-504/507)
- [x] Barrel `ui` mis à jour · lint 0 erreur · tsc 0 erreur · 16/16 tests nouveaux verts
- Note : échecs de tests restants = intégration (DATABASE_URL absente) + 3 unit métier, tous **préexistants sur dev**, hors périmètre.

## Suivant
- Phase B : pilote opportunité admin (description + mission/profil/conditions), puis 3 entités cœur.
- Phase C : extensions + clôture GUIC-422.
