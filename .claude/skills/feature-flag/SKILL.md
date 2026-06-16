---
name: feature-flag
description: "Use when the user wants to wrap a component in a NEXT_PUBLIC_DESIGN_V3 conditional so the v3 work can be merged to dev without exposing it to all 22 000 users immediately. Adds the flag check, ensures a fallback to the existing component, and keeps both code paths typed. Invoke with: /feature-flag <activate|deactivate> <component-path>."
---

You are invoking the **feature-flag** skill. Wrap (or unwrap) a component behind the `NEXT_PUBLIC_DESIGN_V3` env flag.

## Required inputs

- **action** : `activate` (wrap with flag, fallback to existing) | `deactivate` (remove flag, keep new only)
- **component-path** : e.g. `src/components/layout/BenefSidebar/index.tsx`

If missing, ask once.

## Flag conventions

- Source of truth : `NEXT_PUBLIC_DESIGN_V3` in `.env.local` (default `"false"` for safety). User must set to `"true"` to see v3.
- Read in code via : `process.env.NEXT_PUBLIC_DESIGN_V3 === 'true'`
- Wrap : in the consumer (page or layout), pick the v3 component or the legacy.

## Pattern (activate)

Recommended pattern for non-trivial components — create a sibling file `<Name>V3.tsx` next to `<Name>.tsx`, then a switcher `<Name>/index.tsx` that picks one:

```tsx
// src/components/layout/BenefSidebar/index.tsx
'use client'
import { BenefSidebarV3 } from './BenefSidebarV3'
import { BenefSidebarLegacy } from './BenefSidebarLegacy'

const DESIGN_V3 = process.env.NEXT_PUBLIC_DESIGN_V3 === 'true'

export function BenefSidebar(props: BenefSidebarProps) {
  return DESIGN_V3 ? <BenefSidebarV3 {...props} /> : <BenefSidebarLegacy {...props} />
}

export type { BenefSidebarProps } from './BenefSidebarV3'  // single type source
```

Rules:
- Both versions MUST share the same props interface (export the type from V3 only — single source).
- Legacy file = existing implementation renamed `<Name>Legacy.tsx`.
- V3 file = new implementation `<Name>V3.tsx`.
- The index switcher is the only public export.
- Update all imports if needed (`grep -rn 'from.*<Name>' src/`).

## Pattern (deactivate — promote v3 to default)

When the v3 is validated and we want to remove the flag:
```bash
# 1. Delete the legacy
git rm src/components/layout/BenefSidebar/BenefSidebarLegacy.tsx
# 2. Simplify the index : re-export V3 directly
# 3. Optionally rename V3 → original name
git mv src/components/layout/BenefSidebar/BenefSidebarV3.tsx src/components/layout/BenefSidebar/index.tsx
# 4. Remove NEXT_PUBLIC_DESIGN_V3 from .env if no other component uses it (check first)
```

Document each deactivation in commit message and `.agent_context/DECISIONS.md`.

## Steps to execute (activate)

1. Read the current component to understand its structure and props.
2. Rename current file to `<Name>Legacy.tsx` (preserve git history with `git mv`).
3. Create `<Name>V3.tsx` as a copy of legacy initially (the v3 work will modify it in a separate ticket).
4. Create the switcher `index.tsx` (or update if already a folder).
5. Verify all imports still resolve (`grep -rn 'from.*<Name>' src/` then `npx tsc --noEmit`).
6. Add to `.env.local.example` : `NEXT_PUBLIC_DESIGN_V3=false`.
7. Update `.agent_context/DECISIONS.md` with the flag entry.
8. Commit with `chore(layout): [GUIC-NNN] feature flag DESIGN_V3 sur <Name>` — this is **chore**, so no RED required (per CJS_AGENT_RULES § exceptions TDD).

## Hard rules

- NEVER expose `NEXT_PUBLIC_DESIGN_V3` to server-only code paths — it's prefixed `NEXT_PUBLIC_` for a reason (client bundle).
- NEVER default the flag to `"true"` in `.env.local.example` — that would expose v3 by accident.
- NEVER apply this skill to `centres/*` components (Wave 7 figée).
- The switcher MUST type-check identically for both branches (same props interface).
- Keep the legacy WORKING — don't delete it until deactivation.
