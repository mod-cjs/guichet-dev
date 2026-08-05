import { Icon } from '@/components/ui'
import { regionLabel } from '@/lib/regions'

export interface ObjectiveCardProps {
  objectif: string | null
  secteurs: string[]
  typesRecherches: string[]
  regionsMobilite: string[]
}

/**
 * <ObjectiveCard /> — « Objectif & secteurs visés ».
 *
 * Réf `design-guichet-v5/profil-web.jsx` (`ObjectiveCard` L.505-544). Les
 * champs `objectif`, `types_recherches` et `regions_mobilite` ont été créés
 * pour cette carte ; `domaines_interet` portait déjà les secteurs, alimentés
 * par l'onboarding.
 *
 * Règle R3 du standard : un bloc dont la donnée manque ne s'affiche pas. Un
 * titre « Mobilité » suivi d'un tiret n'informe de rien et laisse croire à une
 * panne.
 */
const LIBELLE_TYPE: Record<string, string> = {
  emploi:       'Emploi',
  stage:        'Stage',
  formation:    'Formation',
  financement:  'Bourse / Financement',
  volontariat:  'Volontariat',
  entrepreneuriat: 'Entrepreneuriat',
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey m-0 mb-space-2">
        {titre}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-fs-200 font-semibold
      bg-gj-bg text-gj-ink border border-gj-line px-space-2 py-1 rounded-gj-pill">
      {children}
    </span>
  )
}

export function ObjectiveCard({ objectif, secteurs, typesRecherches, regionsMobilite }: ObjectiveCardProps) {
  const rien =
    !objectif?.trim() && secteurs.length === 0 && typesRecherches.length === 0 && regionsMobilite.length === 0

  return (
    <section
      aria-label="Objectif & secteurs visés"
      className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4
        flex flex-col gap-space-4"
    >
      <h2 className="text-fs-400 font-bold text-gj-ink m-0">Objectif &amp; secteurs visés</h2>

      {rien ? (
        <p data-testid="objectif-vide" className="text-fs-200 text-gj-grey italic m-0">
          Dis ce que tu cherches : c&apos;est ce qui oriente les opportunités que
          Yaye te propose.
        </p>
      ) : (
        <>
          {objectif?.trim() && (
            <div className="flex gap-space-3 bg-gj-teal-soft rounded-gj-md p-space-3">
              <span
                aria-hidden
                className="w-[38px] h-[38px] rounded-gj-md shrink-0 bg-gj-surface text-gj-teal-deep
                  inline-flex items-center justify-center"
              >
                <Icon name="target" size={19} />
              </span>
              <div>
                <h3 className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-teal-deep m-0">
                  Mon objectif
                </h3>
                <p className="text-fs-300 font-bold text-gj-ink leading-snug mt-1 m-0">{objectif}</p>
              </div>
            </div>
          )}

          {secteurs.length > 0 && (
            <Bloc titre="Secteurs visés">
              {secteurs.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </Bloc>
          )}

          {typesRecherches.length > 0 && (
            <Bloc titre="Type recherché">
              {typesRecherches.map((t) => (
                <Chip key={t}>{LIBELLE_TYPE[t] ?? t}</Chip>
              ))}
            </Bloc>
          )}

          {regionsMobilite.length > 0 && (
            <Bloc titre="Mobilité">
              {regionsMobilite.map((r) => (
                <Chip key={r}>
                  <Icon name="pin" size={13} className="text-gj-teal-deep" aria-hidden />
                  {regionLabel(r) ?? r}
                </Chip>
              ))}
            </Bloc>
          )}
        </>
      )}
    </section>
  )
}
