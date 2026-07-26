# 02 — Knowledge Graph Neo4j (enrichi)

> **Décision actée** : option B — graphe **enrichi** exploitant toute la richesse Prisma (10 sous-types d'opportunités décompressés, événements, tags, profil normalisé, parcours Moodle). Objectif : tenir la promesse d'« orientation active » et de « recommandation multi-entités » de la note (§1.3, §4.2). Tout dérive de Prisma — **aucune saisie supplémentaire**.

## 0. Principe fondateur — Neo4j est une vue dérivée, pas une source de vérité

> 🔒 **INVARIANT ARCHITECTURAL (non négociable)** : **Prisma/MariaDB est la source de vérité unique. Neo4j est une projection dérivée (read-model), entièrement reconstructible.**

Conséquences directes :

1. **Aucune donnée ne naît dans Neo4j.** Réservations, emprunts, scores de reco, candidatures, badges → écrits dans Prisma (`Reservation`, `Emprunt`, `RecommandationIA`, `Candidature`…). Le graphe ne fait que **refléter**.
2. **Sens d'écriture unique** : `Prisma → (pipeline de projection) → Neo4j`. Jamais l'inverse. Un Route Handler ne fait **jamais** un `CREATE`/`MERGE` Neo4j porteur d'une donnée qui n'existe pas d'abord en Prisma.
3. **La cohérence à terme est donc bornée** : une dérive de sync = **péremption temporaire** (staleness), **jamais** perte ni corruption. Tout est récupérable par **reprojection** (sync nocturne = filet).
4. **Lectures critiques en temps réel → Prisma** (disponibilité salle/véhicule, statut exemplaire, éligibilité avant action). C'est le rôle de `get_realtime_data`. Le graphe sert la **découverte / reco**, où un léger retard est tolérable.
5. **Relations dérivées** (`MAITRISE`, `ATTESTE`, `PREPARE`) : calculées par règles à la projection — elles aussi 100 % recalculables depuis Prisma.

> ⚠️ Le jour où une donnée serait *née* dans le graphe (écrite uniquement dans Neo4j), cette garantie tombe et la cohérence devient un vrai risque de corruption. **À proscrire en revue de code.**

### Corollaire — le graphe est l'**unique moteur de raisonnement** de la recommandation

> 🧠 **INVARIANT** : tout raisonnement de recommandation/matching (pertinence, éligibilité, écart de compétences, parcours) se fait **par traversée du graphe**. Il n'existe **aucun second moteur** de scoring ailleurs.

- **Raisonnement** = traversées Cypher (le « cerveau »). **Résultat** = score + **chemin explicatif**, matérialisé dans `RecommandationIA` (Prisma) comme **cache**, jamais comme logique parallèle.
- **Réactif** (`query_knowledge_graph`) et **proactif** (`get_recommendations`) partagent **la même** logique de traversée : le proactif n'est que le **même calcul exécuté en avance** (batch) et **mémoïsé**. Le précalcul est une **optimisation de latence + le moyen du push** (v1.1), pas une logique différente.
- **Explicabilité** : `RecommandationIA.raison` porte le **chemin du graphe** (« requiert X que tu maîtrises via le certificat Moodle Y, financée par le programme Z de ta région »), pas un score opaque.
- **Garde-fou (revue de code)** : `src/lib/ia/recommandation.ts` **n'invente aucun score** (pas d'heuristique mots-clés/pondérations maison qui divergerait du graphe) — il **orchestre** la traversée et **écrit** le résultat. Un seul cerveau : le graphe.

## 1. Pourquoi un graphe

Les données du Guichet sont **fondamentalement relationnelles** : une opportunité requiert des compétences, est publiée par une organisation, financée par un programme, localisée dans une région ; un bénéficiaire maîtrise des compétences (issues de ses diplômes et certificats Moodle), a postulé à des offres, s'est inscrit à des événements ; un livre a des exemplaires à des emplacements précis. Neo4j stocke ces entités et relations de façon **lisible et traversable**, sans vecteurs, sans couche opaque — ce qui permet le **matching par parcours** (compétences manquantes → formations → centre → événement).

