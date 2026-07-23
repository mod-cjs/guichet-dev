# CURRENT_TASK — GUIC-658 · Accessibilité phase 2 (lecture vocale, curseur, guide)

**Spec** : `.agent_context/specs/GUIC-658-accessibilite-phase2.md` (validée PO 2026-07-23) · **Branche** : `feature/GUIC-658-accessibilite-phase2` (empilée sur `feature/GUIC-581-inclusion-accessibilite` — PR #295 en review) · **JIRA** : sous-tâche de GUIC-580

## Décisions PO (2026-07-23)
- Lecture vocale : **TTS français seul** (fr-FR, voix appareil) — pas de détection wolof (contenus audio enregistrés, badge Lot 6).
- Grand curseur + guide de lecture : **desktop uniquement** (lignes `hidden lg:flex`).
- Invariants phase 1 : opt-in strict, design par défaut inchangé, scope `/jeune/*`, persistance profil + localStorage.

## État
- [x] Extension `A11yPrefs` (cursor/guide/voice) + ATTR_MAP + anti-FOUC + sanitize rétro-compat
- [x] Tokens CSS : `data-cursor` (SVG v4), `#gj-a11y-guide`, affordance hover `data-voice`
- [x] `A11yGadgets` (guide mousemove + TTS clic capture non bloquant) monté dans le layout
- [x] Schéma Zod 10 clés strictes
- [x] Page : 3 nouveaux switches (Lecture & compréhension / Navigation)
- [x] `npm run validate` vert (3687 tests)
- [ ] PR ouverte (base = branche GUIC-581 tant que #295 non mergée ; retarget dev après merge)

## Hors périmètre : wolof TTS (cadrage équipe inclusion avant GUIC-583) · langues nationales (épic i18n) · pages publiques.
