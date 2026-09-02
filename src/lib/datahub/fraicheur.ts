/**
 * M13 / Data Hub — fraîcheur du pipeline, telle qu'un administrateur la lit.
 *
 * POURQUOI
 * « Ces chiffres datent de quand ? » est la première question devant un tableau de bord, et
 * la plateforme n'y répondait nulle part : l'état des runs vivait dans un fichier de log
 * sur l'hôte ETL (`DATAHUB_LOG_FILE`), visible du seul administrateur système.
 *
 * SENS DE CIRCULATION — c'est le pipeline qui POUSSE son résultat vers le Guichet
 * (`scripts/datahub/publier-run.ts`, appelé par `run-nightly.sh`), jamais le Guichet qui
 * va lire l'entrepôt. L'inverse forcerait l'application à joindre PostgreSQL, alors que
 * GUIC-700 sépare délibérément les deux : l'app ne partage aucun réseau avec l'entrepôt.
 */

export type NiveauFraicheur = 'ok' | 'retard' | 'echec' | 'inconnu'

export interface RunDatahub {
  /** `succes` | `echec`. */
  statut: string
  /** `extraction` | `dbt` | `reconciliation` | `complet`. */
  etape: string
  termineA: Date
  message: string | null
}

export interface Fraicheur {
  niveau: NiveauFraicheur
  /** Âge du dernier run en heures pleines ; `null` si aucun run n'a jamais été publié. */
  ageHeures: number | null
  libelle: string
}

/**
 * Au-delà de ce délai, une nuit a été manquée.
 *
 * 26 h et non 24 : la crontab tourne à 2h30, et un run qui démarre à l'heure mais dure une
 * heure de plus que d'habitude ne doit pas déclencher une alerte — seule l'absence de run
 * en est une.
 */
export const SEUIL_RETARD_H = 26

const LIBELLES_ETAPE: Record<string, string> = {
  extraction: 'extraction',
  dbt: 'transformation dbt',
  reconciliation: 'réconciliation',
  complet: 'run complet',
}

function libelleEtape(etape: string): string {
  return LIBELLES_ETAPE[etape] ?? etape
}

export function resumerFraicheur(run: RunDatahub | null, maintenant: Date): Fraicheur {
  if (!run) {
    return {
      niveau: 'inconnu',
      ageHeures: null,
      libelle: 'Aucun run du pipeline enregistré — fraîcheur inconnue',
    }
  }

  // Jamais d'âge négatif : l'hôte ETL et le Guichet sont deux machines, et une horloge en
  // avance de quelques secondes afficherait sinon « il y a -1 heure ».
  const ageHeures = Math.max(
    0,
    Math.floor((maintenant.getTime() - run.termineA.getTime()) / 3_600_000),
  )

  if (run.statut !== 'succes') {
    return {
      niveau: 'echec',
      ageHeures,
      libelle: `Dernier run en ÉCHEC à l'étape ${libelleEtape(run.etape)} — les données ne sont pas fiables`,
    }
  }

  if (ageHeures > SEUIL_RETARD_H) {
    return {
      niveau: 'retard',
      ageHeures,
      libelle: `Dernier run réussi il y a ${ageHeures} h — une exécution nocturne a été manquée`,
    }
  }

  return {
    niveau: 'ok',
    ageHeures,
    libelle:
      ageHeures === 0
        ? 'Dernier run réussi il y a moins d’une heure'
        : `Dernier run réussi il y a ${ageHeures} h`,
  }
}

/** Statuts publiables par le runner. */
export const STATUTS = ['succes', 'echec'] as const
/** Étapes de `run-nightly.sh`, dans l'ordre où elles s'enchaînent. */
export const ETAPES = ['extraction', 'dbt', 'reconciliation', 'complet'] as const

export interface PublicationRun {
  statut: (typeof STATUTS)[number]
  etape: (typeof ETAPES)[number]
  demarreA: Date
  message: string | null
}

/** La colonne `message` documente un échec, elle ne remplace pas le log du runner. */
const MESSAGE_MAX = 1000

/**
 * Lit les arguments passés par `run-nightly.sh` : `<statut> <étape> <demarreA> [message…]`.
 *
 * La validation est stricte et lève : un statut mal orthographié écrit en base rendrait la
 * bannière de fraîcheur muette au moment précis où elle doit alerter — un échec silencieux
 * de l'outil qui sert à détecter les échecs silencieux.
 */
export function lirePublication(argv: readonly string[]): PublicationRun {
  const [statut, etape, demarreA, ...reste] = argv

  if (!statut || !etape || !demarreA) {
    throw new Error('usage : publier-run.ts <statut> <étape> <demarreA ISO> [message]')
  }
  if (!(STATUTS as readonly string[]).includes(statut)) {
    throw new Error(`statut inconnu : ${statut} (attendu : ${STATUTS.join(' | ')})`)
  }
  if (!(ETAPES as readonly string[]).includes(etape)) {
    throw new Error(`étape inconnue : ${etape} (attendu : ${ETAPES.join(' | ')})`)
  }

  const debut = new Date(demarreA)
  if (Number.isNaN(debut.getTime())) {
    throw new Error(`date de démarrage illisible : ${demarreA}`)
  }

  // Le shell découpe le message sur les espaces : on le recolle.
  const message = reste.length > 0 ? reste.join(' ').slice(0, MESSAGE_MAX) : null

  return {
    statut: statut as PublicationRun['statut'],
    etape: etape as PublicationRun['etape'],
    demarreA: debut,
    message,
  }
}
