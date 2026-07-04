# Spec M7 — SEO & référencement (GUIC-25 / GUIC-102)

> **Statut ticket** : les descriptions JIRA (GUIC-7 epic, GUIC-25 story) mentionnent
> **Nuxt.js** (obsolète — stack réelle **Next.js 16 App Router**) et des **redirections 301
> Drupal** (aucune map d'URLs Drupal dans le repo). Décision PO (2026-07-04) :
> - Fondations SEO complètes livrées ici (voir périmètre).
> - Redirections 301 Drupal **reportées** dans un sous-ticket dédié (nécessite l'export
>   des anciennes URLs Drupal — bloquant côté data).

## Objectif

« En tant que responsable comm CJS, je veux que les pages publiques soient bien indexées
par Google afin d'augmenter la visibilité naturelle. »

## Périmètre livré

1. **`metadataBase`** (root layout) — résout OG/canonical en URLs absolues. Sans lui, les
   `openGraph` et canoniques par page sont relatifs → cassés pour les crawlers/partages.
2. **`robots.ts`** — autorise les routes publiques, bloque les espaces privés
   (`/jeune`, `/admin`, `/conseiller`, `/recruteur`, `/centre-staff`, `/api`, `/auth`,
   `/checkin`, `/apercu-partenaire`, `/design-preview`), pointe vers le sitemap.
3. **`sitemap.ts`** dynamique (GUIC-102) — pages statiques publiques + opportunités
   (`statut=publiee`) + événements (`a_venir`/`en_cours`) + ressources (`estPublic`) +
   centres. **Cache Redis 1h** (`seo:sitemap:v1`), dégradation gracieuse si Redis KO.
4. **`manifest.ts`** — PWA (nom, couleurs `gj-teal`, icônes, lang `fr`).
5. **Données structurées Schema.org (JSON-LD)** :
   - `Organization` sur l'accueil (`/`)
   - `JobPosting` sur le détail opportunité (`/opportunites/[slug]`)
   - `Event` sur le détail événement (`/agenda/[id]`)
6. **Canonical + OpenGraph par page** sur les routes dynamiques publiques.

## Contraintes techniques

- URL de base : `appUrl()` de `src/lib/app-url.ts` (jamais de domaine en dur).
- Sitemap : requêtes Prisma en lecture seule ; sélection minimale (slug/id + updatedAt).
  Un item sans date de modif retombe sur `new Date()` (build time).
- JSON-LD : composant `<JsonLd data={…} />` (`src/components/seo/JsonLd.tsx`) qui rend un
  `<script type="application/ld+json">` — pas de HTML brut ailleurs.
- Helpers JSON-LD purs et testés : `src/lib/seo/json-ld.ts`.
- Construction sitemap testable : `src/lib/seo/sitemap.ts` (`buildSitemapEntries`).

## Mapping données

| Route publique              | Modèle / clé        | Filtre publication              |
|-----------------------------|---------------------|---------------------------------|
| `/opportunites/[slug]`      | `Opportunite.slug`  | `statut=publiee, deletedAt=null`|
| `/agenda/[id]`              | `Evenement.id`      | `statut in (a_venir, en_cours)` |
| `/ressources/[id]`          | `Ressource.id`      | `estPublic=true`                |
| `/centres/[slug]`           | `Centre.slug`       | (tous)                          |

## Hors périmètre

- Redirections 301 Drupal (sous-ticket dédié, bloqué data).
- Google Search Console / soumission sitemap (GUIC-106 — opérationnel, hors code).
- `opengraph-image` dynamique par entité (v2 possible ; OG image statique par défaut ici).

## Tests

- `src/lib/seo/json-ld.test.ts` — JobPosting/Event/Organization : champs requis, dates ISO,
  échappement, absence de `undefined`.
- `src/lib/seo/sitemap.test.ts` — construction des entrées, filtrage publication, URLs
  absolues, exclusion des espaces privés.
