import type { LangueItem } from '@/types/profil'

export interface SkillsCardProps {
  competences: string[]
  langues: LangueItem[]
  /** Ouvre l'ajout et le retrait des langues. Sans lui, la carte est consultable. */
  editable?: boolean
}

/**
 * <SkillsCard /> — « Compétences & langues ».
 *
 * Réf `design-guichet-v5/profil-web.jsx` (`SkillsCard` L.546-565). Les langues
 * n'existaient pas en base : le modèle `LangueProfil` a été créé pour cette
 * carte, avec un niveau en enum plutôt qu'un texte libre — au Sénégal le
 * plurilinguisme compte dans le matching (wolof, français, pulaar, sérère), et
 * un texte libre ne s'exploiterait pas.
 *
 * La barre de niveau est DÉCORATIVE : le niveau reste écrit en toutes lettres.
 * Une barre seule ne dit rien à un lecteur d'écran, et rien du tout à qui ne
 * distingue pas les longueurs.
 */
const NIVEAUX: Record<LangueItem['niveau'], { label: string; part: number }> = {
  maternelle:    { label: 'Langue maternelle', part: 100 },
  courant:       { label: 'Courant',           part: 80 },
  intermediaire: { label: 'Intermédiaire',     part: 55 },
  notions:       { label: 'Notions',           part: 30 },
}

export function SkillsCard({ competences, langues }: SkillsCardProps) {
  const rien = competences.length === 0 && langues.length === 0

  return (
    <section
      aria-label="Compétences & langues"
      className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4
        flex flex-col gap-space-4"
    >
      <h2 className="text-fs-400 font-bold text-gj-ink m-0">Compétences &amp; langues</h2>

      {rien ? (
        <p data-testid="competences-vide" className="text-fs-200 text-gj-grey italic m-0">
          Ajoute tes compétences et les langues que tu parles : les recruteurs les
          cherchent en premier.
        </p>
      ) : (
        <>
          {competences.length > 0 && (
            <div>
              <h3 className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey m-0 mb-space-2">
                Compétences
              </h3>
              <div className="flex flex-wrap gap-2">
                {competences.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center text-fs-200 font-semibold
                      bg-gj-bg text-gj-ink border border-gj-line px-space-2 py-1 rounded-gj-pill"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {langues.length > 0 && (
            <div>
              <h3 className="text-fs-100 font-extrabold uppercase tracking-[0.4px] text-gj-grey m-0 mb-space-3">
                Langues
              </h3>
              <ul data-testid="langues-liste" className="list-none p-0 m-0 flex flex-col gap-space-3">
                {langues.map((l) => {
                  const n = NIVEAUX[l.niveau]
                  return (
                    <li key={l.id}>
                      <span className="flex items-baseline justify-between gap-space-2">
                        <span className="text-fs-200 font-extrabold text-gj-ink">{l.langue}</span>
                        <span className="text-fs-100 text-gj-grey">{n.label}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        role="progressbar"
                        className="block mt-1 h-[6px] bg-gj-bg rounded-gj-pill overflow-hidden"
                      >
                        <span
                          className="block h-full bg-gj-teal rounded-gj-pill"
                          style={{ width: `${n.part}%` }}
                        />
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
