# Supervision de disponibilité — sonde externe (GUIC-575)

> **Le monitoring interne meurt avec le serveur.** Netdata (GUIC-545) et Grafana (GUIC-544)
> tournent **sur** la machine qu'ils supervisent. Panne matérielle, saturation disque, noyau,
> coupure réseau OVH : ils tombent **avec** elle, et personne n'est prévenu.
>
> Le risque assumé rend ça décisif : **une seule machine porte le SSO, le BRM et le Guichet**. Sa
> chute est un incident total — et c'est exactement le moment où la supervision interne est muette.

## La règle qui commande tout : indépendance du chemin d'alerte

Le ticket l'exige noir sur blanc — *« l'alerte arrive même si le serveur est totalement
injoignable »* et *« aucune dépendance au serveur supervisé »*.

**Conséquence directe, et contre-intuitive : l'alerte ne doit JAMAIS transiter par notre serveur.**

Un webhook qui pointerait vers une route du Guichet pour relayer vers WhatsApp serait
**auto-annulant** : le scénario qu'on surveille (serveur à terre) est précisément celui où ce
relais est mort. On aurait une supervision qui fonctionne parfaitement… sauf quand elle sert.

C'est la faute de conception la plus fréquente sur ce type de dispositif. Elle ne se voit jamais
en test — seulement le jour de la panne.

## Le service retenu : UptimeRobot (offre gratuite)

| Critère | Pourquoi |
|---|---|
| **Hors de notre infrastructure** | Condition non négociable (voir ci-dessus). |
| 50 sondes, intervalle 5 min | Couvre le critère « alerte en moins de 5 minutes ». |
| Surveillance TLS incluse | Le ticket la demande ; native, rien à écrire. |
| Alerte e-mail native | Chemin **totalement** indépendant de notre serveur. |
| Webhooks | Ouvre la voie WhatsApp — avec la réserve ci-dessous. |

**Aucune donnée personnelle ne sort** : la sonde ne fait que demander une URL. C'est ce qui
distingue ce choix de Sentry ou Datadog, écartés pour la contrainte CDP (cf. GUIC-544).

## Les trois sondes à créer

| # | Cible | Attendu | Pourquoi celle-là |
|---|---|---|---|
| 1 | `https://guichet.<domaine>/api/health` | **200** | Vérifie l'app **et** ses dépendances : la route teste MariaDB et Redis, et renvoie **503** si l'une manque. Un 503 est donc une alerte légitime, pas un faux positif. |
| 2 | `https://guichet.<domaine>/` | **200** + mot-clé attendu dans la page | Une application peut répondre 200 sur `/api/health` **et** servir une page blanche aux utilisateurs. Le mot-clé (ex. « Guichet ») est ce qui distingue « le serveur répond » de « le site marche ». |
| 3 | Certificat TLS du domaine | Alerte à **J-14** | Un certificat expiré rend le site inaccessible à tous, d'un coup, sans aucune panne serveur. |

Intervalle : **5 minutes** pour les deux premières.

## Canal d'alerte — ce qui est possible, et ce qui ne l'est pas

**E-mail : satisfait les trois critères d'acceptation.** UptimeRobot l'envoie par sa propre
infrastructure, sans jamais toucher notre serveur. C'est le socle, à activer en premier.

**WhatsApp : possible, mais pas n'importe comment.** Meta Cloud API exige un en-tête
`Authorization: Bearer <token>` et un corps JSON spécifique — que le webhook gratuit
d'UptimeRobot ne sait pas produire. Trois voies, par ordre de préférence :

1. **Relais hébergé hors de notre serveur** (Cloudflare Worker, offre gratuite) : il reçoit le
   webhook UptimeRobot et le retraduit pour Meta. Indépendance préservée, coût nul.
2. **UptimeRobot Pro** — en-têtes et corps personnalisés, donc appel direct à Meta.
3. ~~Relais sur notre serveur~~ — **exclu** : viole le critère « aucune dépendance au serveur
   supervisé ».

> **Décision produit à confirmer.** Le choix retenu est « WhatsApp **et** e-mail sur tout ». La
> réserve du ticket GUIC-576 reste valable — *« le bruit tue le signal »* : deux canaux pour
> chaque avertissement finissent par n'être lus sur aucun. Une piste sans recâblage : préfixer le
> message par sa sévérité, pour pouvoir filtrer plus tard.

## Vérifier — les deux tests qui ferment le ticket

Aucun des deux ne peut être fait depuis le dépôt : ils exigent le service réel.

**Test 1 — arrêt volontaire (staging).**

```bash
docker compose -f docker-compose.prod.yml --env-file /etc/guichet/prod.env stop app
```
→ l'alerte doit arriver **en moins de 5 minutes**. Puis `start`, et vérifier l'alerte de
rétablissement.

**Test 2 — le serveur totalement injoignable.** C'est celui qui compte, et le seul qui prouve
l'indépendance du chemin d'alerte. Bloquer le trafic entrant (règle pare-feu OVH, ou arrêt de
l'interface) et vérifier que l'alerte **arrive quand même**.

⚠️ **À faire sur staging, jamais en production**, et en prévenant : sur cette machine, couper le
réseau coupe **aussi le SSO et le BRM**.

Un dispositif qui passe le test 1 mais échoue au test 2 donne une **fausse sécurité** — il ne
protège que des pannes applicatives, pas de la chute machine qui justifie ce ticket.

## Ce que ce document ne peut pas faire

Créer le compte, les sondes et les alertes est une opération **hors dépôt** (SaaS). Ce ticket ne
peut donc **pas** être clos par une PR : il l'est quand les **deux tests ci-dessus ont été passés**
sur le serveur réel.

Reste également à confirmer : le nom de domaine définitif et le mot-clé à chercher en page
d'accueil.

## Constat annexe — hors périmètre, à arbitrer

`/api/health` est **public et non authentifié** (il n'est pas dans `PROTECTED`, cf.
`src/middleware.ts`), et il interroge MariaDB **et** Redis à chaque appel. Deux conséquences
mineures mais réelles :

- il divulgue l'état interne (`checks.db`, `checks.redis`) à qui le demande ;
- il offre un levier de charge : chaque requête déclenche deux accès aux dépendances.

À l'échelle d'une sonde toutes les 5 minutes, c'est sans effet. Ce n'est signalé ici que parce
que l'endpoint devient une cible publiquement documentée. Piste, si on décide d'y toucher :
garder le **code de statut** public (200/503 suffit à une sonde, qui ne lit pas le corps) et
réserver le **détail** au réseau interne.

**Tracé en GUIC-624.** Non fait ici — hors périmètre, et l'endpoint a **trois consommateurs** :
la sonde externe, le healthcheck du conteneur, et le smoke test de `deploy.sh` **qui déclenche le
rollback automatique**. Casser l'un des deux derniers casserait le déploiement lui-même.
