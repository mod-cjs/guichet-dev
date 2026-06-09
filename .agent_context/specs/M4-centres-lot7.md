# M4-Centres — Lot 7 Centres CJS

> **Spec officielle d'intégration du Lot 7 design v2.**
> Décisions PO 2026-06-09 verrouillées. Toute évolution requiert un ADR additionnel.
> Source du design : `public/design-v2/Lot 7 - Centres CJS.html` + `centres-web.jsx` + `centres-mobile.jsx` + `mobile-centres.jsx` + `centres-data.jsx`.

---

## 1. Objectif

Permettre aux jeunes inscrits au CJS de :
- **Découvrir** les centres CJS sur tout le territoire sénégalais (carte + annuaire)
- **Consulter** le détail d'un centre (horaires, services, conseillers, ressources réservables)
- **Réserver** une ressource (salle, véhicule, poste info) avec créneau + nombre de personnes + motif (justificatif si véhicule)
- **Suivre** leurs réservations avec statuts (Auto-validée, Refusée, Passée)
- **Présenter** leur carte CJS QR (anti-fraude HMAC rotatif) pour check-in physique
- **Choisir** un centre de rattachement principal pendant l'onboarding

Permettre au personnel des centres de :
- **Gérer** leurs ressources réservables (CRUD)
- **Annuler** une réservation (workflow validation futur, sprint+1)
- **Consulter** les réservations entrantes et check-ins du jour
- **Mesurer** la fréquentation (KPI principal centre — instrumentation depuis Wave 1)

## 2. Décisions PO verrouillées (2026-06-09)

| Décision | Valeur | Justification |
|---|---|---|
| Centre principal jeune | Hybride : auto-suggest région SSO + override Guichet | ADR-001 — pas de claim SSO `centre_id` |
| QR encoding | JWT HS256 rotatif 15 min | ADR-002 — anti-spoof + anti-replay |
| Photo carte CJS | Avatar OIDC + fallback upload | Anti-fraude + ID staff |
| Wallet | **OUT MVP** (Sprint+1) | Coût + chantier infra |
| Rôles backoffice | `centre_admin` + `centre_conseiller` SSO + table miroir Guichet | ADR-003 — dépendance SSO |
| Validation réservation | Auto-validée + staff peut annuler post (option c) | Vraie fonctionnalité métier MVP |
| Approval workflow centre | Préparé schéma, désactivé MVP | Sprint+1 |
| KPI fréquentation | Instrumentation événementielle dès W1 | KPI principal du module |
| SMS provider | Orange Sénégal (réutilisé SSO) | Déjà en place |
| Notifications | SMS confirmation + rappel J-1 / H-1 | Préférence configurable Sprint+1 |
| Architecture composants | Unique adaptatif (`lg:*`) | Cohérence projet |
| Carte cartographique | Google Maps JS API | ADR-004 + clé API restreinte |
| Variante mobile landing | `mobile-centres.jsx` (composite) | Tab BottomNav `/centres` |
| Flow détaillé mobile | `centres-mobile.jsx` (state machine) | Sous-routes du flow |
| Tabs Mes réservations | 5 tabs : Toutes / En attente / Acceptées / Refusées / Passées | Cohérence + complétude |
| Mobile detail | Sections Horaires + Contact en scroll (option b) | Pas de bottom-sheet |
| CTAs mobile myresa | Parité web (refusee + passee inclus) | Cohérence fonctionnelle |
| Géolocalisation | Approximation par région SSO (option b) | Privacy CDP + simplicité |
| Map mock landing mobile | Google Maps 180px (option a) | UX cohérente |
| Tests | TDD strict + Playwright E2E sur flow réservation | Robuste |
| Découpage | 7 waves data-first (W0 → W6) | Phasage clair |

## 3. Architecture

### 3.1 Modèle de données (Prisma)

