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

## Phase B — Pilote + propagation ✅ TERMINÉE
- [x] Pilote opportunité admin (description + mission/profil/conditions repliables) — sanitisation + rendu + SEO.
- [x] Offre recruteur : RichTextEditor (hidden input) + sanitisation action (contenu tiers).
- [x] Événement : Input mono-ligne → éditeur riche + sanitisation + rendu agenda + SEO.
- [x] Ressource : Input mono-ligne → éditeur riche + sanitisation + rendu hero + SEO.
- Rendu : tous les `whitespace-pre-line` de ces entités → `RichContent` (fallback texte plat).

## Phase C — Extensions + audit affichage ✅ TERMINÉE
- [x] Partenaire (Organisation.description) : éditeur + sanitisation + rendu admin RichContent.
- [x] Profil entreprise recruteur : éditeur (contenu tiers) + sanitisation + null-si-vide.
- [x] Ressource centre : éditeur + sanitisation.
- [x] **Audit affichage** — richesse prise en compte partout :
  - Détail (riche) : opportunité, agenda, ressource, partenaire → `RichContent`.
  - Aperçus/cartes (texte plat) : ResourceCard, RessourceCard → `htmlToPlainText`.
  - Recherche/filtres : agenda-client, EvenementsClient, agenda public → `htmlToPlainText`.
  - Partage/ICS/meta SEO : share ressource, export .ics, 3 meta → `htmlToPlainText`.
  - Canaux WhatsApp + prompt IA adéquation → `htmlToPlainText`.
  - KG : la projection n'indexe QUE les champs structurés (déjà conforme GUIC-509).

## Reste
- Clôturer GUIC-422 (couvert comme cas d'usage).
- PR via /propagate + mise à jour Jira (transitions au merge).
