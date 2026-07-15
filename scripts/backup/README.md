# Sauvegardes — OVH (GUIC-571)

> « Une sauvegarde jamais restaurée n'est pas une sauvegarde. »

Sauvegarde **MariaDB** (le métier) et **MinIO** (CV/justificatifs = données personnelles), avec
**exercice de restauration** obligatoire avant le go-live et périodique ensuite. Neo4j (vue
dérivée de MariaDB) et Redis (cache) ne sont pas sauvegardés.

## Pièces

| Fichier | Rôle |
|---|---|
| `backup.sh` | Dump MariaDB (`mariadb-dump` dans un conteneur sur le réseau, via `host.docker.internal`) + miroir MinIO (`mc mirror`) → `BACKUP_DIR`, rétention, copie hors-site optionnelle. |
| `restore-drill.sh` | Restaure le dernier dump dans une base **jetable** (`guichet_restore_drill_*`, jamais la prod), vérifie qu'elle contient des tables, puis la supprime. |

## Cohérence F2

Comme l'app et les migrations (GUIC-564), les sauvegardes joignent MariaDB **depuis un conteneur
sur le réseau du Guichet**, avec `host.docker.internal` — jamais la « perspective hôte »
(`127.0.0.1`), qui ne vaut pas pour un service adressé côté conteneur. Prérequis infra
(rappel) : MariaDB et MinIO doivent écouter sur une interface joignable depuis le bridge Docker.

## Planification (crontab système, installation manuelle)

```cron
# Sauvegarde quotidienne à 1h (avant les crons applicatifs de 2-4h)
0 1 * * * cd /opt/guichet-jeunesse && bash scripts/backup/backup.sh >> /var/log/guichet/backup.log 2>&1 # GUICHET-BACKUP

# Exercice de restauration hebdomadaire (dimanche 5h)
0 5 * * 0 cd /opt/guichet-jeunesse && bash scripts/backup/restore-drill.sh >> /var/log/guichet/backup.log 2>&1 # GUICHET-BACKUP
```

## Copie hors-site (une sauvegarde sur le même disque ne protège pas d'une panne disque)

Définir `BACKUP_OFFSITE_CMD` dans l'environnement du script (ex. `rclone sync "$BACKUP_DIR" remote:guichet-backups`).
Sans elle, `backup.sh` avertit à chaque exécution.

## Variables

| Variable | Défaut | Rôle |
|---|---|---|
| `BACKUP_DIR` | `/var/backups/guichet` | destination locale |
| `BACKUP_RETENTION_DAYS` | `14` | purge au-delà |
| `BACKUP_NETWORK` | `guichet_guichet` | réseau Docker (dérivé de COMPOSE_PROJECT_NAME) |
| `BACKUP_OFFSITE_CMD` | *(vide)* | commande de copie hors-site |

## Avant le go-live (bloquant, cf. runbook GUIC-159)

```bash
bash scripts/backup/backup.sh          # produit un dump
bash scripts/backup/restore-drill.sh   # DOIT afficher "✓ EXERCICE RÉUSSI : N tables restaurées"
```

Un go-live sans exercice de restauration réussi est refusé.