```prisma
// Existant : model Centre (étendu)

model Centre {
  id            String   @id @default(uuid())
  // ... champs existants : nom, ville, region, adresse, latitude, longitude, telephone, email, estActif

  // NOUVEAU
  description       String?  @db.Text
  imageUrl          String?  @db.VarChar(500)
  services          Json     @default("[]")          // string[] enum CentreService
  conseillersCount  Int      @default(0) @map("conseillers_count")

  // Relations
  horaires      CentreHoraire[]
  ressources    RessourceCentre[]
  reservations  Reservation[]
  checkIns      CheckIn[]
  staff         CentreStaff[]
  events        CentreEvent[]
  utilisateursPrincipals ProfilJeune[]                // centrePrincipalId FK (relation inverse)

  @@index([region, estActif])
  @@map("centres")
}

enum CentreService {
  WiFi
  Bibliotheque
  Coworking
  Ateliers
  Conseiller
  Salle_reunion
  Postes_info
  Imprimante
  Cafe
  Espace_detente

  @@map("centre_service")
}

model CentreHoraire {
  centreId      String     @map("centre_id")
  jour          Jour                                  // enum 7 valeurs
  ouvert        Boolean    @default(true)
  ouvreA        String?    @map("ouvre_a") @db.VarChar(5)   // "08:00"
  fermeA        String?    @map("ferme_a") @db.VarChar(5)   // "18:00"
  centre        Centre     @relation(fields: [centreId], references: [id], onDelete: Cascade)
  @@id([centreId, jour])
  @@map("centre_horaires")
}

enum Jour {
  Lundi
  Mardi
  Mercredi
  Jeudi
  Vendredi
  Samedi
  Dimanche
  @@map("jour")
}

model RessourceCentre {
  id           String                @id @default(uuid())
  centreId     String                @map("centre_id")
  type         TypeRessourceCentre
  nom          String                @db.VarChar(120)
  description  String?               @db.Text
  imageUrl     String?               @db.VarChar(500)
  capacite     Int                   @default(1)            // 1 = ressource unique, >1 = multiple
  capaciteUnit String?               @map("capacite_unit") @db.VarChar(30) // "personnes", "postes", "véhicules"
  dureeMinCreneauMin Int             @default(60) @map("duree_min_creneau_min")
  requiresJustif Boolean             @default(false) @map("requires_justif")
  estActive    Boolean               @default(true) @map("est_active")
  createdAt    DateTime              @default(now()) @map("created_at")
  updatedAt    DateTime              @updatedAt @map("updated_at")
  centre       Centre                @relation(fields: [centreId], references: [id], onDelete: Cascade)
  reservations Reservation[]

  @@index([centreId, type, estActive])
  @@map("ressources_centre")
}

enum TypeRessourceCentre {
  Salle
  Vehicule
  Poste_info
  Equipement
  Atelier_recurrent
  @@map("type_ressource_centre")
}

model Reservation {
  id                String              @id @default(uuid())
  cjsUid            String              @map("cjs_uid")
  centreId          String              @map("centre_id")
  ressourceId       String              @map("ressource_id")
  dateReservee      DateTime            @map("date_reservee")           // jour
  creneauDebut      String              @map("creneau_debut") @db.VarChar(5)  // "14:00"
  creneauFin        String              @map("creneau_fin") @db.VarChar(5)    // "16:00"
  nombrePersonnes   Int                 @default(1) @map("nombre_personnes")
  motif             String              @db.Text
  justifFileUrl     String?             @map("justif_file_url") @db.VarChar(500)
  statut            StatutReservation   @default(Acceptee)              // MVP : auto-validée
  raisonRefusOuAnnul String?            @map("raison_refus_ou_annul") @db.Text
  noShow            Boolean             @default(false) @map("no_show")
  createdAt         DateTime            @default(now()) @map("created_at")
  decisionA         DateTime?           @map("decision_a")
  annuleeA          DateTime?           @map("annulee_a")

  utilisateur       Utilisateur         @relation(fields: [cjsUid], references: [cjsUid])
  centre            Centre              @relation(fields: [centreId], references: [id])
  ressource         RessourceCentre     @relation(fields: [ressourceId], references: [id])

  @@index([cjsUid, createdAt(sort: Desc)])
  @@index([centreId, statut, dateReservee])
  @@index([ressourceId, dateReservee, statut])
  @@index([statut, dateReservee])
  @@map("reservations")
}

enum StatutReservation {
  EnAttente              // workflow approval — désactivé MVP
  Acceptee               // auto-validée MVP
  Refusee
  AnnuleeParJeune
  Passee                 // batch quotidien : si date < now() + statut != Annulee/Refusee
  NonHonoree             // batch : si date passée + pas de CheckIn

  @@map("statut_reservation")
}

model CheckIn {
  id          String       @id @default(uuid())
  cjsUid      String       @map("cjs_uid")
  centreId    String       @map("centre_id")
  reservationId String?    @map("reservation_id")           // optionnel : check-in libre
  via         CheckInVia
  scannerId   String?      @map("scanner_id")               // staff qui a scanné
  effectueA   DateTime     @default(now()) @map("effectue_a")
  dwellMinutes Int?        @map("dwell_minutes")            // si checkout fourni
  meta        Json?

  utilisateur Utilisateur  @relation(fields: [cjsUid], references: [cjsUid])
  centre      Centre       @relation(fields: [centreId], references: [id])

  @@index([centreId, effectueA])
  @@index([cjsUid, effectueA])
  @@map("check_ins")
}

enum CheckInVia {
  QrCard                 // QR de la MyCJSCard scanné
  Manuel                 // staff a entré manuellement
  @@map("check_in_via")
}

model CentreStaff {
  cjsUid     String        @map("cjs_uid")
  centreId   String        @map("centre_id")
  role       RoleStaffCentre
  createdAt  DateTime      @default(now()) @map("created_at")

  utilisateur Utilisateur  @relation(fields: [cjsUid], references: [cjsUid])
  centre      Centre       @relation(fields: [centreId], references: [id], onDelete: Cascade)

  @@id([cjsUid, centreId])
  @@index([centreId, role])
  @@map("centre_staff")
}

enum RoleStaffCentre {
  Admin                  // CRUD complet + stats + annulation
  Conseiller             // Lecture + annulation + check-ins
  @@map("role_staff_centre")
}

model CentreEvent {
  // Table KPI événementiel — INSERT-only, retention 6 mois
  id        BigInt       @id @default(autoincrement())
  centreId  String?      @map("centre_id")              // null si index pages
  cjsUid    String?      @map("cjs_uid")                // null si anonyme
  type      String       @db.VarChar(60)                // "centre_viewed", "centre_checkin", "centre_reservation_submitted", etc.
  metadata  Json?
  ts        DateTime     @default(now())

  @@index([type, ts])
  @@index([centreId, type, ts])
  @@map("centre_events")
}

// Extension ProfilJeune
model ProfilJeune {
  // ... existants
  centrePrincipalId String?  @map("centre_principal_id")
  centrePrincipal   Centre?  @relation(fields: [centrePrincipalId], references: [id])
}
```

