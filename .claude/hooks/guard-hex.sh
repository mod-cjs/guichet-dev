#!/bin/bash
# Hook Claude Code — PreToolUse Write/Edit
# Bloque l'écriture de litéraux hex couleur dans le code applicatif.
# Tokens `gj-*` requis par CLAUDE.md (cf .agent_context/CJS_AGENT_RULES.md § Conventions UI).
#
# Whitelist (skip totalement) :
#  - design-guichet-{v2,v3}/, design/html.archive/
#  - public/design-v{2,3}/
#  - node_modules/, .next/, dist/, build/
#  - Fichiers binaires (.svg/.png/.jpg/etc)
#  - .md / .json / .lock / .yml / .yaml / .toml / .prisma
#  - src/styles/tokens.css, colors_and_type.css  (DOIVENT définir des hex)
#
# Exception ponctuelle dans code applicatif : commenter `// gj-hex-exception: <raison>`
# sur la même ligne. Skip aussi les ancres HTML/URL (`href="#anchor"`).
#
# Env GUIC_HOOKS_OFF=1 → disable rapide (debug)

set -u

# Early exit if hooks disabled
[ "${GUIC_HOOKS_OFF:-0}" = "1" ] && exit 0

# Lire stdin dans un fichier temp pour robustesse JSON (caractères spéciaux)
payload_file=$(mktemp -t guard-hex-payload.XXXXXX) || exit 0
trap "rm -f '$payload_file'" EXIT
cat > "$payload_file"

# Parse file_path + new_string/content depuis le fichier (pas string interpolation)
read -r file_path payload < <(python3 - "$payload_file" << 'PYEOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        d = json.load(f)
    file_path = d.get('file_path', '') or d.get('path', '')
    # Edit utilise new_string, Write utilise content
    payload = d.get('new_string', '') or d.get('content', '')
    # Output : 1ère ligne = file_path, reste = payload encodé base64 pour transport sûr
    import base64
    print(file_path)
    print(base64.b64encode(payload.encode()).decode())
except Exception:
    pass
PYEOF
)

# read va couper sur newlines : payload est la 1ère ligne après file_path (= base64 b64)
# Plus simple : tout faire en Python d'un coup
result=$(python3 - "$payload_file" << 'PYEOF'
import json, re, sys

try:
    with open(sys.argv[1]) as f:
        d = json.load(f)
except Exception:
    sys.exit(0)

file_path = d.get('file_path', '') or d.get('path', '')
payload = d.get('new_string', '') or d.get('content', '')

if not file_path or not payload:
    sys.exit(0)

# Whitelist by path (skip silently)
SKIP_PATTERNS = [
    'design-guichet-v2/', 'design-guichet-v3/', 'design/html.archive/',
    'public/design-v2/', 'public/design-v3/',
    'node_modules/', '.next/', 'dist/', 'build/',
    'src/styles/tokens.css', 'src/styles/colors_and_type.css',
    # globals.css retiré de la whitelist — doit respecter les tokens
    '.agent_context/', 'CLAUDE.md', 'CJS_AGENT_RULES.md', 'AGENTS_SYSTEM.md',
]
if any(p in file_path for p in SKIP_PATTERNS):
    sys.exit(0)

# Skip binaires + non-code
SKIP_EXTS = ('.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
             '.md', '.json', '.lock', '.yml', '.yaml', '.toml', '.prisma',
             '.svg', '.txt')
if file_path.lower().endswith(SKIP_EXTS):
    sys.exit(0)

# Scan hex literals
hex_pattern = re.compile(r'#[0-9a-fA-F]{3,8}\b')
lines = payload.split('\n')
violations = []

for i, line in enumerate(lines, 1):
    # Skip lines with exception comment
    if 'gj-hex-exception' in line:
        continue
    matches = hex_pattern.findall(line)
    # Filter false positives : URL anchors (href="#..." without color context)
    real = []
    for m in matches:
        # Length 4 = #RGB, 7 = #RRGGBB, 9 = #RRGGBBAA (others = anchors/hashes)
        if len(m) not in (4, 7, 9):
            continue
        # Skip if line is clearly an HTML anchor (href + #) without color context
        if 'href=' in line and not re.search(
            r'(color|background|border|fill|stroke|outline|shadow|gradient)', line
        ):
            continue
        real.append(m)
    if real:
        for m in real:
            violations.append({
                'line': i,
                'hex': m,
                'snippet': line.strip()[:120],
            })

if not violations:
    sys.exit(0)

# Output structuré
print(f"COUNT={len(violations)}")
for v in violations[:5]:
    print(f"L{v['line']}: {v['hex']} — {v['snippet']}")
PYEOF
)

# Si pas de résultat → no violations
[ -z "$result" ] && exit 0

count=$(echo "$result" | grep -oE 'COUNT=[0-9]+' | cut -d= -f2)

if [ -z "$count" ] || [ "$count" -eq 0 ] 2>/dev/null; then
    exit 0
fi

# Block avec message
echo "" >&2
echo "❌ Hex couleur interdits détectés ($count occurrence(s)) :" >&2
echo "$result" | grep -E '^L[0-9]+' >&2
echo "" >&2
echo "Utiliser des tokens var(--gj-*) (CLAUDE.md § Tokens couleur)." >&2
echo "Exception ponctuelle : commentaire \`// gj-hex-exception: <raison>\` sur la ligne." >&2
echo "Disable temporaire : export GUIC_HOOKS_OFF=1" >&2
exit 2
