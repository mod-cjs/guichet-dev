# Audit UI complet vs Design v2 — 2026-06-05

> Synthèse de 5 audits parallèles · 32 BLOCKING / 63 MEDIUM / 46 LOW dédupliqués
> Branche de référence pour les correctifs : `origin/dev` (lead arbitre les merges)
> Env. test : `mouhammadouod/dev` (audits partiellement effectués sur cet état)

---

## 1. Synthèse exécutive

**Conformité globale design v2** : **~6/10** (moyenne pondérée).

| Périmètre | Score | État |
|---|---|---|
| Onboarding mobile + web | 8.4/10 | Très conforme, polish requis |
| Opportunités mobile | 7/10 | Quasi-conforme |
| Opportunités desktop | 4/10 | Header liste + pagination + FiltresPanel à refondre |
| CandidatureModal | 7/10 | UX solide, 2 anti-patterns (emoji, lien CGU) |
| Agenda | 3/10 | Vue calendrier + bottom-sheet jour absents |
| Ressources | 4/10 | Filtres avancés + favoris manquants en partie |
| Centres | 8/10 | Très fidèle au seul référentiel v2 disponible |
| Dashboard | 3/10 (origin) → 7/10 (mouhammadouod) | Refonte v2 mergée sur env test, à propager dev |
| Profil | n/a | Pas de référentiel design v2 fourni par PO |
| Notifications | 0/10 (origin) → 4/10 (mouhammadouod) | Stub EmptyState (PR #85) — design v2 complet à porter |
| Mes formations | 1/10 | Placeholder M10 |
| Mes candidatures | 7/10 | Squelette OK, différenciation par état manquante |

**Anti-patterns récurrents** :
- 4 emojis utilisés comme icônes (anti-règle CLAUDE.md)
- Hex en dur : 18× gradient Yaye + couleurs ringStroke + couleurs opérateurs + #7BE5B5 live dot + #F5FAF8 fond doux
- 6 icônes sprite référencées sans déclaration (bug d'affichage)
- Token `--gj-yaye-gradient` jamais utilisé (gradient hardcodé partout)
- Tokens programmes (`--prog-yaakaar`, `--prog-yeah`, `--prog-yjc`, `--prog-edupop`) jamais utilisés
- Échelles `--fs-*` et `--space-*` ignorées (valeurs absolues inline)

---

## 2. Findings BLOCKING dédupliqués

### B.1 — Composition `BottomNav` (mobile)
**Périmètre** : `src/components/ui/BottomNav/index.tsx`
**Problème** : items v2 canoniques = `Accueil / Explorer / Candidatures / Centres / Profil`.
Impl. actuelle = `Accueil / Explorer / Agenda / Ressources / Centres` (Candidatures + Profil retirés).
**Impact** : `/jeune/mes-candidatures` est orphelin nav mobile, conformité v2 cassée.
**Décision PO requise** : pivoter vers les 5 items v2 OU documenter formellement le choix actuel dans `.agent_context/specs/layout-navigation.md`.

### B.2 — Lien Accueil BottomNav incorrect
**Périmètre** : `BottomNav.tsx:22`
**Problème** : pointe vers `/` (homepage marketing). Un bénéficiaire connecté arrive sur le marketing.
**Fix** : `/jeune/tableau-de-bord` si session présente, `/` sinon.

### B.3 — `overflow-x-auto` sur chips de navigation
**Périmètre** : `OpportunitesClient.tsx:195`, `mobile-flows.jsx:221`, `lot3-opps-mobile.jsx:94`
**Problème** : viole règle CLAUDE.md "Jamais d'overflow-x-auto sur container de nav" + piège clavier mobile (tab focus sort de l'écran sans scroll automatique).
**Fix** : `flex-wrap` ou `snap-x` avec `scrollIntoView` au focus.

### B.4 — Emojis utilisés comme icônes
**4 occurrences** :
- `CandidatureModal.tsx:402` — `🎉` dans message succès
- `mes-formations/page.tsx:15` — `🚧` placeholder
- `EvenementsClient.tsx:85` — `📅` dans EmptyState
- `RessourcesClient.tsx:79` — `📚` dans EmptyState
**Fix** : remplacer par `<Icon name="..." />` (`bell`, `calendar`, `document`, etc.) ou `aria-hidden="true"`.

### B.5 — Icônes sprite manquantes (6)
**Sprite** : `design-guichet-v2/assets/icons.svg`
**Manquantes** : `i-user`, `i-mic`, `i-quote`, `i-shield`, `i-chevron-down`, `i-more-vertical`
**Impact** : BottomNav profil ne s'affiche pas, Yaye fullscreen mic manquant, testimonial sans quote, slide-over web sans chevron.
**Fix** : ajouter les 6 symboles au sprite + déployer côté `public/icons.svg`.

### B.6 — Hex en dur (anti-pattern tokens)
**Liste prioritaire** :
- `DashboardHero.tsx:18-19` : `#F9C400`, `#FFB4A6` → `var(--gj-yellow)` / `var(--gj-red-soft)`
- 18× gradient Yaye `linear-gradient(135deg, #19A757, #0A807F)` → `var(--gj-yaye-gradient)`
- `cjs-card.jsx:169`, `screens.jsx:350`, `web-dashboard.jsx:137,750`, `mobile-flows.jsx:41` : `#7BE5B5` → token `--gj-status-live` à créer
- `screens.jsx:220,338`, `web-dashboard.jsx:711` : `#F5FAF8` → token `--gj-bg-teal-soft` à créer
- Couleurs opérateurs Free/Expresso/Orange : à centraliser dans `src/lib/operators.ts`

### B.7 — Lien CGU pointe vers `/cgu` au lieu de `/legal/cgu`
**Périmètre** : `CandidatureModal.tsx`
**Fix** : route `/legal/cgu` créée (PR #85 mergée). Mettre à jour le lien dans `CandidatureModal`.

### B.8 — Header liste opportunités desktop absent
**Périmètre** : `OpportunitesClient.tsx`
**Manquant** : search avec kbd ⌘K, sélecteur tri inline, titre dynamique `124 opportunités · "data science"`, sous-ligne meta, chips actives removables.
**Fix** : créer composant `<OpportunitesListHeader>` desktop-only.

### B.9 — Pagination numérotée desktop absente
**Périmètre** : Liste opportunités
**Problème** : scroll infini partout, design v2 attend pagination 1·2·3·...·N en desktop.
**Fix** : composant `<Pagination>` UI + conserver scroll infini mobile.

### B.10 — `FiltresPanel` desktop ne reproduit pas v2
**Manques** :
- Header panneau (icône filtre + titre + badge count + "Tout effacer")
- Checkbox + compteurs par valeur (`<FilterCheck>` pattern)
- Sections "Rémunération" et "Deadline"
- CTA "Appliquer N filtres · X résultats" en pied de sidebar

### B.11 — Sections détail opportunité non structurées
**Périmètre** : `OpportuniteDetail.tsx`
**Problème** : "Profil recherché / Mission / Conditions" sont dans `description` plate. Design v2 attend sections séparées.
**Fix** : enrichir schéma Prisma `Opportunite` (`profilRecherche`, `mission`, `conditions`) OU parser markdown structuré.

### B.12 — URL bar SEO du slide-over desktop absent
**Périmètre** : `DetailSheet.tsx`
**Manquant** : barre URL "fausse-Chrome" + compteur vues (élément pédagogique fort design v2).

### B.13 — Sheet filtres mobile : single-select au lieu multi
**Périmètre** : `OpportunitesFiltersSheet.tsx`
**Problème** : limite API actuelle (`type=` unique). À terme, API doit accepter `type=A&type=B`.
**Fix court terme** : documenter limite. **Fix long terme** : passer en multi côté API.

### B.14 — Vue Calendrier agenda inexistante
**Périmètre** : `/agenda`
**Problème** : pas de `AgendaCalendrier.tsx`, pas de grille 7×N, pas de pastilles, pas de navigation mois, pas de bottom-sheet jour. Design v2 attend toggle Liste/Calendrier.
**Fix** : implémenter complètement.

⚠️ **PR #80 mergée sur mouhammadouod** apporte déjà `AgendaCalendrier.tsx` + bottom-sheet — à propager sur origin/dev.

### B.15 — Bookmark Ressources absent
**Périmètre** : `ResourceCard.tsx`
**Problème** : pas de bouton favori sur card ressource. Pas de page `/jeune/mes-favoris/ressources`.

⚠️ **PR #81 mergée sur mouhammadouod** apporte déjà bookmark + page favoris — à propager sur origin/dev.

### B.16 — Filtres avancés ressources absents
**Périmètre** : `RessourcesClient.tsx`
**Problème** : filtres niveau/langue/catégorie absents.

⚠️ **PR #81 mergée sur mouhammadouod** apporte `RessourcesFiltersSheet` — à propager.

### B.17 — Dashboard refonte v2 absente sur origin/dev
**Périmètre** : `tableau-de-bord/page.tsx`
**Problème sur origin/dev** : ancien `DashboardHero/Compteurs/ActivityFeed`, KPI strip absent, "À ne pas rater" absent, `WebDashTracker` absent, aside MyCJSCard+ProfileNudge+Events+Centers+WhatsApp absente.

⚠️ **PRs #78/#69 mergées sur mouhammadouod** apportent `WebDashHero/KPIs/Tracker/Events/Centers/ProfileNudge/YayePanel/OpportunitesRecoCarousel` — à propager sur origin/dev (PR #78 ouverte).

### B.18 — Page `/jeune/notifications` complète absente
**Périmètre** : `notifications/page.tsx`
**État actuel** : stub EmptyState (PR #85 mergée sur dev).
**Manquant** : design v2 `screens.jsx:447-654` (tabs Toutes/Deadlines/Candidatures/Messages/Yaye, groupement par jour, items avec tile coloré + dot non-lu + meta + horodatage relatif, action "Tout marquer lu").
**Fix** : créer composant complet + brancher sur table `Notification` (à créer en M11).

### B.19 — Bandeau PROFILE_INCOMPLETE absent dans CandidatureModal
**Périmètre** : `CandidatureModal.tsx`
⚠️ **PR #79 GUIC-232 mergée sur mouhammadouod** apporte déjà la détection + bandeau. À propager sur origin/dev.

### B.20 — MyCJSCard absente côté Profil
**Périmètre** : `/jeune/mon-profil`
**Problème** : composant clé du design v2 (`cjs-card.jsx` carte membre QR + matricule) non utilisé.
⚠️ `CarteCjsHero` existe pour `/centres`, mais pas branché sur `/mon-profil`.
**Fix** : composant `<MyCJSCard>` réutilisable (centres + profil + dashboard aside).

### B.21 — Cartes candidatures sans différenciation visuelle par état
**Périmètre** : `CandidatureCard.tsx`
**Manquant** : tile icône métier + bloc contextuel ("docs manquants" yellow-soft, "RDV planifié" blue-soft, "Bravo" green-soft) + CTA conditionnel ("Reprendre", "Préparer", silent).

### B.22 — Page détail candidature `/jeune/mes-candidatures/[id]` 404
**Périmètre** : route inexistante
**Fix** : créer page détail + endpoint API + composant `<CandidatureDetail>`.

### B.23 — Bell/bookmark `BenefTopBar` silencieux
**Périmètre** : `BenefTopBar/index.tsx:120-152`
**Problème** : boutons sans `onClick` callback ni `Link` fallback → cliquent sans rien faire.
**Fix** : fallback `<Link href="/jeune/notifications">` et `<Link href="/jeune/mes-favoris">`.

### B.24 — Lots design v2 manquants (livraison PO)
**Manquants dans `design-guichet-v2/`** :
- `Lot 1 - Onboarding + Ecrans cles.html` (révision sans `(1)`) ⚠️ existe sur mouhammadouod via PR #82
- `Lot 4 - Profil Beneficiaire.html` ⚠️ existe sur mouhammadouod via PR #82
- `Lot 5 - Evenements.html` ⚠️ existe sur mouhammadouod via PR #82
- `Lot 6 - Ressources.html` ⚠️ existe sur mouhammadouod via PR #82
- `Lot 7 - Centres CJS.html` ⚠️ existe sur mouhammadouod via PR #82
- JSX : `profil-mobile.jsx`, `profil-web.jsx`, `events-mobile.jsx`, `events-web.jsx`, `events-data.jsx`, `resources-mobile.jsx`, `resources-web.jsx`, `resources-data.jsx`, `centres-mobile.jsx`, `centres-web.jsx`, `centres-data.jsx` ⚠️ existent sur mouhammadouod via PR #82

**Action** : merger PR #82 sur dev pour rendre tous ces référentiels accessibles aux devs.

---

## 3. Findings MEDIUM dédupliqués

### Tokens & design system
1. `--gj-yaye-gradient` token déclaré mais jamais utilisé (18 hardcodes) — créer migration script
2. `--prog-yaakaar` token = `#A3742A→#5C4118`, hardcodes onboarding = `#C49A5A→#7A5C3A` (divergence)
3. Token `--gj-status-live` manquant pour `#7BE5B5` (4 occurrences)
4. Token `--gj-bg-teal-soft` manquant pour `#F5FAF8` (3 occurrences)
5. Token `--gj-font-yaye-wordmark` manquant pour `Georgia, serif` (5+ occurrences)
6. `colors_and_type.css:16` `--surface-2: #FAFCFB` à promouvoir en `--gj-surface-2`
7. fontWeight 900 dépasse `--gj-fw-black: 800` déclaré
8. Échelle `--fs-*` (9 valeurs) totalement ignorée dans JSX
9. Échelle `--space-*` (8 valeurs) totalement ignorée dans JSX
10. Pulse animations `gj-pulse-urgent` et `gj-pulse-yaye` déclarées mais inutilisées

### Onboarding (22 MEDIUM total, principaux)
11. `OnboardingNavWeb` (top-bar progression web) absent sur 4 écrans web
12. Mock `Onboard3Goal` web a 6 options, impl. a 5 — désaligner
13. Label CTA Welcome mobile = "Commencer" vs mock "Créer mon compte"
14. Label CTA Téléphone = "Continuer" vs mock "Vérifier"
15. Greeting "Salama Awa" hardcodé en prod (4w sans prénom)
16. Champ "Niveau d'études" web (4w) orphelin (pas de state, pas envoyé)
17. Avatar Yaye inline (lettre Y) au lieu de `<YayeAvatar>` réutilisable
18. Drapeau SN texte `<span>SN</span>` au lieu de composant `<SnFlag>` SVG
19. "Année" vs "Date de naissance" — choix produit non tranché
20. Bloc OTP absent (assumé via SSO) — décision PO à confirmer
21. CTA secondaire WhatsApp pointe vers `/api/auth/login` (pas de flow dédié)
22. Logo onboarding non cliquable (manque `<Link href="/">`)

### Opportunités & Candidature (11 MEDIUM)
23. Pas de bouton filtre 44x44 collé à search bar mobile avec badge compteur
24. Chips actives removables au-dessus de la liste absentes
25. Pas d'icône 44x44 employment dans header CandidatureModal (web only)
26. Numéro WhatsApp non affiché dans footer succès
27. Compteur lettre sans feedback coloré progressif (orange à 80%, rouge à 95%)
28. Validation minimum 300 chars sur lettre — confirmer LETTRE_MAX (4000 brief vs 1000 v2)
29. Sheet mobile : Deadline binaire au lieu de 3 options (`<7j / <30j / Sans limite`)
30. Sheet mobile : pas de header avec badge `[4]`
31. `OppListCard` desktop sans CTA "Voir + postuler" visible inline
32. Microcopy "Postuler" (Lot 3) vs "Candidater" (Lot 2) — Lot 3 fait foi

### Dashboard / Profil / Candidatures
33. Group "Mon parcours / Mes interactions" dans DashboardCompteurs sans réf. v2
34. Override `!bg-white !text-gj-teal-deep` Button primary hero (variant DS manquant)
35. CompletionBar `bg-gj-teal/yellow/red` seuils 50/80 hardcodés
36. Section `<MyCJSCard>` non implémentée côté Profil
37. Cartes candidatures : taxonomie 5 états bruts vs 5 méta-catégories design
38. Footer "Besoin d'aide ?" candidatures pas dans v2
39. Page `/jeune/mes-candidatures` utilise CANDIDATURES_MOCK ⚠️ déjà fixé PR #87
40. `/jeune/notifications` page complète design absente (stub uniquement)

### Centres + Agenda + Ressources
41. Map centres = pins hardcodés en pourcentage (pas de géocodage) — décision MVP à officialiser
42. Limite à 4 pins map silencieuse
43. ResourceCard manque chip Niveau + Langue
44. Page formations stub avec emoji 🚧 (M10 pas démarré)
45. Composant `MesCandidatures.tsx` mort (remplacé par `candidatures/CandidaturesClient.tsx`)

### CTA Yaye non canonisé
46. 7+ variantes : "Demander à", "Parler à", "Yaye m'aide", "Aide-moi à écrire (Yaye)", etc.

### Nav labels
47. Sidebar "Mes candidatures/Mon profil" vs BottomNav "Candidatures/Profil" — possessif divergent

### StepBar
48. Mobile 5 étapes vs Web 4 étapes — synchronisation requise

### A11y / structurel
49. `<div onClick>` : 0 trouvé (RAS) ✅
50. `outline:none` sans alternative : 0 (toutes les occurrences ont `focus-visible:ring`) ✅
51. SkipLink présent sur tous les layouts ✅
52. `aria-pressed` partout sur toggles ✅
53. `tap-min` 44px partout ✅
54. Safe-area iOS gérée ✅

---

## 4. Findings LOW (quick wins)

### A faire en 1-2h
1. Migrer `Avatar` vers `next/image` (déjà signalé audit a11y)
2. Ajouter `noreferrer` à `design-preview/page.tsx:60`
3. `aria-hidden="true"` sur emoji `🎉` CandidatureModal (provisoire)
4. 4 `<svg>` inline restants → `<Icon>` (UserMenu, auth/connexion, auth/deconnexion)
5. Centraliser couleurs opérateurs telecom dans `src/lib/operators.ts`
6. Remplacer `window.location.href` par `useRouter().push()` (MesFavoris, CandidaturesClient)
7. Supprimer code mort `src/components/jeune/MesCandidatures.tsx`
8. `data-testid` manquants sur RdvCard, AtelierCarousel cards
9. `aria-current="page"` sur centre primary
10. Wrapper logo onboarding dans `<Link href="/">`
11. Fallback "Salam — c'est Yaye." si pas de prénom
12. Mapping id → label affichage `emploi → "Emploi"` sur écran 5
13. Compteur résultats opps avec style uppercase
14. Vérifier token `--gj-green` (fallback orphelin `YayeSidePanel:180`)
15. Vérifier classe `focus-visible:ring-*` dans `Button/index.tsx` base

### Documentation / spec
16. Documenter dans `.agent_context/specs/DESIGN-V2.md` les arbitrages PO
17. Documenter dans `.agent_context/specs/layout-navigation.md` le choix BottomNav (Candidatures/Profil retirés)

---

## 5. Plan d'action priorisé

### Wave 1 — Quick wins + corrections critiques (~1 jour, 1 dev)
**Effort** : 8h · **Tickets Jira** : GUIC-244, 245, 246, 247

1. **GUIC-244 fix(ui): retirer 4 emojis utilisés comme icônes**
   - Fichiers : CandidatureModal, mes-formations, EvenementsClient, RessourcesClient
   - Effort : 30 min

2. **GUIC-245 fix(ui): hex en dur → tokens gj-***
   - DashboardHero ringStroke `#F9C400`/`#FFB4A6`
   - Créer tokens `--gj-status-live` (#7BE5B5) + `--gj-bg-teal-soft` (#F5FAF8) + `--gj-font-yaye-wordmark`
   - Effort : 2h

3. **GUIC-246 fix(ui): icônes sprite manquantes**
   - Ajouter `i-user, i-mic, i-quote, i-shield, i-chevron-down, i-more-vertical` au sprite
   - Déployer `public/icons.svg`
   - Effort : 1h

4. **GUIC-247 fix(ui-opportunites): retirer overflow-x-auto chips types**
   - Remplacer par flex-wrap responsive
   - Effort : 30 min

5. **GUIC-248 chore(ui): quick wins divers (LOW findings 1-15)**
   - Effort : 4h

### Wave 2 — Refonte Dashboard + Notifications (~3-5 jours, 2 devs)
**Tickets** : GUIC-249, 250, 251

6. **GUIC-249 feat(m1-socle): refonte Dashboard /jeune/tableau-de-bord vs design v2**
   - Déjà partiellement livré sur mouhammadouod (PR #78). Propager sur dev.
   - Compléter : Hero contextuel data-driven, KPI strip 4 cards (delta semaine), carousel "À ne pas rater", `WebDashTracker`, aside (MyCJSCard + ProfileNudge + Events + Centers + WhatsApp)
   - Effort : 3 jours

7. **GUIC-250 feat(m11): page notifications complète**
   - Porter `screens.jsx:447-654` (tabs + groupement par jour + items + tile + dot + meta)
   - Brancher table `Notification` (créer modèle Prisma)
   - Effort : 2 jours

8. **GUIC-251 feat(profil): composant MyCJSCard réutilisable**
   - Centres + Profil + Dashboard aside
   - Effort : 4h

### Wave 3 — Opportunités desktop (~2-3 jours, 1 dev)
**Tickets** : GUIC-252, 253, 254

9. **GUIC-252 feat(m3): header liste opportunités desktop**
   - Search ⌘K, sélecteur tri inline, titre dynamique, sous-ligne meta, chips actives removables
   - Effort : 1 jour

10. **GUIC-253 feat(m3): pagination numérotée desktop**
    - Composant `<Pagination>` UI réutilisable
    - Effort : 4h

11. **GUIC-254 refactor(m3): FiltresPanel desktop vs design v2**
    - Header panneau, checkbox + compteurs par valeur, sections Rémunération/Deadline, CTA "Appliquer"
    - Effort : 1 jour

### Wave 4 — Candidatures pipeline (~2 jours, 1 dev)
**Tickets** : GUIC-255, 256

12. **GUIC-255 feat(m3): cartes candidatures différenciées par état**
    - Tile icône métier, bloc contextuel (docs manquants/RDV/Bravo), CTA conditionnel
    - Effort : 1 jour

13. **GUIC-256 feat(m3): page détail candidature `/jeune/mes-candidatures/[id]`**
    - Page + endpoint API + composant `<CandidatureDetail>`
    - Effort : 1 jour

### Wave 5 — Onboarding polish (~1-2 jours, 1 dev)
**Tickets** : GUIC-257, 258

14. **GUIC-257 feat(onboarding): `OnboardingNavWeb` top-bar progression web**
    - Dots progression + "Déjà inscrit ? Se connecter"
    - Utiliser dans 4 écrans web
    - Effort : 4h

15. **GUIC-258 chore(onboarding): harmonisations diverses**
    - Labels CTA, greeting fallback, `<SnFlag>` SVG, champ niveau études branché, avatar Yaye primitive
    - Effort : 1 jour

### Wave 6 — Arbitrages PO / spec (parallèle, 0 dev)
**Tickets** : GUIC-259, 260

16. **GUIC-259 docs(po): décisions design v2 à arbitrer**
    - Composition BottomNav (Candidatures+Profil vs Agenda+Ressources)
    - Microcopy "Postuler" vs "Candidater"
    - CTA Yaye canonique
    - StepBar 5 vs 4 étapes
    - Labels nav possessif uniforme
    - Année vs Date de naissance
    - Map centres MVP (pas de Leaflet)
    - Bloc OTP preview ou skip
    - 6e option Goal (bourse)
    - Effort PO : 1h réunion

17. **GUIC-260 docs(po): livraison design manquante**
    - Récupérer Lots 4-7 + JSX profil/events/ressources/centres si pas déjà sur dev
    - ⚠️ Si PR #82 mergée → ces fichiers seront sur dev
    - Spec design Profil (pas de référentiel v2 actuellement)
    - Spec design Welcome homepage publique (WelcomeHeroMobile/Web ?)

### Wave 7 — Backend / API alignment (~3 jours, 1 dev backend)
**Tickets** : GUIC-261, 262

18. **GUIC-261 feat(api): API opportunités multi-select**
    - Accepter `type=A&type=B`, idem domaine/région
    - Permet sheet filtres mobile multi
    - Effort : 1 jour

19. **GUIC-262 feat(api/prisma): sections structurées opportunité**
    - Schéma Prisma : `profilRecherche`, `mission`, `conditions` (Markdown ou JSON)
    - Migration + seed update
    - Effort : 1 jour

---

## 6. Récapitulatif waves

| Wave | Effort | Devs | Priorité | Tickets |
|---|---|---|---|---|
| 1 — Quick wins | 8h | 1 | HIGH | GUIC-244 à 248 |
| 2 — Dashboard + Notifications | 3-5j | 2 | HIGH | GUIC-249 à 251 |
| 3 — Opportunités desktop | 2-3j | 1 | MED | GUIC-252 à 254 |
| 4 — Candidatures pipeline | 2j | 1 | MED | GUIC-255 à 256 |
| 5 — Onboarding polish | 1-2j | 1 | MED | GUIC-257 à 258 |
| 6 — Arbitrages PO | 1h | 0 dev | HIGH | GUIC-259 à 260 |
| 7 — Backend alignment | 3j | 1 backend | MED | GUIC-261 à 262 |

**Total** : ~14-17 jours-développeur + 1h PO.

**Recommandation séquencement** :
- Bloquer 1h avec le PO **maintenant** pour Wave 6 (débloque Waves 1-5)
- Lancer Wave 1 + Wave 6 en parallèle (Wave 1 ne dépend pas des arbitrages PO)
- Une fois Wave 6 arbitrée, lancer Waves 2, 3, 4, 5 en parallèle (devs disjoints)
- Wave 7 (backend) en parallèle de Waves 2-5

---

## 7. Annexes

### Faux positifs / Findings dépassés (déjà fixés sur mouhammadouod)

Les agents ont audité partiellement le HEAD local `5abac48` (base origin/dev avant les merges mouhammadouod). Ces findings BLOCKING ne s'appliquent **plus** à mouhammadouod (mais restent valides pour dev tant que PRs non mergées) :

- "WebDashHero/KPIs/Tracker/Events/Centers/ProfileNudge/YayePanel/OpportunitesRecoCarousel absents" → ✅ existent (PRs #69, #78)
- "Page /jeune/notifications inexistante (404)" → ✅ stub PR #85
- "Page /jeune/mes-favoris/ressources absente" → ✅ PR #81
- "RessourcesFiltersSheet absent" → ✅ PR #81
- "AgendaCalendrier inexistant" → ✅ PR #80
- "Bandeau PROFILE_INCOMPLETE absent CandidatureModal" → ✅ PR #79
- "Seed centres/ressources absent" → ✅ PRs #88, #89
- "Lots 4-7 + JSX profil/events/ressources/centres absents" → ✅ PR #82

**Action lead** : merger ces PRs sur dev pour aligner avec mouhammadouod (cf. sprint cleanup PR #94).

### Score conformité par axe

| Axe | Score | Notes |
|---|---|---|
| Layout / structure | 8/10 | Très fidèle au mock quand mock dispo |
| Tokens couleur | 6/10 | gj-* utilisés mais hex hardcodés sur gradient Yaye + ringStroke |
| Typo | 6/10 | Échelle --fs-* ignorée, font-weight 900 hors range |
| Composants primitives | 7/10 | `Button` parfois codé inline, `FooterCTA` absent dans 4 web |
| Iconographie sprite | 7/10 | `<Icon>` partout MAIS 4 emojis + 6 icônes sprite manquantes |
| Microcopy FR / Yaye | 6/10 | Pas de forme canonique CTA Yaye, "Postuler" vs "Candidater" |
| Responsive | 8/10 | Switch CSS propre, gap tablet 640-1024 à investiguer |
| A11y | 9/10 | SkipLink, aria-pressed, role=progressbar, tap-min, safe-area |
| États (loading/erreur/vide) | 5/10 | Aucun skeleton dans design v2, manque dans la livraison PO |
| Animations | 7/10 | 2 keyframes pulse orphelins |
| Architecture nav | 6/10 | Choix BottomNav (Candidatures retirés) à arbitrer |
| Cohérence design v2 interne | 5/10 | 18 hardcodes gradient Yaye + lots manquants + icônes manquantes |

---

## 8. Méthodologie

- 5 agents IA spécialisés exécutés en parallèle (lecture seule)
- ~40 écrans applicatifs audités
- ~50 composants comparés ligne-à-ligne avec référentiels JSX/HTML
- 12 critères systémiques par écran (layout, tokens, typo, composants, iconographie, images, CTA, microcopy, responsive, a11y, états, animations)
- Cross-vérification incohérences internes du design v2 (tokens, couleurs, typo, composants, microcopy, navigation, états)
- Branche audit : `tmp-mouhammadouod-dev` (HEAD à audit time variable selon agent)

Rapports complets disponibles dans les notifications de tâches associées.