### 3.2 Routes

#### Pages publiques (héritent du PublicLayout adaptatif GUIC-349)
- `GET /centres` — Vue `all` (carte Sénégal + annuaire) — SSR
- `GET /centres/[slug]` — Vue `detail` — SSR
- `GET /centres/[slug]/ressources` — Vue `resources` (sous-page) — SSR
- `GET /centres/[slug]/ressources/[ressourceId]/reserver` — Vue `reserve` (formulaire) — SSR + form
- `GET /jeune/mes-reservations` — Vue `myresa` — auth requise — SSR
- `GET /jeune/ma-carte` — Vue `card` — auth requise — SSR

#### API REST
- `GET /api/centres` — Liste paginée (filtres : region, service)
- `GET /api/centres/[slug]` — Détail centre (avec horaires, ressources teaser)
- `GET /api/centres/[slug]/ressources` — Liste ressources réservables d'un centre
- `POST /api/reservations` — Créer une réservation (auto-validée MVP)
- `GET /api/reservations` — Liste des réservations du user connecté (paginé + filtres statut)
- `PATCH /api/reservations/[id]` — Annuler par le jeune (statut → `AnnuleeParJeune`)
- `GET /api/profil/centre-principal/suggestions` — Auto-suggest centres par région SSO
- `POST /api/profil/centre-principal` — Update centre principal
- `POST /api/profil/photo` — Upload photo carte CJS (Vercel Blob + crop côté client)
- `GET /api/cjs-card/qr-token` — Génère JWT rotatif 15 min pour le QR
- `POST /api/v1/checkin/[token]` — **Endpoint scanner staff** : valide JWT + crée `CheckIn` + log event

