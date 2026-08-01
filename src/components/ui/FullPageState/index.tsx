import type { ReactNode } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '../Icon'

export type FullPageStateTone = 'red' | 'grey' | 'teal' | 'yellow'

export interface FullPageStateAction {
  label: string
  /** Action déclenchée au clic (bouton). Ignoré si `href` est fourni. */
  onClick?: () => void
  /** Lien de navigation (rendu en `<Link>` Next). Prime sur `onClick`. */
  href?: string
  icon?: IconName
}

export interface FullPageStateProps {
  icon: IconName
  tone: FullPageStateTone
  title: string
  body?: ReactNode
  primaryAction?: FullPageStateAction
  secondaryAction?: FullPageStateAction
}

/** Pastille tonale (fond, couleur) — miroir du `StateBlock` v5 (Lot 13). */
const TONES: Record<FullPageStateTone, string> = {
  red:    'bg-gj-red-soft text-gj-red',
  grey:   'bg-gj-bg text-gj-grey',
  teal:   'bg-gj-teal-soft text-gj-teal-deep',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
}

const PRIMARY_CLASS =
  'w-full min-h-[50px] rounded-gj-lg bg-gj-teal-deep text-white font-black text-fs-300 ' +
  'inline-flex items-center justify-center gap-2 no-underline'
const SECONDARY_CLASS =
  'w-full min-h-[48px] rounded-gj-lg bg-white text-gj-teal-deep border-[1.5px] border-gj-line ' +
  'font-black text-fs-300 inline-flex items-center justify-center gap-2 no-underline'

function ActionControl({ action, className }: { action: FullPageStateAction; className: string }) {
  const content = (
    <>
      {action.icon && <Icon name={action.icon} size={17} />}
      {action.label}
    </>
  )
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {content}
    </button>
  )
}

/**
 * FullPageState — GUIC-689 (Lot D3, `design-guichet-v5/system-states.jsx`
 * `StateBlock` L23-38).
 *
 * État plein écran générique (erreur, hors-ligne, etc.) : pastille tonale
 * 84×84, titre, corps, 1 à 2 boutons empilés pleine largeur (48-50px de
 * haut). Utilisé par les `error.tsx` de segment ainsi que par tout écran
 * ayant besoin d'un état bloquant plein écran.
 */
export function FullPageState({ icon, tone, title, body, primaryAction, secondaryAction }: FullPageStateProps) {
  return (
    <div className="flex flex-col items-center text-center gap-space-3 px-space-4 py-space-5 max-w-[380px] mx-auto">
      <span
        className={`w-[84px] h-[84px] rounded-[24px] inline-flex items-center justify-center flex-shrink-0 ${TONES[tone]}`}
      >
        <Icon name={icon} size={40} />
      </span>
      <h2 className="text-[22px] font-black text-gj-ink leading-tight m-0">{title}</h2>
      {body && <p className="text-fs-300 text-gj-grey leading-relaxed m-0">{body}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col gap-space-2 w-full mt-space-1">
          {primaryAction && <ActionControl action={primaryAction} className={PRIMARY_CLASS} />}
          {secondaryAction && <ActionControl action={secondaryAction} className={SECONDARY_CLASS} />}
        </div>
      )}
    </div>
  )
}
