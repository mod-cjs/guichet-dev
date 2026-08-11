# Index Ops — Guichet Jeunesse

> Point d'entrée unique : pour chaque tâche opérationnelle, où regarder. Ce document
> n'explique rien en détail — il pointe vers le document qui le fait, pour éviter que
> l'info se disperse en silence sur 8+ fichiers sans qu'on sache par où commencer
> (GUIC-700, trouvé en configurant réellement les sauvegardes/l'observabilité).

## Fichiers de secrets — la carte, à ne jamais confondre

Cause réelle d'un incident de cette phase : `GRAFANA_ADMIN_PASSWORD` documenté dans le
mauvais fichier (`/etc/guichet/prod.env` au lieu de `/etc/guichet/observabilite.env`) —
Grafana refusait de démarrer sans que la doc ne pointe vers la bonne cause.

| Fichier | Contient | Consommé par | Portée |
|---|---|---|---|
| `/etc/guichet/prod.env` | Secrets applicatifs **PROD** (DB, Redis, S3, SSO, LLM…) | `docker-compose.prod.yml` | Prod uniquement |
| `/etc/guichet/test.env` | Mêmes clés, valeurs **PRÉPROD** | `docker-compose.prod.yml` + `docker-compose.test.yml` combinés | Préprod uniquement |
| `/etc/guichet/observabilite.env` | Mot de passe admin Grafana, destinataires d'astreinte, SMTP | `docker-compose.observabilite.yml` | Partagé — pile à cycle de vie indépendant |
| `<checkout>/.env.etl` (ou `GUICHET_ETL_ENV_FILE`) | Secrets Meltano + connexion à l'entrepôt Postgres | `docker-compose.etl.yml` | Partagé |
| `/etc/guichet/cloudflared.env` | `CLOUDFLARE_TUNNEL_TOKEN` | `docker-compose.cloudflared.yml` | Accès Grafana/Netdata (GUIC-575) |
| Externe (Cloudflare Worker, hors dépôt) | Token Meta WhatsApp Cloud API | Relais d'astreinte (GUIC-575) | Sonde de disponibilité |

Gabarits versionnés (jamais de vraie valeur dedans) : `.env.etl.example`,
`.env.observabilite.example`, `.env.cloudflared.example`.

## Par tâche

### Déployer
- Préprod : `docs/deploiement-preprod.md` (ou `-refonte-v5.md` pour la branche v5)
- Mise en prod + rollback : `docs/runbook-production.md`
- Checklist des pièges avant/pendant go-live : `docs/go-live-checklist.md`

### Superviser / observer
- Logs applicatifs, `requestId`, Loki/Grafana, rétention CDP : `docs/observabilite.md`
- Dashboard Grafana : tunnel SSH (`ssh -L 3000:127.0.0.1:3000 <serveur>`), voir §5-6 de
  `docs/observabilite.md`
- Métriques machine (disque, mémoire, CPU) : `docs/netdata.md` — collecte prête, alerting pas encore vérifié
- Accéder aux dashboards sans tunnel SSH (Cloudflare Tunnel + Access) et protéger le domaine public (WAF) : `docs/cloudflare-acces-dashboards.md`
- Disponibilité indépendante du serveur (sonde externe, WhatsApp) : `docs/supervision-disponibilite.md`
- Règles d'alerte réelles (ce qui déclenche, quel seuil) : `infra/observabilite/grafana/provisioning/alerting/rules.yml`
- Canaux de contact (e-mail, webhook) : `infra/observabilite/grafana/provisioning/alerting/contact-points.yml`

### Sauvegarder / restaurer
- Stratégie, crontab, variables : `scripts/backup/README.md`
- Exercice de restauration : **obligatoire avant tout go-live** — un go-live sans exercice réussi est refusé

### Pipeline ETL / Data Hub
- Bout en bout, crontab, dépannage réel : `docs/datahub-briefing-etl.md`
- Spec + historique des bugs réels rencontrés en préprod : `.agent_context/specs/M13-durcissement-etl.md`

### Crons applicatifs (HTTP interne)
- Génération crontab, parité avec `vercel.json` : `scripts/cron/README.md` + `scripts/cron/jobs.json`

### Secrets
- Rotation après fuite : `docs/rotation-secrets-GUIC-625.md`
- Carte des fichiers en service : cette page, ci-dessus

### Architecture / décisions de mise en prod
- `.agent_context/specs/M14-mise-en-prod.md`

## Dette connue (au 2026-08-11) — ce qui n'est pas encore prêt

| Sujet | État | Ticket |
|---|---|---|
| SPF/DKIM/DMARC | Absent — le mail d'astreinte peut finir en spam | GUIC-577 |
| Copie hors-site des sauvegardes | Décision explicitement différée (destination pas encore choisie) — `BACKUP_OFFSITE_CMD` non défini, sans urgence tant qu'aucune échéance n'est fixée | GUIC-571 |
| Accès dashboards (Cloudflare Tunnel + Access) | **En attente — bloqué sur l'absence de domaine dédié.** Le tunnel côté Cloudflare est créé (jeton obtenu), mais la création des Public Hostnames exige une zone Cloudflare, et aucun domaine disponible n'est réellement inutilisé (`consortiumjeunessesenegal.org` et `guichetjeunesse.sn` portent tous deux du courrier Google Workspace actif — vérifié via `dig MX`). Décision : enregistrer un domaine dédié à l'ops, quand ce sera prioritaire. **Le tunnel SSH reste la voie d'accès en attendant.** | GUIC-575 |
| Protection WAF/anti-DDoS du domaine public | Marche à suivre documentée (`docs/cloudflare-acces-dashboards.md` §2) — nécessite une coordination sur le changement de nameservers (risque MX/e-mail), pas encore planifiée | GUIC-575 |
| Numéro WhatsApp d'astreinte | Pas encore disponible — bloque le canal webhook `contact-points.yml` (`ALERTE_WEBHOOK_URL`), même une fois le relais Cloudflare construit | GUIC-575 |
| Métriques machine (disque/mémoire) | Netdata jamais déployé — `rules.yml` lui délègue ces seuils, personne ne les surveille aujourd'hui. Compose prêt (`docs/netdata.md`), à déployer et vérifier en réel — alerting non branché. | GUIC-545 |
| Sonde externe de disponibilité | **Résolu pour la préprod** — UptimeRobot configuré et lié à l'URL préprod. Reste à dupliquer sur le domaine prod une fois celui-ci en service. | GUIC-575 |
| Contacts d'astreinte | **Partiel** — « Astreinte applicative » complétée (les deux mêmes adresses que les alertes Grafana : `odiallo@`/`adiop@consortiumjeunessesenegal.org`). Infra/Plesk, SSO et Décision métier restent vides — **toujours No-Go tant que ces 3 lignes ne sont pas complétées** (`docs/runbook-production.md` §7). | GUIC-159 |

Une entrée retirée de ce tableau doit l'être **parce qu'elle est réellement résolue et
vérifiée en réel**, pas parce que le code a été écrit — cohérent avec `docs/tests-robustesse.md`.
