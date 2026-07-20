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

---

# Alerting et astreinte (GUIC-576)

*« Un tableau de bord que personne ne regarde à 3 h du matin ne sert à rien : la supervision sans
alerte est décorative. »*

## Deux dispositifs, aucun ne remplace l'autre

| Situation | Qui alerte | Pourquoi |
|---|---|---|
| **Serveur à terre** | Sonde externe UptimeRobot | Grafana meurt avec la machine — il ne peut pas alerter sur sa propre mort. |
| **Serveur debout, dégradé** | Grafana | Il voit les logs, donc les 5xx, les échecs de sauvegarde et de tâches. |

C'est la répartition qui compte : brancher les deux sur le même outil laisserait un angle mort
exactement là où l'incident est le plus grave.

## Sévérité — ce qui réveille, et ce qui attend

| Règle | Sévérité | Seuil | Fenêtre |
|---|---|---|---|
| Taux de 5xx élevé | **alerte** | > 5 % | 5 min de persistance |
| Taux de 5xx en hausse | avertissement | > 1 % | 15 min |
| Échec de sauvegarde | **alerte** | ≥ 1 | immédiat |
| Aucune sauvegarde depuis 26 h | **alerte** | absence | immédiat |
| Échecs répétés d'une tâche planifiée | avertissement | ≥ 3 / h | immédiat |

**Alerte** : répétée toutes les heures tant que ce n'est pas résolu — une alerte vue à 3 h et
rendormie ne doit pas disparaître. **Avertissement** : cadence lente (12 h), ce sont des tendances.

La règle *« aucune sauvegarde depuis 26 h »* mérite une mention : c'est la seule qui couvre une
panne **silencieuse**. La sauvegarde ne plante pas — elle ne tourne plus (crontab perdue, disque
plein, machine redémarrée). Rien n'échoue, donc rien n'alerterait. On le découvrirait le jour où
l'on a besoin de restaurer.

**Non couvert ici, volontairement** : saturation disque et mémoire relèvent de **Netdata**
(GUIC-545) — ce sont des métriques machine, absentes des logs. Écrire ces règles dans Grafana
aurait produit des alertes qui ne se déclenchent jamais.

## Canaux

**WhatsApp + e-mail pour tout**, ALERTE comme AVERTISSEMENT (décision retenue).

Réserve consignée, car le ticket la soulève : *« le bruit tue le signal »*. Le dispositif reste
**scindable sans recâblage** — chaque alerte porte un label `severite`, le titre en est préfixé,
et les cadences sont déjà différenciées. Router les avertissements vers l'e-mail seul = une ligne
à changer.

⚠️ **L'e-mail dépend de GUIC-577** (SPF/DKIM/DMARC). Sans ces enregistrements DNS, les alertes
partent en spam : tout fonctionne, et personne ne reçoit rien.

## Mise en service

Dans `/etc/guichet/prod.env` :

```bash
ALERTE_EMAILS=prenom@consortiumjeunessesenegal.org,autre@…   # obligatoire
ALERTE_WEBHOOK_URL=https://<relais-externe>/alerte            # WhatsApp (optionnel)
ALERTE_WEBHOOK_TOKEN=<secret partagé avec le relais>
```

`ALERTE_EMAILS` est **obligatoire** : Grafana refuse de démarrer sans. Un canal d'alerte vide est
pire qu'absent — on croit être couvert.

Le relais WhatsApp vit **hors du serveur** (Cloudflare Worker) et sert **aussi** la sonde externe :
un seul relais, deux usages, et il survit à la chute de la machine.

## Vérifié en exécution

Pile réellement démarrée, pas seulement relue :

- **5 règles chargées, 5 en `health: ok`** ;
- une ligne d'échec injectée dans Loki → règle **`firing`** → routée vers le contact `astreinte` ;
- routage par sévérité confirmé (`severite="alerte"` → 1 h, `severite="avertissement"` → 12 h).

**Trois bugs que seul ce test a révélés**, et qui auraient tous produit une supervision
silencieusement morte :

1. **Source de données sans UID explicite** → les 5 règles échouaient en « data source not found »,
   en restant affichées `inactive`. On aurait cru être supervisé sans qu'aucune alerte ne parte.
2. **Variables d'environnement absentes du conteneur** — les exporter dans le shell ne suffit pas :
   Grafana refusait le point de contact e-mail.
3. **`clamp_min` n'existe pas en LogQL** → les deux règles de taux 5xx en erreur de syntaxe.

## Ce qui reste à faire — le ticket n'est pas clos

Son critère d'acceptation est *« chaque seuil déclenche une alerte réellement reçue par une
personne identifiée (testé) »*. Il manque :

- le **relais WhatsApp** (hors dépôt) et **GUIC-577** pour un e-mail fiable ;
- un **test de bout en bout par seuil**, sur le serveur, jusqu'à réception ;
- le **tableau d'astreinte et le chemin d'escalade** — à arbitrer, puis à reporter dans le runbook
  (`docs/runbook-production.md` §7, aujourd'hui vide et marqué No-Go).
