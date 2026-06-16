---
name: audit-visuel
description: "Use when the user asks for a visual audit of a Guichet component or route against the v3 design reference. Returns a structured list of findings (severity, file:line, current vs expected, fix) ranked critical/high/medium/low. Optional Playwright screenshots if /audit-visuel includes 'with screenshots'. Invoke with: /audit-visuel <component-path-or-route> <Lot-N>."
---

You are invoking the **audit-visuel** skill. Compare an implementation against the v3 design reference and return structured findings.

## Required inputs

Parse the user message OR ask once:
- **target** : component path (e.g. `src/components/layout/BenefSidebar/index.tsx`) OR route (e.g. `/jeune/tableau-de-bord`)
- **Lot** : the v3 lot reference, e.g. `Lot 2`, `Lot 14`. Mapping in `cjs-design-auditor`'s prompt.

Optional flags:
- `--with-screenshots` : also capture Playwright screenshots at 3 viewports (mobile 375×812 / tablet 768×1024 / desktop 1440×900) — requires a dev server running on `localhost:3000`. If invoked, use the `playwright` MCP tools (`mcp__playwright__*`).
- `--scope <hint>` : narrow focus (`color`, `spacing`, `a11y`, etc.) — passed to the auditor.

If target or Lot missing, ask in one short message.

## Steps to execute

### 1. Load schema
Read `.agent_context/schemas/audit-finding.schema.json`. This is the structured-output contract for the auditor.

### 2. Invoke cjs-design-auditor
Spawn the `cjs-design-auditor` agent with:
- prompt: "Audit `<target>` against `<Lot N>`. Scope: `<hint or 'full'>`."
- subagent_type: `cjs-design-auditor`
- schema: the loaded JSON Schema (MUST be passed, otherwise output is not enforced)

The agent returns a validated JSON object. Parse it.

### 3. (Optional) Playwright screenshots
If `--with-screenshots`:
- Check `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` — if not 2xx/3xx, skip with a note "no dev server running".
- For each viewport (mobile/tablet/desktop), use `mcp__playwright__*` to navigate to the route (or storybook URL of the component) and capture a screenshot.
- Save under `data/audits/<date>-<target-slug>-<viewport>.png`.

### 4. Format and return
Present to the user:

```
# Audit visuel : <target> vs Lot N

Summary : <C> critical · <H> high · <M> medium · <L> low · total <T>

## Findings

| # | Sev | Cat | File:Line | Lot ref | Fix |
|---|-----|-----|-----------|---------|-----|
| 1 | high | color | src/...:73 | web-dashboard.jsx L60 | replace #0A807F → var(--gj-teal-deep) |
| 2 | medium | spacing | src/...:102 | ... | increase padding 8→12 |
| ... |

## Hors périmètre / manquants
- <bullet>

## Screenshots (if captured)
- mobile: data/audits/...
- tablet: data/audits/...
- desktop: data/audits/...
```

If 0 findings → success message, mention what was checked.

## Hard rules

- ALWAYS load and pass the schema to the auditor
- NEVER modify code in this skill — only audit
- NEVER audit `src/components/centres/*` (Wave 7 figée — agent already refuses, but double-check)
- NEVER use `design-guichet-v2/` as reference — only v3
- If the user asks to FIX the findings, invoke `cjs-design-implementer` (or `developpeur` if absent) in a separate step — do not chain automatically
