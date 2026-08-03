/**
 * Pseudonymisation du sujet de consultation — GUIC-695.
 *
 * Module volontairement PUR (node:crypto uniquement) : il est importé par
 * `instrumentation.ts` au démarrage pour refuser une production sans clé, et ne doit
 * donc entraîner ni Prisma, ni Redis, ni logger dans ce chemin.
 *
 * POURQUOI UN HMAC ET NON UN SEL
 * Le sujet haché est soit le `cjsUid`, soit `IP|user-agent`. L'espace des IPv4 fait 2^32 :
 * un SHA-256 salé, même avec un sel dédié, s'énumère intégralement en ~21 minutes sur un
 * seul cœur — quelques secondes sur GPU. Un sel ne protège que si l'attaquant ne l'a pas,
 * or il descendait dans l'entrepôt avec les données. Un HMAC déplace le secret hors des
 * données : l'entrepôt peut fuiter entièrement sans qu'aucune IP soit récupérable.
 *
 * POURQUOI UN REFUS EN PRODUCTION
 * L'ancienne forme `process.env.X ?? 'défaut'` n'écartait que `undefined`. Or `.env.example`
 * livrait littéralement `CONSULTATION_HASH_SALT=""`, que `??` laisse passer : tout
 * déploiement issu du patron hachait donc SANS sel, en croyant le contraire. Une clé
 * absente doit faire échouer, jamais dégrader en silence.
 */
import { createHmac } from 'node:crypto'

export interface EnvHachage {
  CONSULTATION_HASH_KEY?: string
  NODE_ENV?: string
}

export function cleHachage(env: EnvHachage = process.env): string {
  const cle = env.CONSULTATION_HASH_KEY?.trim()
  if (cle) return cle
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'CONSULTATION_HASH_KEY manquante : la pseudonymisation des consultations serait ' +
        'réversible. Générer avec `openssl rand -hex 32`.'
    )
  }
  // Hors production, une clé fixe et explicitement non secrète : bloquer le développement
  // n'apporterait aucune protection, les données de dev n'étant pas des données réelles.
  return 'developpement-non-secret-ne-jamais-utiliser-en-production'
}

/** HMAC-SHA256 du sujet (cjsUid ou IP). Aucune IP ne quitte ce module en clair. */
export function hashSujet(sujet: string): string {
  return createHmac('sha256', cleHachage()).update(sujet).digest('hex')
}
