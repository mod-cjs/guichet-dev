/**
 * M13 / Data Hub — authentification des consommateurs (lot 4, spec §6.3).
 *
 * Généralise la garde durcie de GUIC-631 : une variable d'environnement absente doit
 * REFUSER, jamais laisser passer. La forme faible `clef !== process.env.X` accordait
 * l'accès quand la variable manquait et que l'appelant n'envoyait rien —
 * `undefined !== undefined` est faux. Le cas s'est produit en production.
 *
 * La comparaison est à temps constant : une clé API est un secret, et une comparaison
 * de chaînes qui s'arrête au premier caractère différent fuit sa valeur, caractère par
 * caractère, à qui mesure les temps de réponse.
 */
import { authenticateDatahub } from '@/lib/datahub/auth'

const ENV = { ...process.env }

beforeEach(() => {
  delete process.env.DATAHUB_API_KEY
  delete process.env.DATAHUB_API_KEYS
})
afterAll(() => {
  process.env = ENV
})

describe('authenticateDatahub — refus', () => {
  it('refuse quand aucune clé n\'est configurée, même sans en-tête', () => {
    // LE cas de GUIC-631 : un déploiement où la variable n'a pas été propagée.
    expect(authenticateDatahub(null)).toBeNull()
    expect(authenticateDatahub('Bearer nimporte-quoi')).toBeNull()
  })

  it('refuse quand la clé configurée est vide', () => {
    process.env.DATAHUB_API_KEY = ''
    expect(authenticateDatahub('Bearer ')).toBeNull()
    expect(authenticateDatahub(null)).toBeNull()
  })

  it('refuse une clé qui ne correspond pas', () => {
    process.env.DATAHUB_API_KEY = 'secret'
    expect(authenticateDatahub('Bearer autre')).toBeNull()
  })

  it('refuse un en-tête sans schéma Bearer', () => {
    process.env.DATAHUB_API_KEY = 'secret'
    expect(authenticateDatahub('secret')).toBeNull()
    expect(authenticateDatahub('Basic secret')).toBeNull()
  })

  it('accepte le schéma Bearer indépendamment de la casse — RFC 7235 (GUIC-697 D5)', () => {
    // Le tap actuel envoie toujours `Bearer` exact et n'est donc pas affecté. Mais le
    // schéma d'authentification HTTP est insensible à la casse (RFC 7235 §2.1) : un
    // second consommateur honnête envoyant `bearer` ou `BEARER` se faisait refuser sans
    // raison valable au regard du standard.
    process.env.DATAHUB_API_KEY = 'secret'
    expect(authenticateDatahub('bearer secret')).toEqual({ id: 'datahub' })
    expect(authenticateDatahub('BEARER secret')).toEqual({ id: 'datahub' })
    expect(authenticateDatahub('BeArEr secret')).toEqual({ id: 'datahub' })
  })

  it('refuse un Bearer sans valeur', () => {
    process.env.DATAHUB_API_KEY = 'secret'
    expect(authenticateDatahub('Bearer')).toBeNull()
    expect(authenticateDatahub('Bearer   ')).toBeNull()
  })

  it('refuse un préfixe de la clé — pas de comparaison partielle', () => {
    process.env.DATAHUB_API_KEY = 'secret-long'
    expect(authenticateDatahub('Bearer secret')).toBeNull()
  })
})

describe('authenticateDatahub — acceptation', () => {
  it('accepte la clé unique et nomme le consommateur pour la journalisation', () => {
    process.env.DATAHUB_API_KEY = 'secret'
    expect(authenticateDatahub('Bearer secret')).toEqual({ id: 'datahub' })
  })

  it('accepte une clé nommée et rend son identifiant', () => {
    process.env.DATAHUB_API_KEYS = 'meltano:s1,bi:s2'
    expect(authenticateDatahub('Bearer s1')).toEqual({ id: 'meltano' })
    expect(authenticateDatahub('Bearer s2')).toEqual({ id: 'bi' })
  })

  it('accepte deux clés simultanément — ce qui rend la rotation possible', () => {
    process.env.DATAHUB_API_KEYS = 'meltano:ancienne,meltano-2:nouvelle'
    expect(authenticateDatahub('Bearer ancienne')?.id).toBe('meltano')
    expect(authenticateDatahub('Bearer nouvelle')?.id).toBe('meltano-2')
  })

  it('tolère les espaces autour des entrées de la liste', () => {
    process.env.DATAHUB_API_KEYS = ' meltano : s1 , bi : s2 '
    expect(authenticateDatahub('Bearer s1')?.id).toBe('meltano')
  })

  it('ignore une entrée malformée sans invalider les autres', () => {
    process.env.DATAHUB_API_KEYS = 'sans-secret,meltano:s1,:secret-sans-nom'
    expect(authenticateDatahub('Bearer s1')?.id).toBe('meltano')
    expect(authenticateDatahub('Bearer secret-sans-nom')).toBeNull()
  })

  it('donne la priorité à la liste nommée sur la clé unique héritée', () => {
    process.env.DATAHUB_API_KEYS = 'meltano:s1'
    process.env.DATAHUB_API_KEY = 'ancienne'
    expect(authenticateDatahub('Bearer s1')?.id).toBe('meltano')
    expect(authenticateDatahub('Bearer ancienne')).toBeNull()
  })
})
