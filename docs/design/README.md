# Guichet Jeunesse Sénégal — Design System

A design system extracted from the **Guichet Jeunesse Sénégal V5 prototype** — a youth opportunities platform built by Consortium Jeunesse Sénégal (CJS). It connects young Senegalese (16–35) to jobs, internships, training, calls for projects, scholarships, civic engagement and CJS centre services across all 14 regions.

Use this kit when designing **any digital surface** for the Guichet — web, mobile, CJS centre kiosks, partner portals, recruiter back-offices, or printed/social material.

---

## 1 — Brand Voice

**Personality.** Warm but practical. Senegalese, not French. The platform addresses young adults directly, in **French with informal “tu”**, occasionally code-switched with Wolof energy (“Yaakaar”, “YEAH”). Emoji are used **purposefully** — as wayfinding (🎓 Étudiant · 🚀 Entrepreneur · 🤝 Engagement · 📚 Formation), not decoration.

**Mission, in plain words.** *Help every young person in Senegal find their next opportunity — whether that's a job in Dakar, a maraicher project in Kédougou, or a youth-civic-cohort in Ziguinchor.*

**Tone rules.**

| Do | Don't |
|---|---|
| “Trouver ma prochaine opp →” | “Découvrez nos opportunités” (too formal/corporate) |
| “C’est quoi ton objectif ce mois-ci ?” | “Quels sont vos objectifs professionnels ?” |
| Short, action-led headings (“Ils l’ont fait grâce au Guichet 💬”) | Marketing-speak, jargon |
| Cite real partners, real cycle dates, real cities | Generic stock copy |
| Highlight deadlines (J-12, J-18) | Hide urgency |

**Reading level.** Aim for ~B1/B2 French. Sentences ≤ 18 words. Numbers as figures, not words (“22 695 jeunes inscrits”). Use **CFA / FCFA** for money (“350 000 FCFA”).

---

## 2 — Visual Foundations

### Colour
The palette mirrors the Senegal flag: **green / yellow / red**, mediated through one neutral surface tone.

| Token | Hex | Job |
|---|---|---|
| `--gj-teal` | `#009F76` | Primary brand — buttons, links, active state, map dots |
| `--gj-teal-deep` | `#007A5C` | Hero washes, page-header bands, “En direct” strip |
| `--gj-teal-soft` | `#E1F5EE` | Tints — chip backgrounds, CJS event accents, hover |
| `--gj-yellow` | `#F9C400` | Senegal yellow — **today**, secondary CTA, partner accent |
| `--gj-yellow-soft` | `#FFF8E0` | Notice bar, “dossier à compléter” status |
| `--gj-red` | `#D92A1E` | Urgent deadlines, error |
| `--gj-red-soft` | `#fef2f2` | Soft-red status pills |
| `--gj-blue` `#1d4ed8` / `--gj-green` `#15803d` | | Status pills only (in process / approved) |
| `--gj-indigo` `#6366f1` | | Reserved for the **chatbot** UI — never elsewhere |
| `--gj-ink` `#1a1a1a` / `--gj-grey` `#606060` | | Text |
| `--gj-line` `#E0E8E4` / `--gj-bg` `#F5F7F6` / `--gj-surface` `#fff` | | Frames |

**Rules**
- Teal carries the brand. Yellow accents — never two large yellow blocks adjacent.
- Hero & page-header bands are **always `--gj-teal-deep`** with white text.
- Status colours are **only** for status pills (cf. `.brm-st`). Don’t use blue/green as a UI accent.
- Maintain ≥ 4.5:1 on body text. Yellow is for *today/CTA fills with dark ink* — never for body text on white.

### Type
- **Family.** `Segoe UI, system-ui, sans-serif` — set by the prototype to keep the platform fast, low-data, locally-resolvable. Don’t add a webfont without budget approval.
- **Weights used.** 400 / 600 / 700 / **800** (page headings & big numerals).
- **Scale.** Mobile-first and dense — base body is **13px**, secondary 11.5px, captions 10px. Hero `1.6rem` / Section header `1.15rem` / Display numerals `19–28px`.
- See `tokens.css` (`--gj-fs-*`) for the full ramp.

