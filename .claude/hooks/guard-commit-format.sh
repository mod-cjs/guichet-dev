#!/bin/bash
# Hook Claude Code — PreToolUse Bash
# Bloque les `git commit -m "..."` dont le message ne respecte pas le format
# `<type>(<module>): [GUIC-NNN] <desc>` + corps avec `Closes GUIC-NNN`.
# CJS_AGENT_RULES § Commits.
#
# Tolérances :
# - `git commit --amend --no-edit` (le message reste celui du précédent commit)
# - Messages commençant par `merge:` ou `Merge ` (merges automatiques)
# - Messages commençant par `Revert ` (reverts auto)
# - `git commit` sans -m (utilise EDITOR) — pas de validation possible ici, on laisse passer

set -u

input=$(cat)

command=$(printf '%s' "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('command', ''))
except Exception:
    pass
" 2>/dev/null)

# Pas un git commit → exit
if ! echo "$command" | grep -qE '(^|;|\|\||&&|\s)git\s+(-c\s+[^ ]+\s+)*commit\b'; then
    exit 0
fi

# Tolérance : --amend --no-edit (réutilise message existant)
if echo "$command" | grep -qE '\-\-amend.*\-\-no-edit|\-\-no-edit.*\-\-amend'; then
    exit 0
fi

# Extraire le message après -m (gestion ' et ")
# Supporte aussi -m "$(cat <<EOF...EOF)"
msg=$(printf '%s' "$command" | python3 -c "
import sys, re
cmd = sys.stdin.read()
# Chercher -m '...' ou -m \"...\" (peut être multi-ligne avec heredoc)
m = re.search(r\"-m\s+'(.+?)'(?:\s|$)\", cmd, re.DOTALL)
if not m:
    m = re.search(r'-m\s+\"(.+?)\"(?:\s|$)', cmd, re.DOTALL)
if m:
    print(m.group(1))
" 2>/dev/null)

# Si pas de message ou utilise heredoc complexe → laisser passer (l'humain a validé)
[ -z "$msg" ] && exit 0

# Tolérance : commits automatiques (merge / revert)
first_line=$(printf '%s' "$msg" | head -1)
case "$first_line" in
  "merge:"*|"Merge "*|"Revert "*) exit 0 ;;
esac

# Vérifie le format <type>(<module>): [GUIC-NNN] ...
if ! echo "$first_line" | grep -qE '^(feat|fix|perf|security|chore|test|refactor|docs|style)\([a-z0-9-]+\):\s+\[GUIC-[0-9]+\]'; then
    echo "" >&2
    echo "❌ Format commit invalide (CJS_AGENT_RULES § Commits) :" >&2
    echo "  Subject actuel : $first_line" >&2
    echo "  Attendu : <type>(<module>): [GUIC-NNN] <desc FR>" >&2
    echo "  Ex : feat(opportunites): [GUIC-501] sous-onglets types par Lot 3" >&2
    echo "  Types autorisés : feat|fix|perf|security|chore|test|refactor|docs|style" >&2
    exit 2
fi

# Vérifie présence de `Closes GUIC-NNN` dans le corps (multi-ligne)
if ! echo "$msg" | grep -qE 'Closes\s+GUIC-[0-9]+'; then
    echo "" >&2
    echo "⚠️  Pied de message manquant : 'Closes GUIC-NNN'" >&2
    echo "  Ajoute en fin de message : Closes GUIC-NNN (lie le commit au ticket Jira)" >&2
    exit 2
fi

# Interdiction des mentions IA
if echo "$msg" | grep -qE '(Co-Authored-By:\s*Claude|Generated\s+with|🤖|Co-Authored-By:\s*Anthropic)'; then
    echo "" >&2
    echo "❌ Mention IA interdite dans le commit (CJS_AGENT_RULES § Commits) :" >&2
    echo "  Retirer 'Co-Authored-By: Claude', 'Generated with…' ou tout marqueur IA." >&2
    exit 2
fi

exit 0