#### Routes backoffice (Wave 5)
- `GET /centre-staff` — Redirige selon role
- `GET /centre-staff/[centreId]/reservations` — Liste avec filtres statut + date
- `GET /centre-staff/[centreId]/ressources` — CRUD ressources
- `GET /centre-staff/[centreId]/check-ins` — Liste check-ins du jour
- `GET /centre-staff/[centreId]/stats` — Dashboard KPI fréquentation
- `POST /api/centre-staff/[centreId]/reservations/[id]/cancel` — Staff annule
- `CRUD /api/centre-staff/[centreId]/ressources` — Gestion ressources

### 3.3 Composants à créer (`src/components/centres/`)

Cf. catalogue audit — 29 composants P0 et P1. Liste détaillée par wave en section §5.

### 3.4 Tracking événementiel KPI

Helper central : `src/lib/analytics/centre-events.ts` qui :
1. INSERT en table `centre_events` (server-side via Prisma)
2. Forward optionnel vers Vercel Analytics / Sentry / autre (post-MVP)

```ts
export type CentreEventType =
  | 'centre_viewed' | 'centre_map_pin_clicked' | 'centre_filter_applied'
  | 'centre_resource_viewed' | 'centre_resource_filter'
  | 'centre_reservation_started' | 'centre_reservation_submitted' | 'centre_reservation_cancelled'
  | 'centre_reservation_validation_error'
  | 'centre_checkin' | 'centre_checkout' | 'centre_no_show'
  | 'cjs_card_opened' | 'cjs_card_qr_displayed'
  | 'centre_itinerary_opened' | 'centre_phone_clicked' | 'centre_email_clicked'

export async function trackCentreEvent(
  type: CentreEventType,
  metadata: Record<string, unknown>,
  ctx: { centreId?: string; cjsUid?: string },
): Promise<void>
```

API endpoint `/api/v1/track` côté client (rate-limit 60/min).
Anti-doublon : event_id en hash si nécessaire.

## 4. Sécurité

### 4.1 Carte CJS QR — JWT rotatif

- Header : `{ alg: 'HS256', kid: 'cjs-checkin-v1' }`
- Payload : `{ sub: cjsUid, iat, exp: iat+900, scope: 'checkin' }` (15 min)
- Secret env : `CJS_CHECKIN_SECRET` (32 bytes random hex)
- Endpoint génération `GET /api/cjs-card/qr-token` (auth requise, rate-limit 10/min)
- Endpoint validation `POST /api/v1/checkin/:token` (scanner — staff auth)
- Anti-replay : Redis SET NX `checkin:processed:<token>` TTL 1h après usage

### 4.2 Upload photo carte CJS

- Magic-bytes JPEG/PNG/WebP (pattern GUIC-241)
- Max 2MB (resize client → 400×400 WebP)
- Stocké Vercel Blob privé
- Champ `ProfilJeune.photoUrl`
- Bouton retirer = supprime blob + clear champ

### 4.3 Backoffice staff

- Guard : `getSession()` + check `CentreStaff(cjsUid, centreId, role)` via Prisma
- Côté SSO : ajout futur claim `cjs_centre_staff: [{ centreId, role }]`
- Table miroir Guichet (`CentreStaff`) gérée par admin Guichet en attendant

### 4.4 CDP loi 2008-12

- Photo : consentement explicite onboarding (checkbox dédiée + révocation)
- CheckIn : log nominatif (cjsUid) avec retention 6 mois max (purge auto)
- KPI agrégés : anonymisés (jamais cjsUid)
- Carte CJS QR : pas de PII en clair, signature HMAC

## 5. Découpage waves

### Wave 0 — Spec + foundations data
**Tickets : GUIC-353 (parent)**

