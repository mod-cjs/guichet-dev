# GUIC-484 — 4 KPI du dashboard recruteur (US-2)

Épic **GUIC-9** · Module **m9-recruteur**

## AC d'origine vs réalité
AC : « Offres actives · Candidatures reçues (variation hebdo) · À examiner · **Entretiens planifiés** ».
**Aucun modèle Entretien** en base (page Entretiens = ComingSoon) → « Entretiens planifiés »
serait une donnée fabriquée (interdit). Le **design v3/v4** montre **Vues** comme 4ᵉ carte.

## Décision (2026-07-02)
- 4ᵉ KPI = **Vues totales** (`sum(Opportunite.vues)` sur les offres du recruteur) — réel + conforme design.
- **Candidatures reçues** : ajout de la **variation hebdomadaire** (« +N cette semaine », `soumiseA ≥ J-7`).
- KPI « À examiner » **mis en évidence** + cliquable → `/recruteur/candidatures?statut=En_attente`.
- KPI « Entretiens planifiés » **reporté** à la livraison du modèle Entretien (GUIC-132/entretiens).

## Loader (`getRecruteurDashboard`)
Ajout à `RecruteurDashboard` :
- `vuesTotales: number` — `prisma.opportunite.aggregate({ where, _sum: { vues: true } })._sum.vues ?? 0`.
- `candidaturesCetteSemaine: number` — `prisma.candidature.count({ where: { …candWhere, soumiseA: { gte: J-7 } } })`.
Aucune migration ; tout tiré de la base.

## UI (`/recruteur/tableau-de-bord`)
- Grille **4 KPI** : Offres actives · Candidatures reçues (sous-ligne « +N cette semaine ») · À examiner · Vues totales.
- Carte « À examiner » : accent action (bleu) + href filtré.

## Tests (TDD) — `tests/unit/recruteur-dashboard.test.ts`
vuesTotales via aggregate `_sum.vues` · vuesTotales=0 si null · candidaturesCetteSemaine filtre `soumiseA.gte` · KPI existants conservés.

## DoD
`npm run validate` vert · 4 KPI réels · PR → dev · Jira Revue. Commentaire de déviation (Entretiens→Vues) sur GUIC-484.
