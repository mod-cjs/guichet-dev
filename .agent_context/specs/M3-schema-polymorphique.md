# M3 v2 — Schéma opportunités polymorphique (CTI)

**Tickets :** [GUIC-177](https://consortiumjeunesse.atlassian.net/browse/GUIC-177) (cette spec) · [GUIC-178](https://consortiumjeunesse.atlassian.net/browse/GUIC-178) (exécution migration) · parent [GUIC-17](https://consortiumjeunesse.atlassian.net/browse/GUIC-17) (origine — ERD initial polymorphique en attachement, commentaire #10302)
**Branche spec :** `feature/GUIC-177-spec-migration-schema-m3` (depuis `feature/GUIC-175-dette-refonte-v2`)
**Statut :** Validée Lead 2026-05-29
**Auteur :** mod-cjs · **Date :** 2026-05-29

---

## 1. Contexte et objectif

### 1.1 Pourquoi ce changement

Le modèle `Opportunite` actuel (cf. `prisma/schema.prisma` §M3) est une table mono-bloc
qui agrège six types d'opportunités fonctionnellement très différents (`Emploi`, `Stage`,
`Formation`, `Bourse`, `Volontariat`, `Appel_a_projets`) derrière un même enum
`TypeOpportunite`. En pratique :

- Les champs spécifiques (durée d'un stage, montant d'une bourse, autorité de décision
  d'un appel à projets, niveau d'études requis pour une formation, type de contrat pour
  un emploi…) ne sont **pas modélisés** — ils transitent dans `description: LongText`
  ou dans un sac à puces non-typé. L'UX en souffre (filtres pauvres, détail générique)
  et l'IA Yaye ne peut pas matcher finement.
- Le workflow de candidature est **uniformément** « Postuler » alors qu'un appel à
  projets se *soumet* (avec dossier PDF), un concours s'*inscrit* (avec preuves), une
  bourse se *demande* (formulaire long), un emploi se *postule* (CV + lettre).
- Les programmes sectoriels (Yaakaar, YEAH, YJC, EduPop) ne sont **pas** liés à une
  opportunité en base ; ils sont uniquement décoratifs (constante TS gradients).
- Les enums `Domaine` et `Region` sont fermés et empêchent l'ajout de skills ou de tags
  libres pour le matching.

Ce changement introduit un schéma **Class Table Inheritance (CTI)** : une table mère
`Opportunite` portant les champs communs + six tables filles 1:1 portant les champs
spécifiques de chaque sous-type. Les programmes deviennent une vraie référence FK. Les
contrats API externes sont préservés via une couche DTO.

### 1.2 Périmètre validé (Lead, 2026-05-29 — commentaire GUIC-17 #10302)

