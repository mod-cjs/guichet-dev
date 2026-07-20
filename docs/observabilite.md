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

## 3 bis. Réponses 5xx retournées sans exception (GUIC-574)

`onRequestError` (§2) ne voit que les erreurs **levées**. Un `return NextResponse.json(…,
{ status: 500 })` dans un `catch` ne lève pas : il était **invisible**. Le proxy comptait bien le
statut — l'incident était donc détecté — mais **sans la cause** : impossible à diagnostiquer.

Pire cas rencontré : un `catch { }` qui jetait l'erreur **sans même la lier**. Un MinIO
injoignable, un bucket absent et une clé invalide produisaient le même 502 muet.

**`erreurServeur()` rend le log inséparable de la réponse** — on ne peut plus renvoyer un 5xx
muet :

```ts
import { erreurServeur } from '@/lib/observability/erreur-serveur'

} catch (err) {
  return erreurServeur({
    code:   'UPLOAD_FAILED',
    status: 502,                  // défaut 500 ; refuse tout statut hors 5xx
    cause:  err,                  // → LOG uniquement, jamais au client
    route:  '/api/…',             // identifiants neutralisés avant journalisation
  })
}
```

Deux règles portées par le helper :

- **La cause va au log, jamais au client.** Une chaîne comme `connect ECONNREFUSED 10.0.0.5:3306
  — user guichet` renseigne un attaquant sur la topologie interne. Le client reçoit un message
  générique.
- **Refus de tout statut hors 5xx.** L'employer pour un 4xx rendrait le taux d'erreur
  ininterprétable : un 404 ou un 403 est un fonctionnement normal, pas un incident.

**Ce qu'on ne convertit PAS** : les `501 NOT_IMPLEMENTED` (stubs délibérés — `POST /api/centres`,
`/api/evenements`, `/api/ressources`) et `/api/ia`, déjà tracé par `logAgentEvent`. Les compter
comme des pannes fausserait le signal.

## 4. CDP — règles strictes

- **Jamais de PII brute** dans les logs : les `cjs_uid` passent par `hashId` (SHA tronqué).
- La capture d'erreur **ne journalise pas** les en-têtes bruts (cookies, `Authorization`), ni le
  corps de requête.
- Les logs restent **auto-hébergés** (Loki, pas de service étranger — cf. contrainte CDP GUIC-544).

## 5. Agrégation, recherche et rétention — Loki + Grafana (GUIC-544)

**Auto-hébergé, et c'est une décision, pas un défaut.** Sentry, Datadog et Grafana Cloud sont des
services **étrangers** : y envoyer nos logs, même pseudonymisés, constituerait un transfert de
données hors du Sénégal pour une plateforme soumise à la CDP (22 000 jeunes).

```bash
docker compose -f docker-compose.observabilite.yml --env-file /etc/guichet/prod.env up -d
```

Trois services, **aucun port public** — Grafana n'écoute que sur la boucle locale :

```bash
ssh -L 3000:127.0.0.1:3000 <serveur>   # puis http://localhost:3000
```

`GRAFANA_ADMIN_PASSWORD` est **obligatoire** dans `/etc/guichet/prod.env` : le service refuse de
démarrer sans, plutôt que de tourner avec le mot de passe `admin` bien connu.

### Répondre à « que s'est-il passé pour cette requête ? »

Le `requestId` relie l'application **et** le proxy. En une seule recherche :

```logql
{job=~"guichet-app|nginx-proxy"} |= "<requestId>"
```

Dans Grafana, le `requestId` est **cliquable** (champ dérivé) : depuis une ligne applicative, on
saute à toutes les lignes portant le même identifiant.

Taux d'erreur (ce que GUIC-574 a rendu calculable — avant, les 5xx retournés sans exception
étaient muets) :

```logql
sum(count_over_time({job="guichet-app"} | json | level="error" [5m]))
```

### Cardinalité — la règle qui protège l'index

**Un label = un flux.** Mettre `requestId` ou un `cjs_uid` en label créerait un flux par requête
et ferait exploser Loki. Seuls `job`, `level` et `statut` sont des labels ; tout le reste se
cherche par **filtre** (`|= "…"` ou `| json | champ="…"`), sans coût de cardinalité.

### Rétention — vérifiée, pas déclarée