## 2. Principe de décompression des opportunités

⚠️ **Ne jamais écraser les 10 sous-types en un seul nœud `Opportunite` plat.** Le schéma Prisma modélise une opportunité comme une **table mère `Opportunite` + 1 sous-type CTI parmi 10** (invariant XOR : exactement un sous-type non-null). On reproduit cette richesse dans Neo4j via les **labels multiples** :

```cypher
(:Opportunite:Emploi      { ...communs, typeContrat, teletravail, ... })
(:Opportunite:Stage       { ...communs, dureeMois, indemnise, ... })
(:Opportunite:Formation   { ...communs, dureeHeures, certifiante, ... })
(:Opportunite:Bourse      { ...communs, montantTotalFcfa, paysDestination, ... })
(:Opportunite:Concours    { ...communs, dateEpreuves, placesDisponibles, ... })
(:Opportunite:AppelAProjets {...communs, budgetMaxFcfa, thematique, ... })
(:Opportunite:Financement { ...communs, montantFcfa, typeFinancement, ... })
(:Opportunite:Mentorat    { ...communs, modalite, organisateurLibelle, ... })
(:Opportunite:Mobilite    { ...communs, destination, typeMobilite, ... })
(:Opportunite:Volontariat { ...communs, typeVolontariat, domaineMission, ... })
```

Tout nœud porte le label commun `:Opportunite` (props communes) **+** un label de type (props spécifiques). On peut requêter transversalement (`MATCH (o:Opportunite)`) **ou** par type précis (`MATCH (o:Bourse WHERE o.montantTotalFcfa > 1000000)`). C'est la décompression demandée.

## 3. Catalogue complet des nœuds

### A. Cœur opportunités

| Label | Propriétés | Source Prisma |
|-------|-----------|---------------|
| `:Opportunite` (commun) | `id, slug, titre, domaine, region, statut, deadline, remuneration, niveauEtudeMin, organisationLibelle, vues` | `Opportunite` |
| `:Emploi` | `typeContrat (CDI/CDD/FREELANCE/ALTERNANCE/STAGE_ALTERNE), dureeContratMois, experienceRequise, teletravail, niveauEtudeMin` | `OpportuniteEmploi` |
| `:Stage` | `dureeMois, conventionneEcole, indemnise, indemniteMensuelleFcfa, dateDebutPrevue, niveauEtudeMin` | `OpportuniteStage` |
| `:Formation` | `dureeHeures, modalite (PRESENTIEL/DISTANCE/HYBRIDE), certifiante, organismeCertificateur, prerequis, gratuite, fraisInscriptionFcfa` | `OpportuniteFormation` |
| `:Bourse` | `montantTotalFcfa, dureeMois, niveauEtudeRequis, paysDestination, organismeFinanceur, coupleObligatoire` | `OpportuniteBourse` |
| `:Concours` | `organismeOrganisateur, dateEpreuves, lieuEpreuves, preuvesDemandees, placesDisponibles` | `OpportuniteConcours` |
| `:AppelAProjets` | `budgetMaxFcfa, dureeProjetMois, thematique, dossierRequis, criteresEligibilite` | `OpportuniteAppelAProjets` |
| `:Financement` | `montantFcfa, typeFinancement (MICROCREDIT/SUBVENTION/DOTATION/PRET_HONNEUR/CAPITAL_AMORCAGE), tauxAnnuel, dureeRemboursementMois, organismeFinanceur, isContinuous` | `OpportuniteFinancement` |
| `:Mentorat` | `dureeMois, modalite (INDIVIDUEL/GROUPE/COHORTE), thematique, placesDisponibles, organisateurLibelle` | `OpportuniteMentorat` |
| `:Mobilite` | `destination, typeMobilite (ETUDE/STAGE/PROFESSIONNELLE/RECHERCHE), dureeMois, niveauLangueRequis, dateDepartPrevue` | `OpportuniteMobilite` |
| `:Volontariat` | `dureeMois, typeVolontariat (SERVICE_CIVIQUE/ENGAGEMENT/INTERNATIONAL/HUMANITAIRE), indemniteMensuelleFcfa, domaineMission, placesDisponibles` | `OpportuniteVolontariat` |
| `:OpportuniteType` | `slug, libelle, actionLabel, requiresFileUpload, decisionAuthority` (référentiel) | `OpportuniteType` |

