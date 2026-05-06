# Spec GUIC-18 — Tunnel onboarding 3 étapes

**Ticket :** GUIC-18 | **Sprint :** Sprint 1 | **Points :** 5
**Branche :** `feature/GUIC-18-onboarding-wizard`

---

## Périmètre

Après la première authentification SSO d'un `beneficiaire`, forcer un tunnel
3 étapes pour compléter le profil avant d'accéder à l'application.

---

## Flux utilisateur

```
SSO callback → Utilisateur créé en base (upsert)
  → onboardingComplete = false ?
    → redirect /jeune/onboarding
    → Step 1 : Identité  (nom, prénom, dateNaissance, genre)
    → Step 2 : Localisation (region, commune)
    → Step 3 : Profil pro (niveauEtude, situationEmploi, domainesInteret)
    → PUT /api/v1/onboarding?step=3 → onboardingComplete = true
    → Session mise à jour → redirect /jeune/tableau-de-bord
  → onboardingComplete = true → flux normal
```

---

## Changements schéma Prisma

### `Utilisateur` — 2 nouveaux champs

```prisma
onboardingComplete Boolean  @default(false) @map("onboarding_complete")
commune            String?  @db.VarChar(100)
```

Migration : `prisma/migrations/20260506000000_add_onboarding/migration.sql`

---

## Changements types

### `CJSSession` (`src/types/user.ts`)

```typescript
onboardingComplete: boolean   // ← nouveau
```

### Callback SSO (`src/app/auth/callback/route.ts`)

Après `getUserInfo()`, **upsert `Utilisateur`** :
```typescript
const utilisateur = await prisma.utilisateur.upsert({
  where:  { cjsUid: claims.sub },
  update: { nom, prenom, email, telephone, region, updatedAt: new Date() },
  create: { cjsUid, nom, prenom, email, telephone, region },
  select: { onboardingComplete: true },
})
```
Inclure `onboardingComplete` dans la session JWT.

Redirection post-login :
- `beneficiaire` + `!onboardingComplete` → `/jeune/onboarding`
- `beneficiaire` + `onboardingComplete` → `/jeune/tableau-de-bord` (ou `returnTo`)
- `recruteur` → `/recruteur/tableau-de-bord`
- `admin` → `/admin/tableau-de-bord`

---

## API

### `GET /api/v1/onboarding`

Retourne les données déjà saisies (pré-remplissage si l'utilisateur revient).

```typescript
// Response
{
  data: {
    step: number           // dernière étape complétée (0 si nouveau)
    identite: {
      nom: string; prenom: string
      dateNaissance: string | null
      genre: 'HOMME' | 'FEMME' | 'AUTRE' | null
    }
    localisation: { region: Region | null; commune: string | null }
    profil: {
      niveauEtude: string | null
      situationEmploi: string | null
      domainesInteret: string[]
    }
  }
}
```

### `PUT /api/v1/onboarding`

```typescript
// Body — un step à la fois
{ step: 1, data: { nom, prenom, dateNaissance?, genre? } }
{ step: 2, data: { region, commune? } }
{ step: 3, data: { niveauEtude?, situationEmploi?, domainesInteret? } }

// Response
{ data: { nextStep: 2 | 3 | null, onboardingComplete: boolean } }
```

Step 3 : crée/upsert `ProfilJeune` + passe `onboardingComplete = true` sur `Utilisateur`.
Retourner cookie session mis à jour (`onboardingComplete: true`).

---

## Middleware forceOnboarding

Dans `src/middleware.ts`, après le check de session pour `/jeune/*` :

```typescript
// Si beneficiaire non onboardé → forcer l'onboarding
if (
  session.roles.includes('beneficiaire') &&
  !session.onboardingComplete &&
  !pathname.startsWith('/jeune/onboarding')
) {
  return NextResponse.redirect(new URL('/jeune/onboarding', request.url))
}
```

---

## Pages et composants

| Fichier | Description |
|---|---|
| `src/app/jeune/onboarding/page.tsx` | Page wrapper (Server Component — passe session) |
| `src/components/features/OnboardingWizard/index.tsx` | Wizard client 3 étapes |
| `src/components/features/OnboardingWizard/StepIdentite.tsx` | Formulaire étape 1 |
| `src/components/features/OnboardingWizard/StepLocalisation.tsx` | Formulaire étape 2 |
| `src/components/features/OnboardingWizard/StepProfil.tsx` | Formulaire étape 3 |

### Persistance inter-étapes

`useLocalStorage('onboarding_draft', {})` — effacé à la completion.
PUT à chaque étape (pas seulement à la fin).

### UI

- Barre de progression `Step X / 3` en haut
- Boutons Précédent / Suivant / Terminer
- Tokens `gj-teal` pour l'accent, `gj-yellow` pour le CTA final
- Mobile-first, layout sans `BottomNav` (pas encore onboardé)

---

## Validation Zod

```typescript
// src/lib/validations/onboarding.ts
export const stepIdentiteSchema = z.object({
  nom:           z.string().min(2).max(100),
  prenom:        z.string().min(2).max(100),
  dateNaissance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  genre:         z.enum(['HOMME', 'FEMME', 'AUTRE']).optional(),
})
export const stepLocalisationSchema = z.object({
  region:  z.string(),    // enum Region
  commune: z.string().max(100).optional(),
})
export const stepProfilSchema = z.object({
  niveauEtude:     z.string().optional(),
  situationEmploi: z.string().optional(),
  domainesInteret: z.array(z.string()).max(5).optional(),
})
```

---

## Tests Playwright (sous-tâche)

- `tests/e2e/onboarding.spec.ts`
- Scénarios : complétion 3 étapes, retour en arrière, refresh mid-flow, accès `/jeune/*` sans onboarding

---

## Ordre d'implémentation

1. Migration Prisma (+ `prisma migrate dev`)
2. Types `CJSSession` + upsert dans callback
3. `GET` / `PUT` `/api/v1/onboarding`
4. Middleware forceOnboarding
5. Composant `OnboardingWizard`
6. Page `/jeune/onboarding`
7. Tests Playwright
