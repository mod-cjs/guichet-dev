# Spec GUIC-21 — Détail opportunité et workflow de candidature

**Ticket :** GUIC-21 · **Sprint :** 1 · **Story Points :** 8
**Module :** M3 (m3-opportunites) — parent GUIC-3
**Branche prévue :** `feature/GUIC-21-opportunite-detail-candidature` (depuis `dev`)
**Sous-tâches :** GUIC-77, 78, 79, 80, 81, 82, 83
**Études liées :** UX `M3-opportunites-ux.md` · UI `M3-opportunites-ui.md`

**Dépend de GUIC-20** : `OpportunityCard`, la page `/opportunites`, le champ `slug` et
l'API favoris doivent être livrés. À démarrer après merge de GUIC-20 dans `dev` (ou rebase).

---

## Contexte

Le modèle `Candidature` est déjà en base (GUIC-17) : `cjsUid`, `opportuniteId`, `statut`
(`En_attente`/`Vue`/`Retenue`/`Refusee`), `lettreMotivation`, `cvUrl`, `soumiseA`,
contrainte `@@unique([cjsUid, opportuniteId])`. Le `slug` SEO de `Opportunite` est livré
par **GUIC-20** (GUIC-21 ne le crée plus).

GUIC-21 livre la **consultation du détail** et le **workflow de candidature** :
détail (slide-over desktop / sheet mobile via *intercepting route*), formulaire de
candidature, soumission idempotente, confirmation multi-canal asynchrone, section
« Mes candidatures ».

### Reformulation de la story
« postuler en un clic » → **« postuler via un formulaire sans quitter la page »**.

### Décisions de cadrage (arbitrées avec le PO)
- **CV retiré du Sprint 1** : la candidature ne porte que `lettreMotivation`. La colonne
  `cvUrl` reste nullable en base mais n'est ni saisie ni affichée (pas de service d'upload,
  coller une URL de CV est irréaliste pour la cible). Réintroduction = ticket de suivi.
- **Détail = intercepting route Next 16** : slide-over/sheet sur navigation depuis la liste,
  page SSR complète sur accès direct/refresh — un seul rendu de contenu, pas de duplication.
- **Confirmation = dispatcher de notifications multi-canal** (`after()` + DLQ — voir section
  dédiée). GUIC-21 implémente le **canal WhatsApp** ; email et SMS se branchent ensuite sur
  le même dispatcher (tickets de suivi). Pas d'email/SMS livré ici — GUIC-83 recadré.
- **Portabilité du déploiement** : cible principale Vercel Pro, mais l'app doit aussi tourner
  en `standalone` auto-hébergé (Nginx/OVH). L'architecture retenue est portable : `after()`
  est natif Next 16, et le drain DLQ est un endpoint HTTP déclenché soit par `crons`
  Vercel, soit par une crontab système. Aucun worker permanent requis.

### Hors scope GUIC-21
- Traitement des candidatures côté recruteur (changement de statut) → **m9-recruteur**
- Upload de fichier CV → reporté (cf. décision ci-dessus)
- Création du champ `slug` → livré par **GUIC-20**

---

## Schéma Prisma — changements

### Champ `notificationsConsent` sur `Candidature`
```prisma
notificationsConsent Boolean @default(false) @map("notifications_consent")
```
- Migration `prisma migrate dev --name add_candidature_notifications_consent`.
- Enregistre le consentement explicite de l'utilisateur à recevoir la confirmation/le suivi
  par WhatsApp/SMS (exigence Meta + conformité CDP — voir « Consentement » plus bas).
- Pas d'autre changement : `Candidature` et `Opportunite.slug` existent déjà.

Tracking des vues : incrément du compteur `vues` existant. **Pas de table par-utilisateur**
(conformité CDP — pas de donnée de consultation nominative).

---

## Contrats API