### Borders, radii, elevation
- The signature is the **1.5px stroke**. Cards, fields, chips, pills — all share it. Avoid 1px (looks anaemic) and 2px+ (looks heavy).
- Radii ramp: **3 → 5 → 6 → 8 → 11 → 14 → 999**. Cards mostly `8–11px`. Modals `14px`. Pills `999`.
- Shadows are reserved for **floating** UI: chat (`md`), modals (`lg`). Cards on the page use a stroke instead.
- Card accents: a **4px left rail** in teal (CJS event) or yellow (partner event) is the canonical way to type a card.

### Layout
| Container | Width | Used by |
|---|---|---|
| `--gj-container-narrow` | 380 | Inscription form, test |
| `--gj-container-md` | 680 | Profil, contact |
| `--gj-container-wide` | 820 | Opportunités, ressources, accueil body |
| `--gj-container-x` | 920 | Agenda calendar split, carte des centres |

Sticky header (`z=200`) + sticky filter bar (`z=100`) are the canonical scroll anchors.

---

## 3 — Iconography

**Two systems, never mix in the same row:**

1. **Inline emoji** (90% of the platform) — used as content tags inline with text. Specific glyphs are reserved:
   - 🎓 Études / emploi · 🚀 Entrepreneur / projet · 🤝 Engagement · 📚 Formation · 🌾 Agri · 💼 Compétences · 📍 Localisation · 📅 Agenda · 📄 PDF · 📹 Vidéo · 🛠️ Outil · 💡 Tuto · 🔒 Privacy · 💬 WhatsApp / chat · 🔴 En direct · ✉️ Mail · 📞 Téléphone · 🎉 Notice
2. **Inline SVG marks** for the logo, map dots, hero illustrations and status indicators. SVGs use the brand teal stroke and yellow fill (see logo block).

**Don't** introduce a third icon library (no Lucide / Material). The mixed system is intentional — emoji are universal, SVG carries the brand.

---

## 4 — Components (snapshot)

The full UI kit (`UI Kit.html`) shows live versions of:

- **Navigation** — sticky horizontal scrolling tabs (`.nav .nl`) with sub-link buttons (e-learning, YEAH).
- **Notice bar** — yellow strip for system-wide announcements.
- **Hero** — image-darkened gradient with eyebrow chip + headline + dual-CTA (yellow primary on dark, ghost secondary).
- **Stats strip** — 4–5 numerals, 800-weight teal, 10px label.
- **Objective chips** (`.obj-b`) — tappable “qu’est-ce qui t’intéresse” starters.
- **Opportunity card** — left-rail typed card with title, meta (région · J-N), domain tag, CTA.
- **Agenda event** (`.ev.cj` / `.ev.pa`) — date column + body + status pill (`Confirmé / Prévu / Inscrit`).
- **Calendar** — 7-col grid with `.has` dot indicator, `today` (yellow), `selday` (teal).
- **Resource card** — thumbnail-less, format chip + domain badge.
- **Centre map dots** + slide-in side panel.
- **Test step** — radio-group with progress bar.
- **Inscription stepper** — numbered dots with connecting lines.
- **Profile dashboard** — header, three KPI cards with progress bars, accordions.
- **BRM cards** — programme status (`.brm-card` + `.brm-st`).
- **Status pills** — yellow (à compléter), blue (en cours), green (accordée), red (à envoyer).
- **Toggle**, **chat bubble + window**, **floating action stack**, **detail drawer** (bottom sheet).
- **Form fields** — 1.5px stroke, 6px radius, 6×9 padding.
- **Modals** — 14px radius, 460px max, white surface, brand-CTA full-width.

---

## 5 — Files

| File | Purpose |
|---|---|
| `src/styles/tokens.css` | All design tokens as CSS custom properties (imported by `globals.css`) |
| `src/styles/globals.css` | Global styles — imports tokens, Tailwind, font |
| `tailwind.config.ts` | Maps CSS variables to Tailwind utility classes |
| `design/html/UI Kit.html` | Live component gallery — copy patterns from here |
| `design/html/Foundations.html` | Colour, type, radii, spacing reference card |
| `docs/design/SKILL.md` | Per-task usage guidance for designers continuing this work |

---

## 6 — Source

Everything here is **reverse-engineered from the V5 prototype** shown to the CJS team at the **3 April 2026 atelier**. When in doubt, that file is the ground truth. New surfaces should *feel like* it: dense, friendly, mobile-first, made for low-bandwidth Senegal.