### B. Acteurs & référentiels

| Label | Propriétés | Source Prisma |
|-------|-----------|---------------|
| `:Programme` | `slug, nom, description` (Yaakaar, YEAH…) | `Programme` |
| `:Organisation` | `nom, secteur (Domaine), region, estVerifie` | `Organisation` |
| `:Competence` | `slug, libelle, categorie` | `Skill` |
| `:Tag` | `slug, libelle` (urgent, télétravail, diaspora) | `Tag` |
| `:Secteur` | `libelle` (9 valeurs Domaine) | enum `Domaine` (réifié en nœud) |
| `:Region` | `nom, zone` (14 régions) | enum `Region` (réifié en nœud) |

### C. Bénéficiaire & parcours (nouveau — cœur du matching)

| Label | Propriétés | Source Prisma |
|-------|-----------|---------------|
| `:Beneficiaire` | `cjsUid, region, niveauEtude, situationEmploi, completionScore` *(données minimales — pas de PII sensible)* | `Utilisateur` + `ProfilJeune` |
| `:Diplome` | `intitule, niveau, anneeObtention, etablissement` | `Diplome` |
| `:Experience` | `poste, organisation, dateDebut, dateFin` | `Experience` |
| `:Certificat` | `formation, obtenuLe, moodleCertId` | `CertificatMoodle` |

### D. Agenda (nouveau)

| Label | Propriétés | Source Prisma |
|-------|-----------|---------------|
| `:Evenement` | `titre, type (Formation/Atelier/Forum/Webinar/Conference), statut, dateDebut, dateFin, lieu, capaciteMax, estGratuit` | `Evenement` |

### E. Ressources pédagogiques

| Label | Propriétés | Source Prisma |
|-------|-----------|---------------|
| `:RessourcePedagogique` | `titre, type, theme, niveau, langue (FR/Wolof), url` | `Ressource` |

### F. Centres & ressources physiques

| Label | Propriétés | Source Prisma |
|-------|-----------|---------------|
| `:Centre` | `nom, region, latitude, longitude, services (CentreService[])` | `Centre` |
| `:Salle` | `nom, capacite, equipements, statut` | `RessourceCentre {type:Salle}` |
| `:Vehicule` | `nom, capacite, zoneRestriction, statut` | `RessourceCentre {type:Vehicule}` *(+ champ zone à ajouter)* |
| `:Livre` | `titre, auteur, isbn, theme, niveau, langue, resume` | 🔴 **à créer** (modèle Prisma `Livre`) |
| `:ExemplaireLibre` | `id, statut (disponible/emprunté/réservé/maintenance/perdu)` | 🔴 **à créer** (`ExemplaireLibre`) |
| `:Rayon` | `nom, etagere, position` | 🔴 **à créer** (`Rayon`) |
| `:Emprunt` | `cjsUid, dateEmprunt, dateRetourAttendue, statut` | 🔴 **à créer** (`Emprunt`) |

> **Bilan** : 21 types de nœuds + 10 labels de sous-types d'opportunités. **17 dérivent de Prisma existant** ; **4** (bibliothèque physique : `Livre`, `ExemplaireLibre`, `Rayon`, `Emprunt`) sont à créer.

## 4. Relations typées complètes

