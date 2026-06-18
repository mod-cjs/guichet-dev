# Guichet hooks Claude Code

Hooks shell exécutés par l'harness Claude Code à des moments clés du cycle des outils.
Configurés dans `.claude/settings.json` (section `hooks`).

## Table

| Hook | Event | Quand | Bloquant ? |
|---|---|---|---|
| `pre-commit-check.sh` | PreToolUse Bash | Avant chaque `git commit` | OUI — lance lint + tsc |
| `guard-commit-format.sh` | PreToolUse Bash | Avant chaque `git commit -m "..."` | OUI — valide `[GUIC-NNN]` + `Closes` + pas de mention IA |
| `guard-hex.sh` | PreToolUse Write/Edit | Avant chaque Write/Edit sur un fichier | OUI — bloque les hex couleur hors zones whitelistées |
| `save-agent-report.sh` | SubagentStop | Après qu'un sub-agent termine | NON — archive le rapport en local |

## guard-commit-format.sh

Valide chaque `git commit -m "..."` :
- Subject = `<type>(<module>): [GUIC-NNN] <desc>` (regex stricte)
- Body contient `Closes GUIC-NNN`
- Aucune mention `Co-Authored-By: Claude`, `Generated with`, `🤖`, etc.

**Exit code 0** : OK · **Exit code 2** : bloque le commit avec message d'erreur.

**Tolérances** :
- `git commit --amend --no-edit` (réutilise message précédent)
- `merge: ...` ou `Merge ...` (auto-générés)
- `Revert ...` (auto-générés)
- `git commit` sans `-m` (utilise EDITOR — l'humain valide)

## guard-hex.sh

Scanne `new_string` (Edit) ou `content` (Write) pour des litéraux `#RGB` / `#RRGGBB` / `#RRGGBBAA`.

**Whitelist** :
- `design-guichet-v2/`, `design-guichet-v3/`, `design/html.archive/` (sources design)
- `public/design-v2/`, `public/design-v3/`
- `node_modules/`, `.next/`, `dist/`, `build/`
- Fichiers binaires (`.svg`, `.png`, etc.)
- `.md`, `.json`, `.lock`, `.yml` (pas de couleur applicative)
- `src/styles/tokens.css`, `colors_and_type.css`, `globals.css` (les tokens DOIVENT définir des hex)

**Exception ponctuelle** : commenter avec `// gj-hex-exception: <raison>` sur la ligne concernée OU précédente. Skip également les liens HTML (`href="#anchor"`).

**Exit code 0** : OK · **Exit code 2** : bloque l'écriture.

## save-agent-report.sh

Hook `SubagentStop` non-bloquant. Quand un sub-agent termine :
1. Lit `agentType`, `taskId`, `output`, `prompt` du payload
2. Archive un fichier `.agent_context/agent-reports/YYYYMMDD-HHMMSS-<agent>-<id12>.md`
3. Contient métadonnées + premier 500 chars du prompt + output intégral

**Agents exclus** : `Plan`, `Explore`, `general-purpose` (trop volumineux).
**Output vide** : pas d'archive.

Le dossier `.agent_context/agent-reports/` est **gitignoré** (sauf README + .gitignore).

## Activer / désactiver

Les hooks sont activés dès qu'ils sont déclarés dans `.claude/settings.json`. Pour désactiver temporairement :
1. Commenter la ligne dans `settings.json`
2. OU renommer le script (ex : `guard-hex.sh.disabled`)

## Debug

Si un hook bloque sans raison apparente :
- Lancer le script manuellement avec un payload JSON test :
  ```bash
  echo '{"command": "git commit -m \"feat(test): [GUIC-001] test\"", "file_path": "src/test.tsx"}' | .claude/hooks/guard-commit-format.sh
  echo "exit: $?"
  ```
- Les stderr remontent dans l'interface Claude Code (l'agent reçoit le message).

## Ajouter un nouveau hook

1. Créer `.claude/hooks/<nom>.sh` (chmod +x)
2. Lire stdin (`input=$(cat)`), parser le JSON (Python est dispo partout)
3. Retourner `exit 0` (OK) ou `exit 2` (bloque)
4. Déclarer dans `.claude/settings.json` sous le bon `matcher` (Bash / Write / Edit / Read / Glob / Grep / ...) et le bon event (PreToolUse / PostToolUse / SubagentStop / UserPromptSubmit / Stop)
5. Tester via Claude Code (relancer la session pour reload settings.json)
