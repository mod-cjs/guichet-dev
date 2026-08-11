# Netdata — métriques machine (GUIC-545)

Complète Loki/Grafana (`docs/observabilite.md`), qui ne voit que les **logs** — la saturation
disque ou mémoire n'apparaît dans aucun log, donc n'était surveillée par **rien**. `rules.yml`
délègue explicitement ces seuils à Netdata ; sans ce déploiement, le délégué n'existait nulle
part, angle mort réel sur un serveur mutualisé (SSO + BRM + Guichet).

## Démarrer

```bash
docker compose -f docker-compose.netdata.yml up -d
```

Aucun port public — même principe que Grafana : accès au tableau de bord par tunnel SSH.

```bash
ssh -L 19999:127.0.0.1:19999 <serveur>   # puis http://localhost:19999
```

`network_mode: host` est nécessaire pour que Netdata voie les vraies interfaces/disques de
l'hôte (pas la vue isolée d'un conteneur) — la contrepartie est `infra/netdata/netdata.conf`
(`bind to = 127.0.0.1:19999`), sans quoi ce mode exposerait le tableau de bord publiquement.

## État réel — déployé en préprod (2026-08-11)

Netdata tourne, `/api/v1/info` répond, les métriques HÔTE (CPU, disque, mémoire, réseau) sont
collectées. Deux constats du premier déploiement réel :

- **`seccomp:unconfined` nécessaire** (déjà dans `docker-compose.netdata.yml`) — sans lui,
  Netdata échoue à lire les répertoires cgroup v1 (`cannot open directory ... Permission
  denied`, malgré des répertoires world-readable et `SYS_ADMIN`/`SYS_PTRACE` déjà accordés :
  le profil seccomp par défaut de Docker bloque certains appels de la découverte cgroup,
  indépendamment des permissions Unix). Sans ce correctif, seules les métriques globales de
  l'hôte remontent, pas la répartition par conteneur.
- **Le module e-mail natif ne fonctionne PAS tel quel** — confirmé en exécution réelle :
  `sendmail: account default not found: no configuration file available` (code 78). L'image
  officielle n'embarque pas d'agent d'envoi configuré.

## Alerting — voie retenue : Prometheus → Grafana

Le module e-mail natif de Netdata est écarté (constat ci-dessus). Voie retenue : un serveur
**Prometheus** racle Netdata (`infra/netdata/prometheus.yml`), Grafana l'interroge en PromQL et
alerte par le canal déjà testé (SMTP, `contact-points.yml`) — un seul chemin d'astreinte à
maintenir, pas un second non éprouvé.

```bash
docker compose -f docker-compose.netdata.yml up -d   # inclut désormais prometheus
```

Prometheus tourne en `network_mode: host` comme Netdata (`127.0.0.1:9090`, jamais public) — il
racle Netdata en `127.0.0.1:19999` directement. Grafana, sur son réseau bridge séparé, le joint
via `host.docker.internal:9090` (même mécanisme que `backup.sh` pour MariaDB) — nécessite
`extra_hosts: host.docker.internal:host-gateway` sur le service `grafana`
(`docker-compose.observabilite.yml`), déjà ajouté. Source de données provisionnée avec un **UID
explicite** (`infra/observabilite/grafana/provisioning/datasources/prometheus.yml`) — la leçon
de GUIC-576 (Loki) : sans lui, toute règle qui la référence échoue silencieusement.

**Pas encore fait** : les règles d'alerte disque/mémoire dans `rules.yml`. Volontairement pas
écrites tant que les noms exacts des métriques Prometheus exposées par cette version de Netdata
n'ont pas été vérifiés en réel (`curl http://127.0.0.1:19999/api/v1/allmetrics?format=prometheus`)
— écrire des règles contre des noms devinés reproduirait le bug déjà corrigé sur l'alerting ETL
(régex qui ne matchait jamais le vocabulaire réel).
