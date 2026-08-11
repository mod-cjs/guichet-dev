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

## Alerting — pas encore branché, décision à prendre

Contrairement à Loki/Grafana (vérifié en exécution réelle jusqu'à réception d'une alerte —
`docs/supervision-disponibilite.md`), la notification automatique n'est pas fonctionnelle.
Deux options :

1. **Module e-mail natif de Netdata** — écarté par le constat ci-dessus, sauf à installer et
   configurer un MTA dans le conteneur (complexité supplémentaire, chemin d'alerte non éprouvé).
2. **Exposer les métriques à Grafana** (endpoint Prometheus natif de Netdata,
   `/api/v1/allmetrics?format=prometheus`) pour réutiliser le canal d'astreinte déjà testé
   (SMTP, `infra/observabilite/grafana/provisioning/alerting/contact-points.yml`).

Option 2 devient la voie recommandée après ce constat — un seul canal d'astreinte à maintenir,
plutôt que déboguer un MTA dans un conteneur pour un chemin d'alerte qui resterait non éprouvé.
Pas encore fait : ajouter une source de données Prometheus à Grafana.
