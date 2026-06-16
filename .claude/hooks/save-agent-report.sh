#!/bin/bash
# Hook Claude Code — SubagentStop
# Archive le rapport final d'un sub-agent dans .agent_context/agent-reports/
# pour traçabilité (audit, replay, debug).
#
# Pattern : .agent_context/agent-reports/YYYYMMDD-HHMMSS-<agent-name>-<task-id-12>.md
#
# Non-bloquant : retourne toujours exit 0 (sauf erreur critique).
# Env GUIC_HOOKS_OFF=1 → skip.

set -u

[ "${GUIC_HOOKS_OFF:-0}" = "1" ] && exit 0

# Lire stdin dans un fichier temp pour robustesse JSON
payload_file=$(mktemp -t subagent-payload.XXXXXX) || exit 0
trap "rm -f '$payload_file'" EXIT
cat > "$payload_file"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$REPO_ROOT" ] && exit 0

reports_dir="$REPO_ROOT/.agent_context/agent-reports"
mkdir -p "$reports_dir"

# Python lit le payload_file et écrit le rapport
# Tente plusieurs noms de clés (l'harness peut utiliser des variantes)
python3 - "$payload_file" "$reports_dir" << 'PYEOF' >> "$reports_dir/.subagent.log" 2>&1
import json, os, sys
from datetime import datetime, timezone

payload_file = sys.argv[1]
reports_dir = sys.argv[2]

try:
    with open(payload_file) as f:
        d = json.load(f)
except Exception as e:
    print(f"[{datetime.now(timezone.utc).isoformat()}] save-agent-report: parse failed ({e})")
    sys.exit(0)

# Tentative multiple sur le nom des clés (variantes possibles selon la version d'harness)
agent_type = (
    d.get('agentType')
    or d.get('agent_type')
    or d.get('subagent_type')
    or d.get('subagentType')
    or 'unknown'
)
task_id = (
    d.get('taskId')
    or d.get('task_id')
    or d.get('tool_use_id')
    or d.get('toolUseId')
    or 'no-id'
)
output = (
    d.get('output')
    or d.get('finalText')
    or d.get('final_text')
    or d.get('result')
    or d.get('message')
    or ''
)
prompt = (
    d.get('prompt')
    or d.get('input')
    or ''
)

if not output:
    print(f"[{datetime.now(timezone.utc).isoformat()}] save-agent-report: empty output, skip ({agent_type})")
    sys.exit(0)

# Skip agents internes / pas pertinents
SKIP_AGENTS = {'Plan', 'Explore', 'general-purpose', 'fork'}
if agent_type in SKIP_AGENTS:
    sys.exit(0)

stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
fname = f"{stamp}-{agent_type}-{str(task_id)[:12]}.md"
path = os.path.join(reports_dir, fname)

with open(path, 'w') as f:
    f.write(f"# Subagent report — {agent_type}\n\n")
    f.write(f"**task_id**: `{task_id}`\n")
    f.write(f"**stamped**: {stamp} UTC\n\n")
    if prompt:
        s = str(prompt)
        f.write("## Prompt (first 500 chars)\n\n```\n")
        f.write(s[:500] + ("…" if len(s) > 500 else ""))
        f.write("\n```\n\n")
    f.write("## Output\n\n")
    f.write(str(output))

print(f"[{datetime.now(timezone.utc).isoformat()}] save-agent-report: {fname}")
PYEOF

exit 0
