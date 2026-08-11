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

## État — collecte prête, alerting PAS ENCORE VÉRIFIÉ

Contrairement à Loki/Grafana (vérifié en exécution réelle jusqu'à réception d'une alerte —
`docs/supervision-disponibilite.md`), ce déploiement donne la collecte et le tableau de bord,
**pas** une notification automatique testée. Deux options, à trancher puis vérifier en réel avant
de considérer ce point clos :

1. **Module e-mail natif de Netdata** (`health_alarm_notify.conf`) — nécessite un agent
   d'envoi (MTA) dans le conteneur ; à valider que l'image officielle le permet proprement.
2. **Exposer les métriques à Grafana** (endpoint Prometheus natif de Netdata,
   `/api/v1/allmetrics?format=prometheus`) pour réutiliser le canal d'astreinte déjà testé
   (SMTP, `infra/observabilite/grafana/provisioning/alerting/contact-points.yml`) plutôt que
   construire un second chemin d'alerte non éprouvé.

L'option 2 est la plus cohérente avec le reste de la pile (un seul canal d'astreinte à
maintenir) mais suppose d'ajouter une source de données Prometheus à Grafana — pas encore fait.
