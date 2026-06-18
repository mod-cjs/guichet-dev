# Subagent reports archive

Rapports finaux des sous-agents Claude Code archivés automatiquement par
`.claude/hooks/save-agent-report.sh` (hook `SubagentStop`).

## Format

`YYYYMMDD-HHMMSS-<agent-type>-<task-id-12>.md`

Contenu :
- Métadonnées (agent_type, task_id, timestamp UTC)
- Premier 500 chars du prompt initial
- Output final intégral

## Politique de rétention

- **Non-committed** (cf .gitignore) — données potentiellement sensibles, volumineux
- Conservés en local pour debug/replay
- Nettoyage manuel : `find .agent_context/agent-reports -name "*.md" -mtime +30 -delete`
- Pour partager un rapport : copier manuellement vers un gist ou Slack

## Agents exclus

- `Plan`, `Explore`, `general-purpose` (trop volumineux, infos limitées)
- Agents avec output vide (rien à archiver)
