#!/bin/bash
# Hook Claude Code — SubagentStop
# Archive le rapport final d'un sub-agent dans .agent_context/agent-reports/
# pour traçabilité (audit, replay, debug).
#
# Pattern : .agent_context/agent-reports/YYYYMMDD-<agent-name>-<task-id>.md

set -u

input=$(cat)

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$REPO_ROOT" ] && exit 0

reports_dir="$REPO_ROOT/.agent_context/agent-reports"
mkdir -p "$reports_dir"

# Extraire agent_type, task_id, output via Python
python3 << PYEOF >> "$reports_dir/$(date -u +%Y%m%d)-subagent.log" 2>&1
import sys, json, os
from datetime import datetime, timezone

try:
    raw = """$input"""
    d = json.loads(raw)
except Exception as e:
    sys.exit(0)

agent_type = d.get('agentType') or d.get('agent_type') or 'unknown'
task_id = d.get('taskId') or d.get('task_id') or 'no-id'
output = d.get('output', '') or d.get('finalText', '') or ''
prompt = d.get('prompt', '')

# Archive seulement si output non vide
if not output:
    sys.exit(0)

# Skip les agents tools internes (orchestration parent), garder cjs-* + voltagent
# (frontend, nextjs, etc.)
if agent_type in ('Plan', 'Explore', 'general-purpose'):
    sys.exit(0)

stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
fname = f"{stamp}-{agent_type}-{task_id[:12]}.md"
path = os.path.join("$reports_dir", fname)

with open(path, 'w') as f:
    f.write(f"# Subagent report — {agent_type}\n\n")
    f.write(f"**task_id**: {task_id}\n")
    f.write(f"**stamped**: {stamp} UTC\n\n")
    if prompt:
        f.write("## Prompt (first 500 chars)\n\n")
        f.write(prompt[:500] + ("…" if len(prompt) > 500 else "") + "\n\n")
    f.write("## Output\n\n")
    f.write(output)

print(f"Archived report: {path}")
PYEOF

exit 0
