# GUIC-487 — Candidats avec score d'adéquation (US-5)

Épic **GUIC-9** · Module **m9-recruteur** + IA

## Décision (arbitrée)
Score **IA (Groq)** — le LLM évalue l'adéquation candidat/offre à partir des signaux
structurés (pas d'extraction CV PDF ce lot). Réutilise `getGroq()` (jamais recréé).

## Modèle (migration `add_score_adequation`)
`Candidature` : `scoreAdequation Int?`, `scoreRaison String? @Text`, `scoreCalculeLe DateTime?`.
Nullable → `null` tant que non calculé (UI « — »).

## Service `src/lib/recruteur/adequation.ts`
- `buildAdequationMessages(input)` (pur) : system + user à partir de {offre: titre/description/skills/niveauMin ; candidat: niveau/competences/lettre}.
- `parseScore(raw)` (pur) : JSON `{score, raison}` → score clampé 0-100 + raison ; `null` si invalide.
- `computeScoreAdequation(candidatureId)` : charge signaux (offre + `ProfilJeune`) → Groq
  (`response_format json_object`, temperature 0) → stocke sur la candidature. **Fail-soft**.

## Trigger
`POST /api/candidatures` (bloc `after()`, post-réponse) → `computeScoreAdequation(id)` (best-effort).

## UI
- Badge **% d'adéquation** (couleur selon palier) sur : liste Candidatures, détail candidature,
  dashboard « À examiner ». `raison` en tooltip/sous-texte au détail. « — » si non calculé.

## Tests (TDD) — `tests/unit/adequation-score.test.ts`
buildAdequationMessages (signaux présents, champs vides) · parseScore (valide, clamp, arrondi, invalide→null).

## DoD
Migration appliquée · `npm run validate` vert · score affiché · PR → dev · Jira Revue.
Hors périmètre : extraction/ranking du texte CV PDF, recalcul périodique.
