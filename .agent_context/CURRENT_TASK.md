# Tâche active — GUIC-20 · Page Opportunités : recherche et filtres

Branche : feature/GUIC-20-opportunites-recherche (depuis `dev`)
Module  : m3-opportunites · Sprint 1 · 8 SP
Spec    : .agent_context/specs/GUIC-20-opportunites-recherche.md
Études  : M3-opportunites-ux.md · M3-opportunites-ui.md
JIRA    : https://consortiumjeunesse.atlassian.net/browse/GUIC-20

## Méthode
TDD strict — tests d'abord (red), code ensuite (green). `npm run validate` avant chaque commit.

## Workflow TDD — étapes

1. ✅ Tests `slug` (11) verts → `src/lib/slug.ts`
2. ✅ Schéma : `slug` sur `Opportunite` + `OpportuniteFavorite` + relations · `prisma generate` OK
   · migrations `20260522000000_add_opportunite_slug` (3 étapes) et
   `20260522000100_add_opportunites_favorites` créées — **à appliquer quand la BDD locale tourne**
   (`localhost:3307` injoignable au moment du dev)
3. ✅ Tests `opportunites-loader` (12) verts → `src/lib/opportunites-loader.ts`
   + `src/types/opportunite.ts` · exception SQL brut consignée dans DECISIONS.md
   · migrations appliquées en BDD (`prisma migrate deploy`)
4. ✅ Tests `GET /api/opportunites` (5) verts → route réelle (remplace le stub)
   + `src/lib/validations/opportunite.ts` · tsc + lint OK
5. ✅ Tests API favoris (10) verts → `src/app/api/favoris/route.ts` (GET+POST)
   + `[opportuniteId]/route.ts` (DELETE) · tsc + lint OK
6. ✅ Seed `prisma/seed/opportunites.ts` (50 opportunités) + wiring `index.ts`
   + `prisma.config.ts migrations.seed` · seed exécuté : 50 lignes, 40 visibles, 50 slugs uniques
7. ✅ Frontend : `ui/Sheet`, `OpportunityCard`, `FiltresPanel`, `OpportunitesClient`,
   refonte page `/opportunites` (server + Suspense) · `npm run validate` (235 tests) +
   `npm run build` verts
8. ⏳ Vérification navigateur puis commit `[GUIC-20] … Closes GUIC-20` → PR vers `dev`

## Rappels protocole
- TDD obligatoire (cf feedback_tdd) · `npm run validate` avant chaque commit
- Exception SQL brut tolérée : fulltext BOOLEAN MODE → consigner dans DECISIONS.md
- Pas de mention IA, auteur `mod-cjs`
- Commit : `feat|fix|test(m3-opportunites): [GUIC-20] description` · pied `Closes GUIC-20`

## Hors scope
Détail + candidature → GUIC-21. Création d'opportunités → m9-recruteur.