| # | Décision | Validée |
|---|---|---|
| D1 | 6 sous-types CTI : `EMPLOI`, `STAGE`, `FORMATION`, `BOURSE`, `CONCOURS`, `APPEL_A_PROJETS` (remplace l'enum 6 valeurs actuel, `Volontariat` fusionne dans `APPEL_A_PROJETS`/`STAGE` selon cas) | ✅ |
| D2 | Sortie de `OPPORTUNITY_CENTRE` / `OPPORTUNITY_EVENEMENT` / `OPPORTUNITY_RESSOURCE` du polymorphe initial → modèles séparés préservés (`Centre`, `Evenement`, `Ressource` actuels gardés tels quels) | ✅ |
| D3 | Table `Programme` (4 entrées : Yaakaar, YEAH, YJC, EduPop) + `Opportunite.programmeId` FK nullable | ✅ |
| D4 | Extension `OpportuniteType` (table de référence) avec `actionLabel`, `requiresFileUpload`, `fileLabel`, `decisionAuthority` | ✅ |
| D5 | Préservation des contrats API publics et interop via couche DTO (cf. §6) | ✅ |
| D6 | BRM = outil interne (sortie de la liste programmes sectoriels) | ✅ |

### 1.3 Hors périmètre

- `Evenement` / `InscriptionEvenement` (M5) — pas touchés
- `Ressource` / `RessourceFavorite` (M6) — pas touchés
- `Centre` / `AgentCentre` (M4) — pas touchés
- Réservations (système distinct, hors M3)
- UI d'administration des programmes (M8 — différée)
- Refonte des écrans candidat (Phase 2B — sera construite sur ce schéma)
- Migration Drupal (GUIC-17 reste prioritaire ; cette migration s'exécute **après**
  GUIC-17 sur `dev` et `staging`)

---

## 2. ERD final

```mermaid
erDiagram
    Programme ||--o{ Opportunite : "programme_id"
    OpportuniteType ||--o{ Opportunite : "type_id"
    Organisation ||--o{ Opportunite : "organisation_id"

    Opportunite ||--o| OpportuniteEmploi : "1:1 (si type=EMPLOI)"
    Opportunite ||--o| OpportuniteStage : "1:1 (si type=STAGE)"
    Opportunite ||--o| OpportuniteFormation : "1:1 (si type=FORMATION)"
    Opportunite ||--o| OpportuniteBourse : "1:1 (si type=BOURSE)"
    Opportunite ||--o| OpportuniteConcours : "1:1 (si type=CONCOURS)"
    Opportunite ||--o| OpportuniteAppelAProjets : "1:1 (si type=APPEL_A_PROJETS)"

    Opportunite ||--o{ OpportuniteSkill : "M:N skills"
    Skill ||--o{ OpportuniteSkill : ""
    Opportunite ||--o{ OpportuniteTag : "M:N tags"
    Tag ||--o{ OpportuniteTag : ""

    Opportunite ||--o{ Candidature : "candidatures"
    Opportunite ||--o{ OpportuniteFavorite : "favoris"
    Utilisateur ||--o{ Candidature : ""
    Utilisateur ||--o{ OpportuniteFavorite : ""

    Programme {
        string id PK
        string slug UK
        string nom
        string description
        string gradientToken
        boolean actif
    }

    OpportuniteType {
        string id PK
        string slug UK "EMPLOI|STAGE|FORMATION|BOURSE|CONCOURS|APPEL_A_PROJETS"
        string libelle
        string actionLabel "Postuler|Candidater|Soumettre|S'inscrire|Demander"
        boolean requiresFileUpload
        string fileLabel
        string decisionAuthority "Organisation|Jury CJS|Comité ministériel"
        boolean actif
    }

    Opportunite {
        string id PK
        int drupalNid UK
        string slug UK
        string titre
        text description
        string typeId FK
        string programmeId FK
        string organisationId FK
        string organisationLibelle
        enum domaine
        enum region
        string remuneration
        datetime deadline
        string lienExterne
        enum statut
        string recruteurUid
        int vues
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    OpportuniteEmploi {
        string opportuniteId PK_FK
        enum typeContrat "CDI|CDD|FREELANCE|ALTERNANCE"
        int dureeContratMois
        string experienceRequise
        boolean teletravail
        string niveauEtudeMin
    }

    OpportuniteStage {
        string opportuniteId PK_FK
        int dureeMois
        boolean conventionneEcole
        boolean indemnise
        int indemniteMensuelleFcfa
        string niveauEtudeMin
        date dateDebutPrevue
    }

    OpportuniteFormation {
        string opportuniteId PK_FK
        int dureeHeures
        enum modalite "PRESENTIEL|DISTANCE|HYBRIDE"
        boolean certifiante
        string organismeCertificateur
        string prerequis
        boolean gratuite
        int fraisInscriptionFcfa
    }

    OpportuniteBourse {
        string opportuniteId PK_FK
        int montantTotalFcfa
        int dureeMois
        string niveauEtudeRequis
        string paysDestination
        string organismeFinanceur
        boolean coupleObligatoire
    }

    OpportuniteConcours {
        string opportuniteId PK_FK
        string organismeOrganisateur
        date dateEpreuves
        string lieuEpreuves
        string preuvesDemandees
        int placesDisponibles
    }

    OpportuniteAppelAProjets {
        string opportuniteId PK_FK
        int budgetMaxFcfa
        int dureeProjetMois
        string thematique
        string dossierRequis
        string criteresEligibilite
    }

    Skill {
        string id PK
        string slug UK
        string libelle
        string categorie
    }

    OpportuniteSkill {
        string opportuniteId PK_FK
        string skillId PK_FK
        boolean requise
    }

    Tag {
        string id PK
        string slug UK
        string libelle
    }

    OpportuniteTag {
        string opportuniteId PK_FK
        string tagId PK_FK
    }
```

**Note Domaine / Region** : conservés en `enum` Prisma (cf. §4.2). Skill et Tag
deviennent tables (cardinalité libre + référence partagée).

---

## 3. Modèles Prisma cibles

### 3.1 Table de référence — `Programme`

```prisma
// Programmes sectoriels CJS (4 — Yaakaar, YEAH, YJC, EduPop).
// BRM = outil interne, exclu (décision Lead 2026-05-29).
model Programme {
  id            String        @id @default(uuid()) @db.VarChar(36)
  slug          String        @unique @db.VarChar(40) // yaakaar|yeah|yjc|edupop
  nom           String        @db.VarChar(80)
  description   String        @db.VarChar(255)
  gradientToken String        @map("gradient_token") @db.VarChar(80) // var(--prog-*)
  actif         Boolean       @default(true)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  opportunites  Opportunite[]

  @@map("programmes")
}
```

### 3.2 Table de référence — `OpportuniteType`

```prisma
// Types d'opportunité — remplace l'enum TypeOpportunite.
// Permet d'ajouter dynamiquement actionLabel, workflow, autorité de décision
// sans migration Prisma (juste seed).
model OpportuniteType {
  id                  String        @id @default(uuid()) @db.VarChar(36)
  slug                String        @unique @db.VarChar(40)
  // EMPLOI|STAGE|FORMATION|BOURSE|CONCOURS|APPEL_A_PROJETS
  libelle             String        @db.VarChar(80)
  // Verbe d'action affiché sur le bouton principal du détail
  actionLabel         String        @map("action_label") @db.VarChar(40)
  // Postuler|Candidater|Soumettre|S'inscrire|Demander
  requiresFileUpload  Boolean       @default(false) @map("requires_file_upload")
  // Libellé du champ d'upload (CV, Dossier PDF, Lettre de motivation…)
  fileLabel           String?       @map("file_label") @db.VarChar(80)
  // Décideur final (Organisation, Jury CJS, Comité ministériel…)
  decisionAuthority   String?       @map("decision_authority") @db.VarChar(100)
  actif               Boolean       @default(true)
  ordre               Int           @default(0) // tri UI
  createdAt           DateTime      @default(now()) @map("created_at")
  updatedAt           DateTime      @updatedAt @map("updated_at")

  opportunites        Opportunite[]

  @@map("opportunite_types")
}
```

### 3.3 Table mère — `Opportunite`

```prisma
model Opportunite {
  id                  String            @id @default(uuid()) @db.VarChar(36)
  drupalNid           Int?              @unique @map("drupal_nid")
  slug                String            @unique @db.VarChar(280)
  titre               String            @db.VarChar(255)
  description         String            @db.LongText

  typeId              String            @map("type_id") @db.VarChar(36)
  programmeId         String?           @map("programme_id") @db.VarChar(36)
  organisationId      String?           @map("organisation_id") @db.VarChar(36)
  // Texte libre conservé pour les opportunités orphelines (sans entité Organisation)
  organisationLibelle String            @map("organisation_libelle") @db.VarChar(200)

  domaine             Domaine
  region              Region?
  remuneration        String?           @db.VarChar(100)
  deadline            DateTime?
  lienExterne         String?           @map("lien_externe") @db.VarChar(500)
  statut              StatutOpportunite @default(brouillon)
  recruteurUid        String?           @map("recruteur_uid") @db.VarChar(36)
  vues                Int               @default(0)
  createdAt           DateTime          @default(now()) @map("created_at")
  updatedAt           DateTime          @updatedAt @map("updated_at")
  deletedAt           DateTime?         @map("deleted_at")

  type                OpportuniteType   @relation(fields: [typeId], references: [id])
  programme           Programme?        @relation(fields: [programmeId], references: [id], onDelete: SetNull)
  org                 Organisation?     @relation(fields: [organisationId], references: [id], onDelete: SetNull)

  // Sous-types 1:1 (un seul des six est non-null pour une opportunité donnée — invariant
  // applicatif validé par OpportuniteService ; pas de CHECK SQL XOR portable MariaDB)
  emploi              OpportuniteEmploi?
  stage               OpportuniteStage?
  formation           OpportuniteFormation?
  bourse              OpportuniteBourse?
  concours            OpportuniteConcours?
  appelAProjets       OpportuniteAppelAProjets?

  skills              OpportuniteSkill[]
  tags                OpportuniteTag[]
  candidatures        Candidature[]
  favoris             OpportuniteFavorite[]

  @@index([statut, deletedAt])
  @@index([typeId, domaine])
  @@index([programmeId])
  @@index([region])
  @@index([deadline])
  @@fulltext([titre, description])
  @@map("opportunites")
}
```

### 3.4 Sous-types CTI 1:1

```prisma
model OpportuniteEmploi {
  opportuniteId        String      @id @map("opportunite_id") @db.VarChar(36)
  typeContrat          TypeContrat @map("type_contrat") // enum dédié
  dureeContratMois     Int?        @map("duree_contrat_mois")
  experienceRequise    String?     @map("experience_requise") @db.VarChar(100)
  // "Aucune" | "0-2 ans" | "2-5 ans" | "5+ ans"
  teletravail          Boolean     @default(false)
  niveauEtudeMin       String?     @map("niveau_etude_min") @db.VarChar(50)

  opportunite          Opportunite @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)

  @@map("opportunites_emploi")
}

model OpportuniteStage {
  opportuniteId         String      @id @map("opportunite_id") @db.VarChar(36)
  dureeMois             Int         @map("duree_mois")
  conventionneEcole     Boolean     @default(false) @map("conventionne_ecole")
  indemnise             Boolean     @default(false)
  indemniteMensuelleFcfa Int?       @map("indemnite_mensuelle_fcfa")
  niveauEtudeMin        String?     @map("niveau_etude_min") @db.VarChar(50)
  dateDebutPrevue       DateTime?   @map("date_debut_prevue")

  opportunite           Opportunite @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)

  @@map("opportunites_stage")
}

model OpportuniteFormation {
  opportuniteId          String         @id @map("opportunite_id") @db.VarChar(36)
  dureeHeures            Int            @map("duree_heures")
  modalite               ModaliteFormation
  certifiante            Boolean        @default(false)
  organismeCertificateur String?        @map("organisme_certificateur") @db.VarChar(150)
  prerequis              String?        @db.Text
  gratuite               Boolean        @default(true)
  fraisInscriptionFcfa   Int?           @map("frais_inscription_fcfa")

  opportunite            Opportunite    @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)

  @@map("opportunites_formation")
}

model OpportuniteBourse {
  opportuniteId      String      @id @map("opportunite_id") @db.VarChar(36)
  montantTotalFcfa   Int         @map("montant_total_fcfa")
  dureeMois          Int?        @map("duree_mois")
  niveauEtudeRequis  String?     @map("niveau_etude_requis") @db.VarChar(50)
  paysDestination    String?     @map("pays_destination") @db.VarChar(80)
  organismeFinanceur String      @map("organisme_financeur") @db.VarChar(150)
  coupleObligatoire  Boolean     @default(false) @map("couple_obligatoire")

  opportunite        Opportunite @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)

  @@map("opportunites_bourse")
}

model OpportuniteConcours {
  opportuniteId         String      @id @map("opportunite_id") @db.VarChar(36)
  organismeOrganisateur String      @map("organisme_organisateur") @db.VarChar(150)
  dateEpreuves          DateTime?   @map("date_epreuves")
  lieuEpreuves          String?     @map("lieu_epreuves") @db.VarChar(200)
  preuvesDemandees      String?     @map("preuves_demandees") @db.Text
  placesDisponibles     Int?        @map("places_disponibles")

  opportunite           Opportunite @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)

  @@map("opportunites_concours")
}

model OpportuniteAppelAProjets {
  opportuniteId        String      @id @map("opportunite_id") @db.VarChar(36)
  budgetMaxFcfa        Int?        @map("budget_max_fcfa")
  dureeProjetMois      Int?        @map("duree_projet_mois")
  thematique           String?     @db.VarChar(150)
  dossierRequis        String      @map("dossier_requis") @db.Text
  // Liste des pièces (séparées par |) ou description en français
  criteresEligibilite  String      @map("criteres_eligibilite") @db.Text

  opportunite          Opportunite @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)

  @@map("opportunites_appel_a_projets")
}
```

### 3.5 Skills et Tags (M:N)

```prisma
model Skill {
  id        String   @id @default(uuid()) @db.VarChar(36)
  slug      String   @unique @db.VarChar(80)
  libelle   String   @db.VarChar(120)
  categorie String?  @db.VarChar(60) // "technique" | "soft" | "linguistique"
  createdAt DateTime @default(now()) @map("created_at")

  opportunites OpportuniteSkill[]

  @@map("skills")
}

model OpportuniteSkill {
  opportuniteId String @map("opportunite_id") @db.VarChar(36)
  skillId       String @map("skill_id") @db.VarChar(36)
  requise       Boolean @default(true) // false = "appréciée"

  opportunite Opportunite @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)
  skill       Skill       @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@id([opportuniteId, skillId])
  @@index([skillId])
  @@map("opportunites_skills")
}

model Tag {
  id        String   @id @default(uuid()) @db.VarChar(36)
  slug      String   @unique @db.VarChar(80)
  libelle   String   @db.VarChar(120)
  createdAt DateTime @default(now()) @map("created_at")

  opportunites OpportuniteTag[]

  @@map("tags")
}

model OpportuniteTag {
  opportuniteId String @map("opportunite_id") @db.VarChar(36)
  tagId         String @map("tag_id") @db.VarChar(36)

  opportunite Opportunite @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)
  tag         Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([opportuniteId, tagId])
  @@index([tagId])
  @@map("opportunites_tags")
}
```

### 3.6 Nouveaux enums dédiés sous-types

```prisma
enum TypeContrat {
  CDI
  CDD
  FREELANCE
  ALTERNANCE
  STAGE_ALTERNE

  @@map("type_contrat")
}

enum ModaliteFormation {
  PRESENTIEL
  DISTANCE
  HYBRIDE

  @@map("modalite_formation")
}
```

L'ancien enum `TypeOpportunite` est conservé pendant la migration puis supprimé en
fin de séquence (cf. §10).

---

## 4. Mapping ancien `Opportunite` → nouveau

### 4.1 Mapping champ par champ

| Champ actuel | Devient | Notes |
|---|---|---|
| `id` | `Opportunite.id` | Inchangé |
| `drupalNid` | `Opportunite.drupalNid` | Inchangé |
| `slug` | `Opportunite.slug` | Inchangé |
| `titre` | `Opportunite.titre` | Inchangé |
| `description` | `Opportunite.description` | Inchangé (la richesse migre dans les sous-types) |
| `type: TypeOpportunite` | `Opportunite.typeId` (FK `opportunite_types`) | Mapping enum → table (cf. §4.3) |
| `domaine: Domaine` | `Opportunite.domaine` | Enum conservé (décision §4.2) |
| `region: Region?` | `Opportunite.region` | Enum conservé |
| `organisation: String` | `Opportunite.organisationLibelle` | Renommé pour clarifier vs `organisationId` |
| `organisationId` | `Opportunite.organisationId` | Inchangé (FK `organisations`) |
| `remuneration: String?` | `Opportunite.remuneration` | Conservé pour rétrocompatibilité affichage liste |
| `deadline: DateTime?` | `Opportunite.deadline` | Inchangé |
| `lienExterne` | `Opportunite.lienExterne` | Inchangé |
| `statut: StatutOpportunite` | `Opportunite.statut` | Enum inchangé |
| `recruteurUid` | `Opportunite.recruteurUid` | Inchangé |
| `vues`, timestamps | identiques | Inchangé |
| `(absent)` | `Opportunite.programmeId` | Nouveau, nullable |
| `(absent)` | sous-type 1:1 selon `typeId` | Backfill data §9 |

### 4.2 Domaine et Region — choix tranché

**Décision par défaut (à confirmer Lead — Q4 §15) : on conserve les `enum`.**

Raisons :
- 14 régions administratives sénégalaises = liste **stable** (jamais modifiée depuis 2008).
- 9 domaines actuels = liste **stable** ; toute évolution = `ALTER TYPE` simple, déjà
  pratiqué.
- Passer en table coûte 2 jointures supplémentaires sur la quasi-totalité des requêtes
  M3 sans bénéfice métier.
- Si un domaine nouveau s'ajoute, il l'est dans le même PR que la migration Prisma.

**Skill** et **Tag** deviennent en revanche tables : cardinalité libre, alimentation à
la demande, partage transversal (un Skill peut servir à Yaye matching profil ↔ opp).

### 4.3 Mapping enum `TypeOpportunite` → seed `OpportuniteType`

| Enum actuel | `OpportuniteType.slug` (nouveau) | Notes migration |
|---|---|---|
| `Emploi` | `EMPLOI` | Backfill `OpportuniteEmploi` avec valeurs par défaut |
| `Stage` | `STAGE` | Backfill `OpportuniteStage` (`dureeMois=NULL` autorisé temporairement) |
| `Formation` | `FORMATION` | Backfill `OpportuniteFormation` (`dureeHeures` requis → défaut 0 à corriger ensuite) |
| `Bourse` | `BOURSE` | Backfill `OpportuniteBourse` (`montantTotalFcfa=0` puis correction admin) |
| `Volontariat` | `STAGE` (volontariat indemnisé) OU `APPEL_A_PROJETS` (mission projet) | **À trancher cas par cas** dans script ; règle par défaut : `STAGE` avec `indemnise=false`, flag de revue manuelle |
| `Appel_a_projets` | `APPEL_A_PROJETS` | Backfill avec `dossierRequis="À préciser"`, flag revue |
| `(nouveau)` | `CONCOURS` | Pas d'instance existante en base — pure addition |

Toutes les opportunités legacy marquées `volontariat` ou avec champ obligatoire en
valeur factice reçoivent un **flag `_migration_review = true`** (colonne temporaire
ajoutée à l'étape 6, droppée à l'étape 8 après revue admin).

### 4.4 Programme : alimentation

Aucune relation existante → `Opportunite.programmeId = NULL` pour toutes les
opportunités existantes. La curation se fait via UI admin (hors GUIC-178, sera
GUIC-1XX dédié).

---

## 5. Programmes sectoriels

### 5.1 Modèle (cf. §3.1)

`Programme` — 4 entrées seed, alignées sur `src/lib/programmes.ts` **moins** BRM
(décision Lead 2026-05-29).

### 5.2 Données seed initiales

```ts
// prisma/seed/programmes.ts
export const PROGRAMMES_SEED = [
  { slug: 'yaakaar', nom: 'Yaakaar',
    description: 'Programme entrepreneuriat et auto-emploi',
    gradientToken: 'var(--prog-yaakaar)' },
  { slug: 'yeah',    nom: 'YEAH',
    description: 'Youth Empowerment for African Health',
    gradientToken: 'var(--prog-yeah)' },
  { slug: 'yjc',     nom: 'YJC',
    description: 'Youth Job Connect',
    gradientToken: 'var(--prog-yjc)' },
  { slug: 'edupop',  nom: 'EduPop',
    description: 'Éducation populaire',
    gradientToken: 'var(--prog-edupop)' },
] as const
```

`src/lib/programmes.ts` est **conservé** (constante TS) mais sa source de vérité
bascule : import depuis Prisma au runtime serveur, fallback constante pour
composants client. Une fonction `getProgrammeBySlug(slug)` côté serveur lit
`prisma.programme.findUnique({ where: { slug }})`. La constante reste utilisée
côté client pour les gradients (Yaye, Hero, Card).

### 5.3 BRM

BRM est retiré de la table `programmes`. Le slug `brm` reste exporté côté
`src/lib/programmes.ts` **uniquement pour le gradient `--prog-brm`** (déjà utilisé
par l'UI interne BRM, hors périmètre M3). Une note de code y est ajoutée :

```ts
// Note: `brm` est un outil interne CJS, pas un programme sectoriel jeune.
// Il n'est pas seedé dans la table `programmes` (décision Lead 2026-05-29).
// Seul son gradient token reste utile (UI interne admin).
```

---

## 6. Couche DTO — préservation contrats API

Le principe : **aucun consommateur externe** (Data Hub, partenaires interop, app
mobile compilée non encore livrée mais contrat figé) ne doit observer une
modification de payload pendant ou après la migration. Toute évolution de contrat
suit le versioning de l'API (Phase 2B pourra introduire un `v2/opportunites`).

### 6.1 Inventaire des endpoints publics et interop

| Endpoint | Fichier | Type contrat | Stratégie |
|---|---|---|---|
| `GET /api/opportunites` | `src/app/api/opportunites/route.ts` | Public Next, consommé par front Phase 1 | **DTO transparent** : conserve `OpportuniteListItem` (cf. `src/types/opportunite.ts`). Le `type` reste exposé comme string en MAJUSCULES (mappé depuis `OpportuniteType.slug`). |
| `GET /api/opportunites/[slug]` | `src/app/api/opportunites/[slug]/route.ts` | Public Next | DTO élargi : ajoute un objet `details` selon sous-type. Champs racine inchangés. |
| `POST /api/opportunites/[slug]/candidature` | (existant ou à venir GUIC-21) | Public Next, candidat connecté | Payload candidature inchangé. Côté serveur, `OpportuniteService.findByIdWithDetails` détermine si `requiresFileUpload` impose le CV. |
| `GET /api/v1/export/opportunites` | `src/app/api/v1/export/opportunites/route.ts` | **Data Hub partenaire** (Bearer token) | **Contrat figé** — actuellement renvoie `{ data: [], meta }` (squelette). On le concrétise en s'assurant que le payload reste un tableau d'objets plats compatibles avec une consommation BI (pas d'objets imbriqués `details`). Sous-types aplatis en colonnes `duree_mois`, `montant_fcfa`, `type_contrat`, etc. avec préfixe explicite. |
| `GET /api/interconnexion/centres` etc. | `src/app/api/interconnexion/*` | **HMAC machine** (BRM/Centres/Moodle/EduPop) | Pas d'endpoint opportunités côté interop existant. Si un partenaire sectoriel pousse des opportunités (cas EduPop futur), le contrat machine consommera `OpportuniteCreateInput` (Zod) qui mappe sur DTO. |

### 6.2 DTO TypeScript — proposition

```ts
// src/types/opportunite.ts (étendu)

/** Champs communs exposés en liste (forme actuelle préservée). */
export interface OpportuniteListItem {
  id: string
  slug: string
  titre: string
  type: 'EMPLOI'|'STAGE'|'FORMATION'|'BOURSE'|'CONCOURS'|'APPEL_A_PROJETS'
  domaine: Domaine
  region: Region | null
  organisation: string
  remuneration: string | null
  deadline: string | null
  // Nouveaux (additifs, optionnels — clients legacy ignorent)
  programme: { slug: string; nom: string; gradientToken: string } | null
  actionLabel: string // depuis OpportuniteType.actionLabel
}

/** Détail enrichi — discriminated union. */
export type OpportuniteDetailDTO =
  | (OpportuniteBaseDTO & { type: 'EMPLOI';         details: EmploiDetails })
  | (OpportuniteBaseDTO & { type: 'STAGE';          details: StageDetails })
  | (OpportuniteBaseDTO & { type: 'FORMATION';      details: FormationDetails })
  | (OpportuniteBaseDTO & { type: 'BOURSE';         details: BourseDetails })
  | (OpportuniteBaseDTO & { type: 'CONCOURS';       details: ConcoursDetails })
  | (OpportuniteBaseDTO & { type: 'APPEL_A_PROJETS'; details: AppelAProjetsDetails })

interface OpportuniteBaseDTO {
  id: string
  slug: string
  titre: string
  description: string
  domaine: Domaine
  region: Region | null
  organisation: string
  programme: { slug: string; nom: string; gradientToken: string } | null
  remuneration: string | null
  deadline: string | null
  lienExterne: string | null
  statut: StatutOpportunite
  actionLabel: string
  requiresFileUpload: boolean
  fileLabel: string | null
  skills: { slug: string; libelle: string; requise: boolean }[]
  tags: { slug: string; libelle: string }[]
}
```

Chaque `*Details` correspond strictement au sous-type Prisma sans champs serveur
(`opportuniteId` omis).

### 6.3 Export Data Hub — payload aplati

```jsonc
// GET /api/v1/export/opportunites
{
  "data": [
    {
      "id": "...", "slug": "...", "titre": "...",
      "type": "EMPLOI", "programme_slug": "yaakaar",
      "domaine": "Numerique", "region": "Dakar",
      "organisation": "...", "deadline": "2026-06-30T00:00:00.000Z",
      // Sous-type aplati, préfixé par le type pour éviter collisions
      "emploi_type_contrat": "CDI", "emploi_duree_mois": null,
      "stage_duree_mois": null, "bourse_montant_fcfa": null,
      // … toutes colonnes sous-types présentes, null si non applicable
      "skills": ["javascript", "python"],
      "tags": ["urgent", "remote"]
    }
  ],
  "meta": { "total": 123, "generated_at": "..." }
}
```

Ce format est **stable et auto-documenté** ; il est précisé dans `docs/interconnexion.md`
en même temps que la migration.

---

## 7. Services / loaders à adapter

### 7.1 Liste exhaustive

| Fichier | Portée adaptation |
|---|---|
| `src/lib/opportunites-loader.ts` | **Refonte modérée** : `listOpportunites` ajoute `include: { type: true, programme: true }`, mappe `type.slug` vers `OpportuniteListItem.type`. Pas de chargement des sous-types en liste (perf). |
| `src/lib/opportunites-loader.ts` (détail) | Ajouter `findOpportuniteBySlugWithDetails(slug)` qui charge `include: { type: true, programme: true, emploi: true, stage: true, formation: true, bourse: true, concours: true, appelAProjets: true, skills: { include: { skill: true } }, tags: { include: { tag: true } } }` et compose le DTO discriminated. |
| `src/lib/validations/opportunite.ts` | Étendre `OpportuniteQuerySchema` avec `programme?`, `skill?`, `niveauEtudeMin?`. Renommer enum `type` en string `slug` côté Zod. |
| `src/lib/validations/candidature.ts` | Pas d'impact direct ; la logique « CV requis » se déplace côté service en lisant `type.requiresFileUpload`. |
| `src/lib/dashboard-loader.ts` | Compteurs candidatures, opportunités favorites — adapter requêtes pour conserver la forme actuelle (`include: { type: { select: { slug: true, libelle: true }}}` quand le sous-type sert à l'affichage). |
| `src/lib/ia/recommandation.ts` | Refonte du matching : utilise désormais `Opportunite.skills + sous-type.niveauEtudeMin` pour scorer, en plus de `domaine`/`region`. Test régression obligatoire (cf. §11). |
| `src/lib/ia/rag.ts` | Embeddings : intégrer les champs sous-type dans le contexte indexé. Étape différée (GUIC-XX dédié), pas bloquant migration. |
| `src/lib/opportunites/service.ts` *(NOUVEAU)* | Voir §8. |
| `src/lib/opportunites/dto.ts` *(NOUVEAU)* | Mapping Prisma → DTO discriminé. Tests unitaires obligatoires (un mapping par sous-type). |
| `src/app/api/opportunites/route.ts` | Délègue à `OpportuniteService.listForCatalog()` qui renvoie déjà `OpportuniteListItem[]`. |
| `src/app/api/opportunites/[slug]/route.ts` | Délègue à `OpportuniteService.getDetailBySlug(slug)`. |
| `src/app/api/v1/export/opportunites/route.ts` | Implémentation concrète selon format §6.3. |
| `src/app/api/interconnexion/*` | Pas de changement (pas d'endpoint opportunités actuellement). |
| `src/app/api/jeune/dashboard/route.ts` (si existant) | Compteurs `mesCandidatures` inchangés (jointure via `Candidature.opportuniteId` toujours valable). |
| `src/app/opportunites/page.tsx`, `[slug]/page.tsx` | Affichage SSR : utilise le DTO étendu (`programme`, `actionLabel`). Phase 1 ignore les nouveaux champs (rétrocompatible). |

### 7.2 Pages front (M3 livré GUIC-20/21)

Décision (cf. §12) : on **adapte les loaders côté serveur sans casser le contrat
DTO consommé par les composants**. La page liste continue à afficher les badges
type/domaine/région ; la page détail récupère `actionLabel` depuis le DTO au lieu
de la constante hardcodée (`Postuler` → variable).

---

## 8. OpportuniteService — encapsulation polymorphisme

### 8.1 Pattern

Service classe TS encapsulant la transaction Prisma (création table mère +
sous-type dans la même tx) et exposant des méthodes typées via discriminated
unions.

### 8.2 Signatures

```ts
// src/lib/opportunites/service.ts

export type OpportuniteCreateInput =
  | { type: 'EMPLOI';         base: BaseInput; details: EmploiCreateInput }
  | { type: 'STAGE';          base: BaseInput; details: StageCreateInput }
  | { type: 'FORMATION';      base: BaseInput; details: FormationCreateInput }
  | { type: 'BOURSE';         base: BaseInput; details: BourseCreateInput }
  | { type: 'CONCOURS';       base: BaseInput; details: ConcoursCreateInput }
  | { type: 'APPEL_A_PROJETS'; base: BaseInput; details: AppelAProjetsCreateInput }

interface BaseInput {
  titre: string
  description: string
  programmeSlug?: string | null
  organisationId?: string | null
  organisationLibelle: string
  domaine: Domaine
  region?: Region | null
  remuneration?: string | null
  deadline?: Date | null
  lienExterne?: string | null
  recruteurUid?: string | null
  skills?: { slug: string; requise?: boolean }[]
  tags?: { slug: string }[]
}

export class OpportuniteService {
  constructor(private readonly db: PrismaClient) {}

  async create(input: OpportuniteCreateInput): Promise<OpportuniteDetailDTO> {
    return this.db.$transaction(async (tx) => {
      const type = await tx.opportuniteType.findUniqueOrThrow({ where: { slug: input.type } })
      const programme = input.base.programmeSlug
        ? await tx.programme.findUniqueOrThrow({ where: { slug: input.base.programmeSlug } })
        : null
      const opp = await tx.opportunite.create({
        data: { ...mapBase(input.base), typeId: type.id, programmeId: programme?.id, slug: makeSlug(input.base.titre) }
      })
      await createSubtype(tx, input, opp.id)
      await upsertSkills(tx, opp.id, input.base.skills ?? [])
      await upsertTags(tx, opp.id, input.base.tags ?? [])
      return this.findByIdWithDetailsInternal(tx, opp.id)
    })
  }

  async findByIdWithDetails(id: string): Promise<OpportuniteDetailDTO | null> { /* … */ }
  async findBySlugWithDetails(slug: string): Promise<OpportuniteDetailDTO | null> { /* … */ }
  async listForCatalog(filter: OpportuniteFiltres): Promise<OpportuniteListResult> { /* … */ }
  async update(id: string, patch: OpportuniteUpdateInput): Promise<OpportuniteDetailDTO> { /* … */ }
  async softDelete(id: string): Promise<void> { /* … */ }
}
```

### 8.3 Exemple d'usage

```ts
const svc = new OpportuniteService(prisma)
const opp = await svc.create({
  type: 'STAGE',
  base: {
    titre: 'Stage développeur Next.js',
    description: '…',
    programmeSlug: 'yjc',
    organisationLibelle: 'CJS',
    domaine: 'Numerique',
    region: 'Dakar',
    deadline: new Date('2026-08-31'),
    skills: [{ slug: 'react', requise: true }, { slug: 'typescript' }],
  },
  details: {
    dureeMois: 6,
    conventionneEcole: true,
    indemnise: true,
    indemniteMensuelleFcfa: 75000,
    niveauEtudeMin: 'Bac+3',
  },
})
```

### 8.4 Invariant XOR (un seul sous-type non-null)

Pas portable proprement en MariaDB via `CHECK` (support partiel). Garanti
**côté applicatif** :
- `OpportuniteService.create` impose la cohérence (type Zod + branche sous-type unique)
- Pas d'accès direct à `tx.opportuniteEmploi.create` en dehors du service (lint rule
  custom optionnelle ou simple convention documentée + revue PR)
- Test d'intégrité quotidien (job CRON dev/staging) : `SELECT id FROM opportunites o
  WHERE (existe_emploi + existe_stage + …) <> 1` — alerte si > 0

---

## 9. Migration data (dev + staging)

### 9.1 Script

`scripts/migrate-opportunites-to-polymorphic.ts` — exécutable via `tsx`.

Algorithme :
1. Charger `opportunite_types` (seed déjà appliqué).
2. Pour chaque `Opportunite` existante (cursor batch 100) :
   a. Déterminer `typeId` depuis `type` enum legacy via la table de correspondance §4.3.
   b. UPDATE `Opportunite.typeId = X, programmeId = NULL, organisationLibelle = organisation`.
   c. INSERT dans sous-type 1:1 avec valeurs par défaut documentées (cf. §4.3) et
      `_migration_review = true` si défaut factice.
   d. Si `type=Volontariat` : ajout d'un commentaire `_migration_note` (colonne
      temporaire) avec le détail de la décision (`STAGE` ou `APPEL_A_PROJETS`).
3. Log progression dans `migration_opportunites_log` (table de suivi temporaire).
4. Stats finales : par sous-type, par `programmeId IS NULL`, par `_migration_review`.

### 9.2 Cas du type `Autre` / valeurs non standard

Aucune occurrence `AUTRE` dans l'enum actuel mais sécurité : si découvert (ex.
ancien import Drupal mal nettoyé), défaut sur `APPEL_A_PROJETS` + flag revue.

### 9.3 Rollback

- Tag git `pre-migration-m3-v2` posé sur `dev` au commit précédant l'exécution.
- Dump SQL `dump-pre-migration-m3-v2-<date>.sql.gz` archivé sur le coffre interne
  (backup Plesk + S3 chiffré côté CJS).
- Procédure :
  1. `npx prisma migrate resolve --rolled-back <name>` pour les migrations Prisma
     non-appliquées.
  2. Drop des tables nouvelles : `programmes`, `opportunite_types`, sous-types,
     `skills`, `tags`, jointures.
  3. Restore du dump si données déjà migrées.

---

## 10. Plan de migration Prisma

Séquence ordonnée — **chaque étape déployable et rollback indépendamment** :

1. `add_programme_table_and_seed` — crée `programmes` + seed 4 entrées
2. `add_opportunite_types_table_and_seed` — crée `opportunite_types` + seed 6 entrées
3. `add_skill_tag_tables` — crée `skills`, `tags`, `opportunites_skills`,
   `opportunites_tags` (vides)
4. `extend_opportunite_with_polymorphic_columns` — ajoute `type_id` (FK nullable),
   `programme_id` (FK nullable), `organisation_libelle` (copie de `organisation`),
   colonne temporaire `_migration_review BOOLEAN DEFAULT FALSE`
5. `create_polymorphic_subtypes` — crée les 6 tables sous-types (vides), enums
   `TypeContrat` et `ModaliteFormation`
6. `backfill_data` — **non Prisma** : exécution de
   `scripts/migrate-opportunites-to-polymorphic.ts` (cf. §9)
7. `add_constraints` — `type_id NOT NULL`, indexes (`@@index([typeId, domaine])`,
   `@@index([programmeId])`), suppression de l'index `@@index([type, domaine])`
8. `drop_legacy_columns` — drop `type` (enum legacy), drop `organisation` (remplacé
   par `organisation_libelle`), drop `_migration_review`, drop l'enum
   `TypeOpportunite` au catalogue MariaDB

**Validation** : entre l'étape 6 et 7, un go/no-go humain est requis ; aucun champ
NOT NULL n'est posé sur les sous-types tant que la revue admin n'a pas corrigé les
`_migration_review = true`.

---

## 11. Tests

### 11.1 Unitaires `OpportuniteService`

- `create` pour chaque sous-type → assert table mère + table fille + relations OK
- `findByIdWithDetails` → discriminated union TS correctement typée par `type`
- `update` partiel sur base seule, sur sous-type seul, mixte
- Tentative de création avec `type` incohérent (`type=EMPLOI` mais `details` `STAGE`)
  → erreur Zod
- Tentative de double sous-type (manipulation directe) → invariant rejeté en test
  d'intégrité

### 11.2 Intégration API

- `GET /api/opportunites` : payload identique avant/après (snapshot test sur
  fixture)
- `GET /api/opportunites/[slug]` : champs racine inchangés + `details` présent
  selon `type`
- `GET /api/v1/export/opportunites` : format §6.3 stable (snapshot)
- `POST /api/opportunites/[slug]/candidature` : `requiresFileUpload` lu depuis
  `type` → 400 si CV manquant pour `EMPLOI`/`STAGE`, ok pour `FORMATION` si
  formation gratuite sans fichier

### 11.3 Migration data

- Fixture `seed-legacy.sql` : 30 opportunités couvrant tous les enums legacy
- Exécution `scripts/migrate-opportunites-to-polymorphic.ts` en mode dry-run
  (log stats, pas d'écriture)
- Exécution réelle → assert : 30 enregistrements dans `opportunites`, répartition
  correcte dans sous-types, `_migration_review` posé sur les `Volontariat`

### 11.4 Rollback

- Test de rejouabilité : exécuter migration sur DB vierge, faire backup, rollback
  via dump, ré-appliquer la migration → idempotent

### 11.5 Yaye matching (régression)

- Snapshot du score top-5 recommandations pour 10 profils de référence **avant**
  migration
- Re-calcul après migration : tolérance ±10 % sur le score brut, top-3 stable
  pour 8 profils sur 10 (les 2 restants peuvent bouger grâce aux skills nouvellement
  introduits — c'est attendu)

---

## 12. Impact UX et front

### 12.1 Phase 2B (dashboard et opportunités mobile)

Construite directement sur le nouveau schéma. Le composant `OppCard` (cf.
`design-guichet-v2/lot3-opps-mobile.jsx`) exploite déjà :
- `actionLabel` dynamique (`Postuler` / `Soumettre` / `Demander`…)
- Badge programme (gradient via `programme.gradientToken`)
- Sous-type pour la ligne de méta-données (durée stage, montant bourse…)

### 12.2 M3 actuel livré (GUIC-20/21)

**Décision** : on adapte les loaders côté serveur **maintenant** (GUIC-178) afin
qu'ils renvoient un DTO superset rétrocompatible. Les composants front existants
continuent de fonctionner (ils ignorent les champs additifs `programme`,
`actionLabel`, `details`). Refonte visuelle réelle = Phase 2B.

### 12.3 Filtres recherche

`OpportuniteQuerySchema` enrichi (cf. §7.1) avec : `programme=yaakaar|yeah|yjc|edupop`,
`skill=react`, `niveauEtudeMin=Bac+3`. Le filtre `type` accepte les nouveaux slugs
MAJUSCULES (rétrocompatible : un mapping accepte aussi `Stage` legacy pendant 1
release).

---

## 13. Risques et mitigations

| # | Risque | Mitigation |
|---|---|---|
| R1 | Régression Yaye matching | Snapshot avant/après §11.5, tolérance contractualisée |
| R2 | Casse contrats interop / Data Hub | Couche DTO §6, snapshot tests §11.2, communication partenaires Data Hub avant déploiement |
| R3 | Migration data trop longue (timeout Vercel) | Exécution **offline** via `tsx` sur poste Lead ou serveur Plesk, jamais via route HTTP. Dump diff vérifié avant push. |
| R4 | Discriminated unions TS complexes à maintenir | Générateur `scripts/gen-opportunite-dto.ts` à partir du schema Prisma (Phase 2 nice-to-have) |
| R5 | Invariant XOR non garanti SQL | Service applicatif + test intégrité CRON (§8.4) |
| R6 | Décalage entre `src/lib/programmes.ts` (constante) et table `programmes` | Constante TS devient un **fallback de bootstrap** ; la table est source de vérité serveur ; test unitaire vérifie cohérence des 4 slugs + 1 BRM legacy |
| R7 | Opportunités `Volontariat` mal reclassées | Flag `_migration_review = true` + UI admin de revue (GUIC-XX différé, blocage soft : opportunités non visibles tant que pas revues) |

---

## 14. Plan de rollback

1. **Pré-migration** : tag `pre-migration-m3-v2` posé sur le dernier commit `dev`
   avant exécution
2. **Dump SQL** : `mysqldump` sur la base cible (dev puis staging), archivé sous :
   - Plesk backup interne (rétention 90j)
   - Coffre S3 chiffré côté CJS (`s3://cjs-backups/guichet/m3-v2/`)
3. **Procédure de rollback complet** :
   ```bash
   # 1. Reset code
   git checkout pre-migration-m3-v2
   # 2. Reset DB
   gunzip -c dump-pre-migration-m3-v2-<date>.sql.gz | mysql guichet
   # 3. Marquer migrations Prisma comme rolled-back
   npx prisma migrate resolve --rolled-back add_programme_table_and_seed
   npx prisma migrate resolve --rolled-back add_opportunite_types_table_and_seed
   # … etc pour les 8 étapes
   # 4. Redéployer
   ```
4. **Rollback partiel** : chaque étape Prisma de §10 est indépendante. Un rollback
   après étape 4 (par exemple) ne nécessite pas de restaurer la DB — il suffit de
   `migrate resolve --rolled-back` et de drop les colonnes ajoutées.

---

## 15. Questions ouvertes

> Numérotation reprise à zéro pour traçabilité PR review.

1. **Données seed `OpportuniteType`** : valider les libellés exacts FR
   (`Postuler`, `Soumettre un dossier`, `Demander la bourse`, `S'inscrire au
   concours`, `Candidater à la formation`, `Postuler à l'appel à projets`) et le
   `fileLabel` (par défaut : `CV (PDF)` pour EMPLOI/STAGE, `Dossier projet (PDF
   < 10 Mo)` pour APPEL_A_PROJETS, `Preuves d'éligibilité (ZIP)` pour CONCOURS,
   `Lettre + diplômes (PDF)` pour BOURSE, `Aucun` pour FORMATION).
2. **`Domaine` et `Region`** : confirmer la décision « rester en `enum` » (cf.
   §4.2). Si refus, prévoir +0.5j migration table.
3. **Seed initial `Skill`** : 30-50 skills techniques (React, Python, SQL,
   Excel…), soft (Communication, Leadership…), linguistiques (Français, Anglais,
   Wolof). Liste à fournir par PO ou à importer depuis l'ancien taxonomy Drupal ?
4. **Seed initial `Tag`** : alimentation à la demande (vide à la migration) ou
   liste initiale (`urgent`, `remote`, `diaspora`, `femmes`, `handicap`) ?
5. **Migration `Volontariat`** : par défaut `STAGE` avec `indemnise=false`, ou
   `APPEL_A_PROJETS` ? Combien d'opportunités concernées en `dev` actuellement ?
6. **Gel des contrats `/api/interconnexion/*`** : aucun endpoint opportunités
   existant côté interop. Confirmer qu'aucun partenaire ne consomme déjà
   l'opportunité par un autre canal (Data Hub uniquement).
7. **UI revue admin `_migration_review`** : à créer dans la foulée GUIC-178
   (mini-page liste + bouton « Valider classification ») ou ticket distinct ?
8. **Granularité `niveauEtudeMin`** : enum dédié (`Aucun`, `BFEM`, `Bac`,
   `Bac+2`, `Bac+3`, `Bac+5`, `Doctorat`) ou String libre ? La spec propose
   String pour souplesse. Décision Lead.
9. **`Programme.actif`** : utile dès maintenant (mécanisme de dépublication) ou
   YAGNI ? La spec l'inclut par sécurité.

---

## 16. Estimation

| Lot | Charge |
|---|---|
| Migrations Prisma + seeds (`Programme`, `OpportuniteType`, sous-types, `Skill`, `Tag`) | 1.0 j |
| `OpportuniteService` + DTO + mapping + tests unitaires | 1.5 j |
| Adaptation loaders + endpoints API + tests intégration + snapshot Data Hub | 1.5 j |
| Script migration data + tests rollback + dry-run dev | 1.0 j |
| Snapshot Yaye + revue manuelle + ajustements seed | 0.5 j |
| **Total dev** | **≈ 5.5 j** |
| Revue + déploiement staging + go/no-go production | 0.5 j |
| **Total bout-en-bout** | **≈ 6 j** |

---

## 17. Décisions par défaut (à arbitrer si besoin)

Récapitulatif des choix faits dans cette spec faute d'arbitrage explicite Lead/PO :

| # | Décision par défaut | Conséquence si refusée |
|---|---|---|
| DP1 | `Domaine` et `Region` restent `enum` (§4.2) | +0.5 j migration table + 2 jointures supplémentaires sur la quasi-totalité des requêtes |
| DP2 | `Volontariat` → `STAGE indemnise=false` + flag revue (§4.3) | À reclassifier manuellement avant ouverture publique des opportunités migrées |
| DP3 | `Skill`/`Tag` deviennent tables, seed initial à fournir par PO (§4.2, Q3-Q4) | Si non fournis → tables vides, alimentation à la création opportunité |
| DP4 | Invariant XOR garanti côté applicatif (pas CHECK SQL) (§8.4) | Risque de corruption si quelqu'un écrit en base directement — mitigé par revue PR et job CRON |
| DP5 | M3 livré (GUIC-20/21) : loaders adaptés en silence, UI inchangée Phase 1 (§12.2) | Si Phase 2B retarde, les nouveaux champs (programme, actionLabel) restent invisibles côté front mais disponibles côté DTO |
| DP6 | `niveauEtudeMin` = String libre (§15 Q8) | Si enum demandé : refonte mineure tests + 0.2 j |
| DP7 | Format Data Hub : sous-types aplatis avec préfixe (§6.3) | Si BI préfère JSON imbriqué : refonte mineure + 0.2 j |
| DP8 | ~~BRM gardé dans `src/lib/programmes.ts` (gradient uniquement), exclu de la table~~ | ❌ **Obsolète** depuis GUIC-176 (PR #26 cleanup BRM) : BRM est totalement retiré de `programmes.ts` et de `tokens.css` (`--prog-brm-*` supprimés). Il reste un outil interne référencé via `/api/interconnexion/brm` uniquement. La table `Programme` ne doit PAS le contenir. |

---

## 18. Décisions validées 2026-05-30 (PO/tech lead)

Toutes les questions ouvertes de §15 ont été tranchées. La spec est exécutable.

### Q0 — Correction DP8 (BRM)
✅ BRM **totalement absent** de la table `Programme` et de `programmes.ts`. Cleanup déjà fait dans GUIC-176 (PR #26). La spec est ici alignée par la note barrée ci-dessus.

### Q1 — Libellés FR seed `OpportuniteType`

| Type | `actionLabel` | `fileLabel` | `requiresFileUpload` |
|---|---|---|---|
| `emploi` | Postuler | CV (PDF) | `true` |
| `stage` | Postuler | CV (PDF) | `true` |
| `formation` | S'inscrire | Justificatif niveau (optionnel) | `false` |
| `bourse` | Demander | Justificatifs académiques | `true` |
| `concours` | Participer | Soumission (PDF/lien) | `true` |
| `appel_a_projets` | Déposer un dossier | Note conceptuelle + budget | `true` |

À utiliser tels quels dans le seed `prisma/seed/opportunite-types.ts` lors de GUIC-178.

### Q2 — `Domaine` et `Region` restent `enum`
✅ Confirme DP1. Pas de migration table. Justification : listes stables, perf > 2 jointures supplémentaires.

### Q3 — Seed `Skill`
✅ **Seed initial CJS** de 30-40 skills à co-construire avec PO en 30 min lors de GUIC-178. Liste indicative : Excel, Word, Communication, Gestion projet, Comptabilité, Anglais, Wolof, Permis B, Couture, Maraîchage, Soudure, Mécanique, Photographie, Marketing digital, Vente, etc. (couvre YJC + Yaakaar + EduPop). Extensible via admin Phase 4. Évite la table vide initiale.

### Q4 — Seed `Tag`
✅ **Seed minimal de 7 tags** : `urgent`, `remote`, `diaspora`, `priorité-femmes`, `priorité-handicap`, `priorité-rural`, `nouveau`. Évite la prolifération anarchique au démarrage. Ajouts via admin.

### Q5 — Migration `Volontariat` legacy
✅ **Count d'abord** en dev : `SELECT count(*) FROM opportunites WHERE type='AUTRE' OR type='VOLONTARIAT'`.
- Si <50 instances → classification **manuelle** (script SQL ou UI admin minimaliste)
- Si ≥50 → règle automatique (mots-clés titre/description → APPEL_A_PROJETS ou STAGE) + flag `_migration_review` pour vérification

GUIC-178 doit prévoir les deux chemins (le count détermine lequel exécuter).

### Q6 — Partenaires interop hors Data Hub
✅ **Considérer le pire** — gel des contrats sur `/api/v1/export/opportunites` ET `/api/interconnexion/opportunites/*` via couche DTO (confirme DP5). Engagement docs/architecture respecté.

### Q7 — UI revue admin `_migration_review`
✅ **Ticket distinct** si besoin (déterminé par Q5). Pas dans GUIC-178 (qui reste focalisé migration). Si Q5 < 50 instances → simple script SQL, pas d'UI.

### Q8 — `niveauEtudeMin` : enum strict
✅ Override DP6 (qui proposait String libre). **Enum strict** :
```
enum NiveauEtudes {
  BFEM
  BAC
  BAC_PLUS_2
  BAC_PLUS_3
  BAC_PLUS_5
  DOCTORAT
}
```
Si équivalences étrangères nécessaires → champ `niveauEtudeNotes` String? optionnel en complément. Modifier §3 (modèle `Opportunite`) en conséquence lors de GUIC-178.

### Q9 — `Programme.actif`
✅ **Garder** le champ `actif Boolean @default(true)`. Coût zéro maintenant, évite migration future quand un programme CJS sera mis en pause.

---

### Récap impact pour GUIC-178

| Décision validée | Impact code |
|---|---|
| Q0 BRM exclu confirmé | Aligner la spec, seed Programme = 4 lignes (Yaakaar, YEAH, YJC, EduPop) |
| Q1 libellés FR fournis | Seed `OpportuniteType` directement codable |
| Q2 enums conservés | Migration plus simple, pas de table Domaine/Region |
| Q3 seed Skill 30-40 entrées | Pause 30 min co-construction PO pendant GUIC-178 |
| Q4 seed Tag 7 entrées | Codable directement |
| Q5 count Volontariat first | Première étape de GUIC-178 = SQL count |
| Q6 DTO gel contrats | Implémentation DTO obligatoire dans §6 |
| Q7 UI review séparée | Hors scope GUIC-178 |
| Q8 enum NiveauEtudes | Override §3 — utiliser enum strict, pas String |
| Q9 `actif` conservé | Confirme bloc Prisma §3 |

Spec **finale validée**. GUIC-178 peut être lancée.
