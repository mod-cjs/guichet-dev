# Tests E2E Playwright

Guide d'exécution des tests end-to-end du Guichet Jeunesse.

## Stack

- **Runner** : [Playwright](https://playwright.dev/) (`@playwright/test`)
- **Browsers** : Chromium + Pixel 5 (mobile)
- **Config** : `playwright.config.ts` (à la racine)
- **Tests** : `tests/e2e/*.spec.ts`
- **Fixtures** : `tests/e2e/fixtures/`

## Installation locale

```bash
npm install                       # déjà fait si npm ci a été lancé
npx playwright install chromium   # télécharge le binaire Chromium (~150 MB)
```

WebKit et Firefox sont **optionnels** ; les ajouter uniquement si l'on veut
tester ces moteurs (`npx playwright install webkit firefox`).

## Commandes principales

| Commande | Description |
|----------|-------------|
| `npm run test:e2e` | Tous les tests E2E en mode headless |
| `npm run test:e2e:ui` | Mode UI Playwright (debug visuel) |
| `npx playwright test tests/e2e/sso-flow.spec.ts` | Un seul fichier |
| `npx playwright test --headed` | Voir le navigateur s'ouvrir |
| `npx playwright show-report` | Ouvrir le dernier rapport HTML |

## Tests inclus

### `auth-flow.spec.ts`

Couvre :
- Routes publiques (accueil, opportunités, agenda…) accessibles sans auth
- Protection des routes (`/jeune/*`, `/admin/*`, `/recruteur/*`)
- Cookie `auth_return_to` posé lors de la redirection
- Callback avec state invalide → `?error=invalid_state`
- Flux PKCE complet (gaté sur `PLAYWRIGHT_SSO_MOCK=1`)
- Session révoquée (backchannel logout)

### `sso-flow.spec.ts` (GUIC-347)

Anti-régression du bug **GUIC-259** (cookie `cjs_session` repassé en
`sameSite=Strict` cassait la redirection post-callback SSO et provoquait
une boucle login). Couvre :

1. login → callback → `/jeune/tableau-de-bord` (PAS de boucle)
2. cookie `cjs_session` est `sameSite=Lax` (garde-fou GUIC-259)
3. déconnexion supprime le cookie `cjs_session`
4. session expirée redirige sur `/auth/connexion`

Les tests 1, 2 et 3 sont **gatés** sur `PLAYWRIGHT_SSO_MOCK=1` car ils
requièrent un serveur SSO mock + DB Prisma + Redis. Le test 4 tourne
sans dépendance externe.

## Lancer le flow SSO complet en local

Le callback SSO appelle réellement `/oauth/token` et `/oauth/userinfo`,
fait un `prisma.utilisateur.upsert` et stocke les tokens en Redis. Pour
que ces tests passent :

1. **DB locale** prête (`docker compose up -d` ou MariaDB locale) avec
   `DATABASE_URL` configuré dans `.env.local`.
2. **Redis local** prêt (port 6379 par défaut) — `REDIS_URL` configuré.
3. **Serveur SSO mock** disponible — le fichier
   `tests/e2e/fixtures/mock-sso.ts` exporte `startMockSsoServer()` qui
   écoute par défaut sur `127.0.0.1:19999`.
4. **Variables d'env** au moment du `npm run dev` ET de Playwright :

```bash
export SSO_BASE_URL=http://127.0.0.1:19999
export NEXTAUTH_URL=http://localhost:3000
export PLAYWRIGHT_SSO_MOCK=1

# Démarrer Next.js avec ces variables
npm run dev

# Dans un autre terminal, lancer les tests
npm run test:e2e -- tests/e2e/sso-flow.spec.ts
```

Le `beforeAll` du test démarre/arrête automatiquement le mock SSO sur
le port 19999.

## Anti-régression GUIC-259 — important

Le test **« cookie cjs_session a sameSite=Lax »** est un **garde-fou**.
Si quelqu'un repasse `cjs_session` en `Strict` (par exemple lors d'un
hardening sécurité naïf), ce test échoue immédiatement.

Historique :
- **GUIC-18** (2026-05-14) : `cjs_session` posé en `Lax` pour
  compatibilité avec le flow OAuth (le callback SSO est cross-site
  initiator).
- **GUIC-218** (2026-06-03) : Wave 6 sécu CDP, par excès de zèle, a
  repassé `cjs_session` en `Strict` → boucle login en prod.
- **GUIC-259** (2026-06-08) : retour à `Lax`.
- **GUIC-347** (ce ticket) : test E2E qui aurait catché GUIC-218
  immédiatement.

**Ne jamais silencer ce test** sans avoir lu et compris le commit
`e0f6f51`.

## CI

À ce jour Playwright n'est **pas** intégré dans la CI GitHub Actions.
Les tests tournent en local et lors des PR de release.

TODO (post-GUIC-347) :
- Ajouter un workflow `.github/workflows/e2e.yml` qui lance Playwright
  après les tests unit/integration.
- Provisionner DB + Redis éphémères (services Docker) dans la pipeline.
- Stocker le rapport HTML en artefact.

## Configuration avancée

- **`baseURL`** : `PLAYWRIGHT_BASE_URL` (défaut `http://localhost:3000`).
  Permet de tester contre staging : `PLAYWRIGHT_BASE_URL=https://staging.guichet.cjs.sn npm run test:e2e`.
- **`webServer`** : Playwright lance automatiquement `npm run dev` si
  aucun serveur n'écoute sur le port 3000 (`reuseExistingServer: !CI`).
- **`trace`** : `on-first-retry` — la trace est enregistrée seulement
  si un test échoue puis est rejoué.

## Dépannage

| Symptôme | Cause probable | Fix |
|----------|----------------|-----|
| `Error: browserType.launch: Executable doesn't exist` | Chromium non installé | `npx playwright install chromium` |
| `waitForURL` timeout sur `/jeune/...` | Mock SSO non démarré ou `SSO_BASE_URL` non configuré côté Next | `export SSO_BASE_URL=http://127.0.0.1:19999` |
| `cjs_session` cookie absent après callback | DB ou Redis indisponible côté Next.js | Démarrer DB + Redis, vérifier `.env.local` |
| Test 2 échoue avec `expect(sameSite).toBe('Lax')` | `src/lib/auth.ts` `setSessionCookie` est en `Strict` | **Régression GUIC-259** — repasser en `Lax` |
