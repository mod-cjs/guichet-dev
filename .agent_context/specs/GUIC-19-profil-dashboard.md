# Spec GUIC-19 — Tableau de bord jeune + diplômes + activités

**Ticket :** GUIC-19 · **Sprint :** 1 · **Story Points :** 5
**Module :** M2 (profil jeune authentifié) — extension de GUIC-18
**Branche prévue :** `feature/GUIC-19-dashboard-diplomes` (rebase sur `feature/GUIC-18-profil-jeune`)

---

## Contexte

GUIC-18 a livré : OAuth PKCE, onboarding 3 étapes, page `/jeune/mon-profil` avec sections Identité / Profil / Expériences / Certificats, API `GET/PUT /api/profil` + CRUD expériences, score de complétion, composant `CompletionBar`.

GUIC-19 complète ce socle avec les **manques fonctionnels réels** :

1. **Diplômes** — colonne `ProfilJeune.diplomes` (Json) présente dans le schéma mais aucune API ni UI ⇒ refonte en table relationnelle `Diplome`.
2. **Dashboard jeune** — `/jeune/tableau-de-bord` n'affiche qu'un message d'accueil ⇒ compteurs + flux d'activités récentes.
3. **Endpoint activités** — `/api/profil/activity` à créer (agrégation à la volée).

### Hors scope GUIC-19
- **Disponibilité** : reporté (à cadrer avec recruteurs)
- **Certificats Moodle** : déjà rendus en read-only via webhook m10-interop (pas de saisie manuelle prévue)
- **Upload PDF justificatif** : pas de service de stockage configuré, à reporter

---

## Schéma Prisma — changements

### Nouveau modèle `Diplome`
```prisma
model Diplome {
  id              String   @id @default(uuid()) @db.VarChar(36)
  profilId        String   @map("profil_id") @db.VarChar(36)
  intitule        String   @db.VarChar(200)                  // ex: "Licence en Informatique"
  etablissement   String   @db.VarChar(200)                  // ex: "Université Cheikh Anta Diop"
  anneeObtention  Int      @map("annee_obtention")           // ex: 2024
  niveau          String   @db.VarChar(50)                   // valeurs NIVEAU_ETUDE_OPTIONS
  mention         String?  @db.VarChar(50)                   // optionnel — beaucoup de diplômes sans mention
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  profil          ProfilJeune @relation(fields: [profilId], references: [id], onDelete: Cascade)

  @@index([profilId])
  @@map("diplomes")
}
```

### Modification `ProfilJeune`
- Ajout relation : `diplomes Diplome[]`
- Suppression de la colonne `diplomes Json?` (non utilisée — vérifier `SELECT COUNT(*) FROM profils_jeunes WHERE diplomes IS NOT NULL` avant migration en prod)
- Migration nommée : `20260520000000_add_diplomes_table_drop_json`

### Constantes ajoutées (`src/lib/profil-constants.ts`)
```ts
export const MENTION_OPTIONS = [
  { value: 'passable',   label: 'Passable'    },
  { value: 'assez_bien', label: 'Assez bien'  },
  { value: 'bien',       label: 'Bien'        },
  { value: 'tres_bien',  label: 'Très bien'   },
  { value: 'excellent',  label: 'Excellent'   },
] as const

export const ANNEE_OBTENTION_MIN = 1950
```

---

## Score de complétion — addition simple, pas de redistribution

`src/lib/profil-score.ts` — barème actuel (somme 100) + nouvel item :

| Item | Points |
|---|---|
| region | 10 |
| genre | 5 |
| dateNaissance | 5 |
| commune | 5 |
| biographie | 20 |
| niveauEtude | 10 |
| situationEmploi | 10 |
| domainesInteret non vide | 15 |
| competences non vide | 10 |
| expCount > 0 | 10 |
| **`diplomeCount > 0` (NEW)** | **10** |

Somme théorique = 110, écrêtée par `Math.min(s, 100)` déjà en place. **Aucune régression** sur les profils existants : un jeune à 100 avant reste à 100, un jeune à 90 avant peut désormais atteindre 100 en ajoutant un diplôme.

Signature mise à jour : `calculerScore(identite, profil, expCount, diplomeCount)`.

---

## Contrats API

### `GET /api/profil/diplomes`
Auth requise. Rate-limit 30 req/min.
```ts
// Response 200
{ data: Diplome[] }   // triés anneeObtention DESC
```

