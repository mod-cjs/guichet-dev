// Templates Cypher WHITELISTÉS (GUIC-433, Lot 1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §5
//
// ⚠️ INVARIANTS :
//  - Aucune concaténation de langage naturel : tout est PARAMÉTRÉ ($uid, $oppId…).
//  - Filtrage RBAC : les requêtes liées à un bénéficiaire sont bornées à $uid.
//  - Reco collaborative : sortie AGRÉGÉE uniquement (count), jamais les attributs
//    d'un autre bénéficiaire (isolation inter-bénéficiaires, doc 07).
//  - Lecture seule : aucun CREATE/MERGE ici (le pipeline de projection est le seul scripteur).

/**
 * GUIC-706 — filtre de visibilité d'une opportunité pour le bénéficiaire : publiée ET dont
 * le partenaire n'est PAS suspendu (`orgSuspendue` porté sur le nœud par la projection).
 * `coalesce(...false)` : les offres sans org (drapeau absent) restent visibles.
 */
const visible = (a: string): string => `${a}.statut = 'publiee' AND coalesce(${a}.orgSuspendue, false) = false`

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
  WHERE ${visible('o')}
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
  WHERE c.slug IN $slugs AND ${visible('o')}
    AND (o.deadline IS NULL OR o.deadline >= datetime())
  RETURN DISTINCT ${RETURN_OPP}
  LIMIT $limit
`

/** Opportunités éligibles par niveau d'étude (+ tri par expérience), non déjà postulées. */
export const ELIGIBLE_OPPORTUNITES = `
  MATCH (b:Beneficiaire {cjsUid: $uid})
  MATCH (o:Opportunite)
  WHERE ${visible('o')}
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
  WHERE ${visible('reco')}
    AND NOT EXISTS { MATCH (b)-[:A_POSTULE]->(reco) }
  RETURN reco.id AS id, reco.slug AS slug, reco.titre AS titre,
         count(DISTINCT autre) AS popularite
  ORDER BY popularite DESC
  LIMIT $limit
`

/**
 * Parcours multi-entités : opportunité → compétence requise ← formation qui la
 * développe, + programme financeur. (Centre/ACCUEILLE : pas de source Prisma → omis.)
 */
export const MULTI_ENTITY_PATH = `
  MATCH (o:Opportunite)-[:REQUIERT]->(comp:Competence)<-[:DEVELOPPE]-(f:Opportunite:Formation)
  WHERE ${visible('o')}
    AND coalesce(f.orgSuspendue, false) = false
    AND ($domaine IS NULL OR o.domaine = $domaine)
    AND ($region  IS NULL OR o.region  = $region)
  OPTIONAL MATCH (p:Programme)-[:FINANCE]->(o)
  RETURN o.id AS id, o.slug AS slug, o.titre AS titre,
         comp.libelle AS competence, f.titre AS formationTitre, p.nom AS programmeNom
  LIMIT $limit
`
