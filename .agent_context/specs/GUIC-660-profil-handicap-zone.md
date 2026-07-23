# Spec GUIC-660 — Situation de handicap + Zone d'habitation (rural/urbain) au profil bénéficiaire

**Ticket :** GUIC-660 · **Module :** M1 (socle) — extension profil bénéficiaire
**Branche :** `feature/GUIC-660-profil-handicap-zone` (depuis `dev`)
**Source métier :** recommandation Genre & Inclusion (cf. GUIC-580, entretien Geneviève)

---

## Contexte

On collecte deux données socio-démographiques manquantes sur le profil du jeune :
- **Situation de handicap** — enum par type
- **Zone d'habitation** — rural / urbain

Usage : ciblage inclusif des opportunités (tags `priorite-handicap`/`priorite-rural` existants, GUIC-182) + reporting désagrégé (funnel onboarding admin, GUIC-466/475).

Aucun des deux champs n'existe aujourd'hui (schéma, onboarding, profil, vues internes). Étude d'impact réalisée en amont.

⚠️ **Ne pas confondre** « situation de handicap » (donnée socio-démographique, ce ticket) avec le **module d'accessibilité visuelle** GUIC-580 (`ProfilJeune.prefsAccessibilite`, réglages d'affichage). Deux choses distinctes.

---

## Décisions de cadrage (validées PO)

| Sujet | Décision |
|---|---|
| **Handicap** | Enum par type : `aucun · moteur · visuel · auditif · autre · non_precise` — facultatif |
| **Zone** | **Auto-déclarée** (2 boutons Rural / Urbain). Pas de dérivation depuis la commune (la table 415 communes ne porte aucun flag zone) |
| **Score complétion** | **Non compté** — plafond 100 inchangé, `profil-score.ts` non touché |
| **RGPD / anonymisation / consentement** | **Hors périmètre** — champs de profil ordinaires |

---

## Schéma Prisma — changements

```prisma
enum Handicap {
  aucun
  moteur
  visuel
  auditif
  autre
  non_precise
}

enum ZoneHabitation {
  rural
  urbain
}

// model ProfilJeune — après situationEmploi
situationHandicap  Handicap?       @map("situation_handicap")
zoneHabitation     ZoneHabitation? @map("zone_habitation")

// model OnboardingDraft — VARCHAR (cohérent avec genre/region déjà en texte)
situationHandicap  String? @map("situation_handicap") @db.VarChar(20)
zoneHabitation     String? @map("zone_habitation")    @db.VarChar(10)
```

Migration : `prisma migrate dev --name add_handicap_zone_habitation`.
**Pré-requis** : Vague 0 / migration Prisma cassée résolue (`/purge-debt --scope migration`) — sinon `migrate dev` échoue. Migrer les 2 bases (cf. mémoire shadow DB locale).

---

## Périmètre technique par surface

### Constantes & types (socle)
- `src/lib/profil-constants.ts` — `HANDICAP_OPTIONS`, `ZONE_HABITATION_OPTIONS`, helpers `handicapLabel()` / `zoneLabel()`.
- `src/types/profil.ts` — champs `situationHandicap` / `zoneHabitation` dans `ProfilComplet.profil` **et** `PutProfilResponse`.

### Onboarding (écran 2 « Qui es-tu ? », mobile + web)
- `src/lib/validations/onboarding.ts` — étendre `stepProfilSchema` (2 enums optionnels/nullable).
- `src/lib/onboarding-draft.ts` — champs dans `OnboardingDraft`, `RawDraft`, `normalize`.
- `src/app/api/onboarding/draft/route.ts` — `patchSchema` (`.strict()`), `OnboardingDraftDTO`, `DraftRow`, `serialize`, bloc `writable`.
- `src/app/api/v1/onboarding/route.ts` — persister au **step 3** (upsert `ProfilJeune` create+update) + inclure au `select` du GET.
- `src/app/jeune/onboarding/_screens/OnboardingProfil.tsx` (mobile) — Zone (boutons) sous commune, Handicap (Select FACULTATIF) en bas ; `patchDraft` au changement.
- `src/app/jeune/onboarding/_screens-web/OnboardingProfilWeb.tsx` (web) — idem.
- `src/app/jeune/onboarding/_screens/OnboardingRecommandations.tsx` — joindre `draft.situationHandicap`/`draft.zoneHabitation` au body du step 3.

### Profil jeune (édition post-onboarding)
- `src/lib/profil-loader.ts` — SELECT + mapping `loadProfilComplet` (⚠️ expose aussi à Yaye via `get_user_profile` — effet voulu).
- `src/app/api/profil/route.ts` — `PutProfilSchema` (2 enums), `profilData` (spread conditionnel), `PutProfilResponse`. **Ne PAS** toucher `mergedProfil`/`calculerScore`.
- `src/components/profil/SectionProfil.tsx` — Select handicap + boutons zone, POST `/api/profil`.

### Vues internes & exports (lecture)
- Conseiller : `src/lib/loaders/conseiller.ts` (SELECT + interfaces) + `conseiller/beneficiaires/[cjsUid]/page.tsx` + `conseiller/beneficiaires/export/route.ts` (2 colonnes CSV).
- Admin : `admin/utilisateurs/[cjsUid]/page.tsx` + `AdminUserDetail.tsx` (2 `<Field>`) + `api/admin/export/utilisateurs/route.ts` (header + SELECT + ligne).
- (Optionnel) `api/v1/export/utilisateurs/route.ts` — stub Data Hub à implémenter.

---

## Critères d'acceptation

- [ ] Le jeune peut renseigner handicap + zone à l'onboarding (facultatif)
- [ ] Modifiable depuis Mon Profil
- [ ] Persistés sur `ProfilJeune` + repris via draft (switch device)
- [ ] Visibles sur la fiche bénéficiaire conseiller **et** admin
- [ ] Présents dans les exports CSV admin **et** conseiller
- [ ] N'affectent PAS le score de complétion
- [ ] `npm run validate` vert · TDD (RED avant GREEN)

---

## Hors périmètre

- RGPD / anonymisation / consentement / exclusion logs
- Comptage dans le score de complétion
- Filtrage recommandations Yaye par zone/handicap (phase 2 possible)
- Dérivation automatique commune → zone

---

## Découpage commits TDD

1. `test/feat(m1-socle): [GUIC-660] schéma + enums + constants + types`
2. `test/feat(m1-socle): [GUIC-660] validation + draft + persistance onboarding`
3. `test/feat(m1-socle): [GUIC-660] UI onboarding (mobile+web) + envoi step 3`
4. `test/feat(m1-socle): [GUIC-660] profil-loader + /api/profil + SectionProfil`
5. `test/feat(m1-socle): [GUIC-660] vues conseiller + admin + exports CSV`
