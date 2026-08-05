import { Icon, type IconName } from '@/components/ui'
import { libelleType, type ElementParcours } from '@/lib/profil-parcours'

export interface TimelineCardProps {
  parcours: ElementParcours[]
}

/**
 * <TimelineCard /> — parcours en un seul fil chronologique.
 *
 * Réf `design-guichet-v5/profil-web.jsx` (`TimelineCard` L.567-616). Remplace
 * les trois listes séparées (expériences, diplômes, engagements) : un parcours
 * se lit dans le temps, pas par catégorie administrative.
 *
 * Chaque nature garde sa couleur — c'est ce qui permet de balayer le fil et de
 * distinguer d'un coup d'œil une formation d'un emploi.
 */
const ALLURE: Record<ElementParcours['type'], { icon: IconName; pastille: string; texte: string }> = {
  formation:  { icon: 'learning',   pastille: 'bg-gj-teal-soft',   texte: 'text-gj-teal-deep' },
  experience: { icon: 'employment', pastille: 'bg-gj-yellow-soft', texte: 'text-gj-yellow-ink' },
  engagement: { icon: 'users',      pastille: 'bg-gj-blue-soft',   texte: 'text-gj-blue-ink' },
}

export function TimelineCard({ parcours }: TimelineCardProps) {
  return (
    <section
      aria-label="Mon parcours"
      className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4
        flex flex-col gap-space-3"
    >
      <h2 className="text-fs-400 font-bold text-gj-ink m-0">Mon parcours</h2>

      {parcours.length === 0 ? (
        <p data-testid="parcours-vide" className="text-fs-200 text-gj-grey italic m-0">
          Ajoute une formation, une expérience ou un engagement : c&apos;est ce qui
          permet à Yaye de te proposer des opportunités adaptées.
        </p>
      ) : (
        <ol data-testid="parcours-liste" className="list-none p-0 m-0 flex flex-col">
          {parcours.map((el, i) => {
            const allure = ALLURE[el.type]
            const dernier = i === parcours.length - 1
            return (
              <li key={`${el.type}-${el.id}`} className="flex gap-space-3">
                {/* Colonne du fil : pastille + trait de liaison. Le trait s'arrête
                    au dernier élément, sinon il pend dans le vide. */}
                <span className="flex flex-col items-center shrink-0">
                  <span
                    aria-hidden
                    className={`w-9 h-9 rounded-gj-md inline-flex items-center justify-center
                      ${allure.pastille} ${allure.texte}`}
                  >
                    <Icon name={allure.icon} size={18} />
                  </span>
                  {!dernier && <span aria-hidden className="w-px flex-1 bg-gj-line my-1" />}
                </span>

                <span className={`flex-1 min-w-0 ${dernier ? '' : 'pb-space-4'}`}>
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className={`text-fs-100 font-extrabold uppercase tracking-[0.4px] ${allure.texte}`}>
                      {libelleType(el.type)}
                    </span>
                    {el.enCours && (
                      <span className="text-fs-100 font-extrabold text-gj-green-ink bg-gj-green-soft px-space-2 py-[2px] rounded-gj-pill">
                        En cours
                      </span>
                    )}
                  </span>
                  <span className="block text-fs-300 font-extrabold text-gj-ink mt-1">
                    {el.titre}
                  </span>
                  <span className="block text-fs-200 text-gj-grey mt-[2px]">{el.organisation}</span>
                  <span className="block text-fs-100 text-gj-grey-2 mt-[2px]">{el.periode}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