- ✅ Cette spec rédigée (`.agent_context/specs/M4-centres-lot7.md`)
- ✅ ADRs (5 documents)
- Sprite icons manquants ajoutés à `public/icons.svg` (`car`, `desktop`, `block`, `target`, `share`)
- Migration Prisma `lot7_data_model` (tous les modèles + enums)
- Seed initial `prisma/seed/lot7-centres.ts` : horaires 9 centres + services + ~30 ressources démo + utilisateurs staff démo
- Helper analytics `src/lib/analytics/centre-events.ts` + endpoint `/api/v1/track`
- Tests unit modèles + analytics (TDD strict)
- Variable env `NEXT_PUBLIC_GOOGLE_MAPS_KEY` documentée
- Variable env `CJS_CHECKIN_SECRET` documentée

**Critère de done** : `npm run validate` vert, migration appliquée, seeds peuplés, tests >90% coverage sur lib analytics.

### Wave 1 — Primitives + Storybook
**Tickets : GUIC-354**

Composants à créer (avec stories) :
- `<SenegalMap>` — wrapper SVG existant + props `pins`, `activeId`, `onPinClick`, `showLabels`, `prefersReducedMotion`
- `<CentresMapGoogle>` — wrapper Google Maps JS API + alternative liste a11y
- `<MyCJSCard>` final — refactor existant + intégration photo + QR signé
- `<MyCJSCardBack>` — refonte GUIC-352
- `<QRBadge>` — wraps `qrcode` lib serveur, génère via API
- `<CentreOpenDot>` — point d'ouverture (vert/rouge selon `open`)

**Critère** : Storybook complet + tests visuels + a11y axe-core.

### Wave 2 — Vue `all` + onboarding centre principal
**Tickets : GUIC-355, GUIC-356**

- Page `/centres` refactor avec carte interactive + annuaire
- Composant `<CentreRow>` / `<CentreCardMobile>` / `<CentreRegionFilter>`
- Page `/jeune/onboarding/centre` (nouvelle étape entre `profil` et `recommandations`)
  - Auto-suggest selon `session.region`
  - Modifiable plus tard via `/jeune/mon-profil`
- API `GET /api/centres` paginée + filtres
- Tracking `centre_viewed`, `centre_map_pin_clicked`, `centre_filter_applied`
- Test PO mouhammadouod

### Wave 3 — Vue `detail` + ressources teaser
**Tickets : GUIC-357**

- Page `/centres/[slug]` avec hero teal + sections (Horaires, Services, Contact, Ressources teaser)
- Composants `<CentreDetailHero>`, `<CentreHoursTable>`, `<CentreServicesGrid>`, `<CentreContactCard>`
- Mobile : sections en scroll vertical (pas de bottom-sheet)
- Tap-to-call (`tel:`) + Itinéraire deeplink (`geo:`, `maps://`)
- API `GET /api/centres/[slug]` détail
- Tracking
- Test PO

### Wave 4 — Vues `resources` + `reserve`
**Tickets : GUIC-358, GUIC-359**

- Page `/centres/[slug]/ressources` (liste filtrable par type)
- Page `/centres/[slug]/ressources/[ressourceId]/reserver` (formulaire complet)
- Composants `<RessourceCard>`, `<RessourceTypeFilter>`, `<ReservationForm>`, `<ReservationSlotPicker>`, `<PeopleStepper>`, `<JustificatifUpload>`, `<ReservationRecap>`
- API `POST /api/reservations` avec verrou pessimiste `prisma.$transaction({ isolationLevel: Serializable })`
- Notification SMS Orange au jeune (template confirmation + rappel J-1)
- Email centre (`centre.email`)
- Tracking détaillé
- Test PO

### Wave 5 — Vue `myresa` + workflow
**Tickets : GUIC-360**

- Page `/jeune/mes-reservations` avec 5 tabs
- Composants `<ReservationCard>`, `<ReservationStatusBadge>`, `<ReservationsTabs>`, `<QRRetrievalModal>` (pour `acceptee`)
- API `PATCH /api/reservations/[id]` annulation par le jeune
- Job batch quotidien : marque `Passee` ou `NonHonoree`
- Tracking `centre_reservation_cancelled`
- Test PO

### Wave 6 — Vue `card` + check-in + KPI dashboard
**Tickets : GUIC-361, GUIC-362, GUIC-363**

