# Domaine métier — Guichet Jeunesse CJS

## 1. Le Consortium Jeunesse Sénégal (CJS)

Le CJS est une coalition d'organisations de la société civile sénégalaise œuvrant pour l'engagement civique des jeunes et l'éducation populaire. Il opère dans les 14 régions du Sénégal via 9 centres physiques et plusieurs plateformes numériques.

Le Guichet Jeunesse est la **porte d'entrée numérique principale** du CJS pour les jeunes : il agrège les opportunités (emploi, stage, bourse, volontariat), les événements, les formations et les ressources pédagogiques de l'ensemble de l'écosystème.

---

## 2. Programmes clés

| Programme | Description |
|-----------|-------------|
| **YEAH** | Youth & Entrepreneurship in Agrifood systems – Hope. Programme principal dans lequel s'inscrit la mission de refonte. |
| **Yaakaar** | Programme d'accompagnement à l'entrepreneuriat des jeunes (Yaakaar 2030). |

---

## 3. Rôles utilisateurs

| Rôle | Claim OIDC (`cjs_roles`) | Description |
|------|--------------------------|-------------|
| **Jeune / Bénéficiaire** | `beneficiaire` | Utilisateur principal du Guichet. Peut consulter les opportunités, postuler, s'inscrire à des événements, accéder aux ressources et gérer son profil. |
| **Recruteur** | `recruteur` | Organisation partenaire publiant des offres sur le Guichet. Peut créer/gérer des opportunités et consulter les candidatures reçues. |
| **Administrateur CJS** | `admin` | Équipe CJS. Gère l'ensemble du contenu, des utilisateurs et du back-office. |
| **Data Steward** | `data_steward` | Responsable de la qualité des données. Accès aux endpoints d'export Data Hub. |

---

## 4. Entités métier principales

### 4.1 Utilisateur (`Utilisateur`)

L'entité centrale. Tout utilisateur dans l'écosystème CJS est identifié par son `cjs_uid` (UUID v4), généré à la création du compte sur le SSO.

| Champ | Type | Description |
|-------|------|-------------|
| `cjs_uid` | UUID v4 | **Identifiant unique universel CJS**. Clé de jointure entre toutes les plateformes. Fourni par le SSO (claim `sub`). |
| `telephone` | String | Format E.164 obligatoire : `+221XXXXXXXXX`. Clé de rapprochement prioritaire. |
| `email` | String | Minuscules, trimé. Clé de rapprochement secondaire. |
| `nom` | String | Nom de famille |
| `prenom` | String | Prénom |
| `region` | Region | Une des 14 régions du Sénégal |
| `genre` | String | M / F |
| `dateNaissance` | Date | — |
| `statut` | String | `actif` / `inactif` / `anonymise` |
| `drupalUid` | Int? | ID de l'ancien compte Drupal (migration) |

**Règle d'or** : Le SSO est la source de vérité pour l'identité. Toute modification de nom, téléphone ou email passe par le SSO et se propage vers le Guichet.

### 4.2 Opportunité (`Opportunite`)

Une offre publiée sur le Guichet par un recruteur ou l'équipe CJS.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant interne |
| `titre` | String | Titre de l'opportunité |
| `description` | Text | Description complète |
| `type` | TypeOpportunite | Voir énumération ci-dessous |
| `domaine` | Domaine | Voir énumération ci-dessous |
| `region` | Region | Région cible |
| `organisation` | String | Nom de l'organisation |
| `remuneration` | String? | Montant ou "Non rémunéré" |
| `deadline` | DateTime? | Date limite de candidature |
| `lienExterne` | String? | URL externe si candidature hors Guichet |
| `estActif` | Boolean | Visible ou archivée |
| `recruteurUid` | UUID? | `cjs_uid` du recruteur |

**TypeOpportunite** : `Emploi`, `Stage`, `Formation`, `Bourse`, `Volontariat`, `Appel_a_projets`

**Domaine** : `Agriculture`, `Numerique`, `Entrepreneuriat`, `Citoyennete`, `Environnement`, `Sante`, `Education`, `Culture`, `Autre`

### 4.3 Candidature (`Candidature`)

Postulation d'un jeune à une opportunité.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | — |
| `cjsUid` | UUID | `cjs_uid` du jeune candidat |
| `opportuniteId` | UUID | Opportunité visée |
| `statut` | StatutCandidature | `En_attente`, `Vue`, `Retenue`, `Refusee` |
| `lettreMotivation` | Text? | Lettre de motivation |
| `cv` | String? | URL du CV (stockage objet) |
| `soumiseA` | DateTime | Date de soumission |

### 4.4 Centre CJS (`Centre`)

