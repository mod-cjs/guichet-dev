# CURRENT_TASK — Vague 3 design v5 : socle, états système, navigation, écrans (épic GUIC-689)

**Branche** : `feature/GUIC-689-design-v5-vague3-socle` — **empilée** sur vague 2 (PR #322) → vague 1 (PR #318) → fondation (PR #314).
Ordre de merge : #314 → #318 → #322 → vague 3. Rebaser sur `dev` au fil des merges.
**Worktree** : `.claude/worktrees/design-v5` (node_modules PROPRE — ne jamais re-symlinker).
**Serveur local** : `APP_ENV=local ALLOW_DEV_LOGIN=true NEXTAUTH_URL=http://localhost:3211 PORT=3211 npm run start`, puis `/api/dev/login?uid=…` (le SSO n'est pas joignable en dev).

## Périmètre — issu de l'audit de conformité (38 items, 8 arbitrages)

| Lot | Contenu | État |
|---|---|---|
| **A** | Interfaces qui mentent : CTA Yaye dashboard sans handler · CTA Yaye coloré par type au lieu du magenta · bouton « Retirer ma candidature » sans API (arbitrage rendu : **retrait**) | agent lancé |
| **C1** | Primitives : Tabs (pilule), Chip (fond plein), Toast (sombre + action inline) | agent lancé |
| **C2** | Primitives : Modal/Alert glyphes → sprite · 4 icônes manquantes · Badge bordure · Avatar dégradé+présence · FileUpload dropzone · Skeleton gabarit | agent lancé |
| **D** | États système : mode hors-ligne (0 occurrence de `navigator.onLine`) · `error.tsx` (0 fichier) · primitive plein écran · EmptyState fullpage | à lancer |
| **E** | Navigation : bottom-nav signature v5 · `/jeune/parametres` injoignable · fil d'Ariane ID brut · libellés sidebar | à lancer |
| **F** | Écrans : médiathèque (É-10) · tuile sectorielle OppCard · logos partenaires · filtres agenda Format/Lieu · notation/attestation · compteur de vues | à lancer |
| **G** | Bulle streaming Yaye (hauteur réservée) · gradient hex Notifications · code mort dashboard | à lancer |

**Lot B (plancher 11px, 83 occurrences / 42 fichiers)** : traité de façon opportuniste dans les fichiers touchés ; le gros (recruteur 20, conseiller 15) part avec les vagues de ces espaces.

## Règles de coordination (leçons des vagues 1-2)
- Agents en parallèle : périmètres de fichiers **disjoints**, et **jamais `git add -A`** — sinon un agent committe le travail en cours d'un autre.
- Tout commit `feat`/`fix` doit toucher un fichier de test (hook TDD).
- `npm run build | tail` masque un échec → capturer le code de sortie.
- jsdom ignore les styles inline `var()` → sentinelle fs.
- `:where()` obligatoire pour tout scope de sélecteur global (spécificité nulle).
- **Ne jamais conclure sur une lecture partielle de code** : monter le composant et compter (leçon É-15).

## Vérification de fin de vague
`npm run validate` par moi-même (jamais sur parole d'agent) + audit visuel multi-viewports + revue des diffs avant push.
