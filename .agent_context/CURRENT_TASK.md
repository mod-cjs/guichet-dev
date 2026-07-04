# CURRENT_TASK — GUIC-25 SEO technique (M7)

**Branche** : `feature/GUIC-25-seo-technique-metadonnees-schema-sitemap` (depuis origin/dev)
**Spec** : `.agent_context/specs/M7-seo.md`
**Périmètre validé PO (2026-07-04)** : fondations SEO complètes · 301 Drupal reportées.

## Checklist

- [ ] `metadataBase` + OG défaut + siteName (root layout)
- [ ] `robots.ts`
- [ ] `sitemap.ts` dynamique + cache Redis 1h (`src/lib/seo/sitemap.ts`)
- [ ] `manifest.ts`
- [ ] Helpers JSON-LD `src/lib/seo/json-ld.ts` + composant `<JsonLd>`
- [ ] JSON-LD Organization (accueil), JobPosting (opportunité), Event (agenda)
- [ ] Canonical + OpenGraph sur routes dynamiques publiques
- [ ] Tests `json-ld.test.ts` + `sitemap.test.ts`
- [ ] `npm run validate`

## Sous-tickets à créer

- 301 Drupal (bloqué : nécessite export URLs Drupal)