Un des 9 centres physiques du CJS répartis sur le territoire.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | — |
| `nom` | String | Nom du centre |
| `region` | Region | Région d'implantation |
| `adresse` | String | Adresse complète |
| `latitude` | Float | Pour la carte interactive |
| `longitude` | Float | Pour la carte interactive |
| `telephone` | String | Contact |
| `responsable` | String | Nom du responsable |
| `gcId` | Int? | ID dans la plateforme Gestion des Centres |

### 4.5 Événement (`Evenement`)

Formation, atelier, forum, webinar organisé par le CJS ou ses partenaires.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | — |
| `titre` | String | — |
| `description` | Text | — |
| `type` | TypeEvenement | `Formation`, `Atelier`, `Forum`, `Webinar`, `Conference` |
| `dateDebut` | DateTime | — |
| `dateFin` | DateTime? | — |
| `lieu` | String | Nom du lieu ou "En ligne" |
| `centreId` | UUID? | Centre CJS si applicable |
| `capaciteMax` | Int? | — |
| `estGratuit` | Boolean | — |

### 4.6 Ressource (`Ressource`)

Document pédagogique, guide, vidéo ou lien de la bibliothèque du Guichet.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | — |
| `titre` | String | — |
| `description` | Text | — |
| `type` | TypeRessource | `PDF`, `Video`, `Lien`, `Guide`, `Outil` |
| `theme` | String | Thématique |
| `url` | String | URL d'accès |
| `estPublic` | Boolean | Accessible sans compte |

---

## 5. Les 14 régions du Sénégal

```
Dakar | Thiès | Diourbel | Fatick | Kaolack | Kaffrine |
Louga | Saint-Louis | Matam | Tambacounda | Kédougou |
Kolda | Ziguinchor | Sédhiou
```

Le champ `region` dans toutes les entités utilise ces valeurs exactes.

---

## 6. L'écosystème CJS — plateformes interconnectées

| Plateforme | Stack | Rôle dans l'écosystème |
|------------|-------|----------------------|
| **Guichet Jeunesse** | Next.js (ce projet) | Portail principal jeunes |
| **SSO CJS** | Laravel 11 + Passport | Authentification unifiée, source de vérité identité |
| **BRM** | Laravel | Gestion des bénéficiaires, programmes, décaissements |
| **EduPop / E-learning** | Drupal + Moodle | Contenus pédagogiques, formations en ligne, Fatou l'IA |
| **Gestion des Centres** | Angular/JHipster | Gestion des 9 centres physiques |
| **Odoo** | Odoo | ERP, comptabilité, gestion financière |
| **Site Officiel** | WordPress | Site institutionnel du CJS |

### Flux entre plateformes et le Guichet

| Source | Destination | Déclencheur | Données transférées |
|--------|-------------|-------------|---------------------|
| Centres → Guichet | Création compte | Enrôlement jeune en centre | `cjs_uid`, profil de base |
| Moodle → Guichet | Mise à jour profil | Obtention d'un certificat | Certification, formation complétée |
| BRM ↔ Guichet | Sync bidirectionnelle | Modification parcours | Programmes suivis, statut bénéficiaire |
| Guichet → Data Hub | Export | Cron quotidien ou appel BI | Utilisateurs, opportunités, candidatures |

---

## 7. L'agent WhatsApp Aïssatou

L'agent WhatsApp du Guichet Jeunesse s'appelle **Aïssatou**. Il est **distinct et indépendant** de **Fatou**, l'IA d'EduPop.

| | Aïssatou (Guichet) | Fatou (EduPop) |
|---|---|---|
| Périmètre | Opportunités, événements, candidatures | Contenus pédagogiques EduPop |
| Stack IA | Groq (llama-3.3-70b-versatile) | Groq + RAG Pinecone + Voyage AI |
| Canal | Meta Cloud API v19 | Meta Cloud API v19 |
| Numéro | Numéro dédié Guichet | Numéro dédié EduPop |

Ne jamais réutiliser la logique d'EduPop IA pour Aïssatou. Ce sont deux agents indépendants.

---

## 8. Gouvernance des données

| Rôle | Responsabilités |
|------|----------------|
| **Data Owner** | Direction CJS — décide de ce qui est collecté et pourquoi |
| **Data Steward** | Équipe technique CJS — garant de la qualité et de la conformité |
| **Data Custodian** | Développeurs — implémentent les règles techniques |

**Conformité CDP** (Commission des Données Personnelles, Sénégal) :
- Tout traitement de données personnelles est déclaré
- Le consentement est collecté et traçable via le SSO
- Le droit d'accès (`GET /api/users/{uuid}/data`) et le droit à l'oubli (`POST /api/users/{uuid}/anonymize`) sont implémentés côté SSO
- La durée de conservation des données est définie et respectée
