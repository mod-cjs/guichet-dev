# CURRENT_TASK — GUIC-599 · US-4 Déduplication des opportunités

**Épic** : GUIC-595 · **Spec** : `.agent_context/specs/M3-curation-opportunites.md` §4quater (validée lead 2026-07-20)
**Branche** : `feature/GUIC-599-deduplication` (worktree `.claude/worktrees/curation-599`, **stackée sur GUIC-598**)
**JIRA** : GUIC-599 En cours

## Décisions lead (2026-07-20)
- Méthode : empreinte exacte `sha256(titre+org normalisés)` + similarité floue (Jaccard tokens titre ≥ seuil, org OU deadline concordante).
- Comparaison contre : autres ItemCuration (a_valider/approuvee) ET Opportunite publiées.
- Exécution : phase 3 du cron veille (après extraction).

## Périmètre
- Migration : `ItemCuration.empreinteContenu String?` (indexé) + `doublonDeId String?` (self-FK).
- `src/lib/curation/dedup/` : normalisation, empreinteContenu, similarité Jaccard, orchestrateur phase 3.
- Un item `a_valider` dont le contenu existe déjà → `statut doublon` + `doublonDeId` (item) ; si match une Opportunite publiée → `doublon` (note). Le canonique = le plus ancien.
- Phase 3 branchée dans `/api/cron/veille-sources` (verrou Redis partagé).

## TDD
1. RED : normalisation+empreinte, Jaccard/seuil, même annonce 2 sources → 1 canonique+1 doublon ; intégration (doublon+doublonDeId, unique reste a_valider, match Opportunite publiée).
2. GREEN.

## Garde-fous
- **dev a corrigé GUIC-622 (tsc vert)** ; mais mes branches stackées gardent l'ancienne baseline 12 jusqu'au merge de #274. Vérifier tsc = 12 sur ce worktree.
- node_modules partagé (css-select déjà installé). 
- US-4 ne fetch rien (dédup sur contenu déjà extrait) → pas de surface SSRF nouvelle.
