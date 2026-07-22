# GUIC-547 — Centre de notifications multicanal paramétrable (WhatsApp / SMS / email)

Épic parent **GUIC-8** (Dashboard administrateur) · Étiquettes `go-live-v1` `multicanal` `notifications` · 13 pts
Assigné : Mouhammadou Oury Diallo · Source : réunion review + planning du **13 juillet 2026** (demande d'Abdou)

> **But métier** — Permettre à l'admin de configurer, **pour chaque événement métier × chaque type d'utilisateur** (bénéficiaire, partenaire/recruteur, conseiller, admin), **quel(s) canal(aux)** utiliser : WhatsApp (Meta Cloud API), SMS (Orange), email — en **réutilisant** les briques d'envoi existantes et en **respectant le consentement CDP par canal**.

---

## 0. Sous-tâches JIRA (périmètre)

| Ticket | Titre | Prio | Couvre |
|---|---|---|---|
| GUIC-548 | Backend — Moteur de notifications (socle) | Highest | Généralise le dispatcher `src/lib/notifications/`, `emitEvent()`, routage par config |
| GUIC-549 | Cadrage — Catalogue des événements notifiables | Highest | Registre des `event keys`, métadonnées, rôles cibles (§3) |
| GUIC-550 | Frontend — Matrice de configuration admin | Highest | UI admin événement × rôle × canal (§4) |
| GUIC-551 | Backend — Adaptateur canal WhatsApp | Highest | **Existe déjà** — à généraliser au-delà de `candidature_confirmee` |
| GUIC-552 | Backend — Adaptateur canal SMS (Orange SMS Pro) | High | **À construire** (aucun code aujourd'hui) |
| GUIC-553 | Backend — Adaptateur canal email (templates CJS) | High | **À construire** (aucun code aujourd'hui) |
| GUIC-554 | Frontend — Préférences de notification par utilisateur | Medium | UI + modèle préférences/consentement par canal (§5) |

---

## 1. État de l'existant (cartographie du code — 2026-07-22)

Il y a **deux systèmes de notification distincts** aujourd'hui. GUIC-547 doit les **unifier** derrière un moteur unique piloté par config.

### Système A — Centre in-app (`Notification`)
- Modèle `Notification` : `prisma/schema.prisma:873` — `{ id, cjsUid, type, titre, contenu, iconName, lien, metaPill, luA, createdAt }`. **Aucune colonne canal, aucun statut de livraison** — purement in-app.
- Enum `TypeNotification { Deadline, Candidature, Message, Yaye, System }` — `prisma/schema.prisma:239`. `Deadline` est **orphelin** (aucun producteur).
- Loader `loadNotifications(cjsUid)` / `countUnreadNotifications(cjsUid)` — `src/lib/loaders/notifications.ts:106` / `:44`.
- Client partagé `NotificationsClient` — `src/components/jeune/NotificationsClient.tsx` (utilisé par jeune, recruteur, conseiller).
- Pages : `/jeune/(app)/notifications`, `/recruteur/notifications`, `/conseiller/notifications`. **Pas de page admin.**
- Cloche/badge : `AppTopbar` (jeune), `BellLink` inline (recruteur/conseiller layouts).
- ⚠️ Composants `NotificationsDrawer/` et `notifications/NotificationsPanel` = **mock only**, non branchés Prisma.
- **7 call-sites décentralisés** créent des `Notification` en dur (voir §3, colonne « in-app »). Pas de helper central `createNotification()`.

### Système B — Dispatcher multicanal (`src/lib/notifications/`)
- `NotificationChannel` interface — `src/lib/notifications/types.ts:13` : `{ id, isConfigured(payload), send(payload) }`.
- `REGISTRY = [whatsappChannel]` — `src/lib/notifications/index.ts:11`. **WhatsApp seul branché** ; commentaire : « email/SMS = tickets de suivi ».
- `notifyCandidatureConfirmee(payload, consent)` — `index.ts:82`. **Gating** : `NOTIFICATIONS_ENABLED === 'true'` + `consent` ; fan-out `Promise.allSettled` sur `enabledChannels()` (env `NOTIFICATION_CHANNELS`).
- **Idempotence** : Redis `notif:sent:<canal>:<eventId>` TTL 7 j. **DLQ** : `notif:dlq`, `MAX_ATTEMPTS=3`, `drainDlq()` via cron `/api/internal/notifications-dlq`.
- `NotificationPayload` — `types.ts:2` : `{ eventId, prenom, telephone, opportuniteTitre, organisation }` → **candidature-specific, à généraliser**.
- `ChannelError { permanent }` — 4xx (hors 429) = permanent, 429/5xx = retry.

### Canaux d'envoi
| Canal | État | Point d'entrée |
|---|---|---|
| **WhatsApp** | ✅ mature | `src/lib/whatsapp.ts` (`sendTemplateMessage(to, templateName, 'fr', bodyParams[])`, `:118`) ; adapter `src/lib/notifications/channels/whatsapp.ts`. Templates = **noms de templates Meta pré-approuvés** (pas de fichiers locaux). |
| **SMS (Orange)** | ❌ inexistant | Seulement mock `src/lib/notifications/reservations.ts:36` + TODO. Specs indiquent creds Orange possiblement côté SSO (`M4-centres-lot7.md:37,469`). |
| **Email** | ❌ inexistant | Aucune lib (`nodemailer`/`resend`/`smtp`…). À construire de zéro (GUIC-553). |

### Consentement / préférences (CDP)
- **Existe** : `Candidature.notificationsConsent` (opt-in par candidature, `schema:500`) ; trace CDP `Candidature.consentAt/cguVersion/consentIp` (`:502-504`) ; 2 booléens **catégoriels** `Utilisateur.notifCandidatures` / `notifMessages` (`:271-272`, conçus recruteur/conseiller) ; cascades RGPD WhatsApp + `src/lib/ia/cdp-purge.ts`.
- **N'existe PAS** (à construire) : modèle de **consentement par canal**, table `NotificationPreference`, opt-out WhatsApp/SMS/email sur `Utilisateur`, préférences côté **bénéficiaire**, mapping type→canaux.

### Rôles / identité
- Rôles = **claim SSO `cjs_roles`** (jamais la colonne `Utilisateur.role`, display-only). `CJSSession.roles: string[]` (`src/types/user.ts`).
- Helpers `src/lib/auth/espace-roles.ts` : `BENEFICIAIRE_ROLES = {beneficiaire, jeune, chercheur_d_emploi}`, `CONSEILLER_ROLE`, `RECRUTEUR_ROLE` ; admin via `src/lib/auth/admin-roles.ts`.
- **`cjsUid`** = clé destinataire universelle (PK `Utilisateur`, présent partout). `telephone` / `email` (nullable, `@unique`) sur `Utilisateur`.
- Ancrage : conseiller → `AgentCentre` ; recruteur → `Organisation.cjsUid`.

---

## 2. Architecture cible

```
Événement métier (mutation)
   │  emitEvent(eventKey, { recipients, context })     ← GUIC-548, remplace les create() en dur
   ▼
NotificationEngine
   ├─ 1. Résout les destinataires (cjsUid) par rôle
   ├─ 2. Lit la CONFIG ADMIN : (eventKey × rôle) → canaux activés   ← GUIC-550 / matrice
   ├─ 3. Intersecte avec les PRÉFÉRENCES utilisateur                ← GUIC-554
   ├─ 4. Intersecte avec le CONSENTEMENT CDP par canal (opt-in)     ← CDP
   ├─ 5. Vérifie contact dispo (telephone E.164 / email)
   └─ 6. Fan-out sur les canaux retenus (idempotence + DLQ existants)
           ├─ in-app   (toujours, si configuré)  → Notification row (Système A)
           ├─ whatsapp (channels/whatsapp.ts)     ✅
           ├─ sms      (channels/sms.ts)          ← GUIC-552
           └─ email    (channels/email.ts)        ← GUIC-553
```

**Principe directeur** : un seul point d'émission `emitEvent()`, une seule table de config admin, un seul moteur de fan-out. On **réutilise** l'idempotence Redis + DLQ + `NotificationChannel` déjà en place. Le canal **in-app** devient un `NotificationChannel` à part entière (aujourd'hui il est écrit en dur hors dispatcher).

### Ordre de priorité des canaux (résolution)
`canal envoyé = config_admin(eventKey, rôle) ∩ préférence_user ∩ consentement_CDP ∩ contact_disponible`
- **in-app** : pas de consentement requis (l'utilisateur est déjà dans l'app), pas de coût, activable par défaut.
- **whatsapp / sms** : requièrent opt-in explicite (numéro E.164 lié + consentement) — hors 24 h WhatsApp ⇒ template Meta obligatoire.
- **email** : requiert email vérifié + consentement.

---

## 3. Catalogue des événements notifiables (GUIC-549)

Legend : **[W]** déjà branché · **[M]** mock/log seulement · **[A]** aspirationnel (mutation existe, aucune notif). Canaux = **défaut recommandé** (l'admin peut surcharger).

### M2 — Auth / Comptes
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `compte.provisioned` | `api/webhooks/sso/route.ts:89` | bénéficiaire | in-app + email | A |
| `partenaire.compte_verifie` | `admin/partenaires/actions.ts:48` | recruteur | in-app + email | A |
| `recruteur.statut_change` | `admin/partenaires/actions.ts:104` | recruteur | in-app + email | A |

### M3 — Opportunités & Candidatures
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `candidature.created.confirmation` | `api/candidatures/route.ts:196` | bénéficiaire | in-app + whatsapp | **W** |
| `candidature.created.recruteur` | `api/candidatures/route.ts:207` | recruteur | in-app | **W** |
| `candidature.statut_change` | `recruteur/candidatures/actions.ts:46` | bénéficiaire | in-app + whatsapp/sms | **A ⚠️ high-value manquant** |
| `opportunite.created_recruteur` | `recruteur/mes-offres/actions.ts:79` | admin | in-app | A |
| `opportunite.approved` / `published` | `admin/opportunites/actions.ts:78/:95` | recruteur | in-app + email | A |
| `opportunite.rejected` | `admin/opportunites/actions.ts:86` | recruteur | in-app + email | A |
| `opportunite.matches_profile` | cron reco (`api/cron/yaye-reco-precompute`) | bénéficiaire | in-app + whatsapp | A |
| `candidature.deadline_approaching` | **cron manquant** (`TypeNotification.Deadline` orphelin) | bénéficiaire | in-app + sms | A |

### M4 — Centres (réservations, check-in, bibliothèque)
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `reservation.created.staff` | `api/reservations/route.ts:256` | conseiller(s) centre | in-app | **W** |
| `reservation.created.jeune` | `api/reservations/route.ts:233` | bénéficiaire | sms + email | **M** |
| `reservation.accepted` | `conseiller/actions.ts:114` | bénéficiaire | in-app + sms | **W** |
| `reservation.refused` | `conseiller/actions.ts:114` | bénéficiaire | in-app + sms | **W** |
| `reservation.creneau_proposed` | `conseiller/actions.ts:180` | bénéficiaire | in-app + sms | **W** |
| `reservation.cancelled_by_jeune` | `api/reservations/[id]/route.ts:129` | conseiller/centre | in-app | A |
| `reservation.cancelled_by_centre` | `api/centre-staff/[centreId]/reservations/[id]/cancel/route.ts:139` | bénéficiaire | in-app + sms | A |
| `reservation.reminder` | **cron manquant** (kind `reminder` défini, jamais appelé) | bénéficiaire | sms | A |
| `reservation.no_show` | `api/cron/reservations-batch/route.ts:47` | bénéficiaire | in-app | A |
| `checkin.presence_marked` | `api/v1/checkin/[token]/presence/route.ts:68` | bénéficiaire | in-app | A |
| `emprunt.initie` / `retrait_confirme` / `rendu` | `api/bibliotheque/emprunts/*` | bénéficiaire | in-app + email | A |
| `emprunt.en_retard` | **cron manquant** | bénéficiaire | sms + email | A |

### M5 — Agenda / Événements
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `evenement.inscription` | `api/evenements/[id]/inscription/route.ts:104` | bénéficiaire | in-app + email | A |
| `evenement.reminder` | **cron manquant** | bénéficiaire (inscrits) | sms + whatsapp | A |
| `evenement.modified` / `cancelled` | `admin/evenements/actions.ts:83/:99` | bénéficiaires inscrits | in-app + sms | A |
| `publication.soumise` | `conseiller/publications/actions.ts:56` | admin | in-app | A |
| `publication.validee` / `refusee` | `admin/evenements/actions.ts:144/:156` | conseiller (auteur) | in-app | A |

### M6 — Ressources
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `ressource.published` | `admin/ressources/actions.ts:41` | bénéficiaires (matching/favoris) | in-app | A |
| `ressource.modified` | `admin/ressources/actions.ts:63` | bénéficiaires (favoris) | in-app | A |

### M8 — Admin / Modération / Curation
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `curation.item_discovered` | `lib/curation/robot/run.ts:104` (cron veille) | admin | in-app | A |
| `partenaire.rattachement_centre` | `admin/utilisateurs/actions.ts:64` | conseiller | in-app | A |

### M9 — Recruteur (entretiens, messagerie)
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `entretien.planifie` | `recruteur/entretiens/actions.ts:68` | bénéficiaire | in-app + whatsapp/sms | **W** |
| `entretien.annule` / `termine` | `recruteur/entretiens/actions.ts:87` | bénéficiaire | in-app + sms | A |
| `entretien.reminder` | **cron manquant** | bénéficiaire + recruteur | sms + whatsapp | A |
| `message.received` | `lib/messagerie/actions.ts:95` | l'autre partie | in-app | **W** |

### M11 — WhatsApp
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `whatsapp.opt_in_confirmed` | `api/whatsapp/link/confirm/route.ts:12` | bénéficiaire | whatsapp | A |

### M12 — IA (Yaye)
| Event key | Déclencheur | Destinataire(s) | Défaut canaux | État |
|---|---|---|---|---|
| `yaye.escalade_conseiller` | `lib/ia/escalade.ts:47` | conseillers + directeurs | in-app | **W** |
| `yaye.signalement_danger` | `lib/ia/escalade.ts:42` | conseillers + directeurs | in-app + sms (urgent) | **W** |
| `yaye.escalade_resolue` | `api/admin/yaye/escalades/[id]/route.ts` | bénéficiaire | in-app + whatsapp | A |

### M10 — Interop (BRM / Centres / EduPop / Moodle)
Tous les endpoints `/api/interconnexion/*` sont des **stubs HMAC qui loguent seulement** — pas de notif tant que la sync n'est pas implémentée (Sprint 4). Events futurs : `interop.moodle.progression`, `interop.edupop.event` → bénéficiaire.

> **Récap couverture** : ~10 flux **déjà branchés**, 1 mock, le reste aspirationnel. Cibles : bénéficiaire ~24 events · recruteur ~8 · conseiller ~6 · admin ~5.

---

## 4. Matrice de configuration admin (GUIC-550)

Écran admin (sous GUIC-8) : tableau **événement (ligne) × rôle × canal (colonnes)**, chaque cellule = toggle canal activable.

```
Événement                     │ Bénéficiaire        │ Recruteur      │ Conseiller     │ Admin
                              │ in │ WA │ SMS │ ✉  │ in │ WA │SMS│✉ │ in │SMS│✉ │ in │✉
candidature.statut_change     │ ☑  │ ☑  │ ☐   │ ☐  │ —  │ — │ —│—│ — │—│—│ — │—
reservation.accepted          │ ☑  │ ☐  │ ☑   │ ☐  │ —  │ … │  │ │ …
…
```

**Modèle de données (nouveau)** :
```prisma
model NotificationEventConfig {
  id        String   @id @default(uuid()) @db.VarChar(36)
  eventKey  String   @db.VarChar(80)          // ex "candidature.statut_change"
  role      String   @db.VarChar(40)          // beneficiaire | recruteur | conseiller | admin
  canaux    Json                              // ["in_app","whatsapp","sms","email"]
  actif     Boolean  @default(true)
  updatedBy String?  @map("updated_by") @db.VarChar(36)
  updatedAt DateTime @updatedAt @map("updated_at")
  @@unique([eventKey, role])
  @@map("notification_event_config")
}
```
- **Seed** : initialiser depuis les « défaut canaux » du §3 (migration de seed).
- Fallback si pas de ligne config : comportement **par défaut du catalogue** (§3), jamais silencieux total (in-app minimum pour les events critiques).
- Rôle **admin** : l'écran doit pouvoir se restreindre aux rôles pertinents par event (griser les cellules non applicables).

---

## 5. Préférences & consentement utilisateur (GUIC-554 + CDP)

Deux notions à ne pas confondre :
- **Consentement CDP** (légal, opt-in par canal) — obligatoire avant tout envoi WhatsApp/SMS/email.
- **Préférence** (confort, l'utilisateur affine ce qu'il reçoit) — ne peut qu'**abaisser** ce que l'admin a activé, jamais réactiver un canal sans consentement.

**Modèle de données (nouveau)** :
```prisma
model NotificationPreference {
  id            String   @id @default(uuid()) @db.VarChar(36)
  cjsUid        String   @map("cjs_uid") @db.VarChar(36)
  canal         String   @db.VarChar(20)   // whatsapp | sms | email | in_app
  consentGiven  Boolean  @default(false) @map("consent_given")   // CDP opt-in
  consentAt     DateTime? @map("consent_at")
  consentSource String?  @map("consent_source") @db.VarChar(40)  // onboarding | params | whatsapp_link | candidature
  enabled       Boolean  @default(true)    // préférence de confort
  categoriesOff Json?    @map("categories_off")  // events/catégories désactivés par l'user
  utilisateur   Utilisateur @relation(fields: [cjsUid], references: [cjsUid], onDelete: Cascade)
  @@unique([cjsUid, canal])
  @@map("notification_preferences")
}
```
- **Migration douce** des 2 booléens existants `notifCandidatures`/`notifMessages` → `categoriesOff` (ne pas casser GUIC-513).
- **WhatsApp** : le lien `ConversationWhatsApp.linkedAt` (magic link) sert de preuve d'opt-in canal whatsapp → alimente `consentGiven`. STOP WhatsApp ⇒ `consentGiven=false`.
- **UI** : écran « Préférences de notification » pour **chaque espace** (jeune, recruteur, conseiller) — aujourd'hui seul recruteur/conseiller ont des toggles ; **le bénéficiaire n'a rien**, à créer.
- **Right-to-erasure** : `onDelete: Cascade` sur `cjsUid` (cohérent avec l'existant).

---

## 6. Découpage & ordre d'implémentation recommandé

1. **GUIC-549 (cadrage)** → figer le registre `NOTIFICATION_EVENTS` (TS const, une entrée par event key du §3 : `{ key, module, roles[], defautCanaux[], template refs }`). Livrable = `src/lib/notifications/catalog.ts` + doc.
2. **GUIC-548 (socle)** → `emitEvent(eventKey, ctx)` + `NotificationEngine` (résolution destinataires → config → préférence → consentement → fan-out). Transformer le canal **in-app** en `NotificationChannel`. Généraliser `NotificationPayload` (event générique + `templateData`). Migrer les 7 call-sites en dur vers `emitEvent()` **sans changer le comportement observable** (les 10 flux WIRED restent identiques).
3. **GUIC-551 (WhatsApp)** → généraliser `channels/whatsapp.ts` au-delà de `candidature_confirmee` : mapping `eventKey → templateName Meta` (les templates doivent être pré-approuvés côté Meta).
4. **GUIC-552 (SMS Orange)** → nouveau `channels/sms.ts` implémentant `NotificationChannel`. Clarifier d'abord **où sont les creds Orange** (repo vs SSO — cf. `M4-centres-lot7.md:469`). Env `ORANGE_SMS_*`.
5. **GUIC-553 (email)** → nouveau `channels/email.ts` + lib d'envoi (choix techno à trancher, cf. Q3) + templates CJS. Env `SMTP_*` ou provider.
6. **GUIC-550 (matrice admin)** → modèle `NotificationEventConfig` + seed + écran admin.
7. **GUIC-554 (préférences user)** → modèle `NotificationPreference` + écrans par espace + migration des booléens.

**Transverse** : brancher les crons manquants (`*.reminder`, `deadline_approaching`, `emprunt.en_retard`) une fois le moteur prêt — ils débloquent ~6 events aspirationnels à forte valeur.

---

## 7. Contraintes & règles (rappel CLAUDE.md)

- **CDP** : aucun envoi WhatsApp/SMS/email sans `consentGiven=true` sur le canal. Trace de consentement conservée. Purge = cascade `cjsUid`.
- **Idempotence** : réutiliser `notif:sent:<canal>:<eventId>` (TTL 7 j) — `eventId` doit devenir `<eventKey>:<entityId>`.
- **E.164** obligatoire pour téléphone (WhatsApp/SMS).
- **Fail-soft** : une notif ne doit jamais bloquer la mutation métier (`after()` / try-catch, comme l'existant).
- **Prisma only** · migrations via `prisma migrate dev` · **`src/components/ui/` only** pour l'UI · tokens `gj-*`.
- **Feature flag** conseillé (`NOTIFICATIONS_ENABLED`, `NOTIFICATION_CHANNELS`) déjà en place — étendre plutôt que remplacer.

---

## 8. Décisions (tranchées 2026-07-22)

1. **SMS = Orange SMS Pro** (contrat SSO). API `https://api.orangesmspro.sn:8443/api` (env `ORANGE_SMS_BASE_URL`). Contrat exact ci-dessous. Creds en env `ORANGE_SMS_*` (jamais commit).
2. **Email = Resend** (décision PO 2026-07-22, remplace le choix GCP/Gmail initial — bascule faite en GUIC-553). `POST api.resend.com/emails`, env `RESEND_API_KEY` + `RESEND_FROM` (domaine vérifié côté Resend). Templates HTML aux tokens `gj-*`.
3. **Granularité config admin = `(eventKey × rôle)`** — pas de niveau centre/organisation.
4. **Les 4 canaux** (in-app, whatsapp, sms, email) sont livrés.
5. **Migration GUIC-513** : `notifCandidatures`/`notifMessages` → `NotificationPreference.categoriesOff` (migration douce, oui).

### Contrat Orange SMS Pro (GUIC-552)
Source : lib PHP de référence du SSO. Requête **GET** avec paramètres en query-string sur `${ORANGE_SMS_BASE_URL}` :
```
params = { token, subject, signature, recipient, content, timestamp, key }
timestamp = Math.floor(Date.now()/1000)
key       = HMAC-SHA1( token + subject + signature + recipient + content + timestamp , api_key )   // hex
```
- **Auth** : HTTP Basic `login:token`.
- **recipient** : numéro **sans `+`**, format `221XXXXXXXXX` (⚠️ différent du E.164 WhatsApp — le canal SMS doit stripper le `+`).
- **signature** : nom d'expéditeur SMS (≤ 11 car., ex `KIWIST1`).
- **subject** : libellé interne de campagne.
- Env : `ORANGE_SMS_LOGIN`, `ORANGE_SMS_API_KEY`, `ORANGE_SMS_TOKEN`, `ORANGE_SMS_SIGNATURE`, `ORANGE_SMS_SUBJECT`, `ORANGE_SMS_BASE_URL`, `ORANGE_SMS_VERIFY_SSL` (défaut `false` — l'endpoint a un certif auto-signé côté SSO).
- Permanent vs retry : 4xx (hors 429) = permanent ; 429/5xx = retry (aligné `ChannelError`).

### Contrat email GCP (GUIC-553)
- Envoi via **Gmail API** (`gmail.users.messages.send`) authentifié par le service account (domain-wide delegation → impersonate `GCP_EMAIL_SENDER`), réutilise `GOOGLE_APPLICATION_CREDENTIALS` déjà monté.
- Env : `GCP_EMAIL_SENDER` (adresse expéditrice Workspace), scope `https://www.googleapis.com/auth/gmail.send`.
- Corps : `multipart/alternative` (text + HTML tokens `gj-*`). Sujet + template par `eventKey`.
- Dépendance à ajouter : `googleapis` (le `gmail` client). `isConfigured` = destinataire `email` présent + `GCP_EMAIL_SENDER` défini.

---

## DoD (par sous-tâche)
`npm run validate` vert · TDD (RED avant GREEN) · pas de régression sur les 10 flux WIRED · PR → dev · Jira sous-tâche en *Revue*.

## Tests clés (TDD)
- Moteur : résolution `config ∩ préférence ∩ consentement ∩ contact` (matrice de cas), fan-out multi-canaux, idempotence (double `emitEvent` = 1 envoi/canal), fail-soft.
- Consentement : envoi refusé si `consentGiven=false` par canal ; in-app toujours autorisé.
- Adaptateurs SMS/email : `isConfigured` (contact présent), `ChannelError.permanent` sur 4xx.
- Non-régression : les 10 events WIRED produisent exactement la même notif qu'avant migration vers `emitEvent()`.
