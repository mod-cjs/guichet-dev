# Spec — Écran Admin « Utilisateurs » (§5.10)

> **Épic** : GUIC-679 (refonte console admin). **Statut** : spec d'implémentation validée (décisions verrouillées ci-dessous). **Maquette** : Artifact `8324bc87…` écran `screen-users`. **Principe cardinal** : l'admin **SUPERVISE** (voir/filtrer/exporter/relancer/administrer les accès) — le **rôle SSO reste piloté par le SSO** (lecture seule côté Guichet).

## 0. Décisions verrouillées
1. **Fiche = sous-page à onglets** `/admin/utilisateurs/[cjsUid]` (5 onglets) — pas un slide-over (contenu riche).
2. **« Dernière visite »** = nouveau champ `Utilisateur.lastSeenAt` + tracking throttlé.
3. **Changer de rôle** = **lecture seule** (frontière SSO) ; l'admin agit sur les **rattachements** Guichet.
4. **Actions incluses** : Suspendre/Réactiver · **Anonymiser** (droit à l'effacement) · **Message groupé** · **Export CDP enrichi**.

---

## 1. Données & schéma

### 1.1 Champs réels
- **`Utilisateur`** : `cjsUid` (PK), `nom`, `prenom`, `email?`, `telephone?`, `dateNaissance?`, `statut` (`StatutCompte`: actif/inactif/anonymise), `role?` (String — **cache SSO**), `region?` (`Region`), `genre?` (`Genre`), `commune?`, `onboardingComplete`, `notifCandidatures`, `notifMessages`, `deletedAt?`, `createdAt`, `updatedAt`.
- **`ProfilJeune`** (1-1, jeunes) : `completionScore` (Int **réel**), `competences` (Json), `domainesInteret` (Json), `niveauEtude?`, `situationEmploi?`, `situationHandicap?`, `zoneHabitation?`, `cvUrl?`, `cvUploadedAt?`, `photoUrl?`, `biographie?`, `profileVisibility`.
- **Relations activité/parcours** : `candidatures[]`, `inscriptions[]` (`InscriptionEvenement`), `opportunitesFavorites[]`, `ressourcesFavoris[]`, `reservations[]`, `checkIns[]`, `insertions[]`, `emprunts[]`, `notifPreferences[]` · Parcours : `Experience`, `Diplome`, `CertificatMoodle` (via profil/cjsUid), `cvUrl` · Accès : `AgentCentre[]` (rattachements — GUIC-526), organisation (recruteur).

### 1.2 Écart schéma → **migration requise**
| Élément maquette | Réalité | Décision |
|---|---|---|
| **Dernière visite** | aucun champ | **Migration `Utilisateur.lastSeenAt DateTime?`** + helper `touchLastSeen(cjsUid)` throttlé (≤ 1 écriture / 6 h), appelé au login/activité. |
| Rôle | `role` = cache SSO (15/20 593 peuplés) | Lecture seule. Écriture rôle = SSO (hors périmètre). |
| Région | `region` existe mais ~vide | Afficher `region` ; fallback dérivé de `commune` via `src/lib/communes.ts` si `region` null. |
| Complétude | `ProfilJeune.completionScore` réel | Jeunes uniquement ; « — » pour staff. |

### 1.3 Réalité données (spike) → **seed massif (Étape 0)**
20 593 users mais **role 15 · commune 2 · profils 5 · complétude>0 = 2 · anonymisés 0 · lastSeen inexistant**. Seed obligatoire pour rendre visibles : rôles (jeune/conseiller/recruteur/admin), régions, genres, profils+complétude variée, quelques **anonymisés**, `lastSeenAt` échelonnés, rattachements.

---

## 2. Vue LISTE (`/admin/utilisateurs`)

### 2.1 KPIs (4)
| KPI | Source | Calcul |
|---|---|---|
| **Comptes** | `count(Utilisateur)` | + trend mois (createdAt) |
| **Jeunes** | `count(role IN {null,'jeune'})` | pastille « bénéficiaires » |
| **Staff** | `count(role IN {conseiller,recruteur,admin})` | « équipes & partenaires » |
| **Complétude moyenne** | `avg(ProfilJeune.completionScore)` | % ; pastille « profils » |

### 2.2 Toolbar
- **Recherche** (serveur) : `nom` / `prenom` / `email` / `telephone` / `cjsUid` (OR contains). Debounce.
- **Exporter (CDP)** : lien vers `/api/admin/export/utilisateurs` (respecte filtres + `ids` sélection).

### 2.3 Filtres (chips + select) — tous serveur
- **Rôle** : Tous · Jeunes · Conseillers · Recruteurs · Admins (`where.role`).
- **Statut** : Tout · Actifs · Inactifs · **Anonymisés** (`where.statut`).
- **Région** : `<select>` peuplé depuis `REGIONS_SENEGAL` (`where.region`).

### 2.4 Bulkbar (sélection groupée)
- Apparaît si ≥ 1 ligne cochée : « N sélectionné(s) » + **Exporter** (lien export `?ids=`) · **Message groupé** (ouvre `MessageGroupeModal`) · **Annuler**.
- Checkbox par ligne + « tout sélectionner » (page courante).

### 2.5 Table (8 colonnes)
| Col | Source | Rendu | Anonymisé |
|---|---|---|---|
| ☑ | — | checkbox sélection | — |
| **Utilisateur** | `prenom nom` + `cjsUid` (mono) | avatar + nom + cjs_uid | nom conservé, avatar neutre |
| **Coordonnées** | `email` / `telephone` | 2 lignes | **« — » masqué** |
| **Rôle** | `role` | tag couleur (Bénéficiaire si null) | tag conservé |
| **Région** | `region` (ou dérivée commune) | libellé | conservé |
| **Complétude** | `profil.completionScore` | barre + % (**jeunes only**, vert≥70/or≥40/rouge) ; « — » sinon | « — » |
| **Statut** | `statut` | pastille (dot vert si actif) | pastille « Anonymisé » |
| **Dernière visite** | `lastSeenAt` (triable) | relatif | conservé |
| **Détail** | — | bouton → fiche sous-page | — |

### 2.6 Pagination (serveur, 20/page) + **2.7 Cartes mobiles** (md:hidden), mêmes données condensées + « Voir le détail ».

---

## 3. Fiche — sous-page 5 onglets (`/admin/utilisateurs/[cjsUid]`)

En-tête : avatar, nom, cjs_uid, rôle, statut (+ badge Anonymisé si applicable), boutons d'action (selon onglet). **Anonymisé** → PII masquées partout, seules restent statut/dates/journal.

### 3.1 Onglet **Profil**
- **Données** : identité (nom/prénom/email/tél/date naissance/genre/région/commune), `ProfilJeune` (biographie, niveauEtude, situationEmploi, competences, domainesInteret, situationHandicap, zoneHabitation, photoUrl).
- **Fonctions** : lecture ; « profil non renseigné » si onboarding incomplet.
- **Actions** : **Préférences notif** (`notifCandidatures`/`notifMessages` toggles).

### 3.2 Onglet **Activité**
- **Listes** (compteurs + aperçu paginé/limité) : `candidatures` (→ /admin/candidatures), `inscriptions` événements, `opportunitesFavorites` + `ressourcesFavoris`, `reservations`, `checkIns`, `emprunts`.
- **Actions** : navigation (drill-down) uniquement.

### 3.3 Onglet **Parcours**
- **Données** : `Experience[]`, `Diplome[]`, `CertificatMoodle[]`, `cvUrl` (+ cvUploadedAt), `insertions[]` (insertion pro).
- **Actions** : télécharger CV ; lecture.

### 3.4 Onglet **Rôles & accès**
- **Rôle SSO** : affiché **lecture seule** (source = SSO ; note explicite « géré par le SSO »).
- **Rattachements** (existant GUIC-526, `RolesRattachementsSection`) : `AgentCentre[]` (rattacher/retirer centre + rôle agent), organisation (lier/créer pour recruteur).
- **Actions** : `ajouterRattachementCentre` · `retirerRattachementCentre` · `lierOrganisation` · `creerOrganisationPourRecruteur` (déjà en place).

### 3.5 Onglet **Conformité CDP**
- **Données** : consentements (depuis candidatures : `cguVersion`/`consentAt`/`consentIp`), `notifPreferences`, dates (createdAt/updatedAt/lastSeenAt/deletedAt), statut.
- **Actions** : **Exporter (CDP pseudonymisé)** · **Suspendre/Réactiver** · **Anonymiser** (droit à l'effacement, double confirmation).

---

## 4. Actions serveur & workflows

### 4.1 `changerStatutUtilisateur(cjsUid, 'actif'|'inactif')`
Garde admin → update `statut` → AuditLog (`utilisateur.statut`) → revalidate. Un compte `inactif` ne peut plus se connecter (à vérifier côté auth). **Refus** si déjà `anonymise`.

### 4.2 `anonymiserUtilisateur(cjsUid)` — **irréversible**
1. Garde admin. **Refus** si déjà anonymise.
2. **Double confirmation UI** (modal : saisir « ANONYMISER » + case « j'ai compris, irréversible »).
3. Transaction : effacer PII (`nom`→'—', `prenom`→'—', `email`→null, `telephone`→null, `dateNaissance`→null) + `ProfilJeune` (biographie/photo/CV/competences…→null) + `statut='anonymise'` + `deletedAt=now()`.
4. **Conserver** : cjsUid (clé inter-plateformes), agrégats non-nominatifs (candidatures/insertions comptent encore), journal.
5. **AuditLog CDP** (`utilisateur.anonymisation`, meta : par qui, quand). Revalidate.

### 4.3 `messageGroupe(cjsUids[], {canaux:['in_app'|'email'], message})`
Réutilise le moteur de notifs (channels in-app + e-mail). Skip destinataires sans contact (comme la relance). AuditLog. Retour `{envoyes, ignores}`. *(WhatsApp/SMS différés — hors périmètre message libre.)*

### 4.4 Export CDP (`/api/admin/export/utilisateurs`, enrichir)
Garde admin. Filtres `role`/`statut`/`region`/`q` + `ids` sélection. Colonnes **pseudonymisées** (pas de PII brute en clair selon politique) : cjs_uid, rôle, région, statut, complétude, dernière visite, dates consentement. CSV BOM.

### 4.5 Rôle (lecture seule)
Affichage du `role` cache SSO. **Pas d'écriture**. Note UI : « Rôle géré par le SSO CJS ». Les capacités Guichet = rattachements (4.rattachements).

---

## 5. Composants (React)
**À créer** :
- `AdminUsersTable` (refonte complète) — KPIs, toolbar, filtres (rôle/statut/région), bulkbar, table 8 col, pagination, cartes mobiles.
- `UserPager` / réutiliser le pattern `centre-pagination` (URL-bound).
- `MessageGroupeModal` (calqué sur `RelanceModal`).
- `AnonymiserConfirmModal` (double confirmation).
- Fiche : `UserTabs` (5 onglets) + panneaux `ProfilTab` / `ActiviteTab` / `ParcoursTab` / `RolesAccesTab` (réutilise `RolesRattachementsSection`) / `ConformiteTab`.
**À réutiliser** : moteur notifs (`notifications/emit`/channels), `regions.ts`/`communes.ts`, route export, `RolesRattachementsSection`, primitives `Chip`/`Pagination`/`Modal`/`Icon`, tokens `gj-*` + thème admin sombre.
**Loader** : `src/lib/loaders/admin-utilisateurs.ts` (helpers purs + `getUtilisateursData` + `getUtilisateurDetail`) — **`select` ciblé** (garde TransformError adapter).

## 6. États
Anonymisé (PII masquées) · staff (fiche sans complétude/parcours jeune) · vide (aucun résultat) · complétude « — » (non-jeune) · dernière visite vide (jamais vu) · permission refusée · export/message partiel (sans contact).

## 7. Plan d'implémentation (retravaillé depuis cette spec)

> TDD strict par PR (commit `test(RED)` **avant** `feat(GREEN)`), `npm run validate` avant commit, `tsc` complet avant push, rendu Playwright **clair + sombre** (0 erreur console), passe qa-challenger + regression-guard. Garde-fou : **`select` ciblé** partout (jamais `include` plein → TransformError adapter MariaDB). Supervision : **aucune décision candidature** ici ; rôle **lecture seule**.

### Étape 0 — Fondation (chore, avant le 1ᵉʳ RED)
| Tâche | Détail |
|---|---|
| Ticket + branche | Créer **GUIC-\<n\>** (épic 679) ; branche `feature/GUIC-<n>-utilisateurs-admin` depuis `feature/GUIC-687`. |
| Migration | `add_utilisateur_last_seen` → `Utilisateur.lastSeenAt DateTime?` (SQL manuel + `migrate deploy`, shadow DB refusée). |
| Seed | `scripts/seed-utilisateurs-admin.ts` — enrichit ~60 users : **rôles** (jeune/conseiller/recruteur/admin répartis), **régions**, **genres**, ~40 **profils** (`completionScore` 0→100 variés), ~5 **anonymisés** (PII effacées + statut), `lastSeenAt` **échelonnés** (aujourd'hui→6 mois + qq null), **rattachements** `AgentCentre`, `Experience`/`Diplome`/`CertificatMoodle` + `cvUrl` sur qq profils, consentements. |
| Vérif | Requête post-seed : chaque état (rôle/région/complétude/anonymisé/lastSeen/parcours) **visible**. |

### PR-A — Vue liste (spec §2)
**Fichiers**
- `src/lib/loaders/admin-utilisateurs.ts` (NEW) — helpers purs : `parseRoleU`/`parseStatutU`/`parseRegionU`/`parseSortU`, `buildUtilisateurWhere` (rôle+statut+région+recherche), `orderByForSortU` (complétude, lastSeen nulls-last), `mapUtilisateurRow` (**masque email/tél si `anonymise`**, complétude jeunes only), `kpisUtilisateurs` (comptes/jeunes/staff/complétudeMoyenne) ; async `getUtilisateursData`.
- `src/lib/auth/touch-last-seen.ts` (NEW) — `touchLastSeen(cjsUid)` throttlé (≤ 1 écriture/6 h) ; branché dans le flux session (`getSession`/callback).
- `src/app/admin/utilisateurs/AdminUsersTable.tsx` (**refonte**) — 4 KPIs + toolbar + chips rôle + chips statut + select région + bulkbar (**checkbox seul en A**) + table 8 col + pagination + cartes mobiles.
- `src/app/admin/utilisateurs/page.tsx` (**refonte**) — branchement loader (searchParams : `page/q/role/statut/region/sort`).

**Tests RED** — `admin-utilisateurs-loader.test.ts` (where combiné, tri, mapRow masquage anonymisé, kpis) · `admin-users-table.test.tsx` (KPIs, filtres rôle+région, colonnes dont coordonnées masquées + complétude jeunes-only + dernière visite, tri, pagination, **aucune action de décision**).

### PR-B — Fiche 5 onglets (spec §3)
**Fichiers**
- `admin-utilisateurs.ts` — `getUtilisateurDetail(cjsUid)` (données des 5 onglets, `select` ciblé) + helpers mapping (compteurs activité, parcours).
- `src/app/admin/utilisateurs/[cjsUid]/page.tsx` (**refonte**) — hôte 5 onglets.
- `UserTabs.tsx` + `ProfilTab.tsx` / `ActiviteTab.tsx` / `ParcoursTab.tsx` / `RolesAccesTab.tsx` (**enveloppe `RolesRattachementsSection` existant**) / `ConformiteTab.tsx`.
- **Rôle lecture seule** (mention « géré par le SSO CJS », pas de bouton changer rôle).

**Tests RED** — rendu de **chaque onglet** (données + état vide + **anonymisé masqué**) · rôle lecture seule (absence bouton changer rôle) · Parcours (Experience/Diplome/CertificatMoodle + CV).

### PR-C — Actions & sélection groupée (spec §4)
**Fichiers**
- `src/app/admin/utilisateurs/actions.ts` (**étend**) — `changerStatutUtilisateur` · `anonymiserUtilisateur` (**transaction** effacement PII + refus si déjà anonymisé + AuditLog CDP) · `messageGroupe(cjsUids,{canaux,message})`.
- `src/app/admin/utilisateurs/MessageGroupeModal.tsx` + `AnonymiserConfirmModal.tsx` (double confirmation).
- `AdminUsersTable` — câblage bulkbar (Exporter lien `?ids=` / Message groupé) + boutons Suspendre/Anonymiser dans `ConformiteTab`.
- `src/app/api/admin/export/utilisateurs/route.ts` (**enrichir**) — filtres `role/statut/region/q` + `ids` + colonnes **pseudonymisées**.
- *(Pas de nouvelle table : anonymisation → AuditLog ; message → moteur notifs.)*

**Tests RED** — guards admin · `anonymiserUtilisateur` (PII effacées + statut `anonymise` + refus si déjà) · `messageGroupe` (skip sans contact + journalisé) · sélection groupée → `MessageGroupeModal` · export `ids`.

### Matrice de traçabilité
Chaque élément §2 (KPIs, 3 filtres, 8 colonnes, bulk) et §3 (5 onglets) → **PR → test RED → capture rendu (clair + sombre)**. Rien de « fait » sans sa ligne cochée.

## 8. Étape 0 — voir §7 (Fondation). Le seed est le prérequis : sans lui l'écran est vide (20 593 users mais rôle 15, profils 5, anonymisés 0).

## Branche
`feature/GUIC-<n>-utilisateurs-admin` depuis `feature/GUIC-687` (shell + composants admin partagés, sans dépendre de Candidatures).
