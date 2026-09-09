# GUIC-706 — Lancement séquentiel : pilotage des fonctionnalités depuis l'admin

> Module : `m8-admin` (transverse) · Ticket JIRA : `GUIC-706` · Statut : **à valider**
> Branche : `feature/GUIC-706-feature-flags-lancement-sequentiel` · Date : 2026-08-14

## 1. Contexte & motivation

**Driver réel :** la plateforme couvre 14 modules et ~90 routes, mais l'ouverture aux
22 000 utilisateurs ne se fera pas d'un bloc. Le PO veut ouvrir module par module, et
pouvoir **couper une fonctionnalité en incident sans redéploiement** (coût Vertex qui
dérape, template Meta refusé, partenaire d'interop indisponible…).

**État actuel :** aucune infrastructure de feature flag produit.
- Seul kill switch réel : `NOTIFICATIONS_ENABLED` (env, tout ou rien, redéploiement requis)
  — `src/lib/notifications/emit.ts:145`, `notifications/index.ts:86`, `email/mailing.ts:39`.
- La skill `/feature-flag` du dépôt ne pilote que `NEXT_PUBLIC_DESIGN_V3` (cosmétique v3).
- Aucun modèle Prisma `FeatureFlag`, aucun `src/lib/flags/`.

**Patrons existants à répliquer** (ne rien inventer) :
| Patron | Fichier | Ce qu'on reprend |
|---|---|---|
| Config admin en base | `src/lib/ia/llm-config.ts` | singleton Prisma → cache Redis → API admin → UI, résolution en cascade, **fail-soft** |
| Catalogue en code | `src/lib/notifications/catalog.ts` | 47 entrées groupées par module, surcharges en base (`NotificationEventConfig`) |
| Écran de repli | `src/app/recruteur/ComingSoon.tsx` | « Bientôt disponible », aucune donnée fabriquée |
| Garde admin | `src/lib/auth/admin-roles.ts` + `assertAdmin()` local | RBAC des écritures |

## 2. Décisions validées (PO, 2026-08-14)

| Décision | Choix |
|---|---|
| **Périmètre du flag** | **Les utilisateurs, pas l'administration.** Un flag ferme les espaces jeune / recruteur / conseiller / centre-staff / public. La console admin n'est **jamais** fermée par un flag |
| Granularité | **ON/OFF global** par fonctionnalité — pas de ciblage par rôle, pas de rollout en % |
| **Niveau d'occultation** | **Invisibilité, pas indisponibilité.** L'utilisateur ne doit pas savoir que la fonctionnalité existe — cf. §2.2 |
| Comportement page masquée | **404** (`notFound()`), pas de page « Bientôt disponible » |
| Comportement API masquée | `404` + `ApiResponse.error` générique — jamais « fonctionnalité désactivée » |
| Comportement webhook désactivé | **`200` + ignoré** — jamais 404 (sinon retries Meta/SSO en boucle) |
| Source de vérité | **Catalogue en code**, surcharges en base |
| Défaut d'un flag non lancé | **OFF** — une panne base ne doit pas ouvrir la plateforme |

### 2.1 L'asymétrie admin / utilisateurs (décision structurante)

> « La restriction ou l'activation des fonctionnalités est pour les autres utilisateurs,
> de la part de l'admin qui gère. » — PO, 2026-08-14

C'est la raison d'être du dispositif : l'admin **prépare** pendant que le public ne voit rien.
Trois conséquences, toutes à respecter dans le code :

1. **La console admin est hors périmètre des flags.** `m5.agenda` à OFF ne ferme pas
   `/admin/evenements` : l'admin continue de créer et modérer des événements que personne
   ne voit encore. Corollaire : le catalogue sépare `userRoutes` (fermées) de
   `adminRoutes` (jamais fermées, listées uniquement pour documenter le périmètre).
2. **Les rôles admin sont exemptés du gate sur les routes publiques.** Un admin qui ouvre
   `/agenda` alors que `m5.agenda` est OFF voit **la vraie page**, surmontée d'un bandeau
   « Masqué pour les utilisateurs — vous voyez cette page en tant qu'administrateur ».
   Sans quoi l'admin n'a aucun moyen de relire ce qu'il s'apprête à ouvrir.
   L'exemption vaut pour `ADMIN_ROLES` uniquement — conseiller et recruteur sont des
   « autres utilisateurs » au sens de la décision PO.
3. **Les écrans admin d'un module fermé portent un bandeau d'état.** Sur `/admin/evenements`
   quand `m5.agenda` est OFF : « Cette fonctionnalité est masquée pour les utilisateurs. »
   Sans ce signal, l'admin conclut à une panne en voyant zéro inscription.

### 2.2 Règle d'invisibilité (décision structurante)

> « La fonctionnalité ne doit même pas être visible, l'utilisateur ne doit pas la voir. »
> — PO, 2026-08-14

**Invisibilité ≠ indisponibilité.** Une page « Bientôt disponible » *annonce* la
fonctionnalité : c'est encore de la visibilité, et ça crée une attente qu'on ne maîtrise pas.
La règle est l'**absence** : pour un utilisateur, un module masqué n'existe pas.

| | Indisponibilité (rejeté) | Invisibilité (retenu) |
|---|---|---|
| Page | « Bientôt disponible » | **404** |
| API | `403 FEATURE_DISABLED` | **404**, message générique |
| Nav | item grisé | **item absent** |
| Message d'erreur | nomme la fonctionnalité | **ne la nomme jamais** |

Conséquence de méthode : le travail n'est pas « fermer la route du module », c'est
**retirer toute trace du module partout ailleurs**. Les fuites ne sont pas sur la route du
module — elles sont sur les pages des *autres* modules. Inventaire en §3.7.

⚠️ Aucun message d'erreur, aucun code de réponse, aucun temps de réponse ne doit permettre
de distinguer « masqué » de « n'existe pas ». Un `403` explicite ou un `ApiResponse.error`
mentionnant le nom du flag trahirait l'existence de la fonctionnalité.

## 3. Architecture

### 3.1 Catalogue en code — `src/lib/flags/catalog.ts`

Module pur (aucune I/O), importable côté client, sur le modèle de `notifications/catalog.ts`.

```ts
export interface FeatureFlagDef {
  /** Clé stable `module.fonction` — ex. `m5.agenda`. Jamais renommée. */
  key: string
  /** Module métier d'origine (m1…m14) — sert au groupement dans l'UI admin. */
  module: string
  /** Libellé humain court (affiché dans le panneau admin). */
  label: string
  /** Une phrase : ce que l'utilisateur perd si le flag est éteint. */
  description: string
  /** Routes UTILISATEUR fermées quand le flag est OFF (public, jeune, recruteur,
   *  conseiller, centre-staff). Matchées par le middleware. Ne contient JAMAIS
   *  de préfixe `/admin` — cf. §2.1. */
  userRoutes: string[]
  /** Routes ADMIN du même périmètre. **Jamais fermées** : listées pour documenter
   *  ce que l'admin continue de gérer, et pour y afficher le bandeau d'état. */
  adminRoutes: string[]
  /** Préfixes d'API utilisateur couverts (jamais `/api/admin/*`). */
  apiPrefixes: string[]
  /** `id` des items de nav à masquer (clés des tableaux SECTIONS existants).
   *  L'AdminSidebar n'est jamais filtrée. */
  navIds: string[]
  /** Chemins de crons à court-circuiter. */
  crons: string[]
  /** Publics qui PERDENT la fonctionnalité — cf. §5.4. Défaut : ['beneficiaire'].
   *  L'admin n'y figure jamais. Les faces absentes de cette liste restent ouvertes :
   *  c'est ce qui permet au recruteur de publier et au conseiller de préparer
   *  pendant que le module est masqué aux bénéficiaires. */
  closes: Audience[]
  /** Clés dont dépend ce flag — activation impossible si l'un est OFF. */
  dependsOn: string[]
  /** Clés que ce flag EXIGE ouvertes (dépendance inverse). Un flag `locked` peut
   *  exiger qu'un flag masquable reste ouvert — ex. `m2.onboarding` exige
   *  `m4.centres` pour son étape « centre principal » (§5.1). */
  requires: string[]
  /** Mode de fermeture — cf. §7.1. 'sec' = tout disparaît immédiatement (modules sans
   *  engagement : Yaye, WhatsApp, canaux, Data Hub, interop). 'drain' = on ferme
   *  l'entrée, on garde la sortie jusqu'à extinction des engagements en cours. */
  closeMode: 'sec' | 'drain'
  /** Requis si closeMode === 'drain' : où lire les engagements encore actifs,
   *  pour le décompte affiché à l'admin avant confirmation. */
  engagements?: { model: string; activeStates: string[] }
  /** Valeur si aucune ligne en base. OFF pour tout module non encore lancé. */
  defaultEnabled: boolean
  /** Verrouillé : socle non désactivable, toggle grisé côté UI, refus côté serveur. */
  locked?: boolean
}
```

**Invariants testés** : clés uniques · `dependsOn` et `requires` pointent vers des clés
existantes · aucun cycle de dépendance · aucun flag `locked` avec `defaultEnabled: false` ·
tout cron de `vercel.json` est couvert par au plus un flag · `closes` n'est jamais vide et
ne contient jamais `admin` · tout item de nav référencé par `navIds` existe dans le tableau
`SECTIONS` correspondant (sinon un renommage silencieux laisse l'item visible).

### 3.2 Table Prisma — surcharges

```prisma
/// GUIC-706 — Surcharges d'activation des fonctionnalités, pilotées depuis
/// /admin/systeme/fonctionnalites. Le catalogue en code (src/lib/flags/catalog.ts)
/// reste la source de vérité : cette table ne porte QUE les écarts au défaut.
/// Une clé absente = valeur `defaultEnabled` du catalogue.
model FeatureFlag {
  key       String   @id @db.VarChar(64)
  enabled   Boolean
  note      String?  @db.VarChar(280)   // raison de la bascule (incident, vague…)
  updatedBy String?  @map("updated_by") @db.VarChar(36)
  updatedAt DateTime @updatedAt @map("updated_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("feature_flags")
}
```

Pas de seed : l'absence de ligne vaut « défaut du catalogue ». On ne stocke jamais l'état
complet, seulement les écarts — ainsi l'ajout d'un flag au catalogue ne demande pas de migration.

### 3.3 Service — `src/lib/flags/index.ts`

Calqué sur `llm-config.ts`, avec **deux étages de cache** (le middleware s'exécute sur
chaque requête : un aller-retour Redis systématique est trop coûteux).

```
Résolution : cache mémoire process (TTL 10 s) → Redis `flags:all` (TTL 60 s) → base → catalogue
```

```ts
export async function getFlags(): Promise<Record<string, boolean>>
export async function isEnabled(key: string): Promise<boolean>
export async function setFlag(key: string, enabled: boolean, opts: { updatedBy: string; note?: string }): Promise<Record<string, boolean>>
export function flagForPath(pathname: string): string | null   // pur, testable
```

- **Fail-soft absolu** : toute erreur Redis ou Prisma est `logger.warn` + repli sur le
  catalogue. `getFlags()` ne rejette jamais.
- `setFlag()` valide : clé connue · non `locked` · si `enabled=true`, tous les `dependsOn`
  sont ON · si `enabled=false`, aucun dépendant actif n'est laissé orphelin (sinon on
  liste les dépendants et on demande confirmation en cascade).
- Invalidation : `redis.del('flags:all')` + bump d'un compteur `flags:version` que le cache
  mémoire relit — sans quoi les autres instances gardent leur copie jusqu'à 10 s.
  **Latence de propagation assumée : ≤ 10 s.** Documentée dans le runbook.
- Nouvelle action d'audit `feature.flag.update` à ajouter à l'union `AuditAction`
  de `src/lib/audit.ts` (union fermée).

### 3.4 Enforcement — défense en profondeur

Une fonctionnalité n'est pas coupée si un seul chemin est fermé. Les 7 surfaces :

| # | Surface | Mécanisme | Volume | Admin |
|---|---|---|---|---|
| 1 | Pages utilisateur | `flagForPath()` dans `src/middleware.ts` (déjà runtime Node.js, ligne 131) → **rewrite vers une route interne qui appelle `notFound()`** (jamais de redirection : une redirection vers `/indisponible` révélerait l'existence du module). **Exemption `ADMIN_ROLES`** → passe + bandeau | ~90 routes | exempté |
| 2 | Layouts serveur | `await requireFlag(key)` en tête de layout → `notFound()` — filet si le middleware est contourné | ~10 layouts | exempté |
| 3 | Server actions **utilisateur** | `assertFlag(key)` en tête, à côté du `assertAdmin()` existant | 22 fichiers `actions.ts`, dont **10 sous `src/app/admin/`** | **non gardées** |
| 4 | Routes API utilisateur | garde `flagGuard(key)` → 404 `ApiResponse.error` | 25 dossiers, **hors `api/admin/*`** | **non gardées** |
| 5 | Crons | early-return `{ skipped: 'flag_off' }` + log — **sauf crons d'entretien** (cf. ci-dessous) | 11 crons | s/o |
| 6 | Webhooks | **200 + ignoré** (SSO, WhatsApp, 4 interop) | 6 | s/o |
| 7 | Nav + sitemap | champ `flag?: string` par `NavItem`, filtrage **côté serveur** (pas de flash) ; `sitemap.ts` filtré | 9 tableaux sur 10 | **AdminSidebar jamais filtrée** |
| 8 | **Surfaces d'incidence** | filtrage des loaders agrégateurs + catalogue d'outils Yaye — cf. §3.6 | **9 points de fuite** | exempté |

Les server actions (#3) sont le point le plus important : elles contournent **à la fois** le
middleware et la navigation. Mais **seules celles des espaces utilisateur** sont gardées :
les 10 fichiers `src/app/admin/*/actions.ts` restent libres, sinon l'admin ne pourrait plus
préparer le contenu d'un module fermé — l'inverse exact de l'objectif.
La messagerie interne n'a aucune route API : tout passe par `src/lib/messagerie/actions.ts`.

**Crons — deux natures à ne pas confondre :**
- *Crons à effet utilisateur* (`notifications-reminders`, `notifications-dlq`, `veille-sources`
  quand la curation est fermée) → **court-circuités**, sinon on notifie sur une fonctionnalité
  invisible.
- *Crons d'entretien* (`cleanup-cv`, `cleanup-checkins`, `cleanup-centre-events`,
  `yaye-graph-sync`, `reservations-batch`, `programme-integrity`) → **continuent de tourner**.
  Ils préparent la donnée pour le jour de l'ouverture ; les couper créerait une dette à
  rattraper au pire moment. Exception : les crons Yaye coûteux en tokens
  (`yaye-eval`, `yaye-reco-precompute`, `yaye-warm-search`) suivent `m12.yaye` — c'est
  précisément le coût qu'on cherche à maîtriser.

### 3.5 UI admin — `/admin/systeme/fonctionnalites`

- Nouvelle section **« Système »** dans `SECTIONS` de
  `src/components/layout/AdminSidebar/index.tsx` (aujourd'hui : Pilotage / Gouvernance /
  Assistant IA). Anticipe le hub « Système & Exploitation » de `admin-console-refonte.md` §5.6.
- Page serveur (re-garde `isAdminRole`, appelle `getFlags()` en direct) + formulaire client.
- Groupement par module, un `Toggle` par flag (composant `src/components/ui/`), badge de
  dépendances, toggles `locked` grisés avec explication, champ note optionnel à la bascule.
- **Vocabulaire de l'interface** : jamais « activé / désactivé » (qui laisse croire que
  l'admin perd l'accès) mais **« Ouvert aux utilisateurs » / « Masqué aux utilisateurs »**.
  Sous-titre de la page : « Vous gardez l'accès complet à tout ce qui est masqué. »
- Chaque ligne affiche ce que perd l'utilisateur (routes fermées) **et** ce que l'admin
  conserve (écrans de gestion restés ouverts) — les deux colonnes viennent du catalogue.
- Bandeau permanent : « Les changements se propagent en moins de 10 secondes sur toutes
  les instances. » + bouton **Purger le cache** (force `redis.del` immédiat).
- Écriture via `PUT /api/admin/systeme/flags` (idiome LlmConfig) — journalisée.

### 3.6 Surfaces d'incidence — où un module masqué fuit ailleurs

Fermer `/agenda` ne suffit pas : l'agenda apparaît sur **six autres écrans** qui, eux, restent
ouverts. C'est ici que se joue l'exigence §2.2, et c'est le poste de travail le plus lourd
du chantier. Inventaire relevé par cartographie du code :

| # | Fuite | Fichier | Ce qui fuite |
|---|---|---|---|
| 1 | **Catalogue d'outils Yaye** | `src/lib/ia/tools.ts` (17 outils) | **La fuite la plus grave.** 11 outils pointent vers des modules flaggables : `search_events`, `search_library`, `borrow_book`, `get_active_loans`, `search_resources`, `find_centres`, `get_reservable_resources`, `reserve_resource`, `get_badge`, `submit_application`, `escalate_to_advisor`. Yaye proposera spontanément des événements d'un agenda masqué |
| 2 | Tableau de bord jeune | `src/lib/dashboard-loader.ts:19,54,95` | Compteur d'`InscriptionEvenement`, activité récente multi-sources |
| 3 | Fiche centre | `src/lib/loaders/centres.ts:289,328` | `evenementsAVenir`, ressources réservables |
| 4 | Activité du profil | `api/profil/activity` (GUIC-69) | Agrégation de 5 sources, dont événements et emprunts |
| 5 | Notifications | `src/lib/notifications/catalog.ts` (47 événements) | Émission pour un module masqué → l'utilisateur reçoit un WhatsApp sur une fonctionnalité qu'il ne voit pas |
| 6 | Recherche & ⌘K | `BenefTopBar/index.tsx`, `OpportunitesListHeader.tsx` | Résultats pointant vers des routes masquées |
| 7 | Favoris | `api/favoris/*` | Un favori posé avant la fermeture pointe vers une ressource masquée |
| 8 | Fil d'Ariane | `BenefTopBar/buildBreadcrumbs.ts` | Segment nommant un module masqué |
| 9 | SEO | `src/app/sitemap.ts`, OpenGraph | Google indexe et affiche un module masqué |

**Règle de traitement** : chaque loader qui agrège plusieurs modules filtre ses sources par
flag **à la lecture**, pas à l'affichage — un compteur à zéro reste une trace (« 0 événement »
révèle qu'il existe des événements). Un module masqué doit produire **l'absence de la
section entière**, pas une section vide.

**Le cas Yaye est traité à part** : le catalogue d'outils est filtré **à la construction du
prompt** (`buildTools(flags)`), pas au moment de l'exécution. Un outil retiré du catalogue
n'est jamais proposé au modèle, donc jamais mentionné dans une réponse. Le filtrer à
l'exécution laisserait Yaye annoncer « je vais chercher les événements… » puis échouer —
soit exactement la fuite qu'on veut éviter. Test dédié : catalogue filtré ⇒ le prompt système
ne contient aucune occurrence du nom de l'outil.

### 3.7 Signalisation dans le reste de la console

Deux composants transverses, sans lesquels l'asymétrie devient un piège :

- `<FlagStatusBanner flag="m5.agenda" />` en tête des écrans admin d'un module masqué :
  « Masqué pour les utilisateurs — ce que vous publiez ici ne sera visible qu'à l'ouverture. »
  Sans ça, l'admin voit zéro inscription et conclut à une panne.
- `<AdminPreviewBanner />` sur les pages **utilisateur** consultées par un admin sous
  exemption : « Vous voyez cette page en tant qu'administrateur ; elle est masquée pour
  les utilisateurs. » Sans ça, l'admin croit la fonctionnalité ouverte et l'annonce à tort.

## 4. Recensement des flags (~25)

### Verrouillés — jamais désactivables (`locked: true`)
`m1.socle` · `m2.auth` · `m2.profil` · `m7.seo` · `m8.admin` · `m14.ops`

### Vague 1 — isolés, sans dépendance sortante
| Clé | Périmètre |
|---|---|
| `m5.agenda` | `/agenda`, `/jeune/mes-inscriptions`, `/admin/evenements`, analytics événements |
| `m6.ressources` | `/ressources`, `/jeune/mes-formations`, `/conseiller/publications`, `/admin/ressources` |
| `m4.bibliotheque` | `/jeune/bibliotheque`, `/conseiller/bibliotheque`, `/centre-staff/bibliotheque`, `/admin/bibliotheque` |
| `m4.checkin` | `/checkin/v1/*`, `/jeune/ma-carte`, `/conseiller/checkin`, cron `cleanup-checkins` |
| `x.messagerie` | `/jeune|/recruteur|/conseiller/messagerie` — **server actions uniquement** |

### Vague 2 — espaces entiers (le middleware garde déjà ces préfixes)
`m9.recruteur` (`/recruteur/*`) · `m8.conseiller` (`/conseiller/*`) · `m8.centre_staff_legacy` (`/centre-staff/*`)

### Vague 3 — coût externe ou risque (les plus rentables)
| Clé | Périmètre | Pourquoi |
|---|---|---|
| `m12.yaye` | **Parent IA** — kill switch global, 5 enfants (§6.3) | coût token Vertex |
| `m12.yaye_chat` | Bulle publique + bulle jeune + `/jeune/yaye` + panneau dashboard | coût par message |
| `m12.yaye_whatsapp` | Yaye via WhatsApp · `dependsOn: m11.whatsapp` | template Meta |
| `m12.reco` | Score de recommandation + cron `yaye-reco-precompute` | coût par utilisateur |
| `m12.adequation` | Score d'adéquation recruteur (`scoreAdequation`) | coût par candidature |
| `m12.eval` | Juge + cron `yaye-eval` — interne | coût par run |
| `m11.whatsapp` | webhook Meta, `api/whatsapp/link`, canal WhatsApp | approbation templates Meta |
| `x.notif_email` `x.notif_sms` `x.notif_whatsapp` | canaux de `src/lib/notifications/channels/` | coût + délivrabilité |
| `m3.curation` | `/admin/curation`, `/admin/sources-veille`, cron `veille-sources` | robot de veille |
| `m13.datahub` | `/admin/data-hub`, `api/v1/export/*`, `api/v1/track` | contrat externe |
| `m10.interop_brm` `m10.interop_centres` `m10.interop_moodle` `m10.interop_edupop` | 1 par partenaire | go-live partenaire par partenaire |

⚠️ `m12.yaye` : `YayeProvider` + `YayeBubble` sont montés dans
`src/app/jeune/(app)/layout.tsx:66,106` — drawer global sur **tout** l'espace jeune. Le flag
doit être lu côté serveur dans ce layout, pas dans un composant client.

### Irréductibles — flaggables techniquement, sans intérêt de rollout
`m3.opportunites` · `m3.candidatures` (dépend de `m3.opportunites`) ·
`m4.centres` · `m4.reservations` (dépend de `m4.centres`)

Présents au catalogue avec `defaultEnabled: true` : ils servent de **kill switch d'incident**,
pas de levier de lancement.

## 5. Étude par cible — bénéficiaire · recruteur · conseiller

Un flag ne frappe pas les trois publics de la même façon. Le même module est **consommé**
par l'un et **produit** par l'autre. L'étude par cible fait apparaître trois problèmes que
le découpage par module ne montrait pas.

### 5.1 Bénéficiaire — 22 000 comptes, la cible de masse

Surfaces : `BottomNav` (5 items), `BenefSidebar` (4 sections, 15 items), header public,
bulle Yaye du layout, notifications.

| Item de nav | Flag | Reste si masqué |
|---|---|---|
| Accueil | — | toujours |
| Explorer | `m3.opportunites` | — |
| Candidatures | `m3.candidatures` | — |
| Centres CJS | `m4.centres` | — |
| Profil | — | toujours |

**Problème 1 — la grille de la bottom-nav est figée à 5 colonnes.**
`grid-cols-5` est écrit en dur dans `src/components/ui/BottomNav/index.tsx`. **3 des 5 items
sont flaggables.** Retirer un item déforme la barre de navigation mobile des 22 000
utilisateurs. Il faut rendre le nombre de colonnes dynamique **et** définir un ordre de
repli : quel item promeut-on quand un slot se libère ? Sans règle explicite, on obtient une
nav à trous. Même problème sur `RecruteurBottomNav` (4 slots primaires) et
`ConseillerBottomNav` (4 slots primaires).

**Problème 2 — section entière ou rien.** La section « Opportunités » de `BenefSidebar`
compte 6 items tous rattachés à `m3.opportunites`. Règle §2.2 : on retire **le titre de
section aussi**, pas seulement les items — une section vide titrée « Opportunités » est une
trace.

**Problème 3 — l'onboarding verrouillé dépend d'un module masquable.**
`/jeune/onboarding/centre-principal` charge `getCentresWithStatusAndHoraires`
(`src/app/jeune/onboarding/centre-principal/page.tsx:3`). `m2.onboarding` est verrouillé,
mais il **casserait** si `m4.centres` était masqué. Deux issues : rendre l'étape
conditionnelle, ou interdire le masquage de `m4.centres`. **Reco : rendre l'étape
conditionnelle** — elle est déjà facultative par nature, et interdire le masquage priverait
le lancement séquentiel d'un de ses leviers.
→ Le catalogue doit porter des **dépendances inverses** (« ce flag verrouillé exige que
tel autre reste ouvert »), pas seulement des `dependsOn`.

Enfin, `YayeProvider` + `YayeBubble` sont montés dans `src/app/jeune/(app)/layout.tsx:66,106` :
`m12.yaye` doit être lu **côté serveur dans ce layout**, jamais dans un composant client.

### 5.2 Recruteur — les partenaires

12 pages, sidebar 3 sections, bottom-nav 4 primaires + 4 sous « Plus », 6 fichiers d'actions.

L'espace recruteur n'a d'objet que si les opportunités et les candidatures existent :
masquer `m3.opportunites` lui laisse `profil-entreprise` et `parametres`. D'où
`m9.recruteur.dependsOn = ['m3.opportunites', 'm3.candidatures']`.

**Mais — et c'est le point central — le recruteur *produit* ce que le bénéficiaire
*consomme*.** Pendant qu'`m3.opportunites` est masqué aux jeunes, on veut précisément que
les recruteurs continuent de publier : c'est ainsi qu'on constitue le stock avant
l'ouverture. Fermer les deux faces en même temps viderait le catalogue le jour du lancement.

Deux détails : `Messagerie` occupe un **slot primaire** de la bottom-nav (cf. problème 1) ;
`Entretiens` dépend d'une OAuth Google externe (`api/recruteur/google-meet/*`) et mérite son
propre flag, faute de quoi une panne Google casse un item de navigation.

### 5.3 Conseiller — le personnel des centres

11 pages. **Son métier *est* constitué des modules flaggables** : réservations, check-in,
bibliothèque, publications. Masquer ces quatre-là lui laisse un tableau de bord vide, un
agenda vide, ses bénéficiaires, sa messagerie et ses paramètres.

**L'agenda conseiller est dérivé** de `Réservation` + `Événement`
(`src/app/conseiller/agenda/page.tsx`, GUIC-497 — aucun modèle `RendezVous`). Dépendance
**composite** : masquer `m4.reservations` ou `m5.agenda` le vide partiellement, les deux
l'assèchent. Règle §2.2 : l'item de nav ne doit apparaître que si **au moins une** source
est ouverte.

**Le conseiller est un préparateur, pas un consommateur.** C'est lui qui catalogue les
livres des centres et rédige les publications — l'admin national ne va pas cataloguer les
rayons de 20 centres. Sous l'arbitrage §2.1 il est un « autre utilisateur » et perdrait
l'accès : cela **casserait la chaîne de préparation** que le lancement séquentiel est censé
servir.

### 5.4 Conséquence — la face d'audience

Un module a jusqu'à quatre **faces** : bénéficiaire, recruteur, conseiller, admin. Un flag
doit fermer la face *consommateur* et laisser ouvertes les faces *producteur*.

Le catalogue porte donc un champ `closes: Audience[]` — **une seule bascule par
fonctionnalité** (l'arbitrage ON/OFF global est respecté), mais le rayon d'action est
déclaré en code, revu une fois, et non décidé au runtime.

```ts
// `anonyme` = visiteur sans session. Ajouté après l'étude du module IA (§6.1) :
// la bulle Yaye et les pages publiques s'adressent aussi à lui.
type Audience = 'anonyme' | 'beneficiaire' | 'recruteur' | 'conseiller'
/** Publics qui perdent la fonctionnalité. Défaut : ['anonyme','beneficiaire'].
 *  L'admin n'y figure jamais. */
closes: Audience[]
```

**Résolution de l'audience — priorité obligatoire.** Un même compte porte plusieurs rôles
(`rolesPourDevLogin` ajoute toujours `beneficiaire` à `conseiller` et `recruteur` — vérifié
en §10). La face applicable se résout donc dans l'ordre
**admin > conseiller > recruteur > bénéficiaire > anonyme**, jamais « le premier rôle
trouvé ». Sans cette règle, un conseiller se verrait appliquer la face bénéficiaire et
perdrait son comptoir.

| Flag | Bénéficiaire | Recruteur | Conseiller | Admin |
|---|---|---|---|---|
| `m3.opportunites` | **fermé** | ouvert — il publie | ouvert | ouvert |
| `m3.candidatures` | **fermé** | ouvert — il instruit le stock | ouvert | ouvert |
| `m4.centres` | **fermé** | s/o | ouvert | ouvert |
| `m4.reservations` | **fermé** | s/o | ouvert — il prépare les ressources | ouvert |
| `m4.checkin` | **fermé** | s/o | ouvert — il teste le scan | ouvert |
| `m4.bibliotheque` | **fermé** | s/o | ouvert — il catalogue | ouvert |
| `m5.agenda` | **fermé** | s/o | ouvert — il anime | ouvert |
| `m6.ressources` | **fermé** | s/o | ouvert — il publie | ouvert |
| `m12.yaye` | **fermé** | **fermé** | **fermé** | ouvert |
| `m11.whatsapp` | **fermé** | **fermé** | **fermé** | ouvert |
| `x.messagerie` | **fermé** | **fermé** | **fermé** | ouvert |
| `m9.recruteur` | s/o | **fermé** | s/o | ouvert |
| `m8.conseiller` | s/o | s/o | **fermé** | ouvert |

**Règle de lecture** : les modules d'ouverture progressive ne ferment que la face
consommateur ; les modules à coût externe (`m12.yaye`, `m11.whatsapp`) et les canaux
transverses (`x.messagerie`) ferment toutes les faces utilisateur — c'est le coût ou le
risque qu'on coupe, pas l'accès à un contenu.

**Test d'acceptation dérivé** : trois sessions en parallèle (bénéficiaire, recruteur,
conseiller) plus l'admin ; à chaque bascule, vérifier que **seules** les faces déclarées
dans `closes` perdent l'accès et toute trace du module.

## 6. Cas particulier — le module IA (Yaye)

`m12.yaye` en flag unique est trop grossier. C'est le module **le plus coûteux** (tokens
Vertex facturés à l'usage), **le plus exposé** (il parle aux utilisateurs) et celui dont
les surfaces sont les plus dispersées. C'est aussi celui pour lequel le besoin de coupure
est le plus concret.

### 6.1 Les sept surfaces de Yaye

| # | Surface | Fichier | Public |
|---|---|---|---|
| 1 | **Bulle sur les pages publiques** | `src/app/(public)/layout.tsx:45` | **visiteur anonyme** (GUIC-373, « bulle universelle ») |
| 2 | Bulle dans l'espace jeune | `src/app/jeune/(app)/layout.tsx:106` | bénéficiaire |
| 3 | Page de chat plein écran | `/jeune/yaye` | bénéficiaire |
| 4 | Panneau du tableau de bord | `WebDashYayePanel` | bénéficiaire |
| 5 | **WhatsApp** — même moteur `runAgent` | `src/app/api/whatsapp/route.ts:99` | bénéficiaire |
| 6 | Score de recommandation sur la fiche opportunité | `(public)/opportunites/[slug]` + route modale | anonyme + bénéficiaire |
| 7 | **Score d'adéquation candidat/offre** | `src/lib/recruteur/adequation.ts` | **recruteur** |

**Découverte majeure : la surface 1 introduit une quatrième audience.** La bulle est montée
pour les visiteurs **sans session**. Le type `Audience` de §5.4 doit devenir :

```ts
type Audience = 'anonyme' | 'beneficiaire' | 'recruteur' | 'conseiller'
```

Et surtout — **piège d'architecture** : `src/middleware.ts:42` sort en `NextResponse.next()`
dès qu'aucune entrée de `PROTECTED` ne correspond. Or `PROTECTED` ne couvre que `/jeune/`,
`/recruteur/`, `/admin/` et `/conseiller`. **Aucune route publique n'atteindrait donc jamais
le gate des flags.** Le contrôle doit être placé **avant** ce retour anticipé, sinon
`/opportunites`, `/agenda`, `/ressources` et `/centres` resteraient ouverts quel que soit
l'état des flags — un module « masqué » resterait entièrement visible au public.

### 6.2 Les sous-fonctions ont des coûts et des risques différents

| Sous-fonction | Fichier | Slot LLM | Déclencheur du coût |
|---|---|---|---|
| Agent conversationnel | `ia/agent.ts:490,674` | `agent` | par message |
| Mémoire de session | `ia/memory.ts:73` | `agent` | par fin de session |
| Recommandations | `ia/recommandation.ts` | — + cron | par utilisateur précalculé |
| Score d'adéquation | `recruteur/adequation.ts:125` | `adequation` | **par candidature déposée** |
| Juge / évaluation | `ia/metrics/judge.ts:92`, `golden/judge.ts` | `judge` | par run nocturne |
| Embeddings | `ia/embeddings.ts:113`, `vertex-embeddings.ts` | — | par indexation |

Quatre des onze crons de `vercel.json` sont des crons Yaye — dont
**`yaye-warm-search` toutes les heures**, le plus fréquent de toute la plateforme :

```
30 2 * * *  yaye-graph-sync        45 2 * * *  yaye-reco-precompute
 5 * * * *  yaye-warm-search       15 3 * * *  yaye-eval
```

### 6.3 Découpage proposé — un parent, cinq enfants

Un seul flag ne permet pas d'arbitrer : une suspension de template Meta doit couper WhatsApp
sans toucher au chat web ; une dérive de coût sur le scoring ne doit pas faire taire l'agent.

| Clé | Périmètre | `closes` |
|---|---|---|
| `m12.yaye` | **Parent — kill switch IA global.** Coupe tout appel LLM | toutes |
| `m12.yaye_chat` | Surfaces 1 à 4 (bulle publique, bulle jeune, page, panneau) | `anonyme`, `beneficiaire` |
| `m12.yaye_whatsapp` | Surface 5 · `dependsOn: ['m11.whatsapp']` | `beneficiaire` |
| `m12.reco` | Surface 6 + cron `yaye-reco-precompute` | `anonyme`, `beneficiaire` |
| `m12.adequation` | Surface 7 + `scoreAdequation` | `recruteur` |
| `m12.eval` | Juge + cron `yaye-eval` — interne | aucune (admin seul) |

Les enfants portent `dependsOn: ['m12.yaye']` : masquer le parent les masque tous.

### 6.4 Quatre pièges propres à l'IA

**1. Le catalogue d'outils doit être filtré par flag *et* par audience.** §3.6 traite le
filtrage par flag ; s'y ajoute que les 17 outils de `src/lib/ia/tools.ts` n'ont pas le même
sens selon l'interlocuteur. `buildTools()` prend donc `(flags, audience)`.

**2. `scoreAdequation` est une colonne persistée, pas un affichage.** Elle sert de clé de
tri du kanban recruteur (`src/lib/loaders/recruteur.ts:151`, `orderBy scoreAdequation`) et
part au Data Hub en tier `public` (`src/lib/datahub/streams.ts:109`). Masquer le calcul ne
suffit donc pas : il faut **arrêter le calcul**, **retirer la colonne de l'UI**, **basculer
le tri sur un repli explicite** et **retirer le champ du flux d'export**. Sans le repli de
tri, l'ordre des candidatures continuerait de trahir l'existence du score — exactement la
fuite interdite par §2.2.

**3. Le graphe Neo4j n'appartient pas qu'à Yaye.** Huit routes non-IA y écrivent en
projection événementielle (`ia/graph/fire-sync.ts`) : `api/profil/*` (4 routes),
`api/favoris/*` (2), `api/candidatures`, `api/evenements/[id]/inscription`. Masquer
`m12.yaye` ne doit **pas** faire échouer ces écritures : elles doivent devenir des no-op
silencieux. À vérifier — `fire-sync` est déjà en fire-and-forget, mais c'est à tester
explicitement, pas à supposer.

**4. `pre-screen` n'est pas une fonctionnalité.** `src/lib/ia/pre-screen.ts` court-circuite
l'appel LLM sur les messages triviaux (`agent.ts:501`) : c'est un **économiseur de coût**
interne. Ne pas le flagger — le masquer augmenterait la facture.

## 7. Effets de la bascule — ce qui se passe au moment du basculement

Jusqu'ici la spec décrit un **état** (ouvert / masqué). Il manque la **transition**, et elle
n'est pas symétrique : masquer casse ce qui est en cours, ouvrir expose ce qui est froid.

### 7.1 Désactivation — les engagements en cours

**C'est le point aveugle du dispositif.** Une réservation acceptée, un emprunt en cours,
une candidature en instruction sont des **engagements pris envers l'utilisateur**. Les
rendre invisibles ne les annule pas : ça prive l'utilisateur du moyen de les honorer.

| Engagement | États actifs | Ce que casse un masquage sec |
|---|---|---|
| `Emprunt` | `initie`, `en_cours`, `en_retard` | **Le jeune a un livre physique chez lui** et ne peut plus voir sa date de retour. Il passe `en_retard` sans le savoir |
| `Reservation` | `EnAttente`, `Acceptee` | Le jeune se présente au centre pour une réservation qu'il ne voit plus — ou ne s'y présente pas et compte `NonHonoree` |
| `Candidature` | `En_attente`, `Vue` | Le candidat perd le suivi d'un dossier que le recruteur continue d'instruire |
| `InscriptionEvenement` | `inscrit`, `liste_attente` | Le jeune ne sait plus qu'il est attendu |

Base de test au 2026-08-14 : **2 emprunts actifs, 7 réservations à venir** — à l'échelle
des 22 000 comptes, l'ordre de grandeur est tout autre.

**Résolution — deux modes de fermeture, déclarés au catalogue :**

```ts
/** Comment ce flag se ferme. Défaut : 'sec'. */
closeMode: 'sec' | 'drain'
/** Requis si closeMode === 'drain' : où lire les engagements encore actifs. */
engagements?: { model: string; activeStates: string[] }
```

- **Fermeture sèche (`sec`)** — tout disparaît immédiatement. Pour les modules **sans
  engagement** : Yaye, WhatsApp, canaux de notification, recommandations, Data Hub, interop.
  C'est un coût ou un risque qu'on coupe, personne n'attend rien.
- **Fermeture progressive (`drain`)** — on ferme **l'entrée**, on garde **la sortie** :
  plus de nouvelle réservation ni de nouvel emprunt, mais l'utilisateur conserve l'accès en
  lecture à ses engagements en cours jusqu'à extinction. Pour `m4.reservations`,
  `m4.bibliotheque`, `m3.candidatures`, `m5.agenda`.

**Cette exception est la seule entorse assumée à la règle d'invisibilité §2.2** : un
utilisateur qui avait déjà un engagement continue de le voir. Il n'apprend rien qu'il ne
sût déjà — c'est *son* emprunt. Aucun **autre** utilisateur ne voit quoi que ce soit.

**Conséquence sur l'UI admin** : avant de confirmer un masquage `drain`, le panneau affiche
le décompte réel — « 47 emprunts et 112 réservations encore actifs. Ils resteront visibles
de leurs titulaires jusqu'à clôture. » Pas de bascule à l'aveugle.

### 7.2 Désactivation — les effets différés

Ce qui continue après la bascule, et qu'il faut traiter explicitement :

| Effet | Délai | Traitement |
|---|---|---|
| **Sitemap** — double cache : `revalidate = 3600` (`src/app/sitemap.ts:7`) **+** Redis 1 h (`seo/sitemap.ts:16`) | **jusqu'à 2 h** | `setFlag` invalide `seo:sitemap:v1` **et** appelle `revalidatePath('/sitemap.xml')` |
| Notifications planifiées et DLQ (`cron/notifications-reminders`, `internal/notifications-dlq` toutes les 10 min) | jusqu'au prochain tir | Filtrer **à l'émission ET au rejeu** : un rappel mis en file avant le masquage ne doit pas partir |
| Conversations WhatsApp en cours | immédiat | Le webhook répond `200` et ignore (§2.2). Ne **pas** répondre « fonctionnalité indisponible » : ce serait une divulgation |
| Index Google déjà crawlé | jours | Irréversible à court terme. Le sitemap purgé accélère la désindexation, rien de plus |
| Données déjà exportées au Data Hub | **irréversible** | On ne dépublie pas un flux déjà consommé. À signaler au PO avant tout masquage de `m13.datahub` |
| Onglets ouverts avec nav en cache client | jusqu'au rechargement | Acceptable : le clic aboutit à un 404, qui est le comportement voulu |

### 7.3 Activation — le module froid

L'ouverture est le geste **le plus risqué**, et c'est celui auquel on pense le moins.
Un module resté masqué pendant des semaines s'ouvre sur :

1. **Des crons jamais exécutés.** `yaye-reco-precompute` court-circuité pendant le masquage
   ⇒ **aucune recommandation calculée** le jour de l'ouverture. Idem `yaye-graph-sync` pour
   le graphe et les embeddings. L'utilisateur découvre un module vide et n'y revient pas.
2. **Des caches froids et un afflux simultané.** 22 000 comptes découvrent le module en même
   temps, sur des caches Redis vides.
3. **Du contenu absent** si la chaîne de préparation (§5.4) n'a pas été utilisée.

**Résolution — une checklist de pré-ouverture bloquante dans l'UI admin.** Avant d'ouvrir,
le panneau vérifie et affiche :

- volume de contenu publié pour ce module (« 0 événement publié » ⇒ **avertissement bloquant**) ;
- date de dernière exécution réussie de chaque cron du flag ;
- pour `m12.*` : graphe projeté, embeddings calculés, recommandations précalculées ;
- bouton **« Préchauffer »** — déclenche les crons du flag à la demande avant l'ouverture.

L'ouverture reste possible en passant outre, mais jamais par inadvertance.

### 7.4 Réversibilité et traçabilité

- **Un masquage ne supprime jamais de donnée.** Rouvrir restitue l'état antérieur à
  l'identique. C'est ce qui rend le dispositif sûr et ce qui autorise un usage en incident.
- Chaque bascule est journalisée (`feature.flag.update`) avec l'acteur, le sens, la note et
  **le décompte des engagements au moment du geste** — sans quoi l'analyse post-incident est
  impossible.
- **Ordre d'ouverture recommandé** : vague 1 (modules isolés) → vague 2 (espaces) →
  vague 3 (coût externe). Ouvrir un module dont un `dependsOn` est encore masqué est refusé
  par le service, pas seulement grisé dans l'UI.

## 8. Traitement des angles morts

Passe adverse sur la spec elle-même. Six failles identifiées, six réponses.

### 8.1 L'incohérence entre instances — pas une latence, une UI cassée

**Le défaut.** Le cache mémoire par processus (10 s) a été présenté comme une simple
latence de propagation. C'est en réalité une **incohérence** : pendant la fenêtre, une page
rendue par l'instance A (flag encore ouvert) déclenche un fetch client qui atterrit sur
l'instance B (flag déjà masqué) → **404 en plein écran, sur une page qui vient de
s'afficher**. Le symptôme n'est pas « ça met 10 s », c'est « l'interface casse ».

**La réponse — cache mémoire validé par un compteur de version.**

```
À chaque requête : GET flags:version   (un entier, ~0,5 ms)
  version inchangée → on sert la carte en mémoire, aucun autre appel
  version changée   → on relit la carte complète, on remplace le cache mémoire
setFlag() : écrit la carte + INCR flags:version   (atomique)
```

La fenêtre d'incohérence passe de 10 s à quasi zéro, pour le coût d'un `GET` d'entier —
sans le coût d'un parse JSON à chaque requête. La cohérence devient une propriété du
système, pas une convention documentée.

Le fail-soft est conservé et **orienté** : si Redis ne répond pas, on garde la **dernière
carte connue** (et non les défauts du catalogue) — sinon une coupure Redis rouvrirait
brutalement tout ce qui vient d'être masqué. Repli sur le catalogue seulement au démarrage
à froid, quand aucune carte n'a jamais été lue.

Effet de bord positif : l'ordonnancement de propagation (fermer les pages avant les API)
devient inutile — les deux basculent sur la même version.

### 8.2 `moderator` peut masquer toute la plateforme

**Le défaut.** La spec dit « garde `isAdminRole` » partout. Or
`src/lib/auth/admin-roles.ts:10` :
`ADMIN_ROLES = new Set(['admin', 'moderator', 'super_admin'])`. Un modérateur, dont le
métier est de valider des offres, pourrait masquer l'agenda pour 22 000 personnes.

**La réponse — une garde dédiée, sur le patron existant.** Le dépôt a déjà ce cas :
`src/lib/ia/admin/rbac.ts` (`canManageYaye`) restreint deux routes à un sous-ensemble
différent d'`ADMIN_ROLES`. On réplique :

```ts
// src/lib/flags/rbac.ts
const FLAG_WRITE_ROLES = new Set(['admin', 'super_admin'])
export function canManageFlags(roles) { … }
```

- **Lecture** : tout rôle d'administration — un modérateur a besoin de *voir* l'état pour
  comprendre son écran.
- **Écriture** : `admin` et `super_admin` seulement. Toggles désactivés côté UI avec
  explication, et **refus côté serveur** (403), jamais l'un sans l'autre.
- Test : modérateur → `200` sur GET, `403` sur PUT.

### 8.3 Le coût sur les 634 fichiers de tests existants

**Le défaut.** Le dépôt compte **634 fichiers de tests**, et le hook `pre-push` exige la
suite verte. Insérer un filtre par flag dans les loaders, les navigations et les server
actions en fera tomber une partie. Ce poste n'apparaissait nulle part dans le découpage —
c'est potentiellement le deuxième du chantier après le lot 5.

**La réponse — rendre la couche inerte par défaut dans les tests.**

Un mock global dans `tests/setup.ts` fait renvoyer à `@/lib/flags` « tout ouvert » :

```ts
jest.mock('@/lib/flags', () => ({
  ...jest.requireActual('@/lib/flags'),
  getFlags: async () => allOpen(),   // dérivé du catalogue, aucune I/O
}))
```

**Zéro test existant à modifier.** Seuls les tests des lots 5 et 6 lèvent explicitement le
mock pour éprouver un flag masqué. C'est aussi le comportement de production avant
lancement, donc le mock ne ment pas.

**Et une mesure avant de coder** : première tâche du lot 1 — insérer la couche à vide,
lancer la suite complète, **compter les échecs réels**. Le budget du chantier vient d'un
chiffre, pas d'une estimation.

### 8.4 Aucune observabilité — donc aucun moyen de détecter une fuite

**Le défaut.** Rien ne permet de savoir combien d'utilisateurs butent sur un module masqué.
Or c'est le **seul moyen de détecter une fuite en production** : si un module masqué reçoit
des milliers de tentatives, c'est qu'un lien subsiste quelque part (§3.6).

**La réponse — compter les refus, et les afficher à l'admin.**

- Chaque refus de gate émet `logger.info('[flags] blocked', { flag, path, audience })`.
- Un compteur Redis `flags:hits:<key>` (`INCR`, TTL 30 j) — coût négligeable.
- Le panneau admin affiche, par flag masqué : **« 1 240 tentatives d'accès sur 7 jours »**.

Cette mesure sert deux fins d'un coup : **détecter une fuite** (trafic anormal sur un module
censé être invisible) et **mesurer la demande** avant d'ouvrir. C'est le seul indicateur qui
transforme le masquage en information plutôt qu'en angle mort.

### 8.5 Aucune promotion staging → production

**Le défaut.** L'état des flags vit en base, donc diverge par environnement. Une
configuration éprouvée en staging serait rejouée à la main en production, avec le risque
d'erreur que ça implique — au pire moment, celui de l'ouverture.

**La réponse — export / import de configuration, avec diff obligatoire.**

- `GET /api/admin/systeme/flags?format=export` → JSON `{ key: enabled }` horodaté.
- Bouton « Importer une configuration » : **affiche le différentiel avant application**
  (« 3 ouvertures, 1 masquage »), demande confirmation, journalise l'ensemble comme une
  seule opération.
- L'export sert aussi d'**instantané de sauvegarde** : on capture l'état avant une bascule
  d'incident, on le restaure ensuite d'un geste.

### 8.6 Les deux points non tranchés

**Un brouillon de candidature est-il un engagement ?** Non. Le critère qui tranche, et qui
rend `closeMode` décidable au lieu d'être arbitré cas par cas :

> Un **engagement** existe quand un tiers a réservé quelque chose pour l'utilisateur
> (créneau, place, instruction d'un dossier), **ou** quand l'utilisateur détient quelque
> chose (un livre). Sinon, il n'y a qu'une intention.

Un brouillon ne coche ni l'un ni l'autre → `sec`. Il est **conservé en base** : à la
réouverture, l'utilisateur le retrouve intact.

**Le support.** Un utilisateur qui a vu la fonctionnalité hier appellera. La confirmation
de masquage **génère automatiquement une note de service** depuis le catalogue — module
concerné, date, ce que les utilisateurs ne voient plus, ce qu'il faut leur répondre,
décompte des engagements en cours. Publiée au journal d'audit et copiable. Générée, jamais
rédigée à la main : c'est ce qui garantit qu'elle existe.

## 9. Lots de livraison

| Lot | Contenu | Effet visible | PR |
|---|---|---|---|
| **0** | **Mesure** : mock global `tests/setup.ts` + couche à vide, suite relancée, **écart mesuré** contre la ligne de base §12.1 (§8.3) | aucun | écart = 0 |
| **1** | Migration Prisma · `catalog.ts` · `flags/index.ts` (**cache validé par version**, §8.1) · tests | **aucun** (tout ON) | 1 |
| **2** | `api/admin/systeme/flags` · **`flags/rbac.ts`** (§8.2) · page admin · section « Système » · **compteurs de refus** (§8.4) · **export/import** (§8.5) | l'admin bascule, sans effet | 1 |
| **3** | Middleware (rewrite → `notFound()`) · layouts · nav (9 fichiers) · `sitemap.ts` | **les bascules deviennent réelles** | 1 |
| **4** | 12 server actions utilisateur · gardes API · 11 crons · 6 webhooks | contournements fermés | 1 |
| **5** | **Invisibilité — 9 surfaces d'incidence** (§3.6), dont le catalogue d'outils Yaye | **plus aucune trace d'un module masqué** | 1 |
| **6** | **Transitions** — `closeMode: 'drain'`, décompte des engagements, checklist de pré-ouverture, préchauffage, purge sitemap (§7) · **note de service** (§8.6) | la bascule devient sûre dans les deux sens | 1 |
| **7** | Absorption de `NOTIFICATIONS_ENABLED` · runbook · `.env.example` | un seul kill switch | 1 |

Les lots 1–2 n'éteignent rien : livrables sans risque de régression.
Le lot 3 est le point de bascule — à ne merger qu'avec tous les défauts à `true`,
puis à basculer flag par flag depuis l'admin.

**Les lots 5 et 6 sont les plus longs et les plus critiques.** Le lot 5 porte l'exigence
d'invisibilité §2.2 : sans lui, un module « fermé » reste visible depuis le tableau de bord,
la fiche centre, la recherche, les notifications et surtout Yaye. Le lot 6 porte la sûreté
de la transition §7 : sans lui, masquer `m4.bibliotheque` prive un jeune de la date de
retour d'un livre qu'il a physiquement chez lui.

> **Règle de mise en production.** Aucun flag ne passe à `false` en production avant que
> **les lots 5 ET 6 soient verts**. Les lots 1 à 4 sont mergeables sur `dev` à tout moment :
> ils n'éteignent rien tant que les défauts restent à `true`.

## 10. Plan TDD (RED → GREEN par lot)

**Lot 1**
1. RED — `catalog.test.ts` : clés uniques, `dependsOn` résolvables, pas de cycle,
   couverture des 11 crons de `vercel.json`, aucun `locked` + `defaultEnabled:false`.
2. RED — `flags.test.ts` (modelé sur `tests/unit/llm-config.test.ts`, `@jest-environment node`,
   mocks `@/lib/redis`, `@/lib/prisma`, `@/lib/logger`) : cascade mémoire→Redis→base→catalogue ·
   **Redis down → défauts, pas d'exception** · **base down → défauts, pas d'exception** ·
   `setFlag` refuse une clé inconnue / `locked` / un parent OFF · invalidation du cache.
3. RED — `flagForPath` : matching du préfixe le plus spécifique (même logique que
   `ALL_HREFS` de l'AdminSidebar), route non couverte → `null`.
4. GREEN — implémentation minimale.

**Lot 1 (complément §8.1)** — RED : deux instances simulées, `INCR flags:version` sur
l'une ⇒ l'autre relit la carte **à la requête suivante**, pas 10 s après · version
inchangée ⇒ **aucune lecture de la carte** (on n'a pas remplacé un cache par un appel
permanent) · Redis muet ⇒ on sert la **dernière carte connue**, pas les défauts du
catalogue (sinon une coupure rouvrirait ce qu'on vient de masquer).

**Lot 2** — RED : `canManageFlags` (§8.2) — modérateur `200` en GET, **`403` en PUT** ;
admin `200` sur les deux · 400 clé inconnue · persistance · `recordAudit` appelé ·
compteur `flags:hits:<key>` incrémenté à chaque refus · export/import avec diff.

**Lot 3** — RED : middleware sert un **404** si OFF (jamais une redirection), laisse passer
si ON, exempte `ADMIN_ROLES`, n'affecte jamais `/auth/*` ni les webhooks ; nav filtrée ;
sitemap filtré. **Test anti-divulgation** : la réponse d'une route masquée est
*indiscernable* de celle d'une route inexistante (même statut, même corps).

**Lot 4** — RED : action refusée si flag OFF ; API 404 à message générique (le nom du flag
n'apparaît nulle part dans la réponse) ; cron `skipped` ;
**webhook répond 200 quand le flag est OFF** (test explicite anti-régression Meta/SSO).

**Lot 5** — RED, un test par surface d'incidence (§3.6) :
- `buildTools(flags)` : un outil dont le flag est OFF est **absent du prompt système**
  (assertion sur la chaîne du prompt, pas sur le résultat d'exécution).
- `dashboard-loader` : module OFF ⇒ **la section entière est absente**, pas un compteur à 0.
- `loaders/centres` : `evenementsAVenir` absent, pas vide.
- `api/profil/activity` : les sources masquées ne sont pas agrégées.
- `emitEvent` : aucun envoi pour un événement dont le module est masqué.
- `sitemap` : aucune URL du module masqué.
- Recherche, favoris, fil d'Ariane : aucune occurrence du module masqué.

**Lot 6** — RED, la transition :
- `closeMode: 'drain'` : après masquage, le titulaire d'un `Emprunt` `en_cours` **voit
  encore** sa date de retour ; un **autre** utilisateur ne voit rien (le cœur de l'entorse
  assumée à §2.2).
- `closeMode: 'sec'` : aucune trace résiduelle, même pour un utilisateur engagé.
- Le décompte des engagements est exact avant confirmation.
- `setFlag` purge `seo:sitemap:v1` **et** revalide `/sitemap.xml`.
- Un rappel mis en file avant le masquage **ne part pas** (émission **et** rejeu DLQ).
- Ouverture refusée par le service — pas seulement grisée — si un `dependsOn` est masqué.
- Le journal d'audit enregistre le décompte d'engagements au moment du geste.

**Lot 7** — RED : `NOTIFICATIONS_ENABLED=false` continue de bloquer (compat ascendante)
tant que le flag n'a pas pris le relais.

`npm run validate` vert avant chaque commit.

## 11. Risques & points ouverts

| Risque | Mitigation |
|---|---|
| Panne base/Redis ouvre tout | Défauts OFF pour les modules non lancés + fail-soft vers le catalogue |
| Latence de propagation (cache mémoire 10 s) | Documentée + bouton « Purger le cache » dans l'UI |
| Coût middleware (+1 lecture par requête) | Cache mémoire process ; à mesurer sur le lot 3 |
| Webhook qui 404 → retries Meta/SSO en boucle | Test dédié au lot 4, règle écrite dans le catalogue |
| Flag OFF sur un module avec données | On **masque**, on ne supprime jamais. Les données restent, l'admin y accède |
| Server action oubliée | Inventaire exhaustif des 12 fichiers utilisateur en checklist de PR du lot 4 |
| Collision avec la refonte admin (GUIC-679) | La section « Système » anticipe le hub prévu §5.6 de `admin-console-refonte.md` |
| Un admin croit une fonctionnalité ouverte alors qu'elle est masquée | Bandeau de prévisualisation obligatoire sur toute page vue sous exemption (§3.7) |
| Un admin conclut à une panne devant un module masqué sans activité | `FlagStatusBanner` sur les écrans admin concernés (§3.7) |
| **Fuite d'un module masqué par une surface d'incidence** | Les 9 surfaces de §3.6 traitées au lot 5, une par test. **Risque principal du chantier** |
| **Chaîne de préparation cassée** (conseiller privé de son comptoir, recruteur de sa publication) | Champ `closes` : le flag ne ferme que la face consommateur (§5.4) |
| **Bottom-nav déformée** (grille figée à 5 / 4 colonnes) | Colonnes dynamiques + ordre de repli explicite sur les 3 bottom-navs (§5.1) |
| Onboarding verrouillé cassé par un module masqué | Champ `requires` + étape « centre principal » rendue conditionnelle (§5.1) |
| Agenda conseiller vide (source composite Réservation + Événement) | Item de nav affiché si **au moins une** source est ouverte (§5.3) |
| **Routes publiques jamais filtrées** (`middleware.ts:42` sort avant le gate) | Contrôle des flags placé **avant** le retour anticipé — test dédié sur `/opportunites`, `/agenda`, `/ressources`, `/centres` en session anonyme (§6.1) |
| Ordre de tri du kanban recruteur trahit `scoreAdequation` masqué | Repli de tri explicite + retrait du champ du flux Data Hub (§6.4) |
| Écritures graphe cassées par le masquage de Yaye | 8 routes non-IA écrivent via `fire-sync` : no-op silencieux à **tester**, pas à supposer (§6.4) |
| **Engagement en cours rendu invisible** (livre emprunté, réservation acceptée) | `closeMode: 'drain'` — l'entrée ferme, la sortie reste jusqu'à extinction (§7.1) |
| Ouverture d'un module froid (recos vides, graphe non projeté) | Checklist de pré-ouverture + bouton « Préchauffer » (§7.3) |
| Sitemap en retard de 2 h sur la bascule (double cache) | `setFlag` purge Redis **et** `revalidatePath('/sitemap.xml')` (§7.2) |
| Rappel planifié qui part après le masquage | Filtrage **à l'émission ET au rejeu DLQ** (§7.2) |
| **Public dépendant du rendu dynamique implicite** — les pages publiques ne sont dynamiques que parce que `(public)/layout.tsx` appelle `getSession()` (→ `cookies()`) | Documenté comme invariant : toute optimisation retirant `getSession()` du layout rendrait les pages statiques et **neutraliserait les flags**. Test de non-régression au lot 3 |
| `/centre-staff/*` hors `PROTECTED` du middleware (auth JWT propre via `getStaffSession`) | Gate posé dans `(protected)/layout.tsx`, pas dans le middleware |
| **Yaye annonce une fonctionnalité masquée** | Filtrage du catalogue d'outils à la construction du prompt, pas à l'exécution (§3.6) |
| Section vide plutôt qu'absente (« 0 événement ») | Règle explicite : un module masqué produit l'absence de la section, jamais un état vide |
| Nouvelle fonctionnalité ajoutée sans flag | Test d'invariant : toute route utilisateur non couverte par le catalogue échoue le build |

**Point ouvert (PO)** : la latence de propagation de 10 s convient-elle, ou faut-il une
bascule instantanée via un canal Redis pub/sub ? Le pub/sub alourdit le lot 1 (abonnement au
démarrage, reconnexion, test d'intégration) pour un gain qui n'a de valeur qu'en coupure
d'incident. Recommandation : **rester sur 10 s** pour le lot 1, et ne passer au pub/sub que
si un incident réel montre que c'est trop lent.

## 12. Environnement de test (opérationnel)

### 12.1 Ligne de base mesurée — 2026-08-14, `dev` @ `fa78e9e3`

```
npx jest --no-coverage    →  648 suites · 5 211 tests · 100 % vert · 20 s
npx tsc --noEmit          →  0 erreur
npm run lint              →  0 erreur · 7 avertissements (préexistants, no-unused-vars)
```

Trois conséquences pour le chantier :

1. **`npm run validate` est vert sur `dev`.** Aucune dette préexistante à purger avant de
   commencer — contrairement à ce que laissaient craindre GUIC-698/699.
2. **GUIC-699 est obsolète.** Le ticket décrit 16 échecs dans
   `tests/integration/datahub-schema-extraction.test.ts` bloquant tout `git push` ; ce test
   passe désormais **26/26**. Tant que le ticket reste ouvert, l'équipe continue de pousser
   en `--no-verify` pour un problème résolu. **À fermer avant le lot 1.**
3. **La suite tourne en 20 s.** La mesure du lot 0 est donc quasi gratuite et **répétable à
   chaque lot** : tout écart au 5 211 est imputable au flag en cours, immédiatement.

Le lot 0 ne cherche donc plus « combien de tests vont casser » mais vérifie que **l'écart
reste à zéro** après insertion de la couche. Si le mock global de §8.3 est correct, il l'est.

Stack Docker complet, connexion **sans SSO** — `docs/tester-en-local.md` §7.

```bash
docker compose up -d --build app     # app + mariadb + redis + neo4j + minio
curl http://localhost:3000/api/health                       # → 200
```

Connexion sans SSO (`APP_ENV=local` + `ALLOW_DEV_LOGIN=true`, posés par `docker-compose.yml`,
404 en production) :

| Rôle | Commande |
|---|---|
| Admin | `?uid=ad100000-0000-4000-8000-000000000001&to=/admin/tableau-de-bord` — `['admin','beneficiaire']` |
| Modérateur | `?uid=de279c66-d3d2-4955-b378-305215a9aac7` |
| Conseiller | `?uid=c05e111e-0000-4000-8000-000000000001` — `['conseiller','beneficiaire']` |
| Recruteur | `?uid=2c518498-b876-4b43-946e-54afccd077fd` — `['recruteur','beneficiaire']` |
| Bénéficiaire | `/api/dev/login` (défaut) |

Les quatre sessions sont vérifiées (`/admin`, `/conseiller`, `/recruteur`, `/jeune` → 200).

⚠️ **Chaque rôle non-bénéficiaire porte aussi `beneficiaire`** (`rolesPourDevLogin` :
« les espaces jeune restent accessibles à un conseiller/recruteur qui teste le parcours »).
Conséquence pour le test des flags : un conseiller **est aussi** un bénéficiaire. La
résolution de la face d'audience (§5.4) doit donc suivre une **priorité explicite**
— admin > conseiller > recruteur > bénéficiaire — et non « le premier rôle trouvé ».
Sans cette règle, un conseiller se verrait appliquer la face bénéficiaire et perdrait son
comptoir. À tester en propre au lot 3.

Volumétrie de la base de test : 22 496 comptes, dont 1 admin, 1 modérateur, 1 conseiller,
13 recruteurs — le reste sans rôle explicite (bénéficiaires).

⚠️ L'image doit être **reconstruite** après tout changement de code (`--build`) : une image
périmée fait échouer les tests pour de mauvaises raisons — c'est arrivé ici, l'image du
23 juillet ne dérivait pas encore les rôles admin (`rolesPourDevLogin`, GUIC-689).

Le stack sert de banc d'essai des flags. Test d'acceptation central : ouvrir **quatre
sessions en parallèle** — admin, bénéficiaire, recruteur, conseiller — basculer un flag
depuis l'admin, et vérifier que **seules les faces déclarées dans `closes`** perdent
l'accès et toute trace du module (§2.1, §2.2, §5.4).

Comptes de test à identifier en base pour compléter le banc :

```bash
docker exec guichet_mariadb mariadb -u guichet -pguichet_dev_password yaye_poc_enriched \
  -N -B -e "SELECT cjs_uid, role FROM utilisateurs WHERE role IN ('recruteur','conseiller') LIMIT 4;"
```
