#!/bin/bash
# Hook Claude Code — PreToolUse Write/Edit
# Bloque l'écriture de litéraux hex couleur dans le code applicatif.
# Tokens `gj-*` requis par CLAUDE.md (cf .agent_context/CJS_AGENT_RULES.md § Conventions UI).
#
# Whitelist : design-guichet-*/, public/design-*/, node_modules/, *.svg
# Pour ajouter une exception ponctuelle dans le code applicatif, commenter avec
# `// gj-hex-exception: <raison>` sur la même ligne ou la précédente.

set -u

input=$(cat)

# Extraire file_path et le payload (new_string pour Edit, content pour Write)
file_path=$(printf '%s' "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('file_path', '') or d.get('path', ''))
except Exception:
    pass
" 2>/dev/null)

payload=$(printf '%s' "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    # Edit utilise new_string, Write utilise content
    print(d.get('new_string', '') or d.get('content', ''))
except Exception:
    pass
" 2>/dev/null)

# Exit immédiat si pas de fichier ou de payload
[ -z "$file_path" ] && exit 0
[ -z "$payload" ] && exit 0

# Whitelist : skip si chemin dans une zone exemptée
case "$file_path" in
  */design-guichet-v2/*|*/design-guichet-v3/*|*/design/html.archive/*) exit 0 ;;
  */public/design-v2/*|*/public/design-v3/*) exit 0 ;;
  */node_modules/*|*/.next/*|*/dist/*|*/build/*) exit 0 ;;
  *.svg|*.png|*.jpg|*.jpeg|*.gif|*.ico|*.webp) exit 0 ;;
  *.md|*.json|*.lock|*.yml|*.yaml|*.toml) exit 0 ;;
  */CLAUDE.md|*/CJS_AGENT_RULES.md|*/AGENTS_SYSTEM.md) exit 0 ;;
  */tokens.css|*/colors_and_type.css) exit 0 ;;  # les tokens DOIVENT définir des hex
  */globals.css) exit 0 ;;  # gradient stops parfois en hex toléré
esac

# Scan le payload pour hex couleur (#RGB / #RRGGBB / #RRGGBBAA)
# Exclut les lignes contenant `gj-hex-exception:`
violations=$(printf '%s' "$payload" | python3 -c "
import sys, re
content = sys.stdin.read()
pattern = re.compile(r'#[0-9a-fA-F]{3,8}\b')
lines = content.split('\n')
violations = []
for i, line in enumerate(lines, 1):
    # Skip line if exception comment
    if 'gj-hex-exception' in line:
        continue
    matches = pattern.findall(line)
    # Filter false positives : URL fragments (#anchor), CSS variable refs, JS hash literals are usually OK
    real = [m for m in matches if len(m) in (4, 7, 9)]  # #RGB / #RRGGBB / #RRGGBBAA
    if real:
        # Skip if line looks like a JSX import path / URL anchor (start with 'href=' or contains '://')
        if 'href=' in line and '#' in line and not re.search(r'(color|background|border|fill|stroke|outline|shadow|gradient)', line):
            continue
        for m in real:
            violations.append((i, m, line.strip()[:120]))
print(len(violations))
for v in violations[:5]:
    print(f'L{v[0]}: {v[1]} — {v[2]}')
")

count=$(printf '%s' "$violations" | head -1)

if [ -n "$count" ] && [ "$count" -gt 0 ] 2>/dev/null; then
    echo "" >&2
    echo "❌ Hex couleur interdits détectés ($count occurrence(s)) dans $file_path :" >&2
    printf '%s' "$violations" | tail -n +2 >&2
    echo "" >&2
    echo "Utiliser des tokens \`var(--gj-*)\` (CLAUDE.md § Tokens couleur)." >&2
    echo "Pour une exception ponctuelle, ajouter \`// gj-hex-exception: <raison>\` sur la même ligne." >&2
    exit 2
fi

exit 0
