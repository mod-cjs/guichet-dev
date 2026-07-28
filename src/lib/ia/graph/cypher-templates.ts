// Templates Cypher WHITELISTÉS (GUIC-433, Lot 1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §5
//
// ⚠️ INVARIANTS :
//  - Aucune concaténation de langage naturel : tout est PARAMÉTRÉ ($uid, $oppId…).
//  - Filtrage RBAC : les requêtes liées à un bénéficiaire sont bornées à $uid.
//  - Reco collaborative : sortie AGRÉGÉE uniquement (count), jamais les attributs
//    d'un autre bénéficiaire (isolation inter-bénéficiaires, doc 07).
//  - Lecture seule : aucun CREATE/MERGE ici (le pipeline de projection est le seul scripteur).

/** Projection commune d'une opportunité (mêmes champs que `GraphOpportunite`). */
const RETURN_OPP = `
  o.id AS id, o.slug AS slug, o.titre AS titre, o.type AS type,
  coalesce(o.organisationLibelle, o.organisation) AS organisation,
  o.region AS region,
  CASE WHEN o.deadline IS NULL THEN null ELSE toString(o.deadline) END AS deadline
`

/** Recherche simple d'opportunités publiées non expirées. */
export const SEARCH_OPPORTUNITES = `
  MATCH (o:Opportunite)
  WHERE o.statut = 'publiee'
    AND ($domaine IS NULL OR o.domaine = $domaine)
    AND ($region  IS NULL OR o.region  = $region)
    AND ($type    IS NULL OR o.type    = $type)
    AND ($q       IS NULL OR toLower(o.titre) CONTAINS toLower($q))
    AND (o.deadline IS NULL OR o.deadline >= datetime())
  RETURN ${RETURN_OPP}
  ORDER BY o.deadline ASC
  LIMIT $limit
`

/** Compétences requises par une opportunité que le bénéficiaire ne maîtrise pas. */
export const SKILL_GAP_MISSING = `
  MATCH (o:Opportunite {id: $oppId})-[:REQUIERT]->(req:Competence)
  WHERE NOT EXISTS { MATCH (:Beneficiaire {cjsUid: $uid})-[:MAITRISE]->(req) }
  RETURN collect(DISTINCT {slug: req.slug, libelle: req.libelle}) AS manquantes
`

/** Formations publiées qui développent un ensemble de compétences (par slug). */
export const FORMATIONS_FOR_SKILLS = `
  MATCH (o:Opportunite:Formation)-[:DEVELOPPE]->(c:Competence)
  WHERE c.slug IN $slugs AND o.statut = 'publiee'
    AND (o.deadline IS NULL OR o.deadline >= datetime())
  RETURN DISTINCT ${RETURN_OPP}
  LIMIT $limit
`

/** Opportunités éligibles par niveau d'étude (+ tri par expérience), non déjà postulées. */
export const ELIGIBLE_OPPORTUNITES = `
  MATCH (b:Beneficiaire {cjsUid: $uid})
  MATCH (o:Opportunite)
  WHERE o.statut = 'publiee'
    AND (o.niveauEtudeMin IS NULL OR o.niveauEtudeMin IN $allowedNiveaux)
    AND (o.deadline IS NULL OR o.deadline >= datetime())
    AND NOT EXISTS { MATCH (b)-[:A_POSTULE]->(o) }
  OPTIONAL MATCH (b)-[:A_EXERCE]->(exp:Experience)
  WITH o, count(exp) AS nbExp
  RETURN ${RETURN_OPP}, nbExp
  ORDER BY nbExp DESC, o.deadline ASC
  LIMIT $limit
`

/**
 * Reco collaborative : « des profils comme toi ont aussi postulé à… ».
 * ⚠️ Sortie AGRÉGÉE : on ne retourne JAMAIS `autre` ni son cjsUid (doc 07 §isolation).
 */
export const COLLABORATIVE_RECO = `
  MATCH (b:Beneficiaire {cjsUid: $uid})-[:A_POSTULE]->(:Opportunite)
        <-[:A_POSTULE]-(autre:Beneficiaire)-[:A_POSTULE]->(reco:Opportunite)
  WHERE reco.statut = 'publiee'
    AND NOT EXISTS { MATCH (b)-[:A_POSTULE]->(reco) }
  RETURN reco.id AS id, reco.slug AS slug, reco.titre AS titre,
         count(DISTINCT autre) AS popularite
  ORDER BY popularite DESC
  LIMIT $limit
`

/**
 * Livres DISPONIBLES avec emplacement physique — l'exemple canonique de la note (§5.3) :
 * « un livre sur l'agriculture disponible à Thiès » traverse Livre → Exemplaire → Centre → Region.
 * Seuls les exemplaires `disponible` remontent (un exemplaire emprunté n'est pas une réponse).
 */
export const LIVRES_DISPONIBLES = `
  MATCH (l:Livre)-[:CONTIENT]->(e:Exemplaire)-[:EST_LOCALISE_EN]->(c:Centre)
  WHERE e.statut = 'disponible'
    AND ($q      IS NULL OR toLower(l.titre) CONTAINS toLower($q)
                          OR toLower(l.auteur) CONTAINS toLower($q))
    AND ($theme  IS NULL OR toLower(l.theme) CONTAINS toLower($theme))
    AND ($region IS NULL OR c.region = $region)
  RETURN l.id AS livreId, l.titre AS titre, l.auteur AS auteur, l.theme AS theme,
         e.id AS exemplaireId, e.rayon AS rayon, e.etagere AS etagere, e.position AS position,
         c.id AS centreId, c.nom AS centreNom, c.region AS region
  ORDER BY l.titre ASC
  LIMIT $limit
`

