/**
 * GUIC-684 — Badges des programmes sectoriels de rattachement.
 *
 * Rend visible côté bénéficiaire une information collectée partout ailleurs (admin,
 * recruteur, conseiller, curation) mais qui n'était affichée nulle part : de quel
 * programme CJS relève ce contenu.
 *
 * Les couleurs viennent des tokens `--prog-*` (mapping `src/lib/programmes.ts`), donc
 * un programme garde la même identité visuelle partout dans le produit.
 */
import { getProgramme } from '@/lib/programmes'

export interface ProgrammeBadgesProps {
  programmes: { slug: string; nom: string }[]
  /** Rendu sur fond sombre (hero d'une fiche) — inverse le contraste. */
  surFondSombre?: boolean
}

export function ProgrammeBadges({ programmes, surFondSombre = false }: ProgrammeBadgesProps) {
  // Un contenu antérieur au ticket n'a pas de rattachement : on n'affiche pas de vide.
  if (programmes.length === 0) return null

  return (
    <ul
      aria-label="Programmes de rattachement"
      className="flex flex-wrap gap-2 list-none p-0 m-0"
    >
      {programmes.map((p) => {
        const gradient = getProgramme(p.slug)?.gradientToken
        return (
          <li key={p.slug}>
            <span
              className={[
                'inline-flex items-center gap-1 px-3 py-[3px] rounded-gj-pill',
                'text-fs-100 font-bold leading-none',
                surFondSombre ? 'text-color-text-onDark' : 'text-color-text-primary',
              ].join(' ')}
              style={
                gradient
                  ? { background: gradient, color: 'var(--gj-surface)' }
                  : { background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }
              }
            >
              {p.nom}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