- Page `/jeune/ma-carte` (recto + verso + grid usages + CTAs)
- Endpoint `GET /api/cjs-card/qr-token` (auto-refresh côté client toutes les 14 min)
- Endpoint `POST /api/v1/checkin/[token]` (scanner staff)
- Page minimaliste `/checkin/v1/[token]` (web pour staff sans app dédiée — saisie centreId + auth conseiller)
- Backoffice MVP staff `/centre-staff/*` (lecture seule)
- Tests E2E Playwright flow complet (browse → détail → réserver → check-in)
- Dashboard `/admin/analytics/centres` (admin Guichet) : KPI fréquentation, top centres, no-show rate
- Audit a11y + perf final
- Test PO final

### Wave +1 (Sprint+1) — Hors scope MVP
- Validation réservation par centre (workflow approval)
- Wallet Apple/Google
- Multi-staff par centre + permissions fines
- Préférence notification user (SMS vs WhatsApp)
- Statistiques avancées + export CSV
- Géolocalisation `navigator.geolocation` (avec consentement)

## 6. Critères d'acceptation MVP (PO Definition of Done)

- [ ] Tous les écrans Lot 7 implémentés et conformes design v2 (vérifiable sur Vercel preview)
- [ ] Test PO entre chaque wave (mouhammadouod) approuvé
- [ ] TDD strict respecté (commits RED/GREEN distincts vérifiables)
- [ ] 0 emoji utilisé comme icône (hook pre-commit GUIC-346)
- [ ] 0 marqueur conflit Git non résolu (hook pre-commit GUIC-346)
- [ ] Coverage > 80% sur `src/lib/loaders/*`, `src/lib/analytics/centre-events.ts`, `src/components/centres/*`
- [ ] E2E Playwright flow complet réservation + check-in passe
- [ ] A11y : navigation clavier complète (calendrier, formulaire, carte alt-list), focus management, `prefers-reduced-motion`
- [ ] Responsive : viewport 360px → 1920px, pas de débordement, tap-min 44px
- [ ] Performance : LCP < 2.5s sur `/centres`, bundle < 250KB gz par route
- [ ] Sécurité : QR JWT signé + magic-bytes upload + rate-limit + CDP retention 6 mois
- [ ] KPI fréquentation : dashboard admin opérationnel avec données réelles
- [ ] Migrations appliquées sur Railway (`vercel-build` GUIC-350)

## 7. Risques résiduels + mitigations

| Risque | Mitigation |
|---|---|
| Performance Google Maps avec 30+ centres futurs | Clustering `@googlemaps/markerclusterer` post-MVP |
| Hydration SSR mismatch animations SVG | Wrapper `'use client'` + `prefers-reduced-motion` |
| Conflit créneau (réservation simultanée) | Verrou pessimiste Prisma `$transaction Serializable` |
| Quota Google Maps (28k charges/mois free) | Monitoring + alerting + restriction HTTP referrer |
| SMS Orange API quota | Réutiliser instance SSO + rate-limit + queue retry |
| Photo carte CJS PII | Consentement explicite onboarding + révocable + stocké Blob privé |
| Token QR vol/replay | Rotation 15 min + anti-replay Redis SET NX + scanner offline avec révocation |
| Bundle size impact mobile | Code-splitting par route + lazy `dynamic(() => import())` |

## 8. Liens

- ADR-001 — Centre principal hybride : `.agent_context/adr/ADR-001-centre-principal-hybride.md`
- ADR-002 — QR JWT rotatif : `.agent_context/adr/ADR-002-qr-jwt-rotatif.md`
- ADR-003 — Rôles backoffice : `.agent_context/adr/ADR-003-roles-backoffice-centres.md`
- ADR-004 — Google Maps : `.agent_context/adr/ADR-004-cartographie-google-maps.md`
- ADR-005 — KPI événementiel : `.agent_context/adr/ADR-005-kpi-frequentation-evenements.md`
- Audit design source : voir notes session 2026-06-09
- Tickets Jira : GUIC-353 à GUIC-363 + sprint+1

---

*Spec validée PO 2026-06-09. Évolution = ADR additionnel.*
