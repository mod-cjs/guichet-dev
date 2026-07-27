# Spec — Tests E2E Playwright, tous les parcours (GUIC-37 / 153 / 154)

> **Statut : BROUILLON v0 — à raffiner ensemble.** Ne pas coder avant validation.
> Ancrage : routes réelles de `src/app`, infra `playwright.config.ts` (GUIC-604), auth `src/lib/auth/*`.

## 1. Objectif

Garantir **zéro régression** sur les parcours utilisateurs avant chaque mise en production,
via une suite E2E Playwright **complète** (tous les espaces), **déterministe** (pas de faux-vert,
pas de fragmentation inter-tests) et **rapide** (réutilisation de session + tiers @smoke).

GUIC-153 ne liste que 6 parcours ; cette spec couvre **tous** les parcours, triés en
critiques (gate de déploiement) et secondaires (suite complète).

## 2. État des lieux (ce qui existe déjà — ne pas refaire)

- `playwright.config.ts` : 2 webServers (mock SSO port 19999 + Next pointé dessus), secrets
  partagés, 2 projets (chromium desktop + Pixel 5 mobile), `retries:2`/`workers:1` en CI,
  reporter JSON pour le garde-fou « zéro skip ».
- Specs existantes : `auth-flow`, `sso-flow` (anti-régression GUIC-259), `centres-checkin`,
  `centres-reservation`. → à **étendre**, pas à réécrire.
- Mock SSO (`fixtures/mock-sso.ts`) : émet **un seul** utilisateur (`cjs_roles:['beneficiaire']`).
- `docs/e2e-tests.md` : conventions d'exécution.

### Contraintes structurelles (façonnent la stratégie)
1. **Aucune réutilisation de session** → chaque test rejoue le login SSO complet (lent).
2. **Mock mono-rôle** → admin/recruteur/conseiller/staff impossibles sans évolution du mock.
3. **Aucun seeding** + dépendances implicites entre parcours = fragmentation.
4. **Deux auth distinctes** : SSO (`cjs_roles`→`session.roles`) ; staff centre (cookie JWT
   `centre_staff_session`, whitelist `CONSEILLER_STAFF_EMAILS`). Conseiller/recruteur exigent
   en plus un rattachement DB (`AgentCentre` / `Organisation`) pour l'accès « ok ».

## 3. Stratégie d'exécution (optimisation du temps)

1. **Projet `setup` (auth.setup.ts)** : logue chaque identité **une fois**, sauvegarde
   `storageState` par rôle (jeune, recruteur, admin, conseiller) + injecte le cookie staff.
   Les specs déclarent `test.use({ storageState })`. → ~40 logins deviennent 5.
2. **Mock SSO multi-rôles** : paramétrer les claims par sélecteur (login_hint / state) pour
   qu'un seul mock serve les 5 identités ; seeder les lignes DB correspondantes.
3. **Seeding déterministe** (`seed-e2e.ts`, `globalSetup`) : graphe de fixtures à IDs stables
   (users, Organisation, AgentCentre, opportunité publiée, événement, ressource, centre).
   → aucune dépendance de données entre tests (tue la fragmentation).
4. **Tiers** : `@smoke` (golden paths critiques, < 3 min, **chaque PR**) vs suite complète
   (nightly / pré-release). GUIC-154 bloque le déploiement sur `@smoke`.
5. **Viewports ciblés** : tout sur chromium desktop ; **Mobile Chrome uniquement** sur les
   parcours mobile-critiques (bottom-nav jeune, recruteur-mobile) — pas ×2 partout.
6. **Sharding CI** (`--shard`) pour la suite complète ; DB + Redis éphémères (services Docker).
7. **Anti-faux-vert** : flakiness corrigée à la source (leçon `.serial`), jamais masquée ;
   2 runs sur base polluée + parallèle pour prouver la robustesse avant merge.

## 4. Catalogue des parcours

Légende : **[C]** critique (candidat gate `@smoke`) · [S] secondaire · **[!]** note fragmentation/impertinence.

### 4.1 Public (sans auth)
| # | Parcours | Tier | Notes |
|---|---|---|---|
| P1 | Accueil → nav marketing | S | smoke léger |
| P2 | Opportunités : recherche → filtres → détail | **[C]** | conversion + SEO |
| P3 | Agenda public → détail événement | S | |
| P4 | Centres → détail → ressources | S | |
| P5 | Ressources publiques → détail | S | |
| P6 | Pages légales (CGU/confidentialité/mentions) | [!] | **impertinent E2E** → link-check statique |

### 4.2 Auth / SSO (transverse)
| # | Parcours | Tier | Notes |
|---|---|---|---|
| A1 | Connexion SSO → callback → tableau de bord | **[C]** | existe (sso-flow) — étendre |
| A2 | Onboarding complet (profil→objectifs→centre→reco) | **[C]** | premier run |
| A3 | Déconnexion + session expirée | S | existe |
| A4 | Protection des routes par espace | **[C]** | existe (auth-flow) |

### 4.3 Jeune
| # | Parcours | Tier | Notes |
|---|---|---|---|
| J1 | Recherche → détail → **candidature** opportunité | **[C]** | conversion clé ; besoin offre publiée + profil complet |
| J2 | Profil incomplet → blocage → complète → candidate | **[C]** | edge critique |
| J3 | Mes candidatures → suivi statut | S | |
| J5 | Réservation centre (ressource) → mes réservations | **[C]** | recoupe centres-reservation |
| J6 | Inscription événement → mes inscriptions | **[C]** | |
| J4 | Favoris (opportunité + ressource) | S | |
| J7 | Bibliothèque → emprunt → mes emprunts | S | |
| J8 | Ma carte (QR) | S | |
| J9 | Messagerie jeune ↔ recruteur/conseiller | S | |
| J10 | Notifications + paramètres (préférences/consentement) | [!] | **coordonner notif (lead)** |
| J11 | Yaye (chat IA) | [!] | **impertinent** (LLM non déterministe) → mocker ou hors gate |
| J12 | Accessibilité (réglages visuels) | [!] | coordonner GUIC-581 |

### 4.4 Recruteur
| # | Parcours | Tier | Notes |
|---|---|---|---|
| R1 | **Publier une offre** → visible public | **[C]** | GUIC-153 #6 |
| R2 | Candidats → détail → décision (Retenir/Refuser) | **[C]** | recruteur DÉCIDE (cf. feedback rôles) |
| R7 | Onboarding : rôle sans organisation → « attente » | **[C]** | gating d'accès |
| R3 | Entretiens (planifier) | S | |
| R4 | Profil entreprise (éditer) | S | |
| R5 | Modèles emails + envoi groupé | [!] | coordonner notif/email |
| R6 | Messagerie recruteur | S | |

### 4.5 Admin
| # | Parcours | Tier | Notes |
|---|---|---|---|
| Ad1 | **Publier une opportunité** (nouveau→gestion→publier) | **[C]** | GUIC-153 #5 |
| Ad2 | Curation : source→item→approuver→publier | **[C]** | garde l'épic livrée |
| Ad3 | Candidatures : supervise (stats/export/relance, PAS décision) | S | cf. feedback rôles |
| Ad4 | Gestion centres / ressources | S | |
| Ad5 | Gestion événements | S | |
| Ad6 | Gestion utilisateurs (voir/rôles) | S | |
| Ad7 | Types d'opportunité CRUD | S | |
| Ad8 | Matrice notifications | [!] | coordonner notif (lead) |
| Ad9 | Journal d'audit | S | |
| Ad10 | Data hub / analytics | [!] | assert rendu, pas exactitude données |
| Ad11 | Yaye admin (modèle/sessions/escalades) | [!] | LLM → hors gate |

### 4.6 Conseiller
| # | Parcours | Tier | Notes |
|---|---|---|---|
| C0 | Accès : rôle sans rattachement → « attente » | **[C]** | gating |
| C1 | Bénéficiaires : liste → détail | S | |
| C2 | Publications (nouvelle) → publie | S | |
| C3 | Réservations / check-in | S | |
| C4 | Bibliothèque comptoir (emprunt/retour) | S | |
| C5 | Agenda conseiller | S | |
| C6 | Messagerie conseiller | S | |

### 4.7 Centre-staff (auth séparée)
| # | Parcours | Tier | Notes |
|---|---|---|---|
| S1 | Login staff → check-in QR présence | **[C]** | recoupe centres-checkin |
| S2 | Réservations centre (valider) | S | |
| S3 | Bibliothèque catalogue | S | |

## 5. Chaînes cross-espace (valeur métier max, risque fragmentation max)
| # | Chaîne | Tier | Stratégie proposée |
|---|---|---|---|
| X1 | Admin publie → jeune candidate → recruteur décide → jeune voit statut | **[C]** | golden path @smoke (1 test long) |
| X2 | Recruteur publie → jeune candidate → entretien → décision | **[C]** | golden path @smoke |
| X3 | Jeune réserve centre → staff valide check-in | **[C]** | golden path @smoke |
| X4 | Curation veille → admin approuve/publie → jeune candidate | S | segments seedés |

**Règle anti-fragmentation** : chaque segment testable indépendamment sur données seedées ;
les chaînes complètes n'existent que comme quelques golden paths @smoke, jamais comme
dépendances implicites entre fichiers.