### `POST /api/profil/diplomes`
Auth + rate-limit 10/min par user. Cohérent avec POST experiences.
```ts
// Body (Zod)
{
  intitule: string (2..200),
  etablissement: string (2..200),
  anneeObtention: number (1950..currentYear),
  niveau: NiveauEtudeValue,
  mention?: 'passable'|'assez_bien'|'bien'|'tres_bien'|'excellent' | null,
}
// Response 201 → { data: Diplome }
// Limite : max 20 diplômes par profil → 400 LIMIT_REACHED
// Recalcul + persist score si premier diplôme (passe de 0 à 1)
```

### `PUT /api/profil/diplomes/[id]`
Ownership : 404 si `profil.cjsUid !== session.cjsUid`. Body = champs partiels du POST. Réponse `{ data: Diplome }`. (`PUT` choisi pour cohérence avec `PUT /api/profil` du projet, pas `PATCH`.)

### `DELETE /api/profil/diplomes/[id]`
Idem ownership. Réponse 204. Recalcul score si c'était le dernier diplôme.

### `GET /api/profil/activity?limit=10`
Auth requise. Rate-limit 30 req/min. Limit clamp 1..20 (défaut 10).
```ts
// Response 200
{ data: { items: ActivityItem[] } }  // triés date DESC, max `limit`

type ActivityItem =
  | { type: 'candidature',           id, date, opportuniteTitre,  statut }
  | { type: 'inscription_evenement', id, date, evenementTitre,    dateEvent }
  | { type: 'favori_ressource',      id, date, ressourceTitre }
  | { type: 'experience_ajoutee',    id, date, poste, organisation }
  | { type: 'diplome_ajoute',        id, date, intitule, anneeObtention }
  | { type: 'certificat_recu',       id, date, intitule, urlCertificat }
```

**Implémentation** : 5 requêtes parallèles (`Promise.all`) avec `take: limit + 5` (marge pour merge correct), `orderBy createdAt|soumiseA desc`, puis merge + tri JS + slice(limit). Aucune nouvelle table.

> **Pas d'endpoint `/api/profil/dashboard`** : la page tableau-de-bord est server-rendered et appelle directement `lib/dashboard-loader.ts` (Prisma). Exposer un endpoint REST consommé par rien serait du code mort.

---

## Frontend

### `/jeune/tableau-de-bord` (refonte server component)

