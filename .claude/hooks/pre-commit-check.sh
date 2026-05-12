#!/bin/bash
# Hook Claude Code — PreToolUse Bash
# Intercepte les appels git commit et valide lint + TypeScript avant de laisser passer.
# Le git hook .githooks/pre-commit fait la même chose mais ce hook donne
# un feedback AVANT que git soit appelé (message d'erreur dans l'interface Claude).

# Lire le JSON de l'outil via stdin
input=$(cat)

# Extraire la commande bash du payload JSON
command=$(printf '%s' "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('command', ''))
except Exception:
    print('')
" 2>/dev/null)

# Agir seulement si la commande est un git commit
if ! echo "$command" | grep -qE '(^|;|\|\||&&)\s*git\s+commit'; then
    exit 0
fi

echo "🔍 Validation pré-commit (hook Claude Code)…" >&2

# ── Lint ──────────────────────────────────────────────────────────────────
if ! npm run lint --silent 2>/tmp/lint-out; then
    echo "" >&2
    echo "❌ Lint échoué — corrigez les erreurs avant de committer :" >&2
    cat /tmp/lint-out >&2
    exit 2
fi
echo "  ✓ lint" >&2

# ── TypeScript ────────────────────────────────────────────────────────────
if ! npx tsc --noEmit 2>/tmp/tsc-out; then
    echo "" >&2
    echo "❌ TypeScript échoué — corrigez les erreurs avant de committer :" >&2
    cat /tmp/tsc-out >&2
    exit 2
fi
echo "  ✓ TypeScript" >&2

echo "✅ Validation OK — commit autorisé" >&2
exit 0
