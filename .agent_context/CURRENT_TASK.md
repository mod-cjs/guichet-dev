# CURRENT_TASK — GUIC-682 (stacké sur GUIC-680)

**Épic** GUIC-679 · Story GUIC-682 · Centres en grille de cartes letterhead (registre)
**Branche** `feature/GUIC-682-refonte-admin-centres` (worktree `admin-refonte`, depuis GUIC-680, indépendante de 681)

## Incréments
1. ✅ Helper `centre-accent` (accent par région, réutilise `*-soft`/`*-ink` existants — pas de nouveau token → pas de conflit tokens.css entre branches). TDD 4/4.
2. ✅ `CentreCard` (letterhead région + stats Jeunes/Agents + footer Ressources/Éditer/Supprimer, **zéro hex**). TDD 5/5. Story. Visuel clair+sombre OK.
3. ⏳ **Rewire `centres-admin-table.tsx`** (506 l.) → grille de `CentreCard` (garder Ajouter + skeleton + modal + toast + delete). Map CentreRow→CentreCardData (jeunes=_count.profilsRattaches, agents=_count.agents).
4. ⏳ **Réécrire `tests/unit/admin-centres.test.tsx`** : retirer sentinelle anti-doublon desktop/mobile + en-têtes colonnes ; garder no-hex, prefill édition, delete error/success, create, empty. MAJ « ≥2 par centre » → 1 grille.
5. ⏳ Suite complète + tsc + build, puis commits RED/GREEN + push miroir.

## Garde-fous
- TDD ; hook pre-commit `tests/**` → bypass documenté `SKIP_TDD_CHECK=1` sur GREEN.
- Suite complète locale AVANT push (attrape régressions). Ne pas régresser delete/edit/create.
- Commits `[GUIC-682]` + `Closes GUIC-682`, `mod-cjs`, zéro mention IA. Push mouhammadouod uniquement.
