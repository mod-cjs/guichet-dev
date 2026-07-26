# CURRENT_TASK — GUIC-681 (stacké sur GUIC-680)

**Épic** GUIC-679 · Refonte console admin — registre + thème clair/sombre
**Story** GUIC-681 · Partenaires — grille de cartes letterhead + panneau-dossier (registre)
**Branche** `feature/GUIC-681-refonte-admin-partenaires` (worktree `admin-refonte`, **stackée sur GUIC-680** car dépend de la fondation registre pas encore sur `dev`)
**Spec** `.agent_context/specs/admin-console-refonte.md` §2.1

## Décisions
- Paradigme **cartes-grille + slide-over** (validé lead).
- Thème clair (défaut) + sombre commuté via la fondation GUIC-680.
- Réutiliser les server actions existantes : `basculerVerifiePartenaire`, `basculerStatutRecruteur`, `modifierPartenaire`.

## Plan d'exécution (incréments)
1. ✅ **Palette secteur** (tokens `--gj-sector-*` RGB) + helper pur `partenaire-secteur` (TDD 3/3).
2. ✅ **`PartenaireCard`** letterhead (TDD 4/4) + story + baril. Rendu vérifié clair+sombre, 0 erreur.
3. ⏳ **`PartenaireSheet`** (dossier slide-over, primitive `Sheet`) — dossier + actions vérifier/éditer(`PartenaireFormModal`)/suspendre(`RecruteurStatutButton`) + lien fiche complète. **Doit reloger l'édition** (aujourd'hui seul point d'entrée = la table).
4. ⏳ **Rewire `AdminPartenairesTable`** → grille de `PartenaireCard` (garder filtres/recherche/pagination), carte → ouvre le sheet. **MAJ du test `tests/unit/admin-partenaires.test.tsx`** (comme le cas topbar).
5. ⏳ Vérif : `validate` + `tsc` + Playwright 2 thèmes, puis commits RED/GREEN + push miroir.

## Garde-fous
- TDD strict (RED avant GREEN). Hook pre-commit ne voit que `tests/**` ⇒ bypass documenté `SKIP_TDD_CHECK=1` (loggué).
- Ne pas régresser l'édition : sheet AVANT rewire, dans le même incrément que le rewire.
- Ne pas committer/push sans go. Commits `feat|test(m8-admin): [GUIC-681] …` + `Closes GUIC-681`, `mod-cjs`, zéro mention IA. Push **mouhammadouod** uniquement.
