# Checklist code review TDD-compliance

À utiliser systématiquement avant d'approuver toute PR de feature/fix sur le Guichet.

## Vérifications systématiques

- [ ] La PR contient au moins 1 commit `test(...)` AVANT 1 commit `feat/fix(...)`
- [ ] Le commit test (RED) modifie uniquement les fichiers de tests :
  - `tests/**/*.test.ts(x)` ou `**/*.spec.ts(x)`
  - `e2e/**`, `__tests__/**`
  - **Pas** de fichiers `src/**` dans ce commit
- [ ] Si tests + source dans 1 seul commit → **REJET**, demander split via `git reset HEAD~1` + recommit séparé
- [ ] Les tests couvrent les chemins critiques :
  - happy path (au moins 1)
  - cas erreur (au moins 1)
  - cas limite / edge (au moins 1)
- [ ] Les tests utilisent `describe`/`it` lisibles : un humain comprend le comportement attendu sans lire l'implémentation
- [ ] `npm run validate` passe sur la branche (lint + tsc + tests)
- [ ] Couverture (Jest/Vitest) ne diminue pas sur les fichiers modifiés
- [ ] Pas de `console.log` résiduel
- [ ] Pas de `test.skip`, `xit`, `it.only`, `describe.only`, `fit`, `fdescribe`
- [ ] Pas de mention IA dans les commits (`Co-Authored-By`, `Generated with`, etc.)
- [ ] Auteur unique : `adiop-pixel` (les commits antérieurs au 2026-07-30 portent `mod-cjs`)
- [ ] Si fix de bug : un test reproduit le bug et échouait sans le fix (vérifier en checkout du commit RED)

## Anti-régressions par finding sécu critique

Pour les findings sécurité critiques, vérifier l'existence du test de garde correspondant :

- [ ] **GUIC-259 (sameSite)** — test dans `auth.test.ts` : `expect(cookie?.sameSite).toBe('lax')`
- [ ] **GUIC-240 (WhatsApp HMAC)** — test que `APP_SECRET` (et non `VERIFY_TOKEN`) est utilisé pour vérifier la signature webhook Meta
- [ ] **GUIC-241 (safeReturnTo + magic bytes)** — tests respectifs :
  - `safeReturnTo` : rejet des URLs externes / `javascript:` / `data:` / `//evil.com`
  - magic bytes : rejet des uploads dont les bytes ne correspondent pas au MIME déclaré
- [ ] **GUIC-242 (verify-hmac strict)** — test sur la longueur hex stricte (64 chars pour SHA-256) + rejet timing-attack via `timingSafeEqual`
- [ ] **GUIC-243 (webhooks SSO fail-closed)** — test du comportement Redis down : doit rejeter le webhook (fail-closed), pas le laisser passer (fail-open)

## Cas d'exception tolérés (skip TDD légitime)

Vérifier que le commit documente clairement l'exception :

- Hot-fix urgent prod : présence de `SKIP_TDD_CHECK=1` dans le message + ticket follow-up créé pour ajouter le test de non-régression
- Storybook stories `*.stories.tsx` : pas de logique métier
- Index re-export `export { X } from './x'` : pas de comportement
- Documentation pure (`.md`, `.agent_context/**`, mémoires) : pas de code à tester

Toute autre exception doit être validée explicitement par le lead avant merge.

## Action en cas d'échec

1. **Bloquer la PR** — ne pas approuver, demander changes.
2. **Pointer la règle violée** — référencer cette checklist + `feedback_tdd.md`.
3. **Demander correction** — split commits (RED puis GREEN) ou ajout des tests manquants.
4. **Re-review** après push de la correction.

Référence : `~/.claude/projects/-Users-macbook-Desktop-cjs-guichet/memory/feedback_tdd.md` (mémoire globale lead).