### `GET /api/opportunites/[slug]`
Endpoint **public** — rate-limit Redis (60/min/IP). Renvoie le détail complet.
```ts
// 200 → ApiResponse<OpportuniteDetail>
// slug inconnu, statut != publiee, deletedAt != null → 404
```
- `OpportuniteDetail` = tous les champs publics + organisation (jointure `org`).
- **Incrément `vues`** : `UPDATE opportunites SET vues = vues + 1`, best-effort, non bloquant
  (jamais d'échec de la réponse si l'update échoue).
- **Dédoublonnage par IP** : clé Redis `vue:<slug>:<ip>` TTL 30 min — l'incrément n'a lieu
  que si la clé n'existe pas. Limite la sur-compte des bots SEO/refresh sans table par-user.

### `POST /api/candidatures`
Auth SSO requise (`cjs_uid`). Rate-limit 10/min/user.
```ts
// Body Zod : { opportuniteId: string (uuid), lettreMotivation?: string (0..2000),
//              notificationsConsent: boolean (défaut false) }
// 201 → { data: Candidature }
// déjà candidaté → 409 ALREADY_APPLIED (contrainte @@unique)
// opportunité inexistante → 404 · non publiée / expirée → 422
```
- Vérifie la visibilité de l'opportunité (`statut=publiee`, `deletedAt=null`, non expirée)
  **avant** insertion.
- Après création réussie : dispatch des notifications de confirmation via **`after()`**
  (post-réponse, voir section dédiée). Ne doit jamais faire échouer la réponse 201.
- Idempotence : la contrainte `@@unique([cjsUid, opportuniteId])` empêche le doublon (409).

### `GET /api/candidatures`
Auth SSO. Rate-limit 30/min. Candidatures de l'utilisateur connecté.
```ts
// 200 → { data: CandidatureListItem[], meta: { total, page, pageSize: 20 } }
// CandidatureListItem : id, opportuniteSlug, opportuniteTitre, organisation, statut, soumiseA
```
Tri `soumiseA` desc. Pagination offset 20/page. **Remplace le stub**
`src/app/api/candidatures/route.ts`.

### `GET /api/internal/notifications-dlq` *(drain de la DLQ — GUIC-83)*
**Non public.** Authentifié par **`CRON_SECRET`** (header `Authorization: Bearer`). **Pas**
le HMAC `verify-hmac.ts` — celui-ci a une fenêtre timestamp + secrets par-plateforme, conçu
pour les API interop (BRM/Centres), inadapté ici.
```ts
// Déclenché par cron (~toutes les 10 min). Draine la DLQ Redis par lot borné.
// 200 → { data: { retried: number, abandoned: number } }
export const maxDuration = 60   // marge pour l'envoi parallèle (ignoré hors Vercel)
```
- **Déclenchement portable** : sur Vercel via `crons` dans `vercel.json` ; en auto-hébergé
  (Nginx/OVH) via crontab système — `curl -H "Authorization: Bearer $CRON_SECRET" …`.
- Ne traite **que** la DLQ (`notif:dlq`) — le happy path passe par `after()`.
- Renvoi en **parallèle borné** (`Promise.allSettled`, ~10 simultanés) pour tenir `maxDuration`.

---

## Notifications de confirmation — dispatcher multi-canal (GUIC-83)

**Architecture : dispatcher de notifications + `after()` (happy path) + DLQ Redis (échecs).**
`after()` (Next 16, natif — fonctionne aussi en `standalone` auto-hébergé) exécute du code
**après** l'envoi de la réponse, dans la même invocation — envoi instantané sans bloquer le
201, sans queue systématique. La DLQ/cron n'est payée que pour les rares échecs.

### Dispatcher de notifications
GUIC-21 livre une abstraction réutilisable, pas un envoi WhatsApp en dur :
- `src/lib/notifications/` : un dispatcher `notifyCandidatureConfirmee(payload)` + une
  interface `NotificationChannel { id, isEnabled(), send(payload) }`.
