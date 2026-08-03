# Spec — Refonte de la console d'administration

> **Statut** : proposition issue du prototype HTML navigable (Artifact `claude.ai/code/artifact/8324bc87…`, fichier `admin-console.html`). Prototype à jour : **12 écrans fonctionnels**, **thème clair + sombre**, langage de carte « registre » et **panneaux-dossier** (cf §2.1).
> **Nature** : spec d'implémentation React/Next.js — le prototype fait foi pour l'UX/les flux **et le langage visuel (§2.1)**, PAS pour le code.
> **À faire avant de coder** : créer le(s) ticket(s) JIRA (épic « Refonte admin »), valider cette spec, valider la table des extensions (§4), brancher depuis `dev`.
> **Rédigée sous délégation nocturne** (autorisation explicite de l'utilisateur) — les décisions produit prises ici sont marquées 🟦 et **restent à confirmer**.

---

## 1. Objectif & périmètre

Refondre l'espace `/admin` en une console cohérente, task-first, couvrant **9 espaces** :
Tableau de bord · Gouvernance (Modération / Curation / Journal d'audit) · Opportunités · Système & Exploitation · Contenu (Bibliothèque / Événements) · Centres CJS · Utilisateurs · Candidatures · Partenaires.

**Hors périmètre** (déjà exclu du chantier design) : messagerie temps réel, i18n, accessibilité flottante — cf `feedback_design_v3_scope`.

**Principe métier cardinal** : l'admin **SUPERVISE** (voir / filtrer / exporter / relancer / vérifier / provisionner). Il **ne décide pas** des candidatures (Retenir/Refuser = recruteur) — cf `docs`/`feedback_roles_candidatures`.

---

## 2. Fondations techniques (obligatoires)

- **Design** : source de vérité = `design-guichet-v3/` (espace admin = **sombre + doré**, `#11201C` + dégradé or). Utiliser **exclusivement** `src/components/ui/` et les tokens `gj-*` (jamais de hex en dur, jamais de HTML Tailwind brut en page). Nouvelle primitive ⇒ story `*.stories.tsx`.
- **Données** : Prisma (`src/lib/prisma.ts`) uniquement. Toute nouvelle requête via un loader `src/lib/loaders/*`.
- **Réponses API** : `ApiResponse<T>` ; pagination 20/page ; payload ≤ 50 Ko ; images WebP via `<Image />`.
- **Rôles/permissions** : garde admin (rôle SSO = `admin`) sur toutes les routes `/admin/*` + server actions. `cjs_uid` = identifiant partout.
- **Qualité** : TDD strict (commit `test(RED)` avant `feat(GREEN)`) ; `npm run validate` avant commit ; e2e Playwright ; intégration MariaDB réelle (cf `feedback_quality_charter`, `feedback_tdd`). **Lancer `tsc` complet en background avant push** (le build Vercel casse en silence sur une type-error — cf `feedback_tsc_avant_push`).
- **Git** : brancher depuis `dev`, PR vers `dev`, **jamais** merger soi-même. Commit `feat|fix(module): [GUIC-n] …` + `Closes GUIC-n`, auteur `mod-cjs`, aucune mention IA.

---

## 2.1 Langage visuel (conventions du prototype à reproduire)

> Ces conventions sont **dérivées du prototype** et cohérentes avec `design-guichet-v3` (admin = sombre + doré). En React elles se traduisent en **tokens `gj-*` + primitives `src/components/ui/`** (jamais de valeurs en dur). Parti-pris assumé : **« registre institutionnel »** — surfaces plates et structurées, couleur par teinte/typo, pas d'esthétique « carte flottante générique ».

**Thème clair + sombre** 🟦 *(décision produit : garder le mode clair ?)*
- **Sombre = défaut** (identité admin v3). **Clair = ajout**, via un attribut `data-theme` sur la racine (provider de thème React ; le proto a un toggle en topbar).
- **Tout piloté par tokens, zéro valeur en dur.** Tokens d'**élévation** `--el-0…4` = overlays qui **s'inversent** selon le thème (blanc translucide en sombre, noir translucide en clair) — à ne jamais remplacer par des blancs codés. Idem surfaces (`panel`/`bg`), lignes, `--edge`, `--lift`, `--top-bg`. Les strokes/tints en **attribut SVG** (`stroke="…"`) ne résolvent pas les variables CSS ⇒ passer par une **classe**, pas un token en attribut.
- **Sémantiques** (good/warn/crit/info) et **or** re-tonalisés pour le contraste sur blanc (or vif conservé en remplissage — identité — mais assombri en usage texte).

**Langage de carte « registre »** (verrouillé)
- **Repos plat** : filet 1px (`--line`) + **liseré de lumière en haut** (`--edge`), **aucune ombre portée ambiante**. L'élévation (`--lift`) n'apparaît **qu'au survol** (ou pour les overlays).
- **Couleur = teinte + typo, jamais un rail.** ❌ Interdits (tells « design IA ») : barre d'accent verticale collée sur carte arrondie, bandeau couleur pleine largeur (type 7px), ombre uniforme sur toutes les cartes, tout en rayon 18px + pilules pleines.
- Rayons resserrés (~15px cartes, 9-12px éléments).
- **Cartes entité** (centre, partenaire) : en-tête **« papier à en-tête »** teinté de la couleur d'entité (lavis derrière l'avatar) + filet + **bande de stats à séparateurs verticaux**.
- **Cartes triage** (dashboard) : **lavis de couleur en tête**, label en **surtitre capitales** + icône, grand chiffre, **CTA pleine largeur à filet supérieur** (texte + flèche qui glisse au survol) — pas de bouton pilule plein.
- **Statut** : pastille à halo ou pilule sémantique. **Urgence** (modération) = **lavis latéral doux**, jamais une barre.

**Panneaux de détail** — slide-over ET modale à onglets (verrouillé)
- **Cartouche d'en-tête** : surface `panel` (distincte du corps) + **filet doré 3px en tête** (masthead), puces de statut, titre fort, méta.
- **Titres de section** : **tiret doré + filet de séparation** → sections titrées lisibles, pas des mini-labels flottants.
- **Blocs de données encadrés** : chaque grille clé-valeur / description / bloc organisme / **timeline** = fiche à filet + liseré (dossier structuré, **pas un mur de `label:valeur`**).
- **Barre d'actions** en pied sur surface `panel`, action primaire dorée.
- **A11y** : focus trap, `Échap` et clic-hors ferment, `prefers-reduced-motion` respecté.

**Vérification obligatoire** : rendre au **rendu réel** (Playwright headless, desktop + mobile, **clair ET sombre**) et viser **0 erreur console** avant de livrer un écran (cf `reference_render_mockup_playwright`, `feedback_vert_par_chance`).

---

## 3. Architecture de navigation

Sidebar admin (desktop) + drawer hamburger (mobile). Groupes :
- **Pilotage** : Tableau de bord · Centres CJS · Utilisateurs · Candidatures · Partenaires
- **Gouvernance** : Modération · Curation · Opportunités · Journal d'audit
- **Contenu** : Bibliothèque · Événements
- **Assistant IA — Yaye** : Métriques · Escalades
- **Système** : Système & Exploitation

Chaque item = une route `src/app/admin/<x>/page.tsx` (Server Component pour le chargement + Client Component pour l'interactivité). Détails riches = **slide-over panel** ou **modal plein cadre** (participants, lecteur de contenu, fiche centre 6 onglets).

---

## 4. 🚩 Table « schéma EXISTANT vs EXTENSIONS à valider/migrer »

Le prototype contient des **ajouts produit pertinents** qui **ne sont pas encore en base**. Ils sont conservés dans la maquette mais **NE DOIVENT PAS** être codés comme existants. Décision à prendre : migrer (avec `prisma migrate dev`) ou retirer.

| Élément (maquette) | Réalité schéma | Décision requise |
|---|---|---|
| Opportunité **« Pourvue »** | `StatutOpportunite` = brouillon/publiee/archivee/expiree (pas de « pourvue ») | 🟦 *Reco : ajouter `pourvue` à l'enum* (signal d'insertion utile) |
| Opportunité **★ En avant / featured** | pas de champ sur `Opportunite` | 🟦 *Reco : ajouter `enAvant Boolean` (mise en avant accueil)* |
| Modération **« Demander correction »** | offres = `brouillon`→`publiee`/rejet, tracé `moderePar/modereLe` (GUIC-471). Pas d'état « en correction » | 🟦 *Reco : ajouter statut `a_corriger` + `motifModeration`* |
| Modération **flag anti-fraude auto** | pas d'auto-flagging en base | 🟦 *Reco : job de scoring + champ `signalement`/`flags Json` (sinon = signalement manuel)* |
| Curation **« Pertinence Yaye »** | `ItemCuration.scoreCompletude` (complétude scraping) | Afficher `scoreCompletude` (réel) ; 🟦 *pertinence IA = ajout `scorePertinence` optionnel* |
| Journal **IP + portée CDP/base légale** | `AuditLog` = actorCjsUid/action/targetType/targetId/**meta(Json)**/createdAt | Dériver IP + « données perso » de `meta` (pas des colonnes) |
| Événements **types élargis** (Job dating, Portes ouvertes, Séminaire, Hackathon, Meetup, Bootcamp) + **type custom** | `TypeEvenement` = Formation/Atelier/Forum/Webinar/Conference/Cours | 🟦 *Reco : élargir l'enum + champ `typeLibre String?`* |
| Événements **émargement QR** | = **même mécanisme que `CheckIn` centre** | ⚠️ **UNIFIER** : réutiliser `CheckIn`, ne pas créer un 2ᵉ système |
| Événements **lieu ouvert / visio / affiche / tarif** | `Evenement` a lieu, dateFin, estGratuit, centreId | 🟦 *ajouter `mode`, `visioUrl`, `posterUrl`, `deadline`, `langue` si retenus* |

**Sans validation de cette table, coder uniquement le sous-ensemble « schéma existant ».**

---

## 5. Spécification par écran

> Gabarit : **Données** (models/loaders) · **UI** (composants, filtres, pagination) · **Actions** (server actions) · **États** · **Extensions**.

### 5.1 Tableau de bord
- **Données** : agrégats — counts `Candidature` par `StatutCandidature` ; `Opportunite` par `type`/`statut` ; `Utilisateur` count ; `Centre` count ; `EscaladeYaye` ouvertes ; `ItemCuration` `a_valider` ; funnel candidatures (Reçues→Présélection→Entretien→Retenues via `StatutPipeline`).
- **UI** : hero « briefing » (3 priorités : modération en attente, escalades Yaye, curation à valider) ; 4 KPIs ; courbe croissance inscriptions ; « Opportunités par type » (⚠️ **Appel à projets**, pas « Financement ») ; funnel ; régions ; métriques Yaye ; activité récente (depuis `AuditLog`). ⌘K palette.
- **Actions** : navigation uniquement ; les priorités renvoient aux écrans concernés.
- **États** : loading skeleton par carte ; vide (« rien à traiter ») ; erreur par bloc (dégradation gracieuse).
- **Extensions** : aucune (Escalades Yaye = réel `EscaladeYaye`).

### 5.2 Modération (offres)
- **Données** : `Opportunite` `statut = brouillon` (file d'attente). Champs : titre, type, org/recruteur, source, `moderePar/modereLe`.
- **UI** : file de cartes compactes (2 lignes) triées par urgence/ancienneté ; puce type ; « Voir le détail » → **panneau** (fiche recruteur, description, champs clés) ; filtres (source, ancienneté) ; recherche ; pagination ; **sélection groupée** (approuver les vérifiés).
- **Actions** : **Publier** (`statut=publiee`, `moderePar/modereLe`) ; **Rejeter** (→ `archivee`, motif en `meta`) ; bulk publier (exclut les signalées). Actions journalisées (`AuditLog`).
- **États** : file vide (« à jour ») ; confirmation avant publication d'une offre signalée.
- **Extensions** 🟦 : « Demander correction » (statut `a_corriger`) ; flag anti-fraude auto. Sinon MVP = Publier/Rejeter.

### 5.3 Curation
- **Données** : `ItemCuration` (`statut` decouvert/a_valider/approuvee/rejetee/en_attente/doublon, `scoreCompletude`, `empreinte`/`empreinteContenu`/`doublonDeId`, `motifRejet`) + `SourceVeille` (nom/url/fréquence/actif) + `ExecutionVeille`.
- **UI** : bandeau veille (sources + dernière collecte) ; cartes suggérées avec **score de complétude** + signaux + détection **doublon** (empreinte contenu sha256, GUIC-599) ; panneau détail éditable ; filtres (statut, score, doublons) ; pagination.
- **Actions** : **Approuver** (`approuvee` → publie une `Opportunite`, relation `CurationPubliee`) ; **Rejeter** (`rejetee` + `motifRejet`) ; **Fusionner** (doublon) ; **Éditer avant publication**. Config sources = écran `sources-veille`.
- **États** : aucune suggestion ; source en échec (monitoring).
- **Extensions** 🟦 : « Pertinence Yaye » en plus de `scoreCompletude`.

### 5.4 Journal d'audit
- **Données** : `AuditLog` (actorCjsUid, action, targetType, targetId, `meta` Json, createdAt). Append-only.
- **UI** : entrées horodatées dépliables (contexte depuis `meta` : avant/après, IP, cible cliquable) ; recherche (acteur/cible) ; filtres par catégorie d'`action` ; plage de dates ; export (lui-même journalisé) ; pagination/charger plus ; bandeau « inaltérable · append-only ».
- **Actions** : lecture + export CDP.
- **États** : vide ; export en cours.
- **Extensions** : « portée CDP / base légale » = habillage UI dérivé de `meta` (pas des colonnes).

### 5.5 Opportunités (catalogue)
- **Données** : `Opportunite` toutes (statut **brouillon/publiee/archivee/expiree**), `type` (**Emploi/Stage/Formation/Bourse/Volontariat/Appel_a_projets** + sous-types `OpportuniteType`), `org`, `vues`, count candidatures, `moderePar`.
- **UI** : stats ; table dense (offre+type+source, recruteur, publiée, expire, vues, candidatures, statut) ; filtres **type** + **statut** (dont Brouillons, Archivées) + recherche ; pagination ; ★ mise en avant inline.
- **Actions** : Publier (brouillon→publiee) ; Rejeter ; Prolonger ; Archiver ; Republier ; Éditer.
- **États** : loading ; vide ; brouillons en attente.
- **Extensions** 🟦 : « Pourvue », « En avant ».

### 5.6 Système & Exploitation *(conforme — infra)*
- **Données** : santé services (MariaDB/Redis/Vertex/Neo4j/MinIO — sondes runtime), digest image déployée, migrations, backups, crons (`veille-sources`, `yaye-graph-sync`, `yaye-reco-precompute`, `cleanup-cv`, `notifications-reminders`…).
- **UI** : 3 onglets — Exploitation (santé + actions sûres) · Équipe & accès (provisioning staff GUIC-651) · Conformité CDP (rétention CV, rotation secrets).
- **Actions sûres** : reprojeter le graphe, backup, purge CV expirés (CDP), vider cache. Provisioning : inviter (e-mail + rôle SSO + rattachement en un écran). **Jamais** SSH root en clair — frontière de sécurité.
- **États** : service dégradé (bandeau), action en cours, confirmation double sur actions prod.

### 5.7 Contenu — Bibliothèque
- **Données** : `Ressource` (type Guide/Article/Modèle/Vidéo, statut publié/brouillon, cat, auteur, vues) ; biblio physique = `Exemplaire`/`Emprunt` (par centre, GUIC-274).
- **UI** : cartes par type (couverture colorée) ; filtres type + brouillons + recherche ; pagination ; **lecteur** : PDF (pages), **article éditable** (toolbar), **vidéo** (player YouTube), Modèle (document). Modal d'ajout complet (upload PDF / éditeur article / URL YouTube).
- **Actions** : Publier/Dépublier, Mettre en avant, Éditer, Créer.
- **États** : vide, upload en cours, publication.

### 5.8 Contenu — Événements
- **Données** : `Evenement` (`type` TypeEvenement, `statut` a_venir/en_cours/termine/annule/**en_relecture**/refuse, dateDebut/**dateFin**, lieu, centreId, capaciteMax, **estGratuit**, rappelEnvoye) + `InscriptionEvenement` (`statut` inscrit/**liste_attente**/annule/**present**) + `Entretien`? non. Présence ⇒ **`CheckIn`** (unifier).
- **UI** : liste agenda (vignette type, date, jauge inscription, statut, « Complet » dérivé) ; filtres statut (dont **À valider**) + type + recherche ; pagination ; fiche riche (poster, visio, participants, programme, intervenants, ressources) ; **modal création/édition** (type + custom, mode lieu, visio, dates début/fin, tarif, public, inscription, langue, rappels, affiche, ressources upload).
- **Actions** : **Valider/Refuser** (en_relecture, GUIC-477) ; Éditer ; Dupliquer ; Annuler ; Supprimer ; **Participants** (marquer présent = `CheckIn`, promouvoir liste d'attente, export, émargement QR).
- **États** : file de validation ; complet ; annulé ; vide.
- **Extensions** 🟦 : types élargis + custom, mode/visio/affiche/deadline/langue.

### 5.9 Centres CJS
- **Données** : `Centre` (nom, region, GPS lat/long, tel, responsable, email, ville, **services** Json `CentreService`, `estActif`) + `CentreHoraire` (jour, ouvre/ferme) + `AgentCentre` (rôle `RoleAgent`) + `RessourceCentre` (Salle/Poste/Coworking/Véhicule…) + `Reservation` (statuts, justif) + `CheckIn` (QR/manuel, dwell) + `Exemplaire`/`Emprunt` + `Evenement` + `Insertion` (taux, GUIC-469).
- **UI** : grille de cartes (couleur région, services, ouvert/fermé, insertion) ; **fiche 6 onglets** : Vue d'ensemble (carte GPS, services, horaires) · Équipe & accès (agents + rôle agent + multi-centre) · Ressources & réservations (CRUD + file accepter/refuser motif) · Fréquentation (`CheckIn` QR vs manuel, dwell) · Bibliothèque (emprunts) · Événements & insertions. Recherche/filtres/pagination sur chaque liste.
- **Actions** : Créer/Éditer centre (GPS, services…) ; rattacher/retirer conseiller (rôle agent) ; CRUD ressources ; accepter/refuser/annuler réservation (`raisonRefusOuAnnul`) ; retour d'emprunt ; scanner présence (`CheckIn`).
- **États** : centre nouveau ; réservations en attente ; restauration backup à retester.

### 5.10 Utilisateurs
- **Données** : `Utilisateur` (rôle SSO, statut actif/inactif/**anonymise**, région, commune, genre, notifCandidatures/Messages) + `ProfilJeune` (compétences[], domaines[], niveau, situation, **completionScore**, cv) + candidatures/inscriptions/favoris/réservations/checkins/insertions/expériences/diplômes/certificats Moodle.
- **UI** : table (candidat+cjs_uid, coordonnées, rôle, région, **complétude**, statut, dernière visite) ; filtres rôle + statut + **région** + recherche + tri + **sélection groupée** (export/message) + **vue mobile cartes** ; fiche 5 onglets (Profil, Activité [candidatures/favoris/inscriptions listées], Parcours [exp/diplômes/certificats/CV], Rôles & accès, Conformité CDP).
- **Actions** : changer rôle (SSO) ; rattacher centre (+rôle agent) / lier-créer organisation ; préférences notif ; **exporter** (CDP, pseudonymisé) ; suspendre/réactiver ; **anonymiser** (irréversible, droit à l'effacement).
- **États** : anonymisé (données masquées) ; staff (fiche adaptée).

### 5.11 Candidatures *(supervision)*
- **Données** : `Candidature` (`statut` En_attente/Vue/Retenue/Refusee, `pipelineStage` Recue/Preselection/Entretien/Decision, `scoreAdequation` IA 0-100 + raison, `formulaireData` snapshot GUIC-361, consentement CGU + IP, `favoriRecruteur`) + `Entretien` (mode Présentiel/Visio/Téléphone, statut Planifié/Annulé/Terminé) + `Conversation`.
- **UI** : **funnel** national ; table (candidat+cjs_uid, offre+recruteur, soumise, **score IA**, statut, étape, ★favori) ; filtres statut + étape + tri score + recherche + sélection groupée + export ; fiche **lecture** (stepper pipeline, score+raison, CV+lettre+**snapshot figé**, entretiens, **consentement CGU/IP**).
- **Actions** (supervision uniquement) : **Relancer** (recruteur/candidat, canal) · **Exporter** (CDP) · **Voir la conversation**. **AUCUN Retenir/Refuser** (recruteur).
- **États** : vide ; score « en cours de calcul ».

### 5.12 Partenaires
- **Données** : `Organisation` (nom, description GUIC-510, `secteur` Domaine, région, adresse, tel, email, siteWeb, logoUrl, **estVerifie**, `cjsUid` = compte recruteur) + `opportunites[]`.
- **UI** : grille de cartes (couleur secteur, badge vérifié, offres/candidatures, statut compte recruteur) ; filtres secteur + vérifié/non/suspendu + recherche ; fiche (présentation, coordonnées, compte recruteur, offres publiées).
- **Actions** : **Vérifier** (`basculerVerifiePartenaire`) ; **activer/suspendre le compte recruteur** (`basculerStatutRecruteur`) ; Éditer (`PartenaireFormModal`) ; Créer.
- **États** : non vérifié ; compte suspendu (ne peut plus publier).

---

## 6. Checklist transverse (à ne pas oublier — absents du proto)

- **États** systématiques par écran : **loading** (skeleton), **vide**, **erreur** (retry), **permission refusée**.
- **Permissions** : garde `role=admin` côté route ET server action ; masquer les actions non autorisées.
- **CDP** : tout export/consultation sensible journalisé (`AuditLog`) ; pseudonymisation par défaut ; rétention.
- **Accessibilité** : focus management dans modals/slide-over, `aria-*`, navigation clavier, `prefers-reduced-motion`.
- **Responsive** : sidebar → drawer mobile ; tables → cartes < 820px ; pas d'`overflow-x` sur la nav.
- **Perf** : pagination serveur 20/page ; pas de sur-fetch ; `<Image />` WebP.
- **Cohérence chiffres** : agrégats réels (pas figés) — un KPI = une requête.

---

## 7. Plan d'implémentation (proposé) 🟦

**Épic** « Refonte console admin ». Ordre suggéré (valeur/risque) :

1. **Socle** : layout admin (sidebar/drawer), garde rôle, primitives UI manquantes (Table, SlideOver, Stepper, Funnel, Stat, FilterChips, Pager) + stories.
2. **Lecture seule d'abord** (0 migration) : Journal d'audit, Utilisateurs (liste+fiche), Candidatures (supervision), Partenaires (liste+fiche), Dashboard.
3. **Gouvernance** : Modération (brouillon→publier/rejeter), Curation (approuver/rejeter), Opportunités (catalogue).
4. **Gestion riche** : Centres (fiche 6 onglets), Contenu (Bibliothèque lecteur + Événements + validation).
5. **Système & Exploitation** (sondes + actions sûres + provisioning GUIC-651).
6. **Extensions** (après validation §4) : migrations enum/champs, puis features (Pourvue, En avant, types élargis événements, etc.).

Chaque écran = **une PR** (1 user story complète : loader + composant + actions + tests RED/GREEN + états). Feature-flag si intégration progressive.

---

## 8. Ce qui reste TA décision (non tranché sous délégation)
- La **table §4** (migrer quelles extensions).
- Le **mode clair** (§2.1) : le livrer avec le sombre, ou rester sombre-only comme v3.
- Le **périmètre MVP** (quels écrans/features au 1ᵉʳ jet).
- L'**unification émargement événement ↔ `CheckIn`** (archi).
- Le **découpage JIRA** définitif et l'ordre.
- Toute **migration**, **PR**, **merge**, **déploiement**.
