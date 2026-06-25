# 00 — Vision & Périmètre

## Positionnement

Le Guichet Jeunesse n'est plus un simple portail d'opportunités : c'est le **système de gestion intégral de l'écosystème CJS**. Dans un seul projet Next.js cohabitent : catalogue d'opportunités, gestion des 9 centres et de leurs ressources physiques (salles, véhicules, bibliothèques), badge numérique, et l'agent IA **Yaye**.

## Les missions de Yaye (3 axes)

1. **Insertion professionnelle** — opportunités, candidatures, programmes.
2. **Apprentissage** — formations, ressources pédagogiques, bibliothèque des centres.
3. **Savoir** — procédures, droits, dispositifs.

Yaye est aussi l'**interface conversationnelle d'accès aux ressources physiques** des centres (salles, véhicules, livres) et au **badge numérique**.

## Les utilisateurs (rôles)

| Rôle | Description | Portée |
|------|-------------|--------|
| **Bénéficiaire** | Demandeurs d'emploi, porteurs de projet, reconversion, programmes. **Sans restriction d'âge.** | Ses propres données |
| **Recruteur / Partenaire** | Publient des offres, suivent candidatures | Leurs offres |
| **Staff CJS** | Gestionnaires de centre, agents d'accueil, bibliothécaires, conseillers | Selon rôle |
| **Superviseur** | Suit les indicateurs d'impact (direction, bailleurs) | Lecture agrégée |

### Matrice RBAC centres (5 rôles opérationnels)

| Fonctionnalité | Admin CJS | Gestionnaire centre | Agent accueil | Bibliothécaire | Bénéficiaire |
|---|---|---|---|---|---|
| Gérer tous les centres | ✅ Global | ❌ | ❌ | ❌ | ❌ |
| Administrer son centre | ✅ | ✅ Scoped | ❌ | ❌ | ❌ |
| Valider réservations | ✅ | ✅ | 👁 Consulter | ❌ | ❌ |
| Scanner badges / visites | ✅ | ✅ | ✅ | ✅ (biblio) | ❌ |
| Gérer catalogue livres | ✅ | ✅ | ❌ | ✅ | ❌ |
| Gérer emplacements rayons | ✅ | ✅ | ❌ | ✅ | ❌ |
| Emprunts / retours | ✅ | ✅ | ✅ | ✅ | ❌ |
| Réserver salle | ✅ | ✅ | ❌ | ❌ | ✅ |
| Demander véhicule (zone) | ✅ | ✅ | ❌ | ❌ | ✅ zone |
| Emprunter livre | ✅ | ✅ | ❌ | ✅ | ✅ |
| Afficher badge QR | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Scoped** = accès limité au centre assigné via le `centre_id` dans le token SSO.
> **zone** = vérification région bénéficiaire vs zone du centre.

## Taxonomie des ressources d'un centre

> 📌 **Ancrage repo** : le code modélise les ressources réservables via un enum plus large que la note — `TypeRessourceCentre { Salle, Vehicule, Poste_info, Equipement, Atelier_recurrent }`. Les 3 catégories de la note (biblio/salles/véhicules) sont un sous-ensemble. La bibliothèque physique (livres/exemplaires) n'a pas encore de modèle.

Chaque centre a **3 catégories** de ressources gérées nativement :

- **Bibliothèque physique** — catalogue mutualisé de livres (titre, auteur, ISBN, thème, niveau, langue, résumé). Exemplaires physiques individuellement identifiés, chacun avec un **emplacement précis** (rayon, étagère, position). Un même livre peut avoir des exemplaires dans plusieurs centres.
- **Salles réservables** — formation, informatique, coworking. Capacité max, équipements, horaires, statut (disponible / maintenance / réservée). Réservation salle **auto-validée** si créneau libre + profil valide.
- **Véhicules** — bus communautaire, véhicule de liaison. **Restriction géographique stricte** : seuls les bénéficiaires inscrits dans la zone du centre peuvent demander. Chaque demande **validée manuellement** par le gestionnaire.

## Périmètre v1 (livré)

| Module | Détail |
|--------|--------|
| Auth SSO | Tous rôles · `centre_id` de portée · liaison WhatsApp via lien magique |
| Knowledge Graph Neo4j | **Graphe enrichi** : 21 nœuds — opportunités décompressées (10 sous-types CTI), événements, tags, profil/parcours normalisé (compétences, diplômes, certificats Moodle), salles, véhicules, livres, exemplaires, rayons · pipeline Prisma→Neo4j · cf. [02](./02-knowledge-graph-neo4j.md) |
| Recherche NL | Groq + Cypher · opportunités, ressources pédagogiques, livres |
| Badge numérique | QR HMAC · 4 formats · scan centre (entrée, événement, réservation, emprunt) · offline |
| Réservation ressources | Salles (auto) · véhicules (validation gestionnaire) · restriction géo |
| Bibliothèque physique | Catalogue, emplacements rayons, emprunt initié, retour par scan, historique |
| Candidature assistée | Inline web + séquentielle WhatsApp · API · confirmation WhatsApp + email |
| Escalade conseiller | Module envoi WhatsApp panel admin · notif temps réel · passation transparente |
| Traçabilité | `agent_logs` complet · tous événements journalisés |
| Panel admin | Liste sessions · 2 niveaux de lecture · indicateurs qualité · export CSV |
| Templates Meta | 5 templates approuvés : accueil, SSO, confirmation, erreur, mise à jour statut |

## Prévu en v1.1 (post Go-Live)

- Alertes push proactives WhatsApp (nouvelle opportunité, deadline, retour livre proche)
- Réservation depuis l'agenda de centre
- Notif validation réservation véhicule en temps réel dans Yaye
- Enrichissement graphe avec données BRM (programmes) et Moodle (certificats, progressions)
- Mode hors-ligne renforcé (agents terrain zones rurales)
- Évaluation d'une capacité de réponse en **wolof** selon retours d'usage *(la couche données supporte déjà le wolof : `LangueRessource.Wolof` ; seule la réponse NL de Yaye en wolof reste v1.1)*
