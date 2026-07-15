# Observabilité — socle applicatif (GUIC-578)

Prérequis de Netdata (GUIC-545), Loki/Grafana (GUIC-544) et l'alerting (GUIC-576) : sans ces
signaux, il n'y a presque rien à superviser. Ce socle fournit **corrélation, capture d'erreurs et
logs structurés**.

## 1. Corrélation — `requestId`

Un identifiant relie tous les logs d'une même requête, à travers l'app ET le reverse proxy.

- **Source de vérité : le reverse proxy** (nginx/Plesk) génère `X-Request-Id` et le transmet à
  l'app. À défaut (dev, ou proxy non configuré), `resolveRequestId()` en génère un.
- Config nginx recommandée (le proxy pose l'en-tête ET le journalise) :

```nginx
# génère un id s'il n'y en a pas, le transmet à l'app
proxy_set_header X-Request-Id $request_id;
# format de log d'accès incluant l'id + latence (correle avec les logs applicatifs)
log_format guichet '$remote_addr $request_method $uri $status '
                   '${request_time}s req=$request_id';
access_log /var/log/nginx/guichet.access.log guichet;
```

- Un `X-Request-Id` **entrant aberrant** (espaces, ponctuation, trop long) est **rejeté et
  régénéré** — anti-injection de log.

## 2. Capture centrale des erreurs — automatique, toutes les routes

`instrumentation.ts` → hook `onRequestError` de Next : **toute** erreur non gérée (500) produit
UNE entrée de log structurée (`level=error`, message, trace bornée, route, méthode, requestId).
Aucune modification de route nécessaire — c'est global.

Avant ce socle, **une 500 n'était journalisée nulle part de façon fiable**. Désormais, Grafana
filtre sur `level=error` pour le taux d'erreur.

## 3. Log d'accès

- **Global (statut + latence, toutes requêtes) : le proxy.** C'est sa fonction native ; on ne
  wrappe pas les centaines de routes.
- **Applicatif (opt-in) : `withObservability(handler)`** pour les routes où l'on veut une ligne
  d'accès enrichie du contexte applicatif (uid haché, etc.) :

```ts
import { withObservability } from '@/lib/observability/access-log'

export const POST = withObservability(
  async (request) => { /* ... */ },
  { cjsUid: (req) => getSessionUid(req) }, // sera HACHÉ (jamais brut)
)
```

Statut, latence, requestId sont journalisés ; le requestId est renvoyé en en-tête de réponse.

## 4. CDP — règles strictes

- **Jamais de PII brute** dans les logs : les `cjs_uid` passent par `hashId` (SHA tronqué).
- La capture d'erreur **ne journalise pas** les en-têtes bruts (cookies, `Authorization`), ni le
  corps de requête.
- Les logs restent **auto-hébergés** (Loki, pas de service étranger — cf. contrainte CDP GUIC-544).

## Modules

| Fichier | Rôle |
|---|---|
| `src/lib/observability/request-id.ts` | `resolveRequestId`, `isValidRequestId`, `REQUEST_ID_HEADER` |
| `src/lib/observability/error-capture.ts` | `captureRequestError` (appelé par `onRequestError`) |
| `src/lib/observability/access-log.ts` | `withObservability` (wrapper opt-in) |
| `instrumentation.ts` | hook `onRequestError` |