Layout :
```
┌─ Hero (prénom + CompletionBar + CTA "Compléter" si score < 80) ─────────┐
│                                                                          │
├─ Grille compteurs (responsive 2/3/6 cols) ──────────────────────────────┤
│  Candidatures · Events inscrits · Favoris · Certificats · Exp · Diplômes│
│                                                                          │
├─ Activités récentes (10 items max) ─────────────────────────────────────┤
│  Icône SVG par type · libellé contextuel · timeAgo fr                   │
│                                                                          │
├─ Raccourcis (3 cards CTA) ──────────────────────────────────────────────┤
│  Voir mon profil · Voir opportunités · Voir événements                  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Données : appel **direct** à `lib/dashboard-loader.ts` côté server (parallélisation Prisma via `Promise.all`). Pas d'auto-fetch HTTP.
- Composants à créer : `DashboardCompteurs`, `ActivityFeed`, `ActivityItemRow`, `DashboardCTACard`
- Tokens : `gj-teal` (compteurs), `gj-yellow` (alertes complétion), icônes SVG inline `currentColor` (jamais d'emojis dans le markup final)
- BottomNav : route `/jeune/tableau-de-bord` reste l'item actif par défaut

### `SectionDiplomes` dans `/jeune/mon-profil`
- **Pattern identique à `SectionExperiences`** : liste + modal d'ajout + edit inline ou modal + delete avec confirm. **PAS d'auto-save sur blur** (items discrets, pas champs plats).
- Insertion entre `SectionProfil` et `SectionExperiences`
- Form : intitulé, établissement, année (select 1950..currentYear), niveau (select `NIVEAU_ETUDE_OPTIONS`), mention (select optionnel)
- Callback `onScoreChange` propage le nouveau score à `ProfilHeader` (pattern Experience existant)

---

## Fichiers à créer / modifier

### Nouveaux
- `prisma/migrations/20260520000000_add_diplomes_table_drop_json/migration.sql`
- `src/app/api/profil/diplomes/route.ts` — GET + POST
- `src/app/api/profil/diplomes/[id]/route.ts` — PUT + DELETE
- `src/app/api/profil/activity/route.ts` — GET
- `src/lib/dashboard-loader.ts` — `loadDashboard(cjsUid)` (compteurs) et `loadActivity(cjsUid, limit)`
- `src/lib/validations/diplome.ts` — schémas Zod (CreateDiplomeSchema, UpdateDiplomeSchema)
- `src/components/profil/SectionDiplomes.tsx`
- `src/components/dashboard/DashboardCompteurs.tsx`
- `src/components/dashboard/ActivityFeed.tsx`
- `src/components/dashboard/ActivityItemRow.tsx`
- `src/components/dashboard/DashboardCTACard.tsx`
- `src/types/diplome.ts` + types `DashboardData`, `ActivityItem` (dans `src/types/profil.ts`)

### Tests (TDD — écrits AVANT le code, cf feedback projet)
- `tests/unit/profil-score.test.ts` — nouveau cas `diplomeCount > 0` (+10), cap 100 préservé, no-regression cas all-set
- `tests/integration/diplomes-api.test.ts` — GET/POST/PUT/DELETE, ownership, limite 20, rate-limit
- `tests/integration/activity-api.test.ts` — merge 5 sources, tri, limit clamp, auth
- `tests/unit/dashboard-loader.test.ts` — compteurs corrects vs base seedée

### Modifiés
- `prisma/schema.prisma` — ajout `Diplome`, relation, drop colonne JSON
- `src/lib/profil-constants.ts` — `MENTION_OPTIONS`, `ANNEE_OBTENTION_MIN`
- `src/lib/profil-score.ts` — signature + nouveau cas
- `src/lib/profil-loader.ts` — inclure diplômes dans `loadProfilComplet`, passer `diplomeCount` à `calculerScore` dans `recalculerEtPersisterScore`
- `src/app/api/profil/route.ts` — passer `diplomeCount` à `calculerScore`
- `src/app/api/profil/experiences/[id]/route.ts` + `route.ts` — vérifier que le recalcul score est toujours appelé (sinon ajout)
- `src/app/jeune/(app)/tableau-de-bord/page.tsx` — refonte complète
- `src/components/profil/ProfilClient.tsx` — insérer `<SectionDiplomes>` entre Profil et Experiences
- `src/components/profil/index.ts` — export `SectionDiplomes`
- `src/types/profil.ts` — champ `diplomes: DiplomeItem[]` dans `ProfilComplet`

---

## Critères Done

### Backend
- [ ] Migration Prisma appliquée sans data loss (contrôle pré-migration sur colonne JSON)
- [ ] 4 endpoints diplômes (GET / POST / PUT / DELETE) — tests d'intégration verts
- [ ] Endpoint `/api/profil/activity` — items mixtes triés, limit respecté
- [ ] `calculerScore` mis à jour, total max = 100, no-regression confirmée par tests
- [ ] Rate-limits sur tous les nouveaux endpoints (cohérent GUIC-18)
- [ ] Ownership vérifiée sur PUT/DELETE diplôme (404 si autre user, jamais 403 — évite information leak)

### Frontend
- [ ] `/jeune/tableau-de-bord` affiche compteurs réels en SSR (pas de skeleton)
- [ ] Flux activités affiche 10 items mixtes, timeAgo en français (`fr` locale)
- [ ] `SectionDiplomes` permet add/edit/delete via modal (cohérent UX avec Experiences)
- [ ] Aucun emoji dans le markup final, icônes SVG `currentColor`, tokens `gj-*` uniquement
- [ ] CompletionBar reflète le nouveau score après ajout/suppression diplôme (callback `onScoreChange`)

### Qualité (workflow TDD)
- [ ] Tests écrits AVANT le code (TDD obligatoire — cf feedback projet)
- [ ] `npm run lint` + `npm run test` + `npm run build` verts
- [ ] Pas de SQL brut, `ApiResponse<T>` partout, `Zod` partout
- [ ] CURRENT_TASK.md mis à jour, commit `[GUIC-19]` + `Closes GUIC-19`, auteur `mod-cjs`, aucune mention IA

---

## Questions ouvertes / à décider en revue PR

1. **Drop `ProfilJeune.diplomes` (Json)** : OK car non lu/écrit par le code actuel. Pré-flight SQL à exécuter avant la migration prod.
2. **Activité "candidature"** : le modèle `Candidature` utilise `soumiseA` (pas `createdAt`). À aligner dans `dashboard-loader.ts`.
3. **Pagination du flux activités** : non prévue en GUIC-19 (limit fixe ≤ 20). Ticket de suivi à ouvrir si besoin.
4. **Format des dates côté UI** : utiliser `Intl.RelativeTimeFormat('fr')` natif ou `date-fns/formatDistance` (déjà dépendance ?). À vérifier avant implem.