## 6. Impertinences (hors gate E2E — justifié)
- Pages légales statiques → link-check.
- Yaye / Yaye admin (LLM non déterministe) → mock LLM ou exclusion du gate.
- Analytics/data-hub → assert rendu, l'exactitude relève de l'intégration.
- Interne moteur notif → déjà couvert unit ; E2E limité à l'UI de config + 1 smoke de livraison.

## 7. Gate @smoke proposé (~11 golden paths, < 3 min)
P2 · A1 · A2 · J1 · J5 · J6 · R1 · R2 · Ad1 · S1 · X1 (+ X2/X3 si budget temps).

## 8. Plan de livraison (TDD, incréments)
1. Socle exécution : mock multi-rôles + `auth.setup.ts` (storageState) + `seed-e2e.ts`.
2. Gate @smoke (§7) — vert et stable (2 runs base polluée + parallèle).
3. Suite complète par espace (secondaires).
4. Chaînes cross-espace.
5. CI `.github/workflows/e2e.yml` (DB+Redis services) — **branchement pipeline coordonné M14**.

## 9. Décisions
- **D2 — VERROUILLÉE : hybride.** Quelques golden paths complets en @smoke + le gros en
  segments indépendants sur données seedées.
- **D3 — VERROUILLÉE : factory E2E dédiée** (`seed-e2e.ts`, IDs stables, isolée du seed de dev).
- **D5 — VERROUILLÉE : curation couverte** (X4/Ad2 = garde E2E). **Notif (J10/Ad8/R5) et
  accessibilité (J12) LAISSÉES à leurs tickets** (GUIC-547 / 581) — pas de doublon.
- D1. Périmètre @smoke (§7) : proposé, à confirmer.
- D4. Impertinences (§6) exclues du gate : proposé, à confirmer.
- D6. CI (GUIC-154) : workflow préparé ici, branchement pipeline en PR séparée coordonnée M14.

## 10. Golden paths détaillés (@smoke) — ancrés sur le code réel

> Sélecteurs et endpoints vérifiés par cartographie du code (agents Explore, 2026-07).
> Bouton SSO canonique : `a[href="/api/auth/login"]` (texte « Continuer avec mon compte CJS »).

### P2 — Recherche opportunité publique (aucun auth)
- **Seed** : ≥3 `Opportunite` `statut='publiee'`, `deletedAt=null`, slugs stables, types/domaines/régions variés.
- **Étapes** : goto `/opportunites` → viewport desktop (les inputs mobile+desktop coexistent → filtrer par visibilité) → taper dans `input[type="search"]` visible (**debounce 300ms** → `waitForResponse('**/api/opportunites*')`) → cocher `#f-type-Stage` → cliquer une carte `[data-testid="opp-card"]`.
- **Assert** : compteur `aria-live` cohérent ; URL `/opportunites/<slug>` (ou interception `@modal`) ; titre visible.
- **Piège** : `remuneration`/`deadline` ne filtrent pas côté serveur (ne pas asserter dessus).

### A1 — Connexion SSO (existe, étendre `sso-flow`)
- **Seed** : reset user `e2e-uid-001`.
- **Étapes** : `/auth/connexion` → clic `a[href="/api/auth/login"]` → mock SSO → callback.
- **Assert** : arrive `/jeune/(onboarding|tableau-de-bord)`, jamais retour `/auth/connexion` ; cookie `cjs_session` httpOnly **SameSite=Lax** (garde GUIC-259).

### A2 — Onboarding complet
- **Seed** : `Utilisateur(cjsUid, onboardingComplete=false)` + plusieurs `Centre` (region/ville).
- **Ordre RÉEL** : `objectifs → profil → centre-principal → recommandations` (⚠️ **inversé vs le ticket**). Scoper `.gj-onboarding-web` (double DOM mobile/web).
- **Étapes** : objectifs → `getByRole('button',{name:'Continuer'})` ; profil → `#web-prenom`, `#web-nom`, selects `Jour/Mois/Année`, genre, région → Continuer (2 PUT `/api/v1/onboarding`) ; centre → `#web-centre-select` → Continuer (`POST /api/profil/centre-principal`) ; recommandations → `getByRole('button',{name:'Aller à mon espace'})` (PUT step 3 → `onboardingComplete=true`).
- **Assert** : redirection `/jeune/tableau-de-bord` ; `ProfilJeune` créé ; `onboardingComplete=true`.

### J1 — Candidature à une opportunité
- **Seed** : `Opportunite(statut='publiee', slug, deadline future)` + `ProfilJeune` COMPLET (`niveauEtude`, `situationEmploi`, `domainesInteret≥1`) + session `prenom/nom/email/telephone/region`.
- **Étapes** : goto `/opportunites/<slug>` (session jeune) → `getByRole('button',{name:'Postuler maintenant'})` → modal `CandidatureModal` → `textarea` lettre **≥300 chars** → cocher consent `#cguId` → `getByRole('button',{name:'Envoyer ma candidature'})`.
- **Assert** : 201 → `SuccessScreen` heading « Candidature envoyée » + `[data-testid="candidature-ref"]` (`CAND-…`) ; `Candidature` en base.
- **J2 (branche profil incomplet)** : même seed SANS `situationEmploi` → POST renvoie **403 `PROFILE_INCOMPLETE`** → redirection `/jeune/candidature/profil-incomplet?opp=…`. Assert checklist visible.
- **Pièges** : bouton « Déjà candidaté » si candidature existe (`GET /api/candidatures`) ; « Se connecter pour postuler » si anonyme (`?postuler=1` rouvre le modal post-login) ; contrainte unique `(cjsUid,opportuniteId)` → 409.

### J5 — Réservation ressource centre (existe `centres-reservation`, réutiliser)
- **Seed** : `seedCentreWithRessource({cjsUid:'e2e-uid-001'})` (horaires ouverts le jour cible, ressource `estActive`, `capacite≥1`).
- **Étapes** : login → `/centres/<slug>/ressources/<id>/reserver` → `input[type="date"]`=demain → slot `button[role="radio"]:not([disabled])` → motif `textarea` **≥20 chars** → `getByRole('button',{name:/envoyer la demande/i})`.
- **Assert** : redirection `/jeune/mes-reservations-centres?created=…` ; statut initial `EnAttente` (salle) ou `Acceptee` (poste).
- **Piège** : `nombrePersonnes>capacite` → 400 ; conflit créneau → 409 `CRENEAU_OCCUPE`.

### J6 — Inscription à un événement
- **Seed** : `Evenement(statut='a_venir', dateDebut/Fin futures, inscriptions<capaciteMax)`.
- **Étapes** : goto `/agenda/<id>` (session jeune) → `getByRole('button',{name:/S'inscrire — c'est gratuit/})` (optimiste, POST `/api/evenements/<id>/inscription`).
- **Assert** : 201 → toast « Inscription confirmée » + pill « Tu es inscrit·e » ; apparaît dans `/jeune/mes-inscriptions` ; `InscriptionEvenement(statut='inscrit')`.
- **Piège** : **capacité non vérifiée côté API** (gate `complet` seulement client/SSR) — ne pas tester le refus API sur capacité.

### R1 — Recruteur publie une offre → ⚠️ DÉPEND de Ad1
- **Seed** : `Utilisateur` recruteur + **`Organisation(cjsUid=recruteur)`** (sinon écran « attente », voir R7).
- **Étapes** : `/recruteur/mes-offres/nouvelle` → champs par `name`/placeholder (**pas de `getByLabel`** : form sans `id`) : `input[name="titre"]`, description, `domaine`, `region`, `deadline` → `getByRole('button',{name:/Soumettre à validation/})`.
- **Assert** : redirection `/recruteur/mes-offres?creee=1` ; offre en base `statut='brouillon'` (le recruteur **ne publie jamais**). La visibilité publique n'arrive qu'après **Ad1**.

### R2 — Recruteur décide sur un candidat
- **Seed** : `Opportunite` du recruteur + `Candidature(statut='En_attente')` + candidat.
- **Étapes** : `/recruteur/candidatures/<id>` (ouverture auto-flip `En_attente→Vue`) → `getByRole('button',{name:'Retenir'})` (ou `Refuser`).
- **Assert** : toast « Candidat retenu. » ; `Candidature.statut='Retenue'` + `pipelineStage='Decision'` ; notif candidat (fail-soft). **Admin n'a AUCUN bouton décision** (assert d'absence côté `/admin/candidatures`).

