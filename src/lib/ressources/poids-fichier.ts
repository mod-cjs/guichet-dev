import { ipPubliqueValidee } from '@/lib/curation/robot/ssrf-guard'
import { redis } from '@/lib/redis'

/**
 * GUIC-709 — Poids d'un fichier de ressource, MESURÉ à la source.
 *
 * Au Sénégal la connexion se paie au volume : lancer un PDF sans savoir s'il
 * fait 200 Ko ou 40 Mo est une décision prise à l'aveugle. Le poids est donc
 * une information de décision, et à ce titre il ne s'estime pas.
 *
 * Toute incertitude rend `null`, et l'appelant n'affiche alors rien : source
 * muette sur sa taille, en erreur, injoignable, ou `content-length` illisible.
 * Un poids approximatif affiché comme exact est pire qu'un poids absent — le
 * jeune prendrait sa décision sur un chiffre faux.
 *
 * La garde SSRF s'applique bien que l'URL vienne de l'admin : elle vise un
 * hôte arbitraire et ce helper est appelé au rendu d'une page publique. Elle
 * est fail-closed — hôte non résolu ou interne, on ne part pas.
 */

/** Au-delà, la requête est abandonnée : une fiche ne doit pas attendre. */
const DELAI_MAX_MS = 4_000

export async function poidsFichier(url: string): Promise<number | null> {
  if ((await ipPubliqueValidee(url)) === null) return null

  try {
    const reponse = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      // GUIC-709 — sans ça, `fetch` demande du gzip et le `content-length`
      // renvoyé est la taille TRANSFÉRÉE : mesuré au rendu, 1 701 octets
      // annoncés pour un fichier de 3 808. Le nombre dépendrait alors de ce
      // que le client négocie, donc ne serait reproductible pour personne.
      headers: { 'accept-encoding': 'identity' },
      signal: AbortSignal.timeout(DELAI_MAX_MS),
    })
    if (!reponse.ok) return null

    const brut = reponse.headers.get('content-length')
    if (!brut) return null

    const octets = Number(brut)
    // `Number('beaucoup')` vaut NaN, `Number('')` vaut 0 : les deux
    // s'afficheraient comme un poids si on ne les écartait pas ici.
    if (!Number.isFinite(octets) || octets <= 0) return null
    return octets
  } catch {
    // Réseau, DNS, délai dépassé — l'absence de mesure est un état normal.
    return null
  }
}

const UNITES = [
  { seuil: 1_073_741_824, suffixe: 'Go' },
  { seuil: 1_048_576, suffixe: 'Mo' },
  { seuil: 1_024, suffixe: 'Ko' },
] as const

/**
 * Met en forme un poids pour un lecteur, pas pour un ingénieur : une décimale
 * au plus, virgule décimale française, et pas de « 2,0 Mo » quand « 2 Mo »
 * dit la même chose.
 */
export function formaterPoids(octets: number | null): string | null {
  if (octets === null || !Number.isFinite(octets) || octets <= 0) return null

  for (const { seuil, suffixe } of UNITES) {
    if (octets >= seuil) {
      const valeur = octets / seuil
      const arrondi = Math.round(valeur * 10) / 10
      const texte = Number.isInteger(arrondi)
        ? String(arrondi)
        : String(arrondi).replace('.', ',')
      return `${texte} ${suffixe}`
    }
  }
  return `${Math.round(octets)} o`
}

/**
 * GUIC-709 — Mémoire du poids, pour ne pas payer un aller-retour réseau à
 * chaque affichage de fiche.
 *
 * Sans elle, une page publique paierait la latence d'un tiers à chaque visite,
 * et la source recevrait autant de requêtes que nous avons de visiteurs. Le
 * poids d'un fichier ne bouge quasiment jamais : c'est exactement ce qui se
 * mémorise.
 *
 * Redis, comme le dédoublonnage des consultations — le projet y garde déjà ses
 * mémoires courtes, on n'introduit pas un second mécanisme de cache.
 *
 * L'ABSENCE de mesure se mémorise aussi, mais plus brièvement : sans ça une
 * source durablement injoignable serait re-sondée à chaque visite, et le pire
 * cas deviendrait le cas fréquent. Plus brièvement, parce qu'une panne se
 * répare et qu'on veut le constater sans attendre un jour entier.
 */
const TTL_MESURE_S = 86_400 // 24 h — un fichier publié ne change plus de taille
const TTL_ABSENCE_S = 900 // 15 min — laisse une source réparée revenir vite
const MARQUEUR_ABSENCE = '-'

export async function poidsFichierMemo(url: string): Promise<number | null> {
  const cle = `ressource:poids:${url}`

  try {
    const memorise = await redis.get(cle)
    if (memorise === MARQUEUR_ABSENCE) return null
    if (memorise) {
      const octets = Number(memorise)
      if (Number.isFinite(octets) && octets > 0) return octets
    }
  } catch {
    // Redis indisponible : on mesure, comme s'il n'y avait pas de mémoire. Une
    // panne de cache ne doit jamais retirer une information à l'utilisateur.
  }

  const octets = await poidsFichier(url)

  try {
    await redis.set(
      cle,
      octets === null ? MARQUEUR_ABSENCE : String(octets),
      'EX',
      octets === null ? TTL_ABSENCE_S : TTL_MESURE_S,
    )
  } catch {
    // Idem : ne pas avoir pu mémoriser ne change rien à ce qu'on rend.
  }

  return octets
}
