#!/bin/bash
# Hook Claude Code — PreToolUse Bash
# Bloque les `git commit` dont le message ne respecte pas le format
# `<type>(<module>): [GUIC-NNN] <desc>` + corps avec `Closes GUIC-NNN`.
# CJS_AGENT_RULES § Commits.
#
# Supporte les 3 patterns de commit utilisés :
#   1. git commit -m "subject\nbody"
#   2. git commit -m 'subject\nbody'
#   3. git commit -m "$(cat <<'EOF' ... EOF\n)"   ← le plus fréquent dans Claude Code
#
# Tolérances :
# - git commit --amend --no-edit (réutilise message)
# - merge:* / Merge * / Revert * (auto-générés)
# - git commit sans -m ni -F (utilise EDITOR — humain valide)
# - env GUIC_HOOKS_OFF=1 (debug — disable rapide)

set -u

# Early exit if hooks disabled globally
[ "${GUIC_HOOKS_OFF:-0}" = "1" ] && exit 0

# Lire le payload — stocker dans un fichier temp pour robustesse JSON
payload_file=$(mktemp -t guard-commit-payload.XXXXXX) || exit 0
trap "rm -f '$payload_file'" EXIT
cat > "$payload_file"

command=$(python3 - "$payload_file" << 'PYEOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        d = json.load(f)
    print(d.get('command', ''))
except Exception:
    pass
PYEOF
)

# Pas un git commit → exit
if ! echo "$command" | grep -qE '(^|;|\|\||&&|\s)git\s+(-c\s+[^ ]+\s+)*commit\b'; then
    exit 0
fi

# Tolérance : --amend --no-edit
if echo "$command" | grep -qE '\-\-amend.*\-\-no-edit|\-\-no-edit.*\-\-amend'; then
    exit 0
fi

# Extraire le message via Python (gère tous les patterns : -m "..." -m '...' -m "$(cat <<EOF ... EOF)")
msg=$(python3 - "$command" << 'PYEOF'
import sys, re

cmd = sys.argv[1]

# Pattern 1 : -m "$(cat <<'EOF' ... EOF\n)"  (le plus fréquent dans Claude Code)
m = re.search(
    r"-m\s+\"?\$\(cat\s+<<['\"]?(\w+)['\"]?\s*\n(.*?)\n\s*\1\s*\)?\"?",
    cmd,
    re.DOTALL,
)
if m:
    print(m.group(2))
    sys.exit(0)

# Pattern 2 : -m '<single-line>' (avec apostrophes simples, message dans une seule string shell)
m = re.search(r"-m\s+'(.+?)'(?:\s|$)", cmd, re.DOTALL)
if m:
    print(m.group(1))
    sys.exit(0)

# Pattern 3 : -m "<double-quoted>"
m = re.search(r'-m\s+"((?:[^"\\\\]|\\\\.)*)"', cmd, re.DOTALL)
if m:
    # Décoder les échappements \" -> "
    print(m.group(1).replace('\\"', '"').replace("\\'", "'"))
    sys.exit(0)

# Pattern 4 : -F <file>  (lire le fichier)
m = re.search(r"-F\s+(\S+)", cmd)
if m:
    try:
        with open(m.group(1)) as f:
            print(f.read())
        sys.exit(0)
    except Exception:
        pass

# Pas trouvé : commit via EDITOR → laisser passer (humain valide)
PYEOF
)

# Pas de message extrait → laisser passer (EDITOR mode ou pattern non reconnu)
[ -z "$msg" ] && exit 0

# Tolérance : commits automatiques (merge / revert)
first_line=$(printf '%s' "$msg" | head -1)
case "$first_line" in
  "merge:"*|"Merge "*|"Revert "*) exit 0 ;;
esac

# Vérifie le format <type>(<module>): [GUIC-NNN] ...
if ! echo "$first_line" | grep -qE '^(feat|fix|perf|security|chore|test|refactor|docs|style)\([a-z0-9,-]+\):\s+\[GUIC-[0-9]+\]'; then
    echo "" >&2
    echo "❌ Format commit invalide (CJS_AGENT_RULES § Commits) :" >&2
    echo "  Subject : $first_line" >&2
    echo "  Attendu : <type>(<module>): [GUIC-NNN] <desc FR>" >&2
    echo "  Ex     : feat(opportunites): [GUIC-501] sous-onglets types par Lot 3" >&2
    echo "  Types  : feat|fix|perf|security|chore|test|refactor|docs|style" >&2
    echo "  Set GUIC_HOOKS_OFF=1 pour disable temporairement." >&2
    exit 2
fi

# Vérifie présence de `Closes GUIC-NNN` (le corps multi-ligne)
if ! echo "$msg" | grep -qE 'Closes\s+GUIC-[0-9]+'; then
    echo "" >&2
    echo "❌ Pied de message manquant : 'Closes GUIC-NNN' (CJS_AGENT_RULES § Commits)" >&2
    echo "  Ajoute en fin de message : Closes GUIC-NNN" >&2
    exit 2
fi

# Interdiction des mentions IA (full message)
if echo "$msg" | grep -qE '(Co-Authored-By:\s*Claude|Generated\s+with|🤖|Co-Authored-By:\s*Anthropic)'; then
    echo "" >&2
    echo "❌ Mention IA interdite dans le commit (CJS_AGENT_RULES § Commits)" >&2
    echo "  Retire 'Co-Authored-By: Claude', 'Generated with…', emoji robot 🤖" >&2
    exit 2
fi

exit 0