### Ad1 — Admin publie une opportunité
- **Seed** : session admin + `Opportunite(statut='brouillon', deletedAt=null)` (ex. l'offre de R1).
- **Étapes (voie modération)** : `/admin/opportunites` → `getByRole('button',{name:'Approuver'})` → accepter `window.confirm` (`page.once('dialog',d=>d.accept())`).
- **Voie formulaire** : `/admin/opportunites/nouveau` → `getByLabel` OK (ids présents) → `Statut`=« Publiée (en ligne) » → `getByRole('button',{name:"Créer l'opportunité"})`.
- **Assert** : `statut='publiee'` + `moderePar/modereLe` ; visible sur `/opportunites`.

### S1 — Staff centre check-in QR (existe `centres-checkin`, réutiliser)
- **Seed** : `seedCentreWithRessource` + `seedReservation` (aujourd'hui, `Acceptee`).
- **Auth** : `loginStaffViaCookie(context,{email,centreId})` (bypass whitelist).
- **Étapes** : signer QR JWT (`signQrToken`, secret `JWT_CJS_CARD_SECRET` **encodé brut, non hex**, nonce frais) → `/checkin/v1/<token>` → `getByRole('button',{name:/marquer présent/i}).first()`.
- **Assert** : `getByText(/présent confirmé/i)` ; `reservation.statut='Passee'`.
- **Pièges** : anti-rejeu Redis (nonce 1×/24h → 409 `ALREADY_USED`) ; Redis requis (503 sinon).

### X1 — Chaîne cross-espace (golden path @smoke)
`admin publie Ad1` → `jeune trouve P2 + candidate J1` → `recruteur décide R2` → `jeune voit statut dans /jeune/mes-candidatures`. Un seul test long, données seedées au départ (offre publiée + profil complet).

## 11. Factory de seed E2E (`seed-e2e.ts`, IDs stables)
Graphe minimal couvrant tous les @smoke, indépendant du seed de dev :
- **Users** : `e2e-jeune` (onboardingComplete selon test), `e2e-jeune-onb` (false), `e2e-recruteur`, `e2e-admin`, `e2e-conseiller`, `e2e-candidat`.
- **Rattachements** : `Organisation(cjsUid=e2e-recruteur)`, `AgentCentre(e2e-conseiller)`.
- **Données** : `Centre`+`CentreHoraire`(7j)+`RessourceCentre`(Salle) ; `Opportunite` publiée (slug stable, deadline future) + une `brouillon` (pour Ad1) ; `Evenement` a_venir futur ; `Candidature(En_attente)` pour R2 ; `ProfilJeune` complet pour e2e-jeune.
- **Idempotence** : upsert par id stable + `cleanup()` en cascade (modèle des fixtures existantes `centres.ts`).
- **Réutilise** : `seedCentreWithRessource`, `seedReservation`, `loginStaffViaCookie`, `signQrToken` (déjà dans `tests/e2e/_fixtures/`).

## 12. Mock SSO multi-rôles (évolution de `mock-sso.ts`)
Aujourd'hui : claims figées `['beneficiaire']`. Cible : émettre les claims selon un sélecteur porté par `/oauth/authorize` (ex. `login_hint` mappé → jeu de claims + `cjs_roles`), pour que le projet `setup` logue chaque rôle. Alternative : plusieurs instances. Les rattachements DB (Organisation/AgentCentre) restent seedés en base, pas dans le mock.

## 13. Conditions de validation (oracle par écran) — gate @smoke

> Format par parcours : **Précondition** (seed/état) → pour chaque **écran** : `route`,
> **Données attendues** (ce qui doit s'afficher, avec valeurs), **Conditions** (assertions,
> y compris absences) → **État final** (redirection + effets DB/Redis).
> « Cond. » = assertion vérifiable ; « ∅ » = assertion d'ABSENCE.

### P2 — Recherche opportunité publique
- **Précondition** : ≥3 `Opportunite` publiées (slugs stables ; types/domaines/régions variés) ; pas de session.
- **Écran 1 — `/opportunites`**
  - Données : cartes `[data-testid="opp-card"]` (h3 titre, `[data-testid="type-chip"]`, `[data-testid="deadline-label"]`) ; compteur `aria-live` « {N} opportunité(s) ».
  - Cond. : page charge sans redirection `/auth/connexion` ; compteur = nb de publiées ; chaque carte a un titre non vide + un lien `/opportunites/<slug>`. ∅ aucune carte de statut ≠ publiée.
  - Action : saisir « Développeur » dans `input[type="search"]` visible → attendre `waitForResponse('**/api/opportunites*')` (debounce 300 ms) ; cocher `#f-type-Stage`.
  - Cond. post-filtre : URL contient `q=Développeur` et `type=Stage` ; compteur mis à jour ; toutes les cartes visibles sont de type Stage.
- **Écran 2 — `/opportunites/<slug>`** (clic carte)
  - Données : `h1` = titre cliqué ; fil d'Ariane Accueil / Opportunités / titre ; organisation ; deadline ; CTA « Se connecter pour postuler ».
  - Cond. : URL = `/opportunites/<slug>` (ou interception `@modal`) ; titre affiché = celui cliqué ; CTA login présent. ∅ bouton « Postuler maintenant » (car anonyme).
- **État final** : aucune écriture DB.

### A1 — Connexion SSO (étend `sso-flow`)
- **Précondition** : `resetOnboardingState('e2e-uid-001')` ; mock SSO up.
- **Écran 1 — `/auth/connexion`** : lien `a[href="/api/auth/login"]` (« Continuer avec mon compte CJS ») visible.
- **Écran 2 — `/jeune/(onboarding|tableau-de-bord)`** (après callback)
  - Cond. : URL matche `^/jeune/` ; cookie `cjs_session` présent, `httpOnly=true`, **`sameSite='Lax'`** (garde GUIC-259). ∅ jamais de retour `/auth/connexion` (pas de boucle).
- **État final** : `Utilisateur(e2e-uid-001)` upserté ; tokens en Redis.

### A2 — Onboarding complet
- **Précondition** : `e2e-jeune-onb` (`onboardingComplete=false`) ; ≥1 `Centre` région Dakar. Scoper `.gj-onboarding-web` (double DOM).
- **Écran 1 — `/jeune/onboarding/objectifs`** (1/4) : `role="progressbar"` « Étape 1 sur 4 » ; 5 boutons objectifs `aria-pressed`. Action : sélectionner « Trouver un emploi / stage » → « Continuer ».
- **Écran 2 — `/jeune/onboarding/profil`** (2/4) : `#web-prenom`, `#web-nom`, selects Jour/Mois/Année, genre, région. Action : remplir → « Continuer ». Cond. : 2× `PUT /api/v1/onboarding` → 200.
- **Écran 3 — `/jeune/onboarding/centre-principal`** (3/4) : `#web-centre-select` prérempli. Action : « Continuer ». Cond. : `POST /api/profil/centre-principal` → 200.
- **Écran 4 — `/jeune/onboarding/recommandations`** (4/4) : 3 cartes reco. Action : « Aller à mon espace ».
- **État final** : redirection `/jeune/tableau-de-bord` ; DB : `ProfilJeune` créé, `Utilisateur.onboardingComplete=true`.

### J1 — Candidature à une opportunité
- **Précondition** : session `e2e-jeune` ; `Opportunite` publiée (slug, deadline future) ; `ProfilJeune` COMPLET (`niveauEtude`, `situationEmploi`, `domainesInteret≥1`) ; pas de candidature existante.
- **Écran 1 — `/opportunites/<slug>`** : CTA `getByRole('button',{name:'Postuler maintenant'})` **actif**. Cond. : ∅ « Déjà candidaté », ∅ « Candidatures closes ». Action : clic → ouvre `CandidatureModal`.
- **Écran 2 — `CandidatureModal`** (titre « Postuler — <titre> »)
  - Données : bandeau « Tu candidates avec les infos de ton profil. » ; carte profil ; compteur lettre `aria-live`.
  - Cond. : bouton `Envoyer ma candidature` **désactivé** tant que lettre < 300 car. OU consentement `#cguId` décoché.
  - Action : saisir lettre ≥ 300 car. → cocher `#cguId` → cliquer `Envoyer ma candidature`. Cond. : bouton devient actif avant le clic.
- **Écran 3 — `SuccessScreen`** (même modal)
  - Données : `h*` « Candidature envoyée » ; `[data-testid="candidature-ref"]` matche `/^CAND-/` ; liens « Suivre ma candidature » / « Voir d'autres opportunités ».
  - Cond. : POST `/api/candidatures` → 201 ; réf visible.
- **État final** : `Candidature(cjsUid=e2e-jeune, opportuniteId)` en base (statut par défaut) ; toast « Candidature envoyée ».

### J2 — Candidature bloquée (profil incomplet) [promu si tu veux]
- **Précondition** : identique à J1 mais `ProfilJeune` SANS `situationEmploi`.
- **Écran modal** : mêmes étapes → `Envoyer`. Cond. : POST → **403 `PROFILE_INCOMPLETE`**.
- **Écran `/jeune/candidature/profil-incomplet?opp=…`** : checklist (email, téléphone, niveau, situation, CV) ; CTA « Aller sur mon profil ». Cond. : redirection effective + checklist visible. ∅ `Candidature` créée.

### J5 — Réservation ressource centre (réutilise `centres-reservation`)
- **Précondition** : `seedCentreWithRessource({cjsUid:'e2e-uid-001'})` (horaires ouverts jour cible) ; session jeune.
- **Écran 1 — `/centres/<slug>/ressources/<id>/reserver`**
  - Données : `input[type="date"]` ; radiogroup créneaux ; `textarea` motif.
  - Action : date = demain → slot `button[role="radio"]:not([disabled])` → motif ≥ 20 car. → `getByRole('button',{name:/envoyer la demande/i})`. Cond. : slot dispo cliquable (dans les horaires).
- **Écran 2 — `/jeune/mes-reservations-centres?created=<id>`** : la réservation apparaît.
  - Cond. : URL contient `created=` ; ligne réservation visible ; statut `EnAttente` (Salle) en base.

### J6 — Inscription à un événement
- **Précondition** : session jeune ; `Evenement(statut='a_venir', dates futures, inscriptions<capaciteMax)`.
- **Écran 1 — `/agenda/<id>`** : CTA `getByRole('button',{name:/S'inscrire — c'est gratuit/})`. Cond. : ∅ « Complet », ∅ « Inscriptions fermées ». Action : clic (POST `/api/evenements/<id>/inscription`).
- **Écran (même page)** : pill « Tu es inscrit·e » + bouton « Se désinscrire » ; toast « Inscription confirmée ». Cond. : POST → 201.
- **Écran 2 — `/jeune/mes-inscriptions`** : l'événement apparaît en « à venir ».
- **État final** : `InscriptionEvenement(cjsUid, evenementId, statut='inscrit')`.

### R1 — Recruteur publie une offre (dépend Ad1 pour la visibilité)
- **Précondition** : session `e2e-recruteur` ; `Organisation(cjsUid=e2e-recruteur)` (sinon écran « attente »).
- **Écran 1 — `/recruteur/mes-offres/nouvelle`**
  - Données : toggles Emploi/Stage ; `input[name="titre"]` ; description ; `domaine` ; `region` ; `deadline`. (⚠️ pas de `getByLabel`.)
  - Action : titre, description, deadline → `getByRole('button',{name:/Soumettre à validation/})`.
- **Écran 2 — `/recruteur/mes-offres?creee=1`** : l'offre apparaît en « brouillon / en attente ».
  - Cond. : URL contient `creee=1` ; DB `Opportunite.statut='brouillon'` (recruteur ne publie jamais). ∅ visible sur `/opportunites` (tant que non approuvée).
- **État final** : offre `brouillon` prête pour Ad1.

### R2 — Recruteur décide sur un candidat
- **Précondition** : session recruteur ; `Opportunite` du recruteur + `Candidature(En_attente)` d'un `e2e-candidat`.
- **Écran 1 — `/recruteur/candidatures/<id>`**
  - Données : identité candidat ; badge statut (auto-flip `En_attente→Vue` à l'ouverture) ; boutons `Retenir` / `Refuser`.
  - Action : clic `Retenir`. Cond. : toast « Candidat retenu. » ; bouton devient `Retenu` désactivé + `aria-pressed`.
- **État final** : `Candidature.statut='Retenue'`, `pipelineStage='Decision'`. Contrôle croisé : sur `/admin/candidatures`, ∅ tout bouton de décision (supervision seule).

### Ad1 — Admin publie une opportunité
- **Précondition** : session `e2e-admin` ; `Opportunite(statut='brouillon')` (ex. l'offre de R1).
- **Écran 1 — `/admin/opportunites`** (file modération)
  - Données : l'offre brouillon dans la file ; boutons `Approuver` / `Rejeter`.
  - Action : `Approuver` → accepter `window.confirm` (`page.once('dialog',d=>d.accept())`). Cond. : toast « …publiée. ».
- **Écran 2 — `/opportunites`** (public) : l'offre est désormais visible.
  - Cond. : DB `statut='publiee'` + `moderePar`/`modereLe` renseignés ; carte présente publiquement.

### S1 — Staff centre check-in QR (réutilise `centres-checkin`)
- **Précondition** : `seedCentreWithRessource` + `seedReservation` (aujourd'hui, `Acceptee`) ; `loginStaffViaCookie` ; QR JWT signé (nonce frais).
- **Écran 1 — `/checkin/v1/<token>`**
  - Données : nom du bénéficiaire ; carte réservation « Salle E2E » ; bouton `Marquer présent`.
  - Action : `getByRole('button',{name:/marquer présent/i}).first()`.
- **Écran (même page)** : `getByText(/présent confirmé/i)`.
  - Cond. : POST `/api/v1/checkin/<token>` → 200 ; DB `reservation.statut='Passee'` ; anti-rejeu Redis posé (nonce consommé).
- **État final** : `CheckIn(via:'QrCard')` créé.

### X1 — Chaîne cross-espace (golden path)
Enchaîne, dans un seul test (états seedés au départ) : **Ad1** (admin publie l'offre brouillon de R1) → **P2/J1** (jeune trouve puis candidate) → **R2** (recruteur retient) → écran `/jeune/mes-candidatures` : la candidature apparaît avec statut « Retenue ».
- Cond. finale : cohérence bout-en-bout des statuts (offre `publiee`, candidature `Retenue`) visibles dans chaque espace.

## 14. Oracle parcours secondaires (grain champ par champ)

> Assemblé depuis la cartographie code (agents Explore). Libellés cités verbatim ; sélecteurs = DOM réel.
> Format identique au §13. En cours d'assemblage (7 clusters).

### J9 — Messagerie (jeune)
- **Précondition** : session jeune ; ≥1 `Conversation` (candidatUid/recruteurUid = cjsUid) + `Message`. Pages `force-dynamic`.
- **Écran 1 — `/jeune/messagerie`** : `h1` « Messagerie » · sous-titre « Vos échanges avec les recruteurs » · items triés `updatedAt` desc : `Link href="/jeune/messagerie/{id}"` avec avatar initiales, `interlocuteurNom` (font-black si `nonLus>0`), date `frDate` (jj/mm), `offreTitre`, `dernierMessage` tronqué, pastille `nonLus` (si >0), `Icon chevron-right`.
  - Cond. : ∅ items → « Aucune conversation. » · `nonLus=0` → pas de pastille ni gras.
  - Action : clic `a[href="/jeune/messagerie/{id}"]`.
- **Écran 2 — `/jeune/messagerie/[id]`** : retour « Messagerie » (chevron-left) · `h1`=`interlocuteurNom` · « À propos de « {offreTitre} » » · bulles (`corps` pre-line + `frDateTime` jj/mm hh:mm ; `deMoi`→droite teal). `Composer` : `textarea[placeholder="Écrire un message…"]` required maxLength 5000 + `button` « Envoyer ».
  - Cond. : ∅ messages → « Aucun message. Écrivez le premier. » · `getConversation` null → 404 · au load `marquerConversationLue`.
  - Action : saisir + « Envoyer » → `envoyerMessage` → nouveau `Message`, textarea vidé, `router.refresh()`.

### J10 — Notifications + préférences (jeune) — [coordination notif, mais listé]
- **Précondition** : session jeune. Pages `force-dynamic`.
- **Écran 1 — `/jeune/notifications`** : root `[data-testid="notifications-client"]` · `h1` « Notifications » · sous-titre « Retrouvez ici les messages du Guichet, vos rappels et les mises à jour de vos candidatures. » · `[data-testid="unread-counter"]` = « {n} non lue(s) » ou « Tout est à jour » · bouton « Tout marquer lu » (`aria-label="Tout marquer comme lu"`, `disabled` si 0) · `role="tablist"` onglets « Toutes/Deadlines/Candidatures/Messages/Yaye » (pastille count si >0) · groupes par jour `section[aria-label=jour]` `h2` jour · lignes `button[aria-label="{titre}"|"(non lue)"]` avec `[data-testid="unread-dot"]` si non lu, tuile icône (Yaye→« Y »), `titre` (800), `contenu` (2 lignes), `metaPill`, `ageRelatif`.
  - Cond. : ∅ → `EmptyState` « Aucune notification » (desc selon onglet) · pastille onglet omise si 0.
  - Action : clic ligne → `markRead` (POST `/api/notifications/{id}/lu`) + `router.push(lien)` ; onglet = filtre client ; « Tout marquer lu » → POST `/api/notifications/lu-all`.
- **Écran 2 — `/jeune/parametres/notifications`** : `h1` « Préférences de notification » · sous-titre (« …in-app toujours actives ; activez WhatsApp, SMS ou e-mail… ») · liste canaux ordre `in_app, whatsapp, sms, email` : libellés « Dans l'application »/« WhatsApp »/« SMS »/« E-mail » + desc ; `in_app` → badge « toujours actif » + « Activé » (pas de switch) ; autres → `button[role="switch"][aria-label="Recevoir par {label}"]`.
  - Action : toggle switch → `setChannelPreference` → Toast « Canal {label} activé/désactivé. » (revert sur échec).

### J11 — Yaye (chat IA) — [impertinent gate : LLM non déterministe]
- **Précondition** : session jeune (`prenom`). État React-local.
- **Écran unique — `/jeune/yaye`** : header retour `Link[aria-label="Retour"]`→`/jeune/tableau-de-bord`, `YayeAvatar`, « Yaye » + « Conseillère IA » · `role="log"` bulles · quick-replies · `form[aria-label="Envoyer un message à Yaye"]` : `input[aria-label="Message"][placeholder="Pose une question à Yaye"]` + `button[aria-label="Envoyer"]` (disabled si vide).
  - ⚠️ **À mocker** : `pickGreeting`/`pickSuggestions` (Math.random), `fetchYayeHistory` (→ `[]`), `streamYaye` (LLM Vertex), horloge (`new Date`), timers. SSR déterministe (`rng=0`) : greeting « Bonjour{ Prénom}. Je suis Yaye… », replies « Une offre pour moi »/« Une formation »/« Mes candidatures ».
  - Action : saisir + « Envoyer » → `sendMessage`. Fallback erreur : « Oups, j'ai eu un souci de mon côté… ».

### J12 — Accessibilité (jeune) — [coordination GUIC-581, mais listé]
- **Précondition** : session jeune. Défauts `A11Y_DEFAULTS` (`text:'m'`, bools false).
- **Écran unique — `/jeune/accessibilite`** : `h1` « Inclusion & accessibilité » · sous-titre · section « Taille du texte » : 4 boutons `aria-pressed` Petit/Normal/Grand/Très grand (`s/m/l/xl`) · « Vision » : switches « Contraste élevé »/« Niveaux de gris »/« Réduire les animations »/« Espacement du texte » · « Lecture & compréhension » : « Mode FALC » · « Navigation » : « Navigation clavier renforcée » · bouton « Tout réinitialiser ».
  - Cond. : exactement un `aria-pressed=true` sur la taille (défaut « Normal ») ; switches reflètent `prefs[key]` ; toggle pose data-attr html (`data-contrast="high"`, `data-falc="on"`…). Pas d'état erreur (best-effort).
  - Action : clic bouton taille → `change('text',key)` ; toggle switch `aria-label` → `change(key,next)` → `modifierPrefsAccessibilite`. État final : `ProfilJeune.prefsAccessibilite` persisté.

### R3 — Entretiens (recruteur)
- **Précondition** : session recruteur + Organisation ; ≥1 candidature pour activer le form.
- **Écran 1 — `/recruteur/entretiens`** : `h1` « Entretiens » · sous-titre « {N} à venir » · bouton « Planifier un entretien » (si candidats>0) sinon encart « Recevez d'abord des candidatures pour planifier un entretien. » · ∅ entretiens → « Aucun entretien planifié. » · sections `h2` « À venir » / « Passés / annulés » · lignes : lien vers candidature, `candidatNom`, méta `date fr-FR · mode · lieu`, `offreTitre`, badges `Annulé/Terminé/Passé`, boutons `Terminé`+`Annuler` (si à venir).
  - Form (`Nouvel entretien`) : `select[name="candidatureId"]` (« Choisir un candidat… »), `input[name="dateHeure"][type="datetime-local"]`, `select[name="mode"]` (Visio/Présentiel/Téléphone, défaut Visio), `input[name="lieu"]`, `textarea[name="notes"]`, submit « Planifier ».
  - État final : `planifierEntretien` → `Entretien(Planifie)`, `Notification` candidat « Entretien planifié », audit `entretien.plan`, Toast « Entretien planifié — le candidat est notifié. ». Terminer/Annuler → `majStatutEntretien` (updateMany scoped `recruteurUid`, 0→`NOT_FOUND`).

### R4 — Profil entreprise (recruteur)
- **Précondition** : session recruteur + Organisation.
- **Écran 1 — `/recruteur/profil-entreprise`** : en-tête lecture seule (logo/initiale, `h1`=`org.nom`, badge « Partenaire vérifié »/« Non vérifié », compteur « {N} offre(s) », note « Le nom et le statut de vérification sont gérés par l'administration CJS. ») · form 2 cartes : `Présentation` (`RichTextEditor[name="description"]`) ; `Coordonnées` (`select[name="secteur"]`, `select[name="region"]`, `input[name="adresse"]`, `input[name="telephone"]`, `input[name="email"][type=email]`, `input[name="siteWeb"][type=url]`, `input[name="logoUrl"][type=url]`) + submit « Enregistrer » · carte Meet (badges Connecté/Expiré/Non connecté/Non configuré).
  - Cond. : `nom`/`estVerifie` non éditables (strippés serveur) · ∅ org → « Aucune organisation associée à votre compte. » (mais layout intercepte avant).
  - État final : `modifierProfilEntreprise` (Zod email/URL/enums), Toast « Profil enregistré. » / « Vérifiez les champs (email / URLs). ».

### R5 — Modèles emails + envoi groupé (recruteur) — [coordination email]
- **Précondition** : session recruteur ; templates `pipeline.*`.
- **Écran 1 — `/recruteur/modeles-emails`** : `h1` « Modèles d'emails » + sous-titre · `Tabs` « Modèles » | « Historique des envois » (badge count).
  - Onglet Modèles : cartes template (`nom`, badge `Défaut/Système/Personnalisé`, `cle`, « Consulter / Modifier ») → panneau : input Sujet (sans name → cibler via `label:has-text("Sujet")`), `RichTextEditor` Corps, variables cliquables `{{prenom}}`…, boutons « Enregistrer »/« Aperçu »/« Réinitialiser » (si source Personnalisé). Toasts « Template enregistré. »/« Template réinitialisé — rechargez… ».
  - Onglet Historique : ∅ → « Aucun email envoyé pour l'instant… » ; sinon table colonnes « Date · Modèle · Candidat · État » (badges Envoyé/Échec/Nouvel essai), pagination « Page p / tot · N envois ».
- **Écran 2 — envoi groupé (`/recruteur/candidatures`)** : checkboxes `input[aria-label^="Sélectionner "]`, toolbar `role="toolbar"[aria-label="Actions groupées"]` → bouton « Email » → `dialog[aria-label="Envoyer un email aux candidats sélectionnés"]` : select Modèle, textarea Complément, submit « Envoyer ({n}) ».
  - État final : `envoyerEmailGroupe(ids,cle,complement)` (Zod 1..100, ownership), `alert` « Emails : {n} envoyé(s), {n} sans adresse, {n} échec(s). ». Erreur `NOTIFICATIONS_DISABLED` → « Envois désactivés (NOTIFICATIONS_ENABLED). ».

### R6 — Messagerie (recruteur)
- Symétrique à J9 (composant `views.tsx`), accent bleu. `/recruteur/messagerie` : `h1` « Messagerie » + « {N} conversation(s) », ∅ → « Aucune conversation. ». `/recruteur/messagerie/[id]` : `h1`=`interlocuteurNom`, « À propos de « {offreTitre} » », bulles, `Composer` « Écrire un message… »/« Envoyer ». `getConversation` null → 404 ; `marquerConversationLue` au render.

### R7 — Gating recruteur sans organisation → attente
- **Précondition** : rôle recruteur SANS Organisation liée.
- **Écran — `EspaceEnAttente espace="recruteur"`** (remplace tout le layout, pas de nav) : `main#main` centré · `h1` « Compte recruteur en attente de liaison » · détail « Votre compte porte bien le rôle recruteur, mais il n'est pas encore lié à une organisation. Un administrateur CJS doit effectuer cette liaison… » · aide « Besoin d'aide ? Contactez votre administrateur CJS. » · lien `a[href="/"]` « Retour à l'accueil ».
  - Cond. : ∅ sidebar/topbar/bottom-nav · dès qu'un admin lie l'`Organisation`, accès `ok` au rechargement.
  - (Variante `conseiller` : `h1` « Compte conseiller en attente de rattachement », mentionne « rattaché à un centre ».)

### P1 — Accueil public
- **Précondition** : anonyme (si session → `redirect` vers dashboard/onboarding).
- **Écran — `/`** : Header marketing (logo `img[alt="Guichet Jeunesse"]`, nav « Accueil/Opportunités/Agenda/Ressources/Centres CJS » + externes « YEAH »/« E-learning », CTA `link` « Se connecter »→`/auth/connexion`) · hero `h1` (« Trouve ta prochaine opportunité. » mobile / « Ton avenir, commence ici. » web) · stats « 22 695 » Jeunes inscrits / « 1 240 » Opps actives / « 14 » Régions / « 9 » Centres CJS · `h2` « Tout pour ton parcours » + 4 cartes (« Opportunités »/« Agenda »/« Ressources »/« Centres CJS »).
  - Cond. : « Se connecter » visible · exactement 4 cartes section · ∅ UserMenu/avatar · ∅ BottomNav (public).

### P3 — Agenda public
- **Écran 1 — `/agenda`** : `h1` « Agenda & événements » · sous-titre « {total} à venir · … » · filtres Type (radios « Tous/Ateliers/Forums emploi/Formations/Webinaires/Conférences ») + Quand · tabs « Liste »/« Calendrier » · recherche `[aria-label="Rechercher un événement"]` · compteur `aria-live` « {n} événement(s) à venir » · cartes (date jour+MOIS, pill « Gratuit », badge type mappé, titre lien `/agenda/[id]`, CTA « Se connecter »/« S'inscrire »/« Inscrit·e »).
  - Cond. : ∅ items → EmptyState « Aucun événement trouvé » · lien « Mes événements » absent si anonyme.
- **Écran 2 — `/agenda/[id]`** : breadcrumbs · hero (date, badge type brut, `h1` titre, heure HH:MM, lieu) · `h2` « À propos » · `dl` « Informations pratiques » (Date/Horaire/Lieu/Capacité) · aside CTA (`EvenementInscriptionCta` : « Inscriptions fermées »/« Complet »/« Se connecter pour s'inscrire »/« S'inscrire — c'est gratuit »/« Se désinscrire » + « Tu es inscrit·e »).
  - État final : POST/DELETE `/api/evenements/{id}/inscription` (optimiste).

### P4 — Centres
- **Écran 1 — `/centres`** : `h1` « Centres CJS » · sous-titre « {n} centres… » · map + légende « Mon centre »/« Autres centres » · filtre région `radiogroup` · `[data-testid="centres-count-header"]` « {n} centres » · lignes/cartes (`role="button"` « Voir le centre {nom} », badge « Mon centre »/« Mien » si `data-mine="true"`, statut Ouvert/Fermé, horaire, services). ∅ centres → « Aucun centre disponible » ; filtre vide → « Aucun centre trouvé ».
- **Écran 2 — `/centres/[slug]`** : back « Tous les centres » · hero (`[data-testid="hero-eyebrow"]` « Mon centre · {region} » si isMine, `h1` nom, chips open/conseillers/ville, CTA « Prendre RDV »/« Itinéraire ») · `h2` « Ressources réservables » + teasers `[data-testid="ressource-teaser"]` (« Réserver ») · aside `CentreHoursTable` (`h3` « Horaires », 7 jours) + `h3` « Contact ».
- **Écran 3 — `/centres/[slug]/ressources`** : breadcrumb · `h1` « Ressources réservables » · filtre type `radiogroup` (Toutes/Salles/Véhicules/Postes info) · cartes `[data-testid="ressource-card"]` (nom, pill « Gratuit », meta « {typeLabel} · {capacite} {unit} », « Justif requis » si requis, « Réserver »→reserver). ∅ → « Aucune ressource disponible pour ce filtre. ».

### P5 — Ressources
- **Écran 1 — `/ressources`** : `h1` « Bibliothèque de ressources » · recherche (debounce 300ms) · chips type `group` (Toutes/PDF/Vidéos/Liens/Guides/Outils) · `[data-testid="results-count"]` « {n} résultat(s) » · cartes (lien « Voir la ressource : {titre} », badge type, `[data-testid="ressource-favori-btn"]` aria-pressed, CTA par type Télécharger/Regarder/Ouvrir/Lire/Utiliser) · « Charger plus ». ∅ → « Aucune ressource trouvée ».
  - Favori : `POST /api/ressources/{id}/favori` (401→`/auth/connexion`).
- **Écran 2 — `/ressources/[id]`** : breadcrumbs · hero `[data-testid="ressource-detail-hero"]` (badges type/niveau/langue, `h1` titre, thème·catégorie, « {vues} vue(s) ») · `[data-testid="ressource-consult-cta"]` (label par type) · `[data-testid="ressource-detail-favori"]` · related. État final : `incrementRessourceVues` au render.

### A3 — Déconnexion + session expirée
- **Écran — `/auth/deconnexion`** : pending « Déconnexion en cours… » → done (check + `h1` « Vous êtes déconnecté » + « Redirection vers l'accueil… »).
  - Auto : `POST /api/auth/logout` (CSRF origin/referer sinon 403) → révoque token SSO + session Redis + `clearTokens`, efface `cjs_session`, pose `force_login=1`, redirige `/` ; client hard-reload après 1.5s.

### A4 — Protection des routes par espace (middleware)
- Patterns protégés : `/jeune/*` (rôles bénéficiaire/jeune/chercheur_d_emploi), `/recruteur/*` (`isRecruteurRole`), `/admin/*` (ADMIN_ROLES), `/conseiller` (auth-only, D2).
  - Non authentifié sur route protégée → `redirect('/auth/connexion')` + cookie `auth_return_to=pathname+search` (httpOnly, lax, 600s). Publics jamais redirigés.
  - Session révoquée (Redis) → connexion + suppression `cjs_session`. Mauvais rôle → `roleHome(roles)` sinon `/auth/connexion?error=no_role`. Bénéficiaire onboarding incomplet → `/jeune/onboarding`. Token proche expiration (<300s) → refresh silencieux SSO.

### J3 — Mes candidatures
- **Précondition** : session jeune ; `Candidature` (`orderBy soumiseA desc`). Mapping statut→step : `En_attente→Envoyee`, `Vue→EnRevue`, `Retenue/Refusee→Decision`.
- **Écran 1 — `/jeune/mes-candidatures`** : `h1` « Mes candidatures » · sous-titre « Suivi de vos candidatures aux opportunités » · `[data-testid="candidatures-counter"]` « {n} dossier(s) » · chips `[data-testid="candidatures-filter-chips"]` (Toutes/Brouillon/Envoyée/En revue/Entretien/Décision, `data-filter`) · `ul[data-testid="candidatures-list"]` · cartes (`[data-testid="candidature-tile"]`, Tag type, `[data-testid="candidature-status-pill"]` « Acceptée/Refusée/Brouillon/Envoyée/En revue/Entretien/En attente décision », `h3` titre, org, « Envoyée le {d MMMM yyyy} ») · stepper `role="progressbar"` 5 segments `[data-testid="stepper-segment-*"]` (`data-state`) · bloc contextuel `[data-testid="candidature-contextual-block"]` · CTA « Voir le détail → ».
  - Cond. : ∅ global → EmptyState « Pas encore de candidature » ; ∅ filtre → `[data-testid="candidatures-empty-filter"]` « Aucune candidature à cette étape… ». ⚠ steps Brouillon/Entretien = dead-path (schéma 4 statuts) → badges 0.
- **Écran 2 — `/jeune/mes-candidatures/[id]`** : breadcrumbs · hero (`[data-testid="detail-status-pill"]` « Envoyée/En revue/Retenue/Non retenue », `[data-testid="detail-title"]`, « Soumise le {date} ») · stepper · `h2` « Ma candidature » (`[data-testid="detail-lettre"]`, `[data-testid="detail-cv-link"]` « Voir le CV (PDF) »/`detail-cv-empty` « Aucun CV joint. ») · `h2` « Échanges » · `[data-testid="detail-cta-opportunite"]` + `[data-testid="detail-cta-withdraw"]` (si `En_attente`, stub UI).
  - Cond. : `loadCandidatureDetail(id,cjsUid)` → 404 si autrui ; `robots noindex`, titre neutre.

### J4 — Favoris
- **Écran 1 — `/jeune/mes-favoris`** : `h1` « Mes favoris » · sous-titre « Les opportunités que vous avez sauvegardées » · lien « Voir mes ressources favorites → » · chips type `tablist` · grille `OppCard`. Loading → 4 SkeletonCard ; erreur → « Impossible de charger vos favoris… » ; ∅ → EmptyState « Aucun favori ».
  - Action : bouton `aria-pressed`/`aria-label="Retirer des favoris"` → `DELETE /api/favoris/{id}` (optimiste, rollback si échec).
- **Écran 2 — `/jeune/mes-favoris/ressources`** : back « ← Mes favoris (opportunités) » · `h1` « Mes ressources favorites » · grille `ResourceCard` (`[data-testid="ressource-favori-btn"]` → `POST /api/ressources/{id}/favori`). ∅ → « Aucune ressource favorite ».

### J7 — Bibliothèque
- **Écran 1 — `/jeune/bibliotheque`** : `h1` « Bibliothèque » · form GET `#biblio-q[name="q"]` + `#biblio-theme[name="theme"]` (THEMES) + « Rechercher »/« Effacer » · compteur « {n} livre(s) trouvé(s) » · grille `BookCard` (lien `/jeune/bibliotheque/{id}`, badge « {dispo}/{total} »). ∅ → EmptyState « Aucun livre trouvé ».
- **Écran 2 — `/jeune/bibliotheque/[id]`** : `h1` titre · pills thème/niveau/langue · « ISBN : … » · dispo « {n} exemplaire(s) disponible(s) » · `h2` « Résumé » · `h2` « Où trouver ce livre » + emplacements + `EmpruntButton` (« Emprunter » → `POST /api/bibliotheque/emprunts` → « Emprunt initié — présente ton badge… »). 404 si LIVRE_NOT_FOUND.
- **Écran 3 — `/jeune/bibliotheque/mes-emprunts`** : `h1` « Mes emprunts » · cartes (statut « À retirer au centre/En cours/En retard/Rendu/Annulé », « Retour prévu : {date} »). ∅ → « Aucun emprunt en cours ».

### J8 — Ma carte
- **Écran — `/jeune/ma-carte`** : `h1` « Ma carte CJS » · `CJSCardFlip` `role="button"` (« Voir le dos de la carte CJS ») recto (« Carte CJS », « Membre actif », nom, matricule `GJS · XX · ABCDEF`, QR, « QR valide · expire le {date} ») / verso (« VERSO · CARTE CJS », Conditions, QR `/checkin/v1/{token}`) · `[data-testid="qr-status"]` aria-live (« Génération du QR… »/« QR valide encore {n} min ») + « Rafraîchir » · `[data-testid="ma-carte-wallet-btn"]` (disabled) + partage · `h2` « Tes derniers usages » (`[data-testid="mes-usages-grid"]` ou empty « Aucun usage pour le moment »).
  - Cond. : mount `POST /api/v1/track` + `GET /api/cjs-card/qr-token` (auto-refresh). Lecture seule.

### Ad2 — Curation (garde de l'épic)
- **Écran 1 — `/admin/curation`** : `h1` « File de curation » · onglets « À valider/En attente/Approuvées/Rejetées » · filtres `#filtre-source`/`#filtre-type`/`#filtre-score` · colonnes « Opportunité·Source·Organisation·Type·Score·Détecté » · ligne (titre, badge « Publiée » si approuvee+opportuniteId, score « {n}% », date). ∅ → « Aucune opportunité dans cet onglet. » · pagination 20.
- **Écran 2 — `/admin/curation/[id]`** : back « ← Retour à la file » · `h1` « Valider l'opportunité » · form `#c-titre`/`#c-desc`/`#c-org`/`#c-region`/`#c-domaine`/`#c-type`/`#c-deadline`/`#c-lien` + `#c-motif` · boutons « Approuver »/« Rejeter »/« Mettre en attente »/« Publier vers le catalogue » (si approuvée sans opp).
  - État final : approuver garde titre+typeId (`updateMany statut in [a_valider,en_attente]`→approuvee, audit `curation_item.approve`) ; rejeter motif requis + repromotion doublon ; publier → `Opportunite` brouillon (claim atomique).
- **Écran 3 — `/admin/curation/monitoring`** : `h1` « Monitoring de la curation » · bandeau alertes `role="alert"` (« Erreurs répétées »/« Chute à zéro — sélecteurs à revoir ») · table « Source·Rapportées·Approbation·Rejet·Erreurs·Dernière vérif. ». ∅ → « Aucune source configurée. ».

### Ad3 — Candidatures (supervision, lecture seule)
- **Écran — `/admin/candidatures`** : `h1` « Candidatures » · sous-titre « {total} candidatures · Taux de placement {x} % » (+ « {n} à relancer » rouge) · `a` « Exporter (CSV) »→`/api/admin/candidatures/export` · recherche `[name="q"]` · chips « Tous/En attente/Vue/Retenue/Refusée » · table « Candidat·Opportunité·Statut·Soumise » (liens fiche/aperçu, badge « À relancer » si >14j). ∅ → « Aucune candidature trouvée. ».
  - **Cond. décisive : ∅ tout bouton de décision** (read-only confirmé). Seules actions : recherche, filtres, export, drill-down.

### Ad4 — Gestion centres / ressources
- **Écran 1 — `/admin/centres`** : `h1` « Centres CJS » · « Ajouter un centre » · table « Centre·Jeunes·Agents·Actions » · actions Ressources/`aria-label="Modifier"`/`aria-label="Supprimer"`. Suppr → `confirm` ; blocage `CENTRE_NON_VIDE` (« …des jeunes ou agents y sont rattachés. »). Modal `CentreFormModal` (`#centre-nom`/`#centre-region`/`#centre-adresse`/`#centre-latitude`/`#centre-longitude`/`#centre-telephone` pattern `\+221[0-9]{9}`/`#centre-responsable`/`#centre-ville`/`#centre-statut`).
- **Écran 2 — `/admin/centres/[id]/ressources`** : back « Retour aux centres » · `h1` « Ressources — {nom} » · « Nouvelle ressource » · cartes (badge type « Salle/Véhicule/Poste info/Équipement/Atelier récurrent », « Capacité … · créneau … min »). Modal `RessourceCentreFormModal` (`#rc-type`/`#rc-nom`/`#rc-desc`/`#rc-capacite`/`#rc-unit`/`#rc-duree`/`#rc-justif`/`#rc-active`). Suppr blocage `RESSOURCE_NON_VIDE`.

### Ad5 — Gestion événements
- **Écran 1 — `/admin/evenements`** : bandeau « Publications à valider ({n}) » (« Valider »/« Refuser ») · `h1` « Événements » · « Ajouter un événement » · chips « Tous/À venir/En cours/Terminé/Annulé » · table « Événement·Date·Lieu/Centre·Inscrits·Statut » (`StatutPill`). Modal `EvenementFormModal` (`#ev-titre`/`#ev-description`/`#ev-type`/`#ev-date`/`#ev-datefin`/`#ev-lieu`/`#ev-centre`/`#ev-capacite`/`#ev-gratuit`/`#ev-statut`). Suppr blocage `EVENEMENT_AVEC_INSCRITS`.
- **Écran 2 — `/admin/evenements/[id]`** : `h1` titre + statut · « Exporter les participants » · 4 stats (Inscrits/Présents/Liste d'attente/Taux de remplissage) · `h2` « Participants ({n}) » + `PresenceToggle` (`aria-label="Marquer présent/absent"` → `marquerPresenceEvenement`). ∅ → « Aucun inscrit pour le moment. ».

### Ad6 — Gestion utilisateurs
- **Écran 1 — `/admin/utilisateurs`** : `h1` « Utilisateurs » · recherche `[name="q"]` · chips « Tous/Actif/Inactif/Anonymisé » · table « Utilisateur·Rôle·Centre/Commune·Statut » (rôle RÉEL via `deriveRole`, lien fiche). ∅ → « Aucun utilisateur trouvé. ».
- **Écran 2 — `/admin/utilisateurs/[cjsUid]`** : back « Utilisateurs » · en-tête (nom, badge rôle, « Membre depuis {date} ») · carte « Coordonnées » · carte « Profil » (complétude, « Profil non renseigné… » sinon) · « Activité » (stats) · **`RolesRattachementsSection`** `h2` « Rôles & rattachements » : carte « Rattachements centre » (`#rattachement-centre`/`#rattachement-role` + « Rattacher », retirer avec `confirm`) + carte « Organisation » (`#liaison-organisation` + « Lier » / `#creation-organisation` + « Créer »).
  - Cond. : `AdminUserDetail` lecture seule ; `auditPiiAccess` journalisé. Toasts « Rattachement ajouté… »/« Organisation liée… ». Le rôle SSO lui-même n'est jamais modifié ici.

### Ad7 — Types d'opportunité (CRUD)
- **Écran — `/admin/types-opportunite`** : `h1` « Types d'opportunité » · « Nouveau type » · table « Type·Bouton·Fichier·Décision·Opp.·Statut·Actions » (toggle « Actif/Inactif » `aria-pressed`). ∅ → « Aucun type d'opportunité défini. ». Modal `TypeFormModal` (`#type-libelle`/`#type-slug` (disabled édition)/`#type-action`/`#type-file`/`#type-filelabel`/`#type-decision`/`#type-ordre`/`#type-actif`). Suppr blocage `TYPE_NON_VIDE` → `alert` « Impossible de supprimer … Désactive-le plutôt… » ; slug dup → « Ce slug existe déjà… ».

### Ad8 — Matrice notifications [coordination notif — UI seulement]
- **Écran — `/admin/notifications`** : `h1` « Centre de notifications » · tabs « Configuration/À valider ({n})/Templates/Historique ».
  - Configuration (`AdminNotificationsMatrix`) : cartes par module (`h2` « Comptes/Opportunités/… ») ; par event×rôle : label, pills rôle/`critique`/`personnalisé`, `radiogroup` mode « Auto/Validation/Différé » (+ délai min si differe), 4 `switch` canaux (`in_app,whatsapp,sms,email` = App/WhatsApp/SMS/Email). Garde : couper in_app d'un event critique refusé → toast « Événement critique : l'in-app reste toujours actif. ».
  - À valider : cartes occ + « Valider l'envoi »/« Rejeter » (`confirm`). ∅ → « Aucune notification en attente de validation. ».
  - Historique : filtres « Tous/Notifications/Mailings recruteur » · table « Date·Événement·Destinataire·Canal·Statut » (pills « Envoyée/À valider/Planifiée/Nouvel essai/Abandonnée/Rejetée »).

### Ad9 — Journal d'audit
- **Écran — `/admin/journal-audit`** : `h1` « Journal d'audit » · sous-titre (traçabilité) · `ol` items (`{actor}` + actionText mappé ex. « a consulté une fiche bénéficiaire », « a approuvé une publication » + targetText + date fr-FR). ∅ → « Aucun événement d'audit pour l'instant. ». Lecture seule.

### Ad10 — Data-hub / analytics [assert rendu, pas exactitude]
- **`/admin/data-hub`** : `h1` « Statistiques & rapports » · export Utilisateurs/Opportunités · 4 `StatCard` (« Inscriptions cumulées »/« Candidatures par mois »/« Comptes par rôle »/« Inscriptions par région », « — » si vide).
- **`/admin/analytics/centres`** : `h1` « Fréquentation Centres » · filtres période/`#from`/`#to`/`#centre` · 4 KPI (Accès par QR/Part QR/Accès manuels/Total) · charts « Accès par QR par jour »/« Top 5 centres »/« QR vs saisie manuelle ».
- **`/admin/analytics/evenements`** : `h1` « Analytics Événements » · 4 KPI · charts par mois/type/statut.
- **`/admin/analytics/yaye`** : `h1` « Métriques conversationnelles — Yaye » · YQS + 5 couches (Opérationnel/Efficacité/Qualité(juge LLM)/Résultat/Satisfaction). ⚠ couche Qualité/YQS/régression = LLM/cron → asserter sections/labels, **pas** les valeurs.

### Ad11 — Yaye admin [config + LLM]
- **`/admin/yaye/modele`** : `h1` « Modèle IA » · 3 Select `#model-agent`/`#model-judge`/`#model-adequation` · « Guide des modèles » · « Enregistrer » (`PUT /api/admin/ia/config`). ⚠ sélection modèle LLM (config `LlmConfig`).
- **`/admin/yaye/sessions`** (+`[sessionId]`) : `h1` « Sessions Yaye »/« Session Yaye » · filtres dates/rôle/centre/recherche · chips canaux/escaladées/erreur/drapeau · table « Utilisateur·Canal·Intention·Tours·Durée·Début/état ». Détail : verbatim + notes juge (⚠ non déterministes → asserter structure). ∅ → « Aucune session sur cette période. ».
- **`/admin/yaye/escalades`** : `h1` « Escalades Yaye » · chips statut · table « Utilisateur·Raison/stade·Signalée·Statut·Action » · boutons « Prendre en charge »/« Marquer résolue »/« Rouvrir » (`PATCH /api/admin/yaye/escalades/{id}`). ∅ → « Aucune escalade… ».

### C0 — Accès conseiller sans rattachement → attente
- **Précondition** : session rôle `conseiller` SANS `AgentCentre` (`getConseillerContext`=null) → `resolveConseillerAccess`='attente'.
- **Écran — `/conseiller`** (`EspaceEnAttente espace="conseiller"`) : `h1` « Compte conseiller en attente de rattachement » · détail « Votre compte porte bien le rôle conseiller, mais il n'est pas encore rattaché à un centre… » · aide « Besoin d'aide ? Contactez votre administrateur CJS. » · lien `a[href="/"]` « Retour à l'accueil ».
  - Cond. : ∅ sidebar/topbar/bottom-nav ; ni rôle ni rattachement → `redirect('/')` ; pas de session → `/auth/connexion`.

### C1 — Bénéficiaires (annuaire + fiche)
- **Précondition** : session + `getConseillerContext` non nul.
- **Écran 1 — `/conseiller/beneficiaires`** : `h1` « Bénéficiaires » · sous-titre « {n} jeune(s) rattaché(s) à {centreNom}. » · recherche `[name="q"]` · filtres `group` « Tous/Actifs/À compléter » · `a` « Exporter » · table « Bénéficiaire·Commune·Dernière visite·Profil·Statut » (lignes = `Link` vers fiche, `ProfilRing`, `StatutPill`). ∅ → EmptyState « Aucun bénéficiaire » / « Aucun résultat » (si q).
- **Écran 2 — `/conseiller/beneficiaires/[cjsUid]`** (PII, scope centre → 404 hors périmètre) : back « Bénéficiaires » · en-tête (nom, statut, métas commune/âge/genre/niveau/tel/« Membre depuis ») · bouton « Message » (→ `contacterBeneficiaire`) · `h2` « Informations » (« Niveau d'étude »/« Candidatures »/« Dernière activité »/« Téléphone »/« Commune »/« Membre depuis ») · `h2` « Historique des réservations » (∅ → « Aucune réservation ») · aside `ProfilRing` « Profil complété ».
  - État final « Message » : vérifie périmètre (checkIn+reservation>0 sinon redirect), crée/réutilise `Conversation` → `redirect('/conseiller/messagerie/{id}')`.

### C2 — Publications
- **Écran 1 — `/conseiller/publications`** : `h1` « Publications » · sous-titre « …de {centreNom}. » · lien « Nouvelle publication » · cartes (pill type/statut, titre, date + places). ∅ → EmptyState « Aucune publication ».
- **Écran 2 — `/conseiller/publications/nouvelle`** : `h1` « Nouvelle publication » · form `#pub-titre`/`#pub-description`/`#pub-type` (Atelier/Formation/Forum/Conference/Webinar/Cours)/`#pub-tarif`/`#pub-date`/`#pub-datefin`/`#pub-lieu`/`#pub-capacite` · bandeau « Votre publication sera soumise à la validation de l'administrateur avant d'être visible. » · boutons « Annuler »/« Soumettre pour validation ».
  - État final : `creerPublication` → `Evenement(statut=en_relecture, centreId=ctx)`, invisible public jusqu'à validation admin (cf. Ad5 bandeau « Publications à valider »). Zod : titre min 3, lieu requis, dateFin>dateDebut.

### C3 — Réservations & check-in conseiller
- **Écran 1 — `/conseiller/reservations`** : `h1` « Réservations de ressources » · onglets `tablist` « Toutes/À valider(défaut)/Acceptées/Refusées » (compteurs) · lignes (ressource, statut, demandeur, date/créneau/personnes, justificatif, motif) · boutons **si `attente`** : « Accepter »/« Proposer un créneau »/« Refuser ». ∅ par onglet → EmptyState dédié.
  - Modales : « Accepter » (`DecisionModal`, textarea « Message au bénéficiaire (facultatif) », « Confirmer l'acceptation » → `deciderReservation(id,'accept',note)`) ; « Refuser » (textarea « Motif du refus », « Confirmer le refus ») ; « Proposer un créneau » (`ProposeModal`, date/heure début/fin, « Proposer » → `proposerCreneau`).
  - État final : `deciderReservation` scope centre (sinon FORBIDDEN), refuse si déjà traité (« Réservation déjà traitée. »), `reservation.update` + `notification.create` (« Réservation acceptée/refusée »).
- **Écran 2 — `/conseiller/checkin`** : `h1` « Check-in présence » · scanner (« Ouvrir la caméra »/erreurs caméra verbatim par `DOMException`) + `details` « Saisie manuelle (lien ou jeton du QR) » · `h2` « Présents aujourd'hui » (∅ → « Aucune présence enregistrée »).
  - Action : scan/saisie → `router.push('/checkin/v1/{token}')` (l'enregistrement `CheckIn` a lieu sur cette page — cf. S1).

### C4 — Bibliothèque comptoir
- **Écran 1 — `/conseiller/bibliotheque`** : `h1` « Bibliothèque » · indicateurs « Titres/Exemplaires/En cours/À confirmer/En retard » · onglets « À confirmer/À rendre/Historique » · lignes + boutons « Confirmer »(→`confirmerRetrait`)/« Retour »(→`enregistrerRetour`). ∅ → « Rien ici ».
- **Écran 2 — `/conseiller/bibliotheque/comptoir`** : `h1` « Comptoir » · `CardScanner` → jeune identifié (bandeau + « Autre carte ») · `h2` « À retirer »/« À rendre »/« Prêter un livre » (recherche + « Prêter ») · `Modal` confirmation (« Confirmer le retrait/retour/prêt »). Erreurs carte verbatim (« QR expiré — demandez au jeune de rafraîchir sa carte. »…). Toasts « Retrait confirmé. »/« Retour enregistré. »/« Prêt enregistré. ».
- **Écran 3 — `/conseiller/bibliotheque/catalogue`** : `h1` « Catalogue » · `CatalogueClient`. **Écran 4 — `/conseiller/bibliotheque/livre/[id]`** : `h1` titre + pill dispo · Info Thème/Niveau/Langue/ISBN · `ExemplairesManager`. Hors centre → 404.
  - État final : `confirmerEmprunt`→`en_cours` ; `retournerEmprunt`→`rendu` ; `preterLivre` vérifie centre+disponible.

### C5 — Agenda conseiller
- **Écran — `/conseiller/agenda`** : `h1` « Agenda & RDV » + `centreNom` · vues `tablist` « Jour(défaut)/Semaine/Mois » (`?vue=&date=`) · nav « Période précédente/suivante » + « Aujourd'hui » + `periodLabel` · rendu Jour/Semaine/Mois (agenda dérivé Réservation+Événement). Lecture seule.

### C6 — Messagerie conseiller
- Symétrique J9/R6 (accent teal). `/conseiller/messagerie` : `h1` « Messagerie » + « {n} conversation(s) », ∅ → « Aucune conversation. ». `/conseiller/messagerie/[id]` : `h1`=`interlocuteurNom`, bulles, `Composer`, `marquerConversationLue` au render, 404 si introuvable.

### S2 — Centre-staff réservations (auth staff séparée)
- **Précondition** : cookie `centre_staff_session` (`getStaffSession`) ; layout `(protected)` → `/centre-staff/login` sinon. Header « Staff centre » + email, nav « Accueil/Réservations/Check-ins/Bibliothèque ».
- **Écran — `/centre-staff/reservations`** : `h1` « Réservations » · sous-titre date fr-FR · form GET « Date » `#date` + « Voir » · `[data-testid="staff-reservations-list"]` (nom, ressource·type, créneau, badge statut) · bouton « Annuler » `[data-testid="cancel-{id}"]` **si statut ∈ {Acceptee,EnAttente}**. ∅ → « Aucune réservation pour cette date. ».
  - Modale annulation : `dialog` « Annuler la réservation ? » + textarea « Raison (optionnelle) » `[data-testid="cancel-raison"]` + « Confirmer l'annulation » `[data-testid="cancel-confirm"]` → `POST /api/centre-staff/{centreId}/reservations/{id}/cancel`. (Staff = annulation seule, PAS la validation riche de C3.)

### S3 — Centre-staff bibliothèque
- **Écran 1 — `/centre-staff/bibliotheque`** : `h1` « Bibliothèque » · sous-titre « Gestion des emprunts du centre » · lien « Gérer le catalogue » · stats « À confirmer »/« En cours / En retard » · `Tabs` « À confirmer »/« À rendre » · cartes + boutons « Confirmer (scan badge) »(→`POST …/confirmer`)/« Enregistrer le retour »(→`POST …/retour`). ∅ → EmptyState dédié. Toasts « Emprunt confirmé. »/« Retour enregistré. ».
- **Écran 2 — `/centre-staff/bibliotheque/catalogue`** : `h1` « Catalogue » · `CatalogueClient centreId=session.centreId` (CRUD livres/exemplaires scope centre).

---
**Oracle §13 (11 @smoke) + §14 (43 secondaires) = 54 parcours couverts.** Prochaine étape après validation : socle d'exécution (mock multi-rôles + auth.setup + seed) puis implémentation des @smoke en TDD.