- Canaux activés lus depuis l'env : **`NOTIFICATION_CHANNELS`** (liste, ex. `whatsapp,sms`).
- **Sémantique fan-out** : le dispatcher envoie sur **tous** les canaux activés, en parallèle.
  Chaque canal est indépendant — succès/échec géré par canal (idempotence et DLQ par canal).
- **GUIC-21 implémente uniquement le canal `whatsapp`.** Email (`smtp`) et SMS (`orange`)
  sont des **tickets de suivi** : ils n'ont qu'à fournir un `NotificationChannel` de plus,
  zéro rework du dispatcher. Credentials disponibles (repris du projet SSO `../cjs_auth` :
  `MAIL_*` pour SMTP, `ORANGE_SMS_*` pour le SMS).

### Flux nominal (`after()`)
1. `POST /api/candidatures` insère la candidature, renvoie `201`.
2. `after(() => notifyCandidatureConfirmee(payload))` s'exécute post-réponse :
   - **garde-fous globaux** : ne dispatch que si `NOTIFICATIONS_ENABLED` est vrai **et**
     `candidature.notificationsConsent` est vrai. Sinon : aucun envoi (candidature valide).
   - pour chaque canal activé : vérifie l'idempotence (`notif:sent:<canal>:<event_id>` absent —
     `event_id = candidature:<id>`), envoie, succès → pose `notif:sent:<canal>:<event_id>` TTL 7 j.
3. **Échec d'un canal** → un job `{ canal, event_id, payload, attempts }` est poussé en DLQ
   Redis `notif:dlq`. Les autres canaux ne sont pas affectés.

### Politique de retry (DLQ)
| Type d'échec | Cause | Action |
|---|---|---|
| `4xx` provider (destinataire invalide, opt-out, template rejeté) | permanent | abandon immédiat, log `error` |
| `5xx` / réseau / `429` | transitoire | `attempts++`, re-DLQ si `attempts < 3`, sinon abandon + log `error` |
- Succès au retry → pose `notif:sent:<canal>:<event_id>`, retiré de la DLQ.
- Pas de queue à délai : le cron 10 min fournit le backoff (3 tentatives ≈ 30 min).

### Alerte sur abandon
Tout job **abandonné** (4xx permanent, ou 3 retries épuisés) déclenche une alerte :
- `logger.error` structuré, code `NOTIF_ABANDONED` (`{ canal, event_id, cause }`) — capté
  par n'importe quel agrégateur de logs.
- **POST sur `ALERT_WEBHOOK_URL`** si la variable d'env est renseignée : webhook entrant
  générique (Slack / Discord / Google Chat — payload `{ text }` simple). Aucun compte
  provider ni template à gérer ; l'alerte est désactivée proprement si l'URL est absente.
- Idempotence de l'alerte : clé `notif:alerted:<event_id>` (TTL 7 j) — une alerte par job.

### Canal WhatsApp — règles spécifiques
- **Message business-initié → template Meta obligatoire** : hors fenêtre 24 h, Meta refuse
  le texte libre. GUIC-83 ajoute **`sendTemplateMessage`** dans `src/lib/whatsapp.ts`.
  Template **UTILITY**, langue `fr`, 3 variables (prénom, titre, organisation), nom lu depuis
  `WHATSAPP_TEMPLATE_CANDIDATURE`. Le template doit être **pré-approuvé** côté Meta —
  dépendance externe à lancer jour 1 du sprint.
