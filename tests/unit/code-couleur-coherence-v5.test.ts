/**
 * GUIC-689 — « Une catégorie = une couleur, PARTOUT » (Reponse au retour
 * design V3 §2).
 *
 * L'audit de conformité a montré que corriger écran par écran ne suffit pas :
 * Conférence était passée en teal dans les cartes de liste mais restait rouge
 * sur la fiche détail, dans « Mes inscriptions » et au calendrier ; le type PDF
 * était passé en cyan sur la fiche ressource mais restait rouge sur la carte.
 * Résultat : un même objet change de couleur selon l'écran, et le rouge — qui
 * ne doit coder QUE l'urgence d'échéance — se remet à coder un type.
 *
 * Cette sentinelle vérifie la cohérence entre TOUTES les surfaces, pas la
 * conformité d'un fichier isolé.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

/** Extrait le mapping `Type: 'valeur'` d'un bloc de source. */
function mapping(src: string, blocStart: string, blocEnd: string): Record<string, string> {
  const i = src.indexOf(blocStart)
  const bloc = src.slice(i, blocEnd ? src.indexOf(blocEnd, i) : i + 400)
  const out: Record<string, string> = {}
  for (const m of bloc.matchAll(/(Formation|Atelier|Forum|Webinar|Conference)\s*:\s*'([^']+)'/g)) {
    out[m[1]] = m[2]
  }
  return out
}

// Référence v5 : design-guichet-v5/events-data.jsx (EV_TONES) —
// atelier = teal, formation = jaune, conférence = teal.
const FAMILLE_ATTENDUE: Record<string, string> = {
  Atelier: 'teal',
  Formation: 'yellow',
  Forum: 'blue',
  Webinar: 'green',
  Conference: 'teal',
}

describe('GUIC-689 — événements : un type = une couleur sur toutes les surfaces', () => {
  const surfaces: { fichier: string; debut: string; fin: string }[] = [
    { fichier: 'src/components/evenements/EvenementCard.tsx', debut: 'TYPE_BADGE', fin: 'TYPE_ICON' },
    { fichier: 'src/components/evenements/EvenementDetailHero.tsx', debut: 'TYPE_BADGE', fin: 'export' },
    { fichier: 'src/components/evenements/MesInscriptionsClient.tsx', debut: 'TYPE_BADGE', fin: 'export' },
  ]

  it.each(surfaces)('$fichier suit la famille de couleur de la référence v5', ({ fichier, debut, fin }) => {
    const m = mapping(read(fichier), debut, fin)
    expect(Object.keys(m).length).toBeGreaterThan(0)
    for (const [type, famille] of Object.entries(m)) {
      expect(famille).toBe(FAMILLE_ATTENDUE[type])
    }
  })

  it('le calendrier utilise les mêmes familles (Atelier ≠ Formation inversés)', () => {
    const src = read('src/components/evenements/AgendaCalendrier.tsx')
    const bloc = src.slice(src.indexOf('TYPE_PASTILLE'), src.indexOf('TYPE_PASTILLE') + 400)
    for (const [type, famille] of Object.entries(FAMILLE_ATTENDUE)) {
      const m = bloc.match(new RegExp(`${type}\\s*:\\s*'bg-gj-([a-z-]+)'`))
      expect(m?.[1]).toBe(famille)
    }
  })

  it('aucune surface événement ne code un type en rouge', () => {
    for (const f of [
      'src/components/evenements/EvenementCard.tsx',
      'src/components/evenements/EventCard.tsx',
      'src/components/evenements/EvenementDetailHero.tsx',
      'src/components/evenements/MesInscriptionsClient.tsx',
      'src/components/evenements/AgendaCalendrier.tsx',
    ]) {
      const src = read(f)
      for (const m of src.matchAll(/(Formation|Atelier|Forum|Webinar|Conference)\s*:\s*'([^']*red[^']*)'/g)) {
        throw new Error(`${f} : le type ${m[1]} est codé en rouge ("${m[2]}")`)
      }
    }
  })
})

describe('GUIC-689 — ressources : le type PDF n’est rouge sur aucune surface', () => {
  it.each([
    'src/components/ressources/ResourceCard.tsx',
    'src/components/ressources/RessourceDetailHero.tsx',
  ])('%s : PDF hors palette rouge', (f) => {
    const ligne = read(f).split('\n').find((l) => l.trim().startsWith('PDF:')) ?? ''
    expect(ligne).not.toMatch(/red/)
  })
})
