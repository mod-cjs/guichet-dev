# Spec — Éditeur de texte riche mutualisé (GUIC-503)

> Story GUIC-503 · Sous-tâches GUIC-504→509 · Remplace/englobe GUIC-422
> Module : m8-admin (composant transverse UI + m9-recruteur, m3-opportunites, m5-agenda, m6-ressources)

## 1. Objectif

Remplacer la saisie de description en **texte brut** (`<textarea>` / `<Input>`) par un
éditeur **WYSIWYG bridé** mutualisé, réutilisé par tous les CRUD de contenu (admin **et**
recruteur). Mise en forme : titres, gras/italique, listes, liens, images, citations.

## 2. Décisions verrouillées (PO — 2026-07-03)

| Sujet | Décision |
|---|---|
| **Périmètre** | 6 formulaires : Opportunité (admin), Offre (recruteur), Événement, Ressource, Partenaire, Profil entreprise + Ressource centre |
| **Stockage** | **HTML sanitisé** dans la colonne `description` existante — **aucune migration Prisma** |
| **Champs GUIC-257** | `mission` / `profilRecherche` / `conditions` deviennent **éditables** (éditeur riche), traités dans le pilote opportunité |
| **Éditeur** | Tiptap (ProseMirror) — bridé identité CJS, pas de police/couleur libre |
| **Sanitisation** | Serveur, liste blanche stricte, anti-XSS (contenu saisi par des tiers) |
| **KG** | Champs structurés (secteur/région/deadline/compétences) restent **hors** du HTML |

## 3. Contraintes techniques

- Tiptap `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` + `@tiptap/extension-image`.
- Sanitizer : `sanitize-html` (pur JS, sans jsdom — sanitisation **serveur uniquement** à l'écriture ;
  `isomorphic-dompurify` écarté car il charge jsdom eagerly et casse le transform ESM de Jest).
- **Sortie = HTML** (string) stockée telle quelle après sanitisation serveur.
- Rendu lecture via `<RichContent html>` avec **fallback texte plat** : si la valeur ne
  contient aucune balise HTML (lignes existantes), on retombe sur `whitespace-pre-line`.
- Éditeur bridé : marks/nodes autorisés = `p, h2, h3, strong, em, ul, ol, li, a, img, blockquote, br`.
  Pas de `style`/`class`/`font`/`color` inline.
- Meta SEO : stripper le HTML avant `description.slice(0, 160)`.

## 4. Périmètre technique (fichiers)

### Cœur (3 entités du ticket)
| Entité | Formulaire | Rendu |
|---|---|---|
| Opportunité (admin) | `src/app/admin/opportunites/OpportuniteForm.tsx:287` (+ mission/profil/conditions) | `src/components/opportunites/OpportuniteDetail.tsx:308+` |
| Offre (recruteur) | `src/app/recruteur/mes-offres/NouvelleOffreForm.tsx:136` | idem |
| Événement (admin) | `src/app/admin/evenements/EvenementFormModal.tsx:112` (Input→éditeur) | `src/app/(public)/agenda/[id]/page.tsx:93` |
| Ressource (admin) | `src/app/admin/ressources/RessourceFormModal.tsx:70` (Input→éditeur) | `src/components/ressources/RessourceDetailHero.tsx:60` |

### Extensions
| Entité | Formulaire | Rendu |
|---|---|---|
| Partenaire | `src/app/admin/partenaires/PartenaireFormModal.tsx:80` | `src/app/admin/partenaires/[id]/page.tsx:76` |
| Profil entreprise (recruteur) | `src/app/recruteur/profil-entreprise/ProfilEntrepriseForm.tsx:68` | — |
| Ressource centre | `src/app/admin/centres/RessourceCentreFormModal.tsx:94` | — |

### Actions serveur à instrumenter (sanitisation)
`src/app/admin/opportunites/actions.ts`, `admin/evenements/actions.ts`,
`admin/ressources/actions.ts`, `recruteur/mes-offres/actions.ts`,
`admin/partenaires/*`, `recruteur/profil-entreprise/*`, `admin/centres/*`.

## 5. Nouveaux artefacts

- `src/lib/sanitize-html.ts` — liste blanche + `sanitizeRichHtml(input): string`.
- `src/components/ui/RichTextEditor/index.tsx` (+ `.stories.tsx`).
- `src/components/ui/RichContent/index.tsx` (+ `.stories.tsx`) — rendu HTML sanitisé + fallback.
- Tests : `tests/unit/sanitize-html.test.ts` (anti-XSS), tests composants.

## 6. Plan de livraison (3 phases, TDD strict RED→GREEN)

- **Phase A — Socle** (GUIC-504/505/506/507) : deps + sanitizer + RichTextEditor + RichContent.
- **Phase B — Pilote + propagation** (GUIC-508/509) : opportunité admin d'abord, puis les 3 cœur.
- **Phase C — Extensions** : partenaire, profil entreprise, ressource centre + clôture GUIC-422.

## 7. Sécurité (règle CLAUDE.md — contenu tiers)

- Sanitisation **serveur obligatoire** avant persistance (jamais confiance au client).
- Liens : `rel="noopener noreferrer"`, protocoles `http/https/mailto` uniquement.
- Images : `src` `https` uniquement (pas de `data:` non contrôlé), `<img>` sans handlers.
- Tests anti-XSS obligatoires : `<script>`, `onerror=`, `javascript:`, `<iframe>`, attributs `on*`.