- **Téléphone** E.164 (`+221XXXXXXXXX`) repris du profil. Absent → canal ignoré pour cet
  utilisateur (pas d'échec, pas de DLQ).

### Règles transverses
- **Feature-flag** `NOTIFICATIONS_ENABLED` : permet de merger GUIC-21 **avant** l'approbation
  du template Meta (flag `false` → aucun envoi, candidature + Toast inchangés).
- **Idempotence par canal** : clé `notif:sent:<canal>:<event_id>` Redis (TTL 7 j).
- **Consentement (CDP)** : le dispatch est conditionné au champ `notificationsConsent` de la
  candidature (case explicite non pré-cochée — voir formulaire). Aucun envoi sans consentement,
  tous canaux confondus.
- La candidature est toujours confirmée (`201` + Toast) même si une notification échoue/retarde.

---

## Frontend

### Détail opportunité — intercepting route
Route `/opportunites/[slug]` avec **intercepting route + parallel route** Next 16 :
- **Navigation depuis la liste** (clic `OpportunityCard`) → segment intercepté `(.)[slug]`
  dans un slot parallèle `@modal`, rendu en **slide-over** (desktop) / **sheet ascendante**
  (mobile) par-dessus la liste, qui reste en contexte.
- **Accès direct / refresh / partage** → `/opportunites/[slug]/page.tsx` rendu **SSR complet**
  (page autonome, indispensable au SEO m7), avec retour vers la liste.
- **Plomberie requise** : `@modal/default.tsx` (renvoie `null` hors interception) et le
  `layout.tsx` de `(public)/opportunites` doit rendre le slot `{modal}`.
- Contenu commun (un seul composant) : description, organisation, lieu/région, rémunération,
  deadline, type, domaine.
- Mobile sheet : grab handle, fermeture au swipe, `padding-bottom` safe-area — conforme
  `design/html/Mobile Patterns.html`.
- Actions : **Postuler**, **Sauvegarder** (favori — API GUIC-20), **Partager**.
- **État du bouton d'action** (cf `M3-opportunites-ux.md` F1) : le client connecté charge
  une fois son **set de candidatures** (IDs d'opportunités, via `GET /api/candidatures`) ; le
  bouton dérive son état de ce set + de la deadline :
  - `Postuler` (défaut) · `Déjà candidaté` (désactivé, si dans le set) ·
    `Candidatures closes` (désactivé, si expirée) · CTA login si anonyme.
  Évite de laisser remplir un formulaire voué à un `409`/`422`.

### Formulaire de candidature (modal)
- Ouvert par « Postuler » — **uniquement si connecté** ; sinon → `/auth/login` avec
  `callbackUrl = /opportunites/[slug]?postuler=1` : au retour, le détail s'ouvre **et** le
  formulaire est ré-ouvert directement (cf `M3-opportunites-ux.md` F2).
- Champ : `lettreMotivation` (textarea, 0..2000) — **optionnel mais encouragé** : texte
  d'aide incitatif (« Quelques lignes sur votre motivation augmentent vos chances ») +
  compteur de caractères. Pas de minimum bloquant. **Pas de champ CV en Sprint 1.**
- **Case de consentement** `notificationsConsent` : checkbox **non pré-cochée** (CDP — pas
  de consentement implicite), libellé clair (« J'accepte de recevoir la confirmation et le
  suivi de ma candidature par WhatsApp/SMS »). **Facultative** : décochée, la candidature est
  soumise normalement, simplement sans notification.
- **Contexte profil en lecture seule** : nom, prénom, téléphone du profil affichés (non
  éditables) pour que le jeune voie ce que le recruteur recevra. Pas de « pré-remplissage »
  de la lettre — la story est ajustée en ce sens.
- Validation front (Zod partagé), état de chargement, gestion explicite `409 ALREADY_APPLIED`
  (message « Vous avez déjà postulé ») et `422` (opportunité fermée).
- Succès → `Toast` de confirmation (les notifications arrivent en asynchrone, non garanties instantanées).

### Section « Mes candidatures » (espace jeune)
- **Route dédiée** `/jeune/candidatures` — réutilise le layout dashboard de GUIC-19
  (`AppTopbar` + `BottomNav`).
- **Point d'entrée** : une carte dans le dashboard jeune (GUIC-19) renvoyant vers cette route.
  **Pas de 6ᵉ item de `BottomNav`** — la barre est verrouillée à 5 items (cf `layout-navigation.md`).
- Liste : titre opportunité (lien vers `/opportunites/[slug]`), organisation, date, statut (`Badge`).
- Données via `GET /api/candidatures` (ou loader server direct, cohérent avec GUIC-19).

---

## Fichiers à créer / modifier

### Nouveaux
- `prisma/migrations/<ts>_add_candidature_notifications_consent/migration.sql`
- `src/app/(public)/opportunites/[slug]/page.tsx` — détail SSR (accès direct)
- `src/app/(public)/opportunites/@modal/(.)[slug]/page.tsx` — intercepting route (slide-over/sheet)
- `src/app/(public)/opportunites/@modal/default.tsx` — slot vide hors interception
- `src/app/api/opportunites/[slug]/route.ts` — GET détail + incrément vues
- `src/app/api/internal/notifications-dlq/route.ts` — drain DLQ (auth `CRON_SECRET`)
- `src/app/(jeune)/jeune/candidatures/page.tsx` — page « Mes candidatures »
- `src/lib/validations/candidature.ts` — Zod
- `src/lib/notifications/index.ts` — dispatcher `notifyCandidatureConfirmee()` + DLQ + retry
- `src/lib/notifications/types.ts` — interface `NotificationChannel`, payload
- `src/lib/notifications/channels/whatsapp.ts` — canal WhatsApp (template Meta)
- `src/lib/notifications/alert.ts` — alerte abandon (`logger.error` + `ALERT_WEBHOOK_URL`)
- `src/components/opportunites/OpportuniteDetail.tsx` — contenu détail (partagé page + `ui/Sheet`),
  réutilise `ui/Sheet` créé par GUIC-20
- `src/components/opportunites/CandidatureModal.tsx` — formulaire dans `ui/Modal`
- `src/components/jeune/MesCandidatures.tsx`
- `src/types/candidature.ts` — `OpportuniteDetail`, `CandidatureListItem`

### Tests (TDD — écrits AVANT le code)
- `tests/integration/opportunite-detail-api.test.ts` — GET slug, 404, incrément vues, dédoublonnage IP
- `tests/integration/candidatures-api.test.ts` — POST (201/409/404/422), GET liste, auth, rate-limit
- `tests/unit/notifications.test.ts` — dispatcher fan-out, canaux activés via env, idempotence
  par canal, consentement absent → pas d'envoi, feature-flag off, classification retry 4xx/5xx
- `tests/integration/notifications-dlq.test.ts` — drain borné, `CRON_SECRET` requis, abandon
  après 3 retries, alerte `NOTIF_ABANDONED` émise une seule fois

### Modifiés
- `prisma/schema.prisma` — champ `notificationsConsent` sur `Candidature`
- `src/lib/whatsapp.ts` — ajout `sendTemplateMessage`
- `vercel.json` — ajout du cron `/api/internal/notifications-dlq` (`*/10 * * * *`)
- `src/app/api/candidatures/route.ts` — **remplace le stub** (GET + POST réels)
- `src/app/(public)/opportunites/layout.tsx` — rend le slot parallèle `{modal}` (créé si absent)
- `src/components/opportunites/OpportunityCard.tsx` — clic = navigation interceptée vers le détail
- `prisma/seed/opportunites.ts` — éventuelles candidatures de démo (optionnel)

---

## Critères Done

### Backend
- [ ] `GET /api/opportunites/[slug]` : détail, 404 cohérent (statut/deletedAt), incrément `vues`
      non bloquant + dédoublonnage IP Redis
- [ ] `POST /api/candidatures` : 201, 409 doublon, 404/422 visibilité, auth SSO, rate-limit
- [ ] `GET /api/candidatures` : liste utilisateur, pagination, jointure opportunité
- [ ] Dispatcher de notifications (`NotificationChannel`, fan-out, canaux via `NOTIFICATION_CHANNELS`)
- [ ] Canal WhatsApp implémenté (`sendTemplateMessage`, template Meta) ; email/SMS = tickets de suivi
- [ ] Confirmation via `after()` : envoi post-réponse, idempotence `notif:sent:<canal>:<event_id>` TTL 7 j
- [ ] Échec → DLQ Redis ; drain `/api/internal/notifications-dlq` (auth `CRON_SECRET`, cron portable,
      `maxDuration`, envoi parallèle, retry borné 3 + abandon 4xx)
- [ ] Feature-flag `NOTIFICATIONS_ENABLED` permet le merge avant approbation du template Meta
- [ ] Dispatch conditionné à `notificationsConsent` (migration appliquée)
- [ ] Alerte `NOTIF_ABANDONED` sur job abandonné (`logger.error` + `ALERT_WEBHOOK_URL`), idempotente

### Frontend
- [ ] Détail via intercepting route : slide-over/sheet sur navigation, SSR complet sur accès direct
- [ ] Route `/opportunites/[slug]` adressable et server-rendered (SEO)
- [ ] État du bouton d'action dérivé du set de candidatures (Postuler / Déjà candidaté /
      Candidatures closes / login anonyme)
- [ ] Modal candidature : `lettreMotivation` optionnel + aide + compteur, case consentement
      non pré-cochée, contexte profil en lecture seule, cas 409/422
- [ ] « Postuler » gère le non-connecté (`callbackUrl ?postuler=1` rouvre le formulaire au retour)
- [ ] Route `/jeune/candidatures` + carte d'accès dans le dashboard GUIC-19 (pas de 6ᵉ item BottomNav)
- [ ] Icônes = SVG inline `currentColor` (aucun emoji comme icône fonctionnelle/nav ;
      l'illustration `EmptyState` fait exception), tokens `gj-*`, composants `ui/` uniquement

### Qualité
- [ ] Tests écrits AVANT le code (TDD)
- [ ] `npm run validate` vert
- [ ] Pas de SQL brut, `ApiResponse<T>` partout, Zod partout
- [ ] `CURRENT_TASK.md` à jour · commit `[GUIC-21]` + `Closes GUIC-21` · auteur `mod-cjs` · aucune mention IA

---

## Dépendances externes (à lancer jour 1 du sprint)

1. **Template WhatsApp Meta** : soumettre le template UTILITY `fr` (3 variables) ; approbation
   = quelques heures à ~2 j. Non bloquant pour le merge grâce au feature-flag, bloquant pour
   l'activation de l'envoi. Renseigner `WHATSAPP_TEMPLATE_CANDIDATURE` une fois approuvé.
2. **`CRON_SECRET`** : variable d'env à provisionner (Vercel et/ou crontab auto-hébergée).
3. **`ALERT_WEBHOOK_URL`** *(optionnelle)* : URL de webhook entrant (Slack/Discord/Google Chat)
   pour les alertes d'abandon de notification. Absente → alerte limitée au log `error`.

## Tickets de suivi (hors GUIC-21)

- **Canal email** (`smtp`) : `NotificationChannel` branché sur le dispatcher, credentials
  `MAIL_*` repris du SSO. Effort faible — pas de rework du dispatcher.
- **Canal SMS** (`orange`) : `NotificationChannel` via l'API Orange SMS, credentials
  `ORANGE_SMS_*` repris du SSO. Canal le plus pertinent pour la cible (feature phones).

## Points tranchés (2026-05-22)

1. **Consentement notifications** → case `notificationsConsent` explicite **non pré-cochée**
   dans le formulaire, facultative ; champ persisté sur `Candidature`, le dispatch n'a lieu
   que si elle est vraie. Conforme CDP + exigence opt-in Meta.
2. **Point d'entrée « Mes candidatures »** → route dédiée `/jeune/candidatures` + carte
   d'accès dans le dashboard GUIC-19. Pas de 6ᵉ item de `BottomNav` (barre verrouillée à 5).
3. **Alerte DLQ** → tout job abandonné émet `logger.error` (`NOTIF_ABANDONED`) **et** un POST
   sur `ALERT_WEBHOOK_URL` si configurée, idempotent (`notif:alerted:<event_id>`).
