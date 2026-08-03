/**
 * M13 / Data Hub — le contrat et le routage réel doivent coïncider (lot 5).
 *
 * CE QUE CE TEST ATTRAPE, ET QUE RIEN D'AUTRE NE VOIT
 * Dans l'App Router de Next.js, un segment STATIQUE l'emporte sur un segment dynamique.
 * Un dossier `src/app/api/v1/export/<flux>/` masque donc silencieusement la route
 * `[stream]` pour ce nom — sans erreur de compilation, sans test rouge, sans warning.
 *
 * Le défaut est resté invisible jusqu'à une vérification manuelle contre la base : le
 * manifeste du tap annonçait `opportunites` et `programmes` en réplication incrémentale
 * par curseur, alors qu'ils étaient servis par des routes héritées paginant par offset et
 * rendant `meta.total` sans `next_cursor`. Le tap aurait lu UNE page par flux puis se
 * serait arrêté : 4 340 opportunités réduites à quelques centaines dans l'entrepôt, sans
 * la moindre erreur. Exactement la perte silencieuse que tout le dispositif combat.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { streams } from '@/lib/datahub/streams'

const RACINE = join(process.cwd(), 'src', 'app', 'api', 'v1', 'export')

describe('routage des flux d\'export', () => {
  it.each(Object.keys(streams))(
    'le flux %s n\'est masqué par aucune route statique',
    (nom) => {
      expect(existsSync(join(RACINE, nom, 'route.ts'))).toBe(false)
    }
  )

  it('la route dynamique existe', () => {
    expect(existsSync(join(RACINE, '[stream]', 'route.ts'))).toBe(true)
  })

  it('les segments statiques restants ne portent aucun nom de flux', () => {
    // `counts` est un endpoint de service, pas un flux : sa précédence est voulue.
    const reserves = ['counts']
    for (const nom of reserves) {
      expect(Object.keys(streams)).not.toContain(nom)
    }
  })
})
