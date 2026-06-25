# Cron scripts Guichet

Scripts shell pour automatiser des tâches récurrentes système (hors Claude Code).
À installer dans `crontab` (Linux/macOS) ou `launchd` (macOS recommandé).

## Table

| Script | Fréquence recommandée | Rôle |
|---|---|---|
| `rebase-mouhammadouod.sh` | quotidien 4h matin | Rebase `mouhammadouod/tmp-mouhammadouod-dev` sur `origin/dev` |
| `check-merge-queue.sh` | toutes les 6h | Inventaire PRs ouvertes, alerte si > 5 ou stale > 7j |

## Variables d'env (override possible)

| Var | Défaut | Description |
|---|---|---|
| `CJS_REPO_ROOT` | parent de `scripts/cron/..` | Racine du repo Guichet |
| `CJS_MAIN_WORKTREE` | `<repo>/.claude/worktrees/agent-ae210669c88b5b848` | Worktree où mouhammadouod est configuré comme remote |
| `CJS_MOUHAMMADOUOD_BRANCH` | `tmp-mouhammadouod-dev` | Branche locale qui suit mouhammadouod/dev |
| `CJS_MOUHAMMADOUOD_REMOTE` | `mouhammadouod` | Nom du remote |
| `CJS_MOUHAMMADOUOD_REMOTE_BRANCH` | `dev` | Branche distante |
| `CJS_GIT_USER_NAME` | `mod-cjs` | Auteur commits |
| `CJS_GIT_USER_EMAIL` | `mod-cjs@consortiumjeunesse.local` | Email auteur |
| `CJS_MAX_OPEN_PRS` | `5` | Seuil d'alerte PRs ouvertes |
| `CJS_STALE_DAYS` | `7` | Jours sans update = stale |

## Installation crontab (macOS / Linux)

```bash
crontab -e
```

Ajouter :

```cron
# Guichet — rebase quotidien mouhammadouod sur origin/dev (4h matin)
0 4 * * * /Users/macbook/Desktop/cjs/guichet/scripts/cron/rebase-mouhammadouod.sh >> /tmp/cron-rebase-mouhammadouod.log 2>&1

# Guichet — check merge queue toutes les 6h
0 */6 * * * /Users/macbook/Desktop/cjs/guichet/scripts/cron/check-merge-queue.sh >> /tmp/cron-check-merge-queue.log 2>&1
```

Vérifier :
```bash
crontab -l
tail -f /tmp/cron-rebase-mouhammadouod.log
```

## Installation launchd (macOS recommandé — plus robuste)

Créer `~/Library/LaunchAgents/com.guichet.rebase-mouhammadouod.plist` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.guichet.rebase-mouhammadouod</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/macbook/Desktop/cjs/guichet/scripts/cron/rebase-mouhammadouod.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key><integer>4</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <key>StandardOutPath</key><string>/tmp/cron-rebase-mouhammadouod.log</string>
    <key>StandardErrorPath</key><string>/tmp/cron-rebase-mouhammadouod.log</string>
</dict>
</plist>
```

Charger :
```bash
launchctl load ~/Library/LaunchAgents/com.guichet.rebase-mouhammadouod.plist
launchctl list | grep guichet
```

Décharger pour désactiver :
```bash
launchctl unload ~/Library/LaunchAgents/com.guichet.rebase-mouhammadouod.plist
```

## Test manuel

```bash
# Dry-run du rebase (le script se protège tout seul si tree dirty / mauvaise branche)
/Users/macbook/Desktop/cjs/guichet/scripts/cron/rebase-mouhammadouod.sh

# Check merge queue ad-hoc
/Users/macbook/Desktop/cjs/guichet/scripts/cron/check-merge-queue.sh
```

## Sécurité

- Les scripts NE force-pushent JAMAIS, NE skippent JAMAIS les hooks
- En cas de conflit rebase, le script `--abort` et exit avec un code non-zéro
- En cas de divergence importante (> 50 commits ahead), refuse de rebase et alerte
- En cas de working tree dirty, skip et préserve l'état

## Pourquoi pas le Cron tool de Claude Code ?

Le tool `CronCreate` de Claude Code planifie des agents Claude (LLM). Ici on a
besoin d'opérations git pures + appels gh CLI — pas besoin d'un LLM. Crontab
système est plus simple, plus rapide, et tourne même quand Claude Code n'est
pas lancé.

Pour des tâches qui nécessitent du raisonnement (ex : trier les PRs et décider
lesquelles fermer), un agent via `CronCreate` serait plus adapté. Pas pour le
moment.
