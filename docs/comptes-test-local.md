# Comptes de test en local

Le Guichet n'a **aucun login local** : l'authentification passe uniquement par le
SSO CJS. Quand le SSO n'est pas branché sur le build local, la route
`/api/dev/login` pose une session `cjs_session` directement.

Elle est gardée par `devLoginAutorise` (`src/lib/security/prod-guards.ts`) et
exige **deux** variables délibérées — toute configuration incomplète renvoie
404 :

```bash
APP_ENV=local ALLOW_DEV_LOGIN=true \
JWT_CJS_CARD_SECRET=<secret-local-32-caracteres> \
NEXTAUTH_URL=http://localhost:3211 PORT=3211 npm run start
```

`JWT_CJS_CARD_SECRET` n'est pas lié au login : sans lui, `/jeune/ma-carte`
affiche une erreur de génération du QR (le code refuse de signer avec un
secret par défaut — comportement voulu).

## Usage

```
http://localhost:3211/api/dev/login?uid=<cjs_uid>&to=<route>
```

Les rôles de la session sont dérivés de `utilisateurs.role` (GUIC-689) — les
mêmes chaînes que les claims SSO `cjs_roles`. Un rôle inconnu retombe sur
`beneficiaire` : le dev-login n'accorde jamais un privilège qu'il n'a pas su
reconnaître.

## Comptes

### Espace jeune

| `uid` | Nom | Intérêt |
|---|---|---|
| `009ac325-d7e6-488b-890e-fc13bfb1d7e0` | Mamadou Ndilane | 2 candidatures — parcours nominal |
| `00a11efb-fc18-4cf7-a2b8-fb2d32004831` | Oumar Diallo | 2 candidatures |
| `00bf3a9a-d06d-454b-ba5b-c339b8822241` | Amadou Toure | 2 candidatures |
| `00026bfe-3402-4dfe-b00e-f6b2ec77952c` | Abdoulaye Barry | 2 candidatures |
| `e2e-jeune` | Awa Ndiaye | **0 candidature** — états vides |
| `e2e-j2incomplet` | E2E j2incomplet | profil incomplet — parcours de blocage candidature |
| `e2e-jeune-onb` | Sow Sow | onboarding non terminé |

### Espace conseiller

| `uid` | Nom | Intérêt |
|---|---|---|
| `e2e-conseiller` | Sokhna Diop | rattachée à un centre — espace complet |
| `e2e-conseiller-norat` | Aïda Sarr | **sans rattachement** — écran d'attente (décision D1) |

### Espace recruteur

| `uid` | Nom | Intérêt |
|---|---|---|
| `e2e-recruteur` | Bineta Fall | organisation vérifiée — espace complet |
| `e2e-recruteur-noorg` | Oumar Kane | **sans organisation** — chemin de refus |

### Exemples

```bash
# Profil jeune
open "http://localhost:3211/api/dev/login?uid=009ac325-d7e6-488b-890e-fc13bfb1d7e0&to=/jeune/mon-profil"

# Espace conseiller
open "http://localhost:3211/api/dev/login?uid=e2e-conseiller&to=/conseiller"

# Espace recruteur
open "http://localhost:3211/api/dev/login?uid=e2e-recruteur&to=/recruteur/tableau-de-bord"

# États vides
open "http://localhost:3211/api/dev/login?uid=e2e-jeune&to=/jeune/mes-candidatures"
```

## Pièges rencontrés

- **Redirection vers `/auth/connexion` alors que la session vient d'être posée** :
  des clés de révocation périmées traînent dans Redis (`isSessionActive` renvoie
  faux). Purge :
  ```bash
  docker exec guichet_redis sh -c \
    "redis-cli --scan --pattern '*session:revoked:*' | xargs -r redis-cli DEL"
  ```
- **Playwright** : naviguer directement sur `/api/dev/login?...&to=...` plutôt que
  d'injecter le cookie (il porte `Secure`).
- Deux bases locales coexistent (`guichet_jeunesse`, `guichet_push`) — vérifier
  celle que pointe `DATABASE_URL` avant de conclure qu'un compte est absent.
