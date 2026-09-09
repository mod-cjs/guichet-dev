import { Icon } from '@/components/ui'
import type { CritereScore } from '@/lib/profil-score'

export interface CompletionChecklistProps {
  etat: { score: number; criteres: CritereScore[] }
}

/**
 * <CompletionChecklist /> — carte d'aside du profil.
 *
 * Réf `design-guichet-v5/profil-web.jsx` (`CompletionChecklist` L.178-225) :
 * score en gros, barre, puis les étapes avec leur gain, la plus rentable mise
 * en avant sur fond ambre.
 *
 * Les gains viennent du barème réel (`CRITERES_SCORE`), pas de la maquette :
 * elle annonce « Ajouter ton CV +18 % » alors que le CV ne pèse rien dans
 * notre score. Un pourcentage affiché doit être celui que le score accorde
 * vraiment, sinon on promet une progression qui n'arrivera pas.
 */
export function CompletionChecklist({ etat }: CompletionChecklistProps) {
  // Les étapes restantes d'abord, la plus rentable en tête : c'est l'ordre
  // utile quand on cherche quoi faire, pas l'ordre du formulaire.
  const restantes = etat.criteres.filter((c) => !c.rempli).sort((a, b) => b.poids - a.poids)
  const faites = etat.criteres.filter((c) => c.rempli)
  const plusForte = restantes[0]

  return (
    <section
      aria-label="Complétion du profil"
      className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4
        flex flex-col gap-space-3"
    >
      <h2 className="text-fs-300 font-extrabold text-gj-ink m-0">Complétion du profil</h2>

      <div className="flex items-center gap-space-3">
        <span
          data-testid="completion-score"
          className="text-fs-700 font-black text-gj-teal-deep leading-none"
        >
          {etat.score} %
        </span>
        <div className="flex-1">
          {/* Décorative : le pourcentage juste à gauche porte déjà l'information,
              et le bandeau hero expose déjà un `progressbar` pour la même valeur.
              En annoncer deux ferait répéter la même chose au lecteur d'écran. */}
          <div className="h-2 bg-gj-bg rounded-gj-pill overflow-hidden" aria-hidden>
            <span
              className="block h-full bg-gj-teal rounded-gj-pill"
              style={{ width: `${etat.score}%` }}
            />
          </div>
          <p className="text-fs-100 text-gj-grey mt-1 m-0">
            {restantes.length === 0
              ? 'Ton profil est complet.'
              : `Plus que ${restantes.length} ${restantes.length > 1 ? 'étapes' : 'étape'} pour un profil béton.`}
          </p>
        </div>
      </div>

      <ul data-testid="completion-etapes" className="list-none p-0 m-0 flex flex-col gap-[2px]">
        {restantes.map((c) => {
          const forte = c === plusForte
          return (
            <li
              key={c.cle}
              data-testid={forte ? 'completion-etape-forte' : undefined}
              className={`flex items-center gap-space-2 px-space-2 py-space-2 rounded-gj-md
                ${forte ? 'bg-gj-yellow-soft border-[1.5px] border-gj-yellow' : 'border-[1.5px] border-transparent'}`}
            >
              <span
                aria-hidden
                className="w-5 h-5 rounded-full shrink-0 border-[1.5px] border-gj-line-strong bg-gj-surface"
              />
              <span
                className={`flex-1 text-fs-200 ${forte ? 'font-extrabold' : 'font-semibold'} text-gj-ink`}
              >
                {c.label}
              </span>
              <span className="text-fs-100 font-extrabold text-gj-teal-deep">+{c.poids} %</span>
            </li>
          )
        })}

        {faites.map((c) => (
          <li
            key={c.cle}
            className="flex items-center gap-space-2 px-space-2 py-space-2 rounded-gj-md
              border-[1.5px] border-transparent"
          >
            <span
              aria-hidden
              className="w-5 h-5 rounded-full shrink-0 bg-gj-green text-white
                inline-flex items-center justify-center"
            >
              <Icon name="check" size={12} />
            </span>
            <span className="flex-1 text-fs-200 font-semibold text-gj-grey">{c.label}</span>
            <span className="sr-only">acquis</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
