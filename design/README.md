# Design — Guichet Jeunesse CJS

Ce dossier contient les fichiers de référence produits par Claude Design.
Il est la **source de vérité visuelle** du projet.

## Structure

```
design/
├── html/          ← Fichiers HTML de référence (pages et composants)
│   ├── accueil.html
│   ├── opportunites.html
│   ├── detail-opportunite.html
│   ├── evenements.html
│   ├── ressources.html
│   ├── centres.html
│   ├── profil.html
│   └── ...
├── assets/        ← Images, icônes, logos utilisés dans les maquettes
└── README.md
```

## Règle d'utilisation

Chaque fois qu'une nouvelle page ou composant est créé dans le projet,
Claude Code doit :

1. Lire le fichier HTML correspondant dans `design/html/`
2. Extraire la structure, les classes CSS et les variables de tokens
3. Convertir en composant TSX en respectant fidèlement le design
4. Utiliser les variables de `src/styles/tokens.css` pour les couleurs et espacements

## Correspondance HTML → TSX

| Fichier HTML (design) | Fichier TSX (projet) |
|----------------------|----------------------|
| `accueil.html` | `src/app/(public)/page.tsx` |
| `opportunites.html` | `src/app/(public)/opportunites/page.tsx` |
| `detail-opportunite.html` | `src/app/(public)/opportunites/[id]/page.tsx` |
| `evenements.html` | `src/app/(public)/evenements/page.tsx` |
| `ressources.html` | `src/app/(public)/ressources/page.tsx` |
| `centres.html` | `src/app/(public)/centres/page.tsx` |
| `profil.html` | `src/app/(jeune)/mon-profil/page.tsx` |

Mettre à jour ce tableau au fur et à mesure que de nouveaux fichiers HTML sont ajoutés.