| Relation | De → Vers · Propriétés | Source / dérivation |
|----------|------------------------|---------------------|
| `REQUIERT` | `Opportunite → Competence {requise}` | `OpportuniteSkill` |
| `DEVELOPPE` | `(:Formation) → Competence` | `OpportuniteSkill {requise:false}` sur sous-type Formation |
| `EST_DE_TYPE` | `Opportunite → OpportuniteType` | `Opportunite.typeId` |
| `ETIQUETTE` | `Opportunite → Tag` | `OpportuniteTag` |
| `FINANCE` | `Programme → Opportunite` | `Opportunite.programmeId` |
| `PUBLIE` | `Organisation → Opportunite` | `Opportunite.organisationId` |
| `RELEVE_DE` | `Opportunite/Formation/Organisation → Secteur` | `domaine` / `Organisation.secteur` |
| `SITUE_A` | `Opportunite/Centre/Organisation → Region` | `region` |
| `PREPARE` | `RessourcePedagogique → Competence` | dérivée (theme ↔ Competence.categorie) |
| `MAITRISE` | `Beneficiaire → Competence` | `ProfilJeune.competences` (Json) + dérivée des certificats/diplômes |
| `A_OBTENU` | `Beneficiaire → Diplome` · `Beneficiaire → Certificat` | `Diplome.profilId` · `CertificatMoodle.profilId` |
| `A_EXERCE` | `Beneficiaire → Experience` | `Experience.profilId` |
| `ATTESTE` | `Certificat/Diplome → Competence` | dérivée (formation/intitulé ↔ Competence) — **enrichissement Moodle (note §10.2)** |
| `A_POSTULE` | `Beneficiaire → Opportunite {statut, date}` | `Candidature` |
| `INTERESSE_PAR` | `Beneficiaire → Opportunite/RessourcePedagogique` | `OpportuniteFavorite` / `RessourceFavorite` |
| `INSCRIT_A` | `Beneficiaire → Evenement {statut}` | `InscriptionEvenement` |
| `SE_DEROULE_A` | `Evenement → Centre` | `Evenement.centreId` |
| `ACCUEILLE` | `Centre → Formation/Evenement` | `Evenement.centreId` / dérivée |
| `DISPOSE_DE` | `Centre → Salle/Vehicule` | `RessourceCentre.centreId` |
| `CONTIENT` | `Centre → Livre` | 🔴 à créer |
| `A_EXEMPLAIRE` | `Livre → ExemplaireLibre` | 🔴 à créer |
| `EST_LOCALISE_EN` | `ExemplaireLibre → Rayon` | 🔴 à créer |
| `SITUE_DANS` | `Rayon → Centre` (rattache l'emplacement physique à son centre) | 🔴 à créer (`Rayon.centreId`) |
| `EMPRUNTE` | `Beneficiaire → ExemplaireLibre` (via `:Emprunt`) | 🔴 à créer |
| `ACCESSIBLE_A` | `Vehicule → Region` | `zoneRestriction` (à ajouter) |

## 5. Traduction langage naturel → Cypher

```
Requête NL → Groq extrait paramètres structurés
           → injection dans un template Cypher (selon type de recherche)
           → exécution Neo4j (avec filtrage RBAC/centre obligatoire)
           → résultats → Groq formule la réponse FR adaptée au canal
```

### Exemples exploitant la richesse

**Recherche simple** — « livre sur l'agriculture disponible à Thiès »
```cypher
MATCH (c:Centre)-[:SITUE_A]->(:Region {nom:'Thies'}),
      (c)<-[:SITUE_DANS]-(r:Rayon)<-[:EST_LOCALISE_EN]-(e:ExemplaireLibre {statut:'disponible'})
      <-[:A_EXEMPLAIRE]-(l:Livre {theme:'Agriculture'})
RETURN l.titre, l.auteur, r.nom, r.etagere, r.position, c.nom
```

**Analyse d'écart de compétences** (orientation active, note §4.2) — « suis-je prêt pour cette offre ? »
```cypher
MATCH (o:Opportunite {id:$oppId})-[:REQUIERT {requise:true}]->(req:Competence)
OPTIONAL MATCH (b:Beneficiaire {cjsUid:$uid})-[:MAITRISE]->(req)
WITH o, req, b
WHERE b IS NULL
RETURN collect(req.libelle) AS competences_manquantes
```
…puis chaîner vers les formations qui développent ces compétences, le centre qui les accueille, et l'événement associé :
```cypher
MATCH (req:Competence) WHERE req.slug IN $manquantes
MATCH (f:Opportunite:Formation)-[:DEVELOPPE]->(req)
OPTIONAL MATCH (c:Centre)-[:ACCUEILLE]->(f)
RETURN f.titre, c.nom
```

**Éligibilité par niveau scolaire & expérience** — « quelles offres correspondent à mon profil ? »
```cypher
MATCH (b:Beneficiaire {cjsUid:$uid})
MATCH (o:Opportunite {statut:'publiee'})
// niveau scolaire requis ≤ niveau du bénéficiaire (ordre d'enum résolu côté app)
WHERE ($ordreNiveau[o.niveauEtudeMin] IS NULL
       OR $ordreNiveau[o.niveauEtudeMin] <= $ordreNiveau[b.niveauEtude])
OPTIONAL MATCH (b)-[:A_EXERCE]->(exp:Experience)
RETURN o.titre, o.domaine, count(exp) AS nb_experiences
ORDER BY nb_experiences DESC
```
> Le **niveau scolaire** (`Beneficiaire.niveauEtude` + nœuds `Diplome`) et l'**expérience** (`A_EXERCE`→`Experience`) alimentent l'éligibilité et le scoring. Le niveau se compare par **propriété** (ordre d'enum `NiveauEtudes`), l'expérience par **traversée**.

**Recommandation collaborative** — « des profils comme toi ont aussi postulé à… »
```cypher
MATCH (b:Beneficiaire {cjsUid:$uid})-[:A_POSTULE]->(:Opportunite)
      <-[:A_POSTULE]-(autre:Beneficiaire)-[:A_POSTULE]->(reco:Opportunite)
WHERE NOT (b)-[:A_POSTULE]->(reco) AND reco.statut = 'publiee'
RETURN reco.titre, count(*) AS popularite ORDER BY popularite DESC LIMIT 5
// ⚠️ Sortie AGRÉGÉE uniquement : ne jamais retourner `autre`, son cjsUid ou ses attributs (cf. doc 07 §Isolation inter-bénéficiaires)
```

**Recommandation multi-entités chaînée** (cards web § note 3.3) — opportunité → formation → centre → programme :
```cypher
MATCH (o:Opportunite)-[:REQUIERT]->(comp:Competence)<-[:DEVELOPPE]-(f:Opportunite:Formation),
      (c:Centre)-[:ACCUEILLE]->(f), (p:Programme)-[:FINANCE]->(o)
WHERE o.domaine = $domaine AND o.region = $region
RETURN o, f, c, p LIMIT 3
```

> 🔒 **Invariant** : tout template Cypher intègre le filtrage par rôle et `centre_id` du token SSO (cf. [07-securite-conformite.md](./07-securite-conformite.md) §RBAC). Jamais de Cypher sans ce filtrage.

### Templates réellement implémentés (`src/lib/ia/graph/cypher-templates.ts`)

| Template | Intention `query_knowledge_graph` | Relations traversées |
|----------|-----------------------------------|----------------------|
| `SEARCH_OPPORTUNITES` | `recherche` | — (filtres de propriété) |
| `SKILL_GAP_MISSING` + `FORMATIONS_FOR_SKILLS` | `ecart_competences` | `REQUIERT`, `MAITRISE`, `DEVELOPPE` |
| `ELIGIBLE_OPPORTUNITES` | `eligibilite` | `A_POSTULE`, `A_EXERCE` |
| `COLLABORATIVE_RECO` | `reco_collaborative` | `A_POSTULE` (sortie agrégée) |
| `MULTI_ENTITY_PATH` | `parcours` | `REQUIERT`, `DEVELOPPE`, `FINANCE` |
| **`LIVRES_DISPONIBLES`** | **`livre_disponible`** | **`CONTIENT`, `EST_LOCALISE_EN`** |
| **`RESSOURCES_POUR_COMPETENCES`** | **`ressources_competences`** | **`PREPARE`** |
| `GRAPH_POPULATED` | *(sentinelle interne)* | — |

> ⚠️ **Écart projection ↔ lecture** — restent PROJETÉES mais jamais interrogées : `EST_DE_TYPE`,
> `PUBLIE`, `RELEVE_DE`, `SITUE_A`, `ETIQUETTE`, `INSCRIT_A`, `SE_DEROULE_A`, `DISPOSE_DE`,
> `INTERESSE_PAR`, `A_OBTENU`, `ATTESTE`. Soit on écrit les templates qui les exploitent, soit on
> arrête de les projeter — un read-model qu'on n'interroge pas est un coût sans contrepartie.

> 🛡 **Vide ≠ aucun résultat** : le cron nocturne reconstruit le graphe en `wipe:true`. Une traversée
> qui renvoie 0 ligne déclenche la sentinelle `GRAPH_POPULATED` ; si le read-model est vide, l'adapter
> lève `GraphEmptyError` et le circuit-breaker sert le fallback Prisma — au lieu de répondre « je n'ai
> rien trouvé » (ou, pire sur `ecart_competences`, « il ne te manque aucune compétence »).

## 6. Pipeline d'alimentation Prisma → Neo4j

- **Événementiel** : à chaque création/modif d'entité Prisma (opportunité + son sous-type, livre, exemplaire, salle, véhicule, programme, événement, candidature, certificat), un événement interne Next.js déclenche un Route Handler de synchronisation qui **upsert** le nœud + ses labels + recalcule les relations impactées (`REQUIERT`, `ETIQUETTE`, `A_POSTULE`, `MAITRISE`…).
- **Couverture événementielle réelle** : `projectOpportunite` (opportunités), `projectLivre`/`projectExemplaire` (bibliothèque) et **`projectBeneficiaire`** — ce dernier rafraîchit `A_POSTULE`, `MAITRISE`, `ATTESTE`, `A_OBTENU`, `A_EXERCE`, `INTERESSE_PAR`, `INSCRIT_A` pour UNE personne, avec purge préalable des arêtes re-projetées. Déclencheurs (`fireBeneficiaireGraphSync`, fail-soft) posés sur : candidature, profil, diplôme, certificat, expérience, favori (ajout/retrait), inscription événement.
- **Mapping** : une fonction de projection par modèle Prisma → `MERGE (n:Label {id}) SET n += $props` + `MERGE` des relations. Les relations dérivées (`MAITRISE`, `ATTESTE`, `PREPARE`) sont recalculées par règles (matching theme/competence).
- **Filet de sécurité** : **synchronisation complète nocturne** (reprojection idempotente).
- **Scoring de recommandation** : un pipeline distinct interroge le graphe (matching profil × opportunités) et **écrit les scores dans `RecommandationIA` (Prisma)** — jamais dans le graphe (invariant §0). Lu ensuite par l'outil `get_recommendations` (cf. [11](./11-fonctionnalites.md) F2-b, [03](./03-outils-function-calling.md)).

## 7. Synthèse correspondance & restes à faire

- ✅ **Dérivable de Prisma aujourd'hui** : tout le cœur opportunités (décompressé), acteurs, profil/parcours, agenda, ressources pédago, centres/salles/véhicules.
- 🔴 **À créer (modèles Prisma + nœuds)** : `Livre`, `ExemplaireLibre`, `Rayon`, `Emprunt` (bibliothèque physique) + champ `zoneRestriction` véhicule.
- 🟠 **À normaliser** : compétences du jeune (`ProfilJeune.competences` Json → relations `MAITRISE` vers `Competence`) ; relations dérivées (`ATTESTE`, `PREPARE`) via règles de matching.
- ⚙️ **Infra** : Neo4j absent du repo (aucune dépendance) — voir [08-gap-analysis-existant.md](./08-gap-analysis-existant.md) et [09-roadmap-decoupage.md](./09-roadmap-decoupage.md) Lot 1.