**30 jours.** Le piège : `retention_period` **seul ne supprime rien**. C'est le `compactor`, avec
`retention_enabled: true`, qui exécute la suppression. Sans lui la rétention est déclarative —
donc fausse, et l'exigence CDP n'est pas tenue. Vérification sur l'instance :

```bash
curl -s http://loki:3100/config | grep -E 'retention_enabled|retention_period'
# retention_enabled: true / retention_period: 30d
```

Le disque est protégé aux **deux** bouts : plafonds d'ingestion côté Loki (un emballement
applicatif ne peut pas remplir le disque d'une machine qui porte aussi le SSO et le BRM) et
`max-size` sur le driver `json-file` de chaque conteneur.

### CDP — double filet

L'application scrube déjà (`hashId`, `scrubPath`, `scrubMessage`). Promtail rattrape en dernière
ligne ce qui aurait échappé — e-mails, téléphones E.164, IP dans les logs nginx. Deux filets
valent mieux qu'un : ce qui entre dans Loki y reste 30 jours.

## 6. Mise en service côté serveur (OVH / Plesk)

Deux configurations à poser sur la machine. **Une seule passe par Plesk** — et c'est celle qui
comporte un piège.

### a) Le secret Grafana — pas de Plesk, un simple fichier

```bash
openssl rand -base64 24                       # mot de passe solide
sudo sh -c 'echo "GRAFANA_ADMIN_PASSWORD=<mot-de-passe>" >> /etc/guichet/prod.env'
sudo chmod 600 /etc/guichet/prod.env
```

Sans cette variable, Grafana **refuse de démarrer** — voulu : mieux vaut un service absent qu'un
Grafana ouvert avec le mot de passe `admin` bien connu, donnant accès à 30 jours de logs.

### b) La corrélation nginx — Plesk, en DEUX endroits

⚠️ **Le piège :** `log_format` est une directive de contexte **`http`**. Or le champ « Directives
nginx additionnelles » de Plesk injecte dans le bloc **`server`**. Y coller le `log_format` fait
**échouer le rechargement de nginx**. D'où la séparation :

**1. Le format → fichier de contexte `http`** (Plesk le lit et ne l'écrase pas) :

```bash
sudo tee /etc/nginx/conf.d/guichet-log-format.conf > /dev/null <<'EOF'
log_format guichet '$remote_addr $request_method $uri $status '
                   '${request_time}s req=$request_id';
EOF
sudo nginx -t && sudo systemctl reload nginx
```

**2. L'usage → interface Plesk**, *Sites web & Domaines → `guichet.<domaine>` → Paramètres Apache
et nginx → **Directives nginx additionnelles*** :

```nginx
access_log /var/log/nginx/guichet.access.log guichet;
proxy_set_header X-Request-Id $request_id;
```

**Passer par l'interface, jamais par une édition manuelle du vhost** : Plesk régénère
`/var/www/vhosts/system/<domaine>/conf/nginx.conf` à chaque modification du domaine et écraserait
le fichier. Ce champ-là est persisté (`vhost_nginx.conf`).

### Vérifier — le même identifiant des deux côtés

```bash
nginx -v   # $request_id exige nginx >= 1.11

RID=$(curl -sI https://guichet.<domaine>/api/health | grep -i x-request-id | tr -d '\r' | awk '{print $2}')
grep "$RID" /var/log/nginx/guichet.access.log
```

Le `req=` doit apparaître **et** correspondre à l'en-tête renvoyé par l'application. S'il est vide
ou absent, les directives ne s'appliquent pas au bon `location` — celui qui fait le `proxy_pass`
vers `127.0.0.1:8080`.

**Sans cette étape, la moitié de la valeur de GUIC-544 est perdue** : Promtail collectera bien les
deux sources, mais rien ne reliera une ligne du proxy à une ligne applicative. La question « que
s'est-il passé pour cette requête ? » restera sans réponse.

## Modules

| Fichier | Rôle |
|---|---|
| `src/lib/observability/request-id.ts` | `resolveRequestId`, `isValidRequestId`, `REQUEST_ID_HEADER` |
| `src/lib/observability/error-capture.ts` | `captureRequestError` (appelé par `onRequestError`) |
| `src/lib/observability/access-log.ts` | `withObservability` (wrapper opt-in) |
| `instrumentation.ts` | hook `onRequestError` |
