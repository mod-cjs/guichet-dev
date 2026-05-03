# Working with the Guichet Jeunesse design system

A short field guide for any agent picking up this kit.

## When you start
1. **Read `README.md`** end-to-end. It captures voice, palette, scale.
2. **Open `UI Kit.html`** and `Foundations.html` in the preview. Don't redesign components that already live there — copy.
3. **Pull `tokens.css`** into any new HTML you make. Never hardcode colours; use `var(--gj-teal)`, `var(--gj-teal-deep)`, etc.

## Voice checklist
- [ ] Tutoiement throughout (“tu”, never “vous”)
- [ ] Headlines ≤ 8 words, ideally with a verb in the imperative
- [ ] Senegal-specific names — Yaakaar, YEAH, YJC, BRM, CJS, e-learning
- [ ] FCFA for money. Region names spelled in full.
- [ ] Emoji *only* from the reserved set in §3 of the README. No new glyphs.

## Visual rules of thumb
- Hero / page-header bands → `--gj-teal-deep` background, white text. Always.
- Cards on the page → `--gj-surface` + `1.5px solid var(--gj-line)`. No drop shadow.
- Cards that float (modal, chat, drawer) → `var(--gj-shadow-md)` or `lg`.
- Status colours are *typed semantics* — don't repurpose blue/green/red as decoration.
- Indigo is reserved for the chatbot. Don’t use it elsewhere.
- 1.5px strokes, 6/8/11px radii. Anything else looks off.

## Density
- Mobile-first, ~360–440px content widths inside larger containers.
- Body 13px / secondary 11.5px / caption 10px is correct — don't bump up to 16px just because a desktop site usually does.
- Touch targets: keep CTAs ≥ 36px tall by adding padding (9–11px vertical). Nav tab labels are intentionally tight (11px) but the parent row has 13px vertical padding to compensate.

## When you need a component that isn't in the kit
1. Check the prototype source file in this project (or ask the user for it) before inventing.
2. If you must invent, copy the *closest sibling*'s structure (same border, same radius, same padding) and only change content + iconography.
3. Add a new card to `UI Kit.html` for it so future agents inherit your work.

## Variations & tweaks
If the user asks to “try a different style”, prefer:
- Swapping yellow for a deeper amber (`#E89B00`) for higher contrast hero CTAs.
- Switching hero from photo-overlay to a flat `--gj-teal-deep` block with a yellow chip.
- Tightening the nav into a hamburger on mobile — but keep the e-learning ↗ / YEAH ↗ external pills visible.

Avoid:
- Webfont swaps without explicit user approval (data cost matters here).
- Adding gradients beyond the existing hero overlay.
- Replacing the emoji system with a single-icon-library look. It changes the brand’s personality.

## Out of scope (yet)
- Dark mode — not part of the V5 prototype.
- RTL — Wolof is written in Latin script, no current need.
- A printed-poster sub-system (poster templates would be additive).