/**
 * Ressources pédagogiques préparant un ensemble de compétences (par slug).
 * Exploite `PREPARE`, projetée depuis le thème de la ressource (spec 02 §4) et
 * jusqu'ici jamais lue. Chaînée derrière `SKILL_GAP_MISSING`, elle répond à
 * « qu'est-ce que je peux lire/regarder pour combler ce qui me manque ? ».
 */
export const RESSOURCES_POUR_COMPETENCES = `
  MATCH (r:RessourcePedagogique)-[:PREPARE]->(c:Competence)
  WHERE c.slug IN $slugs
  WITH r, collect(DISTINCT c.libelle) AS competences
  RETURN r.id AS id, r.titre AS titre, r.type AS type, r.theme AS theme,
         r.niveau AS niveau, competences
  ORDER BY size(competences) DESC
  LIMIT $limit
`

// ── Aperçu du marché (recherche GLOBALE, GUIC-676) ───────────────────────────
//
// Emprunt ciblé au « Global Search » de GraphRAG : répondre à une question THÉMATIQUE
// (« quels secteurs recrutent à Thiès ? ») au lieu d'une question égocentrée. Ici, pas
// de communautés Leiden : nos regroupements sont déjà connus (Secteur, Region, Type) —
// on les agrège, on ne les infère pas.
//
// ⚠️ INVARIANT CDP — NON NÉGOCIABLE : ces agrégats portent sur les OFFRES.
// Aucun de ces templates ne matche `:Beneficiaire`, `A_POSTULE` ni `Candidature`.
// Compter des personnes reste interdit (le pré-screen refuse « combien de jeunes… »).

/** Filtre commun : offre publiée, non expirée, éventuellement bornée région/domaine. */
const MARCHE_WHERE = `
  WHERE o.statut = 'publiee'
    AND (o.deadline IS NULL OR o.deadline >= datetime())
    AND ($region  IS NULL OR o.region  = $region)
    AND ($domaine IS NULL OR o.domaine = $domaine)
`

/** Volume d'offres ouvertes par type (emploi, stage, bourse…). */
export const MARCHE_PAR_TYPE = `
  MATCH (o:Opportunite) ${MARCHE_WHERE}
  RETURN o.type AS cle, count(*) AS n
  ORDER BY n DESC LIMIT $limit
`

/** Volume d'offres ouvertes par secteur d'activité. */
export const MARCHE_PAR_DOMAINE = `
  MATCH (o:Opportunite) ${MARCHE_WHERE}
  RETURN o.domaine AS cle, count(*) AS n
  ORDER BY n DESC LIMIT $limit
`

/** Volume d'offres ouvertes par région (utile quand aucune région n'est précisée). */
export const MARCHE_PAR_REGION = `
  MATCH (o:Opportunite) ${MARCHE_WHERE}
  RETURN o.region AS cle, count(*) AS n
  ORDER BY n DESC LIMIT $limit
`

/** Compétences les plus DEMANDÉES par les offres ouvertes — traverse REQUIERT globalement. */
export const MARCHE_COMPETENCES = `
  MATCH (o:Opportunite)-[:REQUIERT]->(c:Competence) ${MARCHE_WHERE}
  RETURN c.libelle AS cle, count(DISTINCT o) AS n
  ORDER BY n DESC LIMIT $limit
`

/** Organisations qui publient le plus — traverse PUBLIE (jusqu'ici projetée sans être lue). */
export const MARCHE_ORGANISATIONS = `
  MATCH (org:Organisation)-[:PUBLIE]->(o:Opportunite) ${MARCHE_WHERE}
  RETURN org.nom AS cle, count(DISTINCT o) AS n
  ORDER BY n DESC LIMIT $limit
`

/** Sentinelle « le read-model est-il peuplé ? » (détection de graphe vide, C.2). */
export const GRAPH_POPULATED = `
  MATCH (o:Opportunite) RETURN count(o) > 0 AS populated
`

/**
 * Parcours multi-entités : opportunité → compétence requise ← formation qui la
 * développe, + programme financeur. (Centre/ACCUEILLE : pas de source Prisma → omis.)
 */
export const MULTI_ENTITY_PATH = `
  MATCH (o:Opportunite)-[:REQUIERT]->(comp:Competence)<-[:DEVELOPPE]-(f:Opportunite:Formation)
  WHERE o.statut = 'publiee'
    AND ($domaine IS NULL OR o.domaine = $domaine)
    AND ($region  IS NULL OR o.region  = $region)
  // GUIC-684 — une opportunité peut relever de plusieurs programmes : sans le filtre
  // sur l'arête porteuse, cette clause MULTIPLIERAIT les lignes de résultat.
  OPTIONAL MATCH (p:Programme)-[:FINANCE { principal: true }]->(o)
  RETURN o.id AS id, o.slug AS slug, o.titre AS titre,
         comp.libelle AS competence, f.titre AS formationTitre, p.nom AS programmeNom
  LIMIT $limit
`
