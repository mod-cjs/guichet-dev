# REFONTE-V2 — Adoption design-guichet-v2 et redéfinition des parcours

**Ticket :** [GUIC-169](https://consortiumjeunesse.atlassian.net/browse/GUIC-169) (Epic) · [GUIC-170](https://consortiumjeunesse.atlassian.net/browse/GUIC-170) (Phase 1 spec)
**Branche :** `feature/GUIC-169-refonte-design-v2`
**Tag rollback :** `pre-refonte-v2` (sur `dev@ff6e094`)
**Statut :** Spec validée — 15 questions tranchées (2026-05-27)
**Auteur :** mod-cjs · **Date :** 2026-05-27

---

## 1. Décisions de cadrage (PO)

| # | Question | Décision retenue |
|---|---|---|
| Q1 | Nom de l'IA | **Yaye** (remplace Aïssatou partout — code, docs, mémoires, tokens CSS `--gj-yaye-*`) |
| Q2 | Police | **Stack système** `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, "Noto Sans", sans-serif` — abandon Lexend (suppression `next/font/google`) |
| Q3 | Modes a11y avancés (`data-contrast`, `data-text`, `data-falc`, `data-audio="wo"`) | **Hors MVP** — tokens préservés dans `tokens.css` mais aucun toggle UI, branchement TTS Wolof reporté |
| Q4 | Score de matching | **Mocké** — pas de moteur réel pour l'instant, valeur calculée côté front à partir de critères simples (région, domaine, niveau études) |
| Q5 | Modules sans design v2 (M8 admin, M9 recruteur, M10 interop, M11 whatsapp, M12 IA, M13 data, programmes Yaakaar/YEAH/YJC/EduPop) | **Refondus en dernier**, après le périmètre jeune complet. UI actuelle préservée jusque-là |
| Q6 | WhatsApp OTP | **Fallback uniquement** — ne pas modifier M11. OTP SMS reste géré par le SSO |
| Q7 | Programmes CJS | **Constante TypeScript** (`src/lib/programmes.ts`), pas d'entité Prisma dédiée. Gradients déjà tokenisés (`--prog-yaakaar`, `--prog-yeah`, etc.) |
| Q8 | Tablet landscape (768-1024) | **Traité dans le MVP web** — responsive obligatoire à partir de 768px |

---

## 2. Inventaire du design v2

### 2.1 Source de vérité

`design-guichet-v2/` — livraison du designer le 2026-05-26. Contient :

| Fichier | Contenu |
|---|---|
| `tokens.css` | Palette `gj-*`, sémantiques `--color-*`, typo `--fs-100..900`, espacement `--space-1..8`, hit-targets, radii, élévation, focus, breakpoints, safe-area, motion, z-index, **gradients programmes sectoriels** |
| `colors_and_type.css` | Shorthand layer (`--bg`, `--surface`, `--fg1/2/3`, `--brand`, `--h1..h4`, `--body`, `--caption`, `--micro`, `.gj-type`) |
| `onboarding.jsx` | 5 écrans mobile (Welcome, Phone+OTP, Goal, Profile, Reco) |
| `web-onboarding.jsx` | 5 écrans web (équivalents) |
| `web-dashboard.jsx` | Sidebar `BenefSidebar`, `BenefTopBar`, `WebDashHero`, `WebDashKPIs`, `WebDashTracker`, `WebDashEvents`, `WebDashCenters`, `WebDashProfileNudge`, `WebDashYayePanel` |
| `mobile-flows.jsx` | Dashboard mobile, recherche+filtres, détail opportunité, candidature, confirmation, candidatures pipeline, notifications, Yaye plein écran |
| `lot3-opps-mobile.jsx` / `lot3-opps-web.jsx` | Liste + détail opportunités, slide-over web, modal candidature web |
| `mobile-centres.jsx` | Liste centres CJS + détail |
| `screens.jsx` | Pipeline candidatures + Yaye fullscreen + notifications (consolidé) |
| `phone.jsx` | `PhoneFrame` (dev-only — simulateur device) + `StatusBar` |
| `cjs-card.jsx` | `MyCard` — carte CJS avec QR (Mon profil) |
| `design-canvas.jsx` | Canvas dev exhaustif (référence visuelle de tous les composants) |
| `assets/icons.svg` + `icons.css` | Sprite SVG (`#i-agriculture`, `#i-search`, etc.) — `currentColor` |
| `assets/logo-guichet.png` | Logo (déjà en repo `public/`) |

### 2.2 Tokens nouveaux (vs `design/html/tokens.css` actuel)

- **Couleurs ajoutées** : `--gj-teal-deep-2`, `--gj-yellow-deep`, `--gj-yellow-ink`, `--gj-red-soft`, `--gj-red-ink`, `--gj-blue-deep`, `--gj-blue-soft`, `--gj-blue-ink`, `--gj-green-soft`, `--gj-green-ink`, `--gj-yaye-grad-1..4`, `--gj-yaye-gradient`, `--gj-ink-teal`, `--gj-whatsapp`, `--gj-whatsapp-deep`
- **Programmes sectoriels** : `--prog-yaakaar`, `--prog-yeah`, `--prog-yjc`, `--prog-edupop` (gradients 135deg). BRM = outil interne, pas programme sectoriel.
- **Sémantiques** : `--color-action-*`, `--color-status-*`, `--color-text-*`, `--color-bg-*`, `--color-border-*`
- **Yaye** : `--gj-yaye-deep`, `--gj-yaye-ink`, `--gj-yaye-accent`, `--gj-yaye-gradient` (réservé wordmark + avatar)
- **Hit-targets** : `--tap-min` (44px), `--tap-comfortable` (48px), `--tap-input` (48px), `--tap-dense` (36px desktop only)
- **Safe-area** : `--safe-top/right/bottom/left`
- **Motion** : `--motion-fast/base/slow`, `--motion-ease`
- **`--gj-indigo` est DEPRECATED** et aliasé sur `--gj-teal-deep` (suppression progressive)

### 2.3 Composants nouveaux identifiés

`PhoneFrame` (dev), `PhoneFrameStatusBar`, `BenefSidebar`, `BenefTopBar`, `WebDashTopNav`, `WebDashHero`, `WebDashKPIs`, `WebDashTracker`, `WebDashEvents`, `WebDashCenters`, `WebDashProfileNudge`, `WebDashYayePanel`, `WebOppCard`, `SectionH`, `Chip`, `FieldLabel`, `MobileOppDetail`, `MobileSearchFilter`, `MobileDashWithNotifs`, `CandidaturesPipeline` (stepper 5 étapes), `YayeFullScreen`, `MyCard` (CJS QR).

### 2.4 Parcours couverts

Onboarding mobile (5 étapes) · Onboarding web (5 étapes) · Dashboard mobile + drawer notifications · Dashboard web (sidebar + hero + KPIs + carousel + tracker + sidebar panels) · Opportunités mobile (list + bottom-sheet filtres + détail sheet + apply + confirmation) · Opportunités web (list + slide-over + modal apply) · Candidatures pipeline 5 étapes (Brouillon → Envoyée → En revue → Entretien → Décision) · Centres CJS mobile · Yaye plein écran mobile + side panel web · Notifications mobile (drawer groupé par type).

---

## 3. Contrats intouchables

Tout endpoint, claim, header ou format ci-dessous est verrouillé par un contrat externe (SSO, BRM, Centres, Moodle, EduPop) ou par la conformité CDP. La refonte v2 **ne doit rien modifier** dans ces périmètres.

### 3.1 SSO / OAuth 2.0 / OIDC (Laravel Passport)

| Élément | Valeur | Fichier source | Raison |
|---|---|---|---|
| URL callback OAuth | `https://guichet.cjs.sn/auth/callback` | `src/app/auth/callback/route.ts` | Enregistré côté SSO (client `guichet-jeunesse`) |
| Authorize URL | `{SSO_BASE_URL}/oauth/authorize` | `src/lib/sso-client.ts` | Spec OIDC |
| Token endpoint | `{SSO_BASE_URL}/oauth/token` | idem | Spec OIDC |
| UserInfo | `{SSO_BASE_URL}/api/oauth/userinfo` | idem | Spec OIDC |
| Revoke | `{SSO_BASE_URL}/api/oauth/token/revoke` | idem | Spec SSO |
| JWKS | `{SSO_BASE_URL}/oauth/keys` | `src/app/api/auth/backchannel-logout/route.ts` | Vérif logout token RS256 |
| Backchannel logout | `POST /api/auth/backchannel-logout` (form-urlencoded `logout_token`) | idem | OIDC Back-Channel Logout 1.0 |
| Scopes | `openid profile email phone cjs_roles` | `docs/sso.md` | Contrat scopes |
| Claim `sub` | UUID v4 = `cjs_uid` | partout | **Identifiant inter-plateformes unique** |
| Claims utilisés | `sub`, `given_name`, `family_name`, `email`, `phone_number`, `cjs_roles[]`, `cjs_status`, `address.region` | `src/app/auth/callback/route.ts` | Contrat SSO |
| Cookie session | `cjs_session` (httpOnly, SameSite=lax, signé HS256) | `src/lib/auth.ts` | Lecture middleware |
| Claims JWT cookie | `cjsUid`, `nom`, `prenom`, `email`, `telephone`, `region`, `roles`, `onboardingComplete`, `expiresAt` | `src/lib/auth.ts` (`MinimalSessionClaims`) | Format figé GUIC-166 |
| Tokens Redis | `accessToken`, `refreshToken`, `expiresAt` par `cjsUid` | `src/lib/token-store.ts` | Stockage hors cookie (GUIC-166) |
| PKCE | code_challenge S256, client public sans secret | `src/lib/sso-client.ts` | Type de client SSO |
| Cookies temporaires | `pkce_verifier`, `oauth_state`, `auth_return_to`, `force_login` (TTL 5-10 min) | `src/app/api/auth/login/route.ts` | Sécurité flow |

### 3.2 Webhook SSO entrant

| Élément | Valeur | Source | Raison |
|---|---|---|---|
| Endpoint | `POST /api/webhooks/sso` | `src/app/api/webhooks/sso/route.ts` | Enregistré côté SSO |
| Signature | HMAC-SHA256(`SSO_WEBHOOK_SECRET`, `timestamp + "\n" + body`) | idem | Contrat SSO (différent du HMAC interop) |
| Headers | `X-CJS-Timestamp`, `X-CJS-Signature` | idem | Contrat |
| Events | `user.provisioned`, `user.updated`, `user.anonymized` | idem | Enum signée SSO |
| Payload | `{event, cjs_uid (UUID), timestamp, data:{email,first_name,last_name,phone,region,status,roles[]}}` | idem | Format SSO |
| Idempotence | Redis key `guichet:webhook:sso:{event}:{cjs_uid}:{ts}`, TTL 7 jours | idem | CLAUDE.md |

### 3.3 API d'interconnexion machine-to-machine (HMAC)

| Endpoint | Source | Plateforme | Contrat |
|---|---|---|---|
| `POST /api/interconnexion/centres` | `src/app/api/interconnexion/centres/route.ts` | MyDigitalPro (Centres CJS) | `event=jeune.enrolement`, gcId, telephone E.164 |
| `POST /api/interconnexion/brm` | `src/app/api/interconnexion/brm/route.ts` | BRM | `beneficiaire.programme.rejoint/termine`, `beneficiaire.decaissement.effectue` |
| `POST /api/interconnexion/moodle` | `src/app/api/interconnexion/moodle/route.ts` | Moodle | `certification.obtenue`, moodleCertifId |
| `POST /api/interconnexion/edupop` | `src/app/api/interconnexion/edupop/route.ts` | EduPop | `usage.ia.mensuel` |

**Vérification HMAC commune** (`src/lib/verify-hmac.ts`) :
- Headers : `X-CJS-Api-Key`, `X-CJS-Timestamp` (Unix sec, fenêtre ±5 min), `X-CJS-Signature` (hex)
- Algorithme : `HMAC-SHA256(secret, apiKey + "\n" + timestamp + "\n" + sha256(body))`
- Comparaison `timingSafeEqual`
- Secrets via env : `BRM_API_KEY/SECRET`, `CENTRES_API_KEY/SECRET`, `MOODLE_API_KEY/SECRET`, `EDUPOP_API_KEY/SECRET`

### 3.4 Data Hub — API d'export

| Élément | Valeur | Source | Raison |
|---|---|---|---|
| Base path | `/api/v1/export/` (versionné) | `src/app/api/v1/export/*` | Contrat Power BI / Metabase |
| Endpoints | `GET /utilisateurs`, `/opportunites`, `/formations`, `/programmes` | idem | Consommés par outils BI |
| Auth | `Authorization: Bearer {DATAHUB_API_KEY}` | idem | Clé partagée Data Steward |
| Formats | `Accept: application/json` (défaut) ou `text/csv` (UTF-8 BOM, virgule) | `docs/interconnexion.md` | Compat Excel |
| Structure JSON | `{ data: [...], meta: { total, page, limit, generated_at, freshness_seconds } }` | idem | Contrat consommateurs |
| Champs `utilisateurs` | `cjs_uid, region, genre, tranche_age, statut, completion_profil, date_inscription, nb_candidatures, nb_formations` (pas de PII) | idem | RGPD/CDP |
| Pagination | `page`, `limit` (max 1000, défaut 500) | idem | Contrat |

### 3.5 Conformité CDP (Commission Données Personnelles Sénégal)

| Obligation | Source | Raison |
|---|---|---|
| `cjs_uid` = UUID v4 source SSO, jamais généré localement | partout | Unicité inter-plateformes |
| Téléphone format E.164 (`+221XXXXXXXXX`) | `src/app/auth/callback/route.ts` (`toE164`) | Interop Centres/WhatsApp |
| Anonymisation RGPD : `event=user.anonymized` → nom="Utilisateur", prenom="Anonymisé", email=null, telephone=null, statut=`anonymise`, `deletedAt` | `src/app/api/webhooks/sso/route.ts` (`handleAnonymized`) | RGPD/CDP |
| Cookie SSO `httpOnly`, jamais `localStorage`, jamais accessible JS | `src/lib/auth.ts` | Sécurité |
| Tokens jamais exposés côté client | `src/lib/token-store.ts` (Redis serveur) | Sécurité |
| Rate limiting Redis sur tous endpoints publics | `src/lib/rate-limit.ts` | CLAUDE.md |
| Idempotence webhooks (event_id Redis TTL 7j) | webhook handlers | CLAUDE.md |
| Mentions légales, cookies de consentement, page Vie privée | `src/app/(public)/` (à conserver) | CDP |
| Payload max 50KB, pagination 20/page sur API publiques | conventions | CLAUDE.md |

### 3.6 Onboarding API

| Élément | Valeur | Source |
|---|---|---|
| Endpoint | `GET/PUT /api/v1/onboarding` | `src/app/api/v1/onboarding/route.ts` |
| Body PUT | discriminated union `{step: 1\|2\|3, data: ...}` | idem |
| Effets de bord | upsert `Utilisateur` + `ProfilJeune`, calcul `completionScore`, set `onboardingComplete=true` à step 3, ré-encodage cookie session | idem |
| Versionné v1 → ne pas casser sans bump | idem | Contrat avec proxy/middleware |

### 3.7 Middleware — protection des routes

| Élément | Source | Raison |
|---|---|---|
| Matcher | `['/((?!_next/static|_next/image|favicon.ico|api/auth/).*)']` | `src/middleware.ts` |
| Runtime | `nodejs` (ioredis non Edge) | idem |
| Patterns protégés | `/jeune/*` (rôles bénéficiaire/jeune/chercheur_d_emploi), `/recruteur/*` (recruteur), `/admin/*` (admin/moderator/super_admin) | idem |
| Auto-redirect bénéficiaire sans onboarding → `/jeune/onboarding` | idem | Funnel verrouillé |
| Refresh token automatique si `expiresAt - now < 5 min` | idem | UX continue |
| Denylist Redis (backchannel logout) → redirect `/auth/connexion` | `src/lib/session-store.ts` | OIDC backchannel |

### 3.8 Identifiants & formats

| Donnée | Format | Raison |
|---|---|---|
| `cjs_uid` | UUID v4, claim `sub` du token SSO | Seul identifiant inter-plateformes |
| `telephone` | E.164 `+221XXXXXXXXX` | Interop Centres, WhatsApp, BRM |
| Email | RFC 5322, validé Zod | SSO |
| Region | Enum Prisma `Region` (14 régions Sénégal) | Filtres + statistiques |
| `cjs_roles` | tableau de strings (`beneficiaire`, `jeune`, `chercheur_d_emploi`, `recruteur`, `admin`, `moderator`, `super_admin`) | Source SSO |

---

## 4. Écarts vs implémentation actuelle

### 4.1 Tokens

| Sujet | Actuel (`design/html/tokens.css` + `app/globals.css`) | Cible v2 (`design-guichet-v2/tokens.css`) | Action |
|---|---|---|---|
| Police | `Lexend` via `next/font/google`, variable `--font-lexend` | Stack système `"Segoe UI", system-ui, ...` | **Migrer** : retirer `next/font`, mettre à jour `--gj-font-sans` |
| Indigo Aïssatou | `--gj-indigo` actif, réservé chatbot | `--gj-indigo` DEPRECATED, alias sur `--gj-teal-deep` | Remplacer usages par `--gj-yaye-*` (qui aliasent vers teal-deep) |
| Couleurs status | `gj-red`, `gj-yellow`, `gj-teal` mais pas de `-soft`/`-ink` complets | Toute la matrice `red-soft`/`red-ink`, `blue-soft/ink`, `green-soft/ink`, `yellow-ink/deep` | Étendre |
| Sémantiques | Pas de `--color-action-*`, `--color-status-*` | Couche complète | Adopter |
| Échelle typo | `--gj-fs-*` (sm/base/md/lg/xl/2xl/h1/h2) | `--fs-100..900` (11→36px) + aliases v1 préservés | Adopter (compat via aliases) |
| Espacement | Ad hoc Tailwind | `--space-1..8` (4→64px) | Adopter |
| Hit-targets | Pas tokenisés | `--tap-min`, `--tap-comfortable`, `--tap-input`, `--tap-dense` | Adopter |
| Programmes | Pas de gradients | `--prog-yaakaar/yeah/yjc/brm/edupop` | Adopter |
| Yaye/IA | `--gj-indigo*` | `--gj-yaye-deep/ink/accent/gradient` + 4 stops `--gj-yaye-grad-1..4` | Adopter |
| WhatsApp | Hex en dur | `--gj-whatsapp`, `--gj-whatsapp-deep` | Adopter |
| Safe-area | Partiel (`env(safe-area-inset-bottom)` ponctuel) | Tokens `--safe-top/right/bottom/left` | Adopter |
| Motion | Pas tokenisé | `--motion-fast/base/slow`, `--motion-ease` | Adopter |
| Z-index | Hex Tailwind | `--gj-z-nav/fbar/bottom-nav/chat/overlay/toast` | Adopter |
| A11y modes | Absent | `[data-contrast]`, `[data-text]`, `[data-falc]`, `[data-audio="wo"]` | **Tokens présents, toggles différés** (Q3) |

### 4.2 Composants UI (`src/components/ui/`)

| Actuel | Statut | Cible v2 |
|---|---|---|
| `Alert` | Conserver, restyler | Variants sémantiques `--color-status-*` |
| `Avatar` | Conserver | Ajout variant Yaye (gradient + halo) |
| `Badge` | Conserver, étendre | Variants `teal`, `blue`, `green`, `yellow`, `red`, `grey` + variant programmes |
| `BottomNav` | **Refondre** | Nouvelles icônes SVG sprite, intégration safe-area v2 |
| `Button` | **Refondre** | Variants `primary`, `secondary`, `ghost`, `text`, `danger` + `loading`, `disabled`, hit-target `--tap-comfortable` |
| `Card` | **Refondre** | Style "AppCard v1.5" (white bg, 1.5px border `--gj-line`, radius 12, optional top-pill) |
| `DataTable` | Conserver (admin) | Reporter refonte à Phase 4 |
| `EmptyState` | Conserver, restyler | Pattern `.empty` v2 |
| `Input` | **Refondre** | Hauteur `--tap-input` (48px), font-size 16px (anti-zoom iOS), focus ring `--focus-ring` |
| `Modal` | Conserver | Pour formulaires centrés desktop |
| `Select` | **Refondre** | Mêmes contraintes Input |
| `Sheet` | Conserver (GUIC-20) | Étendre : variant `slide-over` desktop + `bottom-sheet` mobile responsive |
| `Skeleton` | Conserver | Pattern `.skel-card`/`.skel-line` |
| `Tag` | Conserver | Variantes sémantiques (`cjs`, `partner`, `urgent`, `new`) |
| `Toast` | Conserver | Pattern `.toast` ancré bas |

### 4.3 Routes

**Routes actuelles à conserver (URLs figées par SSO/SEO/marketing) :**
- `/`, `/opportunites`, `/opportunites/[slug]`, `/evenements`, `/ressources`, `/centres`
- `/auth/connexion`, `/auth/callback`, `/auth/deconnexion`
- `/jeune/onboarding`, `/jeune/tableau-de-bord`, `/jeune/mon-profil`, `/jeune/mes-candidatures`, `/jeune/mes-favoris`, `/jeune/mes-formations`
- `/admin/*`, `/recruteur/*`
- Toutes les routes `/api/*` (cf §3)

**Routes à ajouter (v2) :**
- `/jeune/mes-notifications` (page dédiée + drawer mobile)
- `/jeune/yaye` (Yaye plein écran mobile — déjà existant `/jeune/(app)/ia/` à vérifier, sinon ajouter)
- `/jeune/ma-carte` (MyCard QR — nouveau)
- Sous-pages onboarding mobile cohérentes (étape welcome séparée si besoin step-by-step)

**Routes à confirmer avec PO (Q ouverte) :**
- Renommage `/evenements` → `/agenda` ? Le design v2 dit "Agenda" partout.

### 4.4 Architecture navigation

| Zone | Actuel | Cible v2 | Action |
|---|---|---|---|
| Public mobile | Header marketing seul (logo + Se connecter) | **Inchangé** | Restyler `Header` |
| Public desktop | Header marketing + Footer | Restyler avec tokens v2 | Restyler |
| Jeune mobile | `AppTopbar` + `BottomNav` 5 items | **Inchangé structure**, nouvelles icônes SVG sprite, restyling v2, FAB Yaye | Restyler + ajouter `YayeFab` |
| Jeune desktop | Header marketing + Footer (pas de sidebar) | **NOUVEAU** : `BenefSidebar` + `BenefTopBar` + sidebar panels Yaye | Créer composants, nouveau layout `(app)` desktop |
| Onboarding | Mini-topbar (logo + déconnexion) | **Inchangé**, restyling v2 | Restyler |
| Admin / Recruteur | Sidebar dédiée + drawer mobile | **Inchangé jusqu'à Phase 4** | Aucun |

**Décision structurante** : la version desktop pour le bénéficiaire passe d'un layout marketing (header + footer) à un **layout applicatif** (sidebar + topbar applicative). Casse les pages actuelles `/jeune/*` desktop — à valider avec PO.

### 4.5 Composants à créer / supprimer

**À créer (`src/components/ui/` + `src/components/v2/`)** :

| Composant | Rôle | Source design |
|---|---|---|
| `YayeFab` | Bouton flottant Yaye mobile (gradient signature, halo pulse) | `mobile-flows.jsx` |
| `YayeBubble` | Bulle de message Yaye dans conversation | `screens.jsx` |
| `YayeActionCard` | Carte d'action proposée par Yaye (CTA contextuel) | `screens.jsx` |
| `YayeQuickReplies` | Suggestions de réponses rapides | `screens.jsx` |
| `YayePanelDesktop` | Side panel Yaye web | `web-dashboard.jsx` (`WebDashYayePanel`) |
| `BottomSheet` | Variant `Sheet` mobile spécialisé | mobile-flows.jsx |
| `PhoneFrame` | Simulateur device (dev/Storybook only, hors prod) | `phone.jsx` |
| `MyCard` | Carte CJS QR Mon profil | `cjs-card.jsx` |
| `StepBar` | Stepper 5 étapes pipeline candidature | `screens.jsx` |
| `FooterCTA` | CTA sticky bas (utilisé en détail opportunité, candidature) | mobile-flows.jsx |
| `Chip` | Filtre/intérêt rond, on/off, icon | onboarding.jsx |
| `FieldLabel` | Label de champ avec `required` | onboarding.jsx |
| `BenefSidebar` | Sidebar navigation bénéficiaire web | `web-dashboard.jsx` |
| `BenefTopBar` | Topbar applicative web bénéficiaire | idem |
| `DashHero` (mobile + web) | Hero du dashboard (salutation, action principale) | `web-dashboard.jsx`, mobile-flows.jsx |
| `DashKPIs` | Bloc 4 KPIs dashboard | `web-dashboard.jsx` |
| `DashTracker` | Tracker de progression candidatures | idem |
| `DashCenters` | Carrousel centres proches | idem |
| `DashProfileNudge` | Nudge complétion profil | idem |
| `OppCardV2` (mobile + web) | Carte opportunité refondue (top-pill, match score, deadline urgent) | `lot3-opps-*.jsx` |
| `NotificationsDrawer` | Drawer notifications mobile (groupé par type) | `screens.jsx` |
| `OpportuniteCandidatureModal` v2 | Modal candidature web | `lot3-opps-web.jsx` |
| `SectionH` | Header de section (titre + lede + "voir plus") | `web-dashboard.jsx` |
| `IconSprite` | Loader `assets/icons.svg` (single inject `<svg><use href=#i-X/></svg>`) | `assets/icons.svg` |

**À supprimer / archiver** :
- `design/html/*` → archiver vers `design/html.archive/` après validation spec
- `next/font/google` import Lexend dans `src/app/layout.tsx`
- Variable CSS `--font-lexend` injectée sur `<html>`
- Toute référence aux fichiers `*Aïssatou*` (renommer en `Yaye`)

**À renommer (Phase 0)** :
- `Aïssatou` / `Aissatou` / `AISSATOU` → `Yaye` / `yaye` / `YAYE` dans :
  - `src/lib/whatsapp.ts`, `src/lib/ia/rag.ts`, `src/lib/ia/recommandation.ts`
  - `src/app/auth/connexion/page.tsx`, `src/app/api/whatsapp/route.ts`
  - `docs/metier.md`, `docs/conventions.md`
  - `.agent_context/specs/M3-opportunites-ui.md`
  - `CLAUDE.md` (2 occurrences)
  - Mémoires utilisateur (`memory/MEMORY.md` et fichiers liés)

---

## 5. Parcours utilisateurs redéfinis

### 5.1 Onboarding mobile (jeune)

```
[Welcome] → [Phone + OTP] → [Goal] → [Profile] → [Reco] → [Dashboard]
```

| Écran | Décisions | États |
|---|---|---|
| Welcome | "Se connecter" (SSO existant), "Créer mon compte" (SSO signup) | loading, error |
| Phone+OTP | **Confirmation E.164 + OTP SMS via SSO**. Pas de saisie OTP en propre (Q6 — fallback WhatsApp uniquement) | loading, error invalid, error rate-limit |
| Goal | Choix objectif principal : Emploi / Stage / Formation / Bourse / Volontariat | (state stocké session) |
| Profile | Step 1+2+3 actuels condensés UI v2 (identité + localisation + profil) | erreurs Zod, loading PUT |
| Reco | Aperçu 3-5 opportunités recommandées (score mocké Q4) | empty (filtre trop strict), error API |

**Différences vs actuel** : l'écran Welcome n'existe pas, l'onboarding actuel saute directement vers le wizard 3 steps. v2 ajoute Welcome + Goal + Reco. **Le wizard 3 steps API reste, on encapsule l'UI autour.**

### 5.2 Onboarding web

Mêmes 5 étapes, layout colonne + illustration côté droit. Reuses `/api/v1/onboarding` (intouchable §3.6).

### 5.3 Dashboard bénéficiaire

**Mobile** : Topbar (avatar + notifs) → DashHero (salutation + action urgente) → KPIs (4 chiffres) → Tracker candidatures → Sections recommandations / agenda / centres → BottomNav + FAB Yaye.

**Web** : BenefSidebar (gauche) + BenefTopBar → Hero → KPIs → Carousel opportunités → Tracker → Sidebar panels (Centres, ProfileNudge, Yaye).

### 5.4 Recherche + candidature

**Mobile** :
```
[Liste opps] → [Bottom-sheet filtres] → [Liste filtrée]
            ↓
        [Détail sheet] → [Formulaire candidature] → [Confirmation] → [Pipeline]
```
**États** : loading skeleton, empty (aucun résultat), error API, success toast.

**Web** :
```
[Liste opps] → [Slide-over détail] → [Modal apply] → [Confirmation toast]
```

### 5.5 Candidatures pipeline

Stepper 5 étapes : Brouillon → Envoyée → En revue → Entretien → Décision.
Tabs : Toutes / À compléter / En cours / Décidées / Archivées.
Badges urgents (J-3, J-1).

### 5.6 Centres

**Mobile** : Liste (carte + distance + horaires) → Détail centre (carte, programmes, contact, agent référent).
**Web** : Reporté Phase 4 si pas de design dédié (à confirmer PO).

### 5.7 Yaye

**Mobile** : Plein écran depuis FAB → conversation (bubbles + quick replies + action cards) → fermeture revient au contexte.
**Web** : Side panel droit (toggle depuis topbar) → conversation embarquée.

### 5.8 Notifications

**Mobile** : Drawer top-down depuis topbar → groupes (Candidatures / Opportunités / Système / Yaye) → action sur chaque.
**Web** : Popover depuis topbar + page dédiée `/jeune/mes-notifications`.

---

## 6. Plan d'exécution phasé

### Phase 0 — Fondations (1 sprint)

- [ ] Copier `design-guichet-v2/tokens.css` → `src/styles/tokens-v2.css`
- [ ] Copier `colors_and_type.css` → `src/styles/colors-type-v2.css`
- [ ] Importer dans `src/app/layout.tsx` (remplace les anciens tokens)
- [ ] Retirer `next/font/google` Lexend, retirer `--font-lexend`
- [ ] Renommer `Aïssatou` → `Yaye` partout (cf §4.5 — liste exhaustive)
- [ ] Archiver `design/html/` → `design/html.archive/` (avec un README expliquant la source d'autorité v2)
- [ ] Mettre à jour `CLAUDE.md` : police, IA Yaye, modes a11y phasés, source design v2
- [ ] Créer `src/lib/programmes.ts` (constante TS des 5 programmes — Q7)
- [ ] Copier `design-guichet-v2/assets/icons.svg` → `public/icons.svg` et créer `<IconSprite>` (single inject root layout)
- [ ] Tests : `npm run validate` doit passer après chaque étape

### Phase 1 — Design system v2 (2 sprints)

- [ ] Refondre `src/components/ui/` primitives : `Button`, `Input`, `Select`, `Card`, `Badge`, `Tag`, `Sheet`, `Modal`, `Toast`, `EmptyState`, `Skeleton`, `Alert`, `BottomNav`
- [ ] Créer nouveaux composants v2 (cf §4.5 liste à créer) sous `src/components/v2/`
- [ ] Yaye : `YayeFab`, `YayeBubble`, `YayeActionCard`, `YayeQuickReplies`, `YayePanelDesktop`
- [ ] Layouts : `BenefSidebar`, `BenefTopBar`, `AppTopbarV2`, `BottomNavV2`, `FooterCTA`
- [ ] `PhoneFrame` dev-only (uniquement dans `src/app/dev/` ou Storybook si introduit)
- [ ] Tests unitaires + visuels (Playwright si dispo) sur les primitives
- [ ] **Non-régression SSO/middleware** : suite d'intégration à passer (login/logout/refresh/backchannel)

### Phase 2 — MVP jeune mobile (3 sprints)

- [ ] Onboarding mobile : Welcome → Phone/OTP → Goal → Profile → Reco → Dashboard
- [ ] Dashboard mobile complet (Hero + KPIs + Tracker + Reco + Agenda + Centres)
- [ ] Opportunités mobile : list + bottom-sheet filtres + détail sheet + modal apply + confirmation + empty state
- [ ] Candidatures pipeline mobile (5 étapes, tabs, urgences)
- [ ] Notifications drawer mobile
- [ ] Centres CJS mobile
- [ ] Yaye plein écran mobile
- [ ] Profil mobile + MyCard QR

### Phase 3 — MVP jeune web (2 sprints)

- [ ] Onboarding web (5 écrans)
- [ ] Dashboard web (sidebar + hero + KPIs + carousel + tracker + sidebar panels)
- [ ] Opportunités web (list + slide-over + modal apply + empty state)
- [ ] Yaye side panel web
- [ ] Responsive tablet landscape (768-1024)
- [ ] Profil web

### Phase 4 — Modules différés (planning post-MVP)

- [ ] M8 admin (sidebar admin restylée)
- [ ] M9 recruteur
- [ ] M10 interop (UI back-office monitoring — pas le contrat API §3.3)
- [ ] M11 WhatsApp (UI admin uniquement, pas le flow OTP — Q6)
- [ ] M12 IA (admin Yaye)
- [ ] M13 Data Hub (UI back-office)
- [ ] Programmes sectoriels (écrans Yaakaar / YEAH / YJC / BRM / EduPop avec gradients dédiés)

---

## 7. MVP identifié

**MVP livrable le plus tôt** : parcours jeune mobile complet (Phase 0 + 1 + 2). Permet une démo de bout en bout sur device (onboarding → recherche → candidature → confirmation → suivi pipeline). Le web suit en Phase 3.

**Critères de done MVP** :
1. Un jeune anonyme peut s'inscrire via SSO, faire son onboarding et arriver sur son dashboard.
2. Il peut chercher une opportunité, filtrer, voir le détail, candidater, recevoir confirmation.
3. Il voit sa candidature dans son pipeline avec stepper visuel et état correct.
4. Il peut ouvrir Yaye depuis le FAB et obtenir une réponse (sans changement back-end IA).
5. Notifications drawer fonctionnel.
6. Aucune régression SSO/HMAC/webhooks/Data Hub.

---

## 8. Risques & mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Casse des pages livrées GUIC-20/21 (opportunités) | Élevée | Élevé | Tag `pre-refonte-v2` + rollback en 1 commande. Refonte route-by-route, pas big-bang |
| Régression SSO (login/refresh/backchannel) | Moyenne | Critique | Tests d'intégration à passer après chaque sprint Phase 1+. Aucune modif `src/lib/auth*`, `middleware.ts`, `auth/callback`, `api/auth/*`, `api/webhooks/sso/*` |
| Régression contrat interop (BRM/Centres/Moodle/EduPop) | Faible | Critique | Endpoints `/api/interconnexion/*` et `/api/v1/export/*` interdits de modification hors Phase 4 |
| Perte fonctionnelle pendant migration (admin/recruteur cassés) | Faible | Moyen | Modules différés gardent leur UI actuelle (tokens v1 préservés en aliases) jusqu'à Phase 4 |
| Charge cognitive double design system | Moyenne | Moyen | `--gj-fs-*` v1 aliasés sur v2, période transitoire supportée |
| Web bénéficiaire actuel (header marketing) cassé par le nouveau layout sidebar | Élevée | Moyen | Phase 3 → un seul switch atomique du layout `/jeune/(app)/layout.tsx` |
| Score matching mocké pris pour réel par utilisateurs | Faible | Faible | Tooltip "estimation" + label clair (Q4) |
| TTS Wolof attendu en Phase 2 alors qu'il est en Phase 4+ | Faible | Faible | Communiquer clairement Q3 au PO |

---

## 9. Mise à jour du système d'agent

- [ ] `CLAUDE.md` : remplacer "Lexend" par stack système, "Aïssatou" par "Yaye", marquer modes a11y comme "phase ultérieure", indiquer `design-guichet-v2/` comme nouvelle source de vérité
- [ ] `.agent_context/rules/` : créer `design-system-v2.md` (résumé tokens + règles de migration)
- [ ] `.agent_context/specs/M2-onboarding.md`, `M3-opportunites-ux.md`, `M3-opportunites-ui.md`, `GUIC-19-profil-dashboard.md`, `GUIC-20-opportunites-recherche.md`, `GUIC-21-opportunite-detail-candidature.md` : ajouter en tête une note "À actualiser après REFONTE-V2 Phase 2/3"
- [ ] Mémoires utilisateur (`/Users/macbook/.claude/projects/-Users-macbook-Desktop-cjs-guichet/memory/`) : créer `project_refonte_v2.md` référencé depuis `MEMORY.md`
- [ ] Archivage `design/html/` → `design/html.archive/` avec README pointant vers `design-guichet-v2/`
- [ ] `docs/conventions.md`, `docs/metier.md` : renommer Aïssatou → Yaye, mettre à jour police

---

## 10. Décisions complémentaires (questions tranchées 2026-05-27)

| # | Décision | Mise en œuvre |
|---|---|---|
| Q9 | `/evenements` → `/agenda` | Rename de route + redirect 301 dans `next.config.ts`. À faire en Phase 0. |
| Q10 | Layout desktop bénéficiaire | Bascule vers layout applicatif (sidebar + topbar). Bandeau in-app la première fois pour annoncer la nouvelle expérience. Phase 3. |
| Q11 | `PhoneFrame` en prod | Embarqué uniquement dans `/dev/preview` (gardée par `process.env.NODE_ENV !== 'production'`). Storybook ailleurs. |
| Q12 | Formule du score mocké | `min(95, 60 + (régionMatch ? 15 : 0) + (objectifMatch ? 15 : 0) + (âgeMatch ? 5 : 0))`, arrondi au palier de 5%. Range affichée 60–95%. Libellé `Estimation` en gris 13px sous le %, tooltip "Calculé selon ton profil". Implémenté dans `src/lib/matching.ts` (pur, testable). |
| Q13 | MyCard QR | URL signée HMAC : `https://guichet.../m/<token>` avec `token = base64url(HMAC-SHA256(cjs_uid \| exp, MEMBER_QR_SECRET))`. Expiration 5 min, régénération auto côté client toutes les 4 min via `/api/me/qr-token`. Endpoint Next côté serveur valide le HMAC et affiche une page vérif. **Aucun `cjs_uid` brut dans le QR** (CDP-safe). |
| Q14 | OTP WhatsApp fallback | Pas d'input OTP propre dans le Guichet. L'écran Phone+OTP du design v2 est conçu pour s'intégrer au flow SSO existant (redirect vers SSO si possible, sinon embed de l'iframe Passport). À détailler dans la spec M2 lors de la Phase 2. |
| Q15 | Yaye plein écran | **Mobile : route dédiée** `/jeune/yaye` (deep-link, back button OS, partage, historique). **Web : side panel non-routé** (n'occupe pas l'écran principal, conserve le contexte). Route `/jeune/(app)/ia/` actuelle de M12 est renommée en `/jeune/yaye`. |
| Q16 | Modes a11y | Hors MVP. Tokens `[data-contrast]`, `[data-text]`, `[data-falc]`, `[data-audio="wo"]` restent dans `tokens.css` mais aucun toggle UI. Réactivation prévue en phase post-MVP avec ticket dédié. |
| Q17 | Notifications web | Page `/jeune/mes-notifications` créée en Phase 3 (cohérence avec dashboard tracker). Popover topbar pour aperçu rapide (5 dernières), CTA "Voir tout" → page complète. |
| Q18 | Storybook | **Adopté en Phase 1**. Setup ~1.5j, gain énorme pour tester variants/responsive isolément. Story par composant `src/components/ui/*` et par composant Yaye. Doc vivante du design system. |
| Q19 | Tablet landscape | **Frontière à 1024px** (token `--bp-lg`). En dessous de 1024 : layout mobile (BottomNav, contenu pleine largeur, hero compact). À partir de 1024 : layout web (sidebar BenefSidebar, topbar BenefTopBar, contenu fluide). Conforme aux breakpoints du design v2. |
| Q20 | Centres web | **Phase 3** — responsive du `mobile-centres.jsx` en layout 2 colonnes (liste à gauche, carte/détail à droite). Pas de design dédié fourni, on adapte. Décision tech lead. |
| Q21 | Programmes sectoriels | Pas de page programme dédiée avant Phase 4. Les opportunités portent un champ `programme` (constante TS) qui affiche un badge avec le gradient correspondant. |
| Q22 | Suppression Lexend | Audit à faire en Phase 0 : grep `Lexend` dans `src/**`, `public/**`, `prisma/**` et templates emails. Si dépendance résiduelle (ex: signature email), supprimer ou remplacer. Sinon retirer `next/font/google` du layout root. |
| Q23 | Hotfix sur `dev` pendant la refonte | **Interdit sauf force majeure** (bug sécurité, prod cassée). Si nécessaire : hotfix sur `dev`, puis rebase de `feature/GUIC-169-refonte-design-v2` sur `dev`. Re-tag `pre-refonte-v2.N` à chaque hotfix appliqué. |

### Synthèse — décisions PO requises encore en attente

Aucune. Toutes les questions soulevées par la Phase 1 ont été tranchées par le PO ou par décision tech lead documentée ci-dessus. Phase 0 peut démarrer.
