# CURRENT_TASK — Vague 2 design v5 : espace jeune (épic GUIC-689)

**Branche** : `feature/GUIC-689-design-v5-vague2-jeune` — **empilée** sur `feature/GUIC-689-design-v5-vague1-public-auth` (PR #318), elle-même sur `feature/GUIC-690-design-v5-fondation-tokens` (PR #314).
Ordre de merge attendu : #314 → #318 → vague 2. Rebaser sur `dev` au fur et à mesure des merges.
**Worktree** : `.claude/worktrees/design-v5` (node_modules PROPRE — ne jamais re-symlinker).
**Serveur local** : `NEXTAUTH_URL=http://localhost:3211 PORT=3211 npm run start` (la session admin tient `:3000`).

## Périmètre
`src/app/jeune/**` (47 tsx) + composants `src/components/jeune/**`, `src/components/yaye/**`, `src/components/ui/Yaye/**`.
**EXCLU** : admin (session parallèle — `src/app/admin/**`, AdminSidebar, CentreCard/PartenaireCard/ThemeToggle, tokens `--gj-admin-*`) · composants centres Wave 7 figés.

## Flux (recette validée en vague 1)
1. Audit bidirectionnel, 3 agents sur périmètres disjoints (dashboard+profil · candidatures/favoris/inscriptions · Yaye/carte CJS/bibliothèque) — EN COURS.
2. Arbitrage : ÉCART-CODE → fix ; PROBLÈME-V5 / AMBIGUÏTÉ → registre `.agent_context/specs/design-v5-deviations.md`.
3. Stories TDD (RED → GREEN) déléguées à des agents Sonnet `nextjs-developer`, séquentielles sur la même branche, périmètres de fichiers explicitement bornés.
4. Pour chaque story : review perso + `npm run validate` relancé par moi + rendu Playwright avant push. Jamais de vert sur parole.
5. Audit visuel de fin de vague (captures multi-viewports) AVANT de clore.

## P1 de l'audit UX à traiter dans cette vague
- Dashboard bénéficiaire allégé : tuiles pictogrammes + règle « 3 textes max ».
- Détail d'offre visuel : bandeau sectoriel + prérequis en check-list ✓/✗ (reliquat vague 1).
- P2 : tuile sectorielle partout où une offre apparaît (reco, candidatures).

## Rappels durs
Magenta `--gj-action`/`.gj-cta` = conversion uniquement, une seule action pleine par écran · badges `--cat-*` déduits du libellé · rouge = urgence J-3 seule · vives/rose jamais sous texte blanc · zéro hex en dur · zéro gradient hors exceptions (wordmark/avatar Yaye, `--prog-*`) · ≥ 11px · ≥ 44px.
Règles Yaye non négociables : un seul point d'entrée IA permanent (le FAB) · aucune réponse sans ligne de sources · « animations réduites » coupe aussi les minuteries JS.
Pièges : le hook exige un fichier test dans tout commit feat · `npm run build | tail` masque un échec (capturer l'exit code) · jsdom ignore les styles inline `var()` (sentinelle fs) · `:where()` obligatoire pour tout scope de sélecteur global (spécificité nulle).
