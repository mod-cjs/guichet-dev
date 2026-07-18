import type { ReactNode } from 'react'
import { Icon, type IconName } from '../../Icon'
import { YayeAvatar } from '../YayeAvatar'

export interface YayeAction {
  icon: IconName
  label: ReactNode
}

export interface YayeActionButton {
  label: string
  onClick?: () => void
  primary?: boolean
}

export interface YayeActionCardProps {
  /** Titre encadré (rendu au-dessus des actions). Défaut "Yaye a agi pour toi". */
  title?: string
  /** Sous-titre (ex: "3 actions · à valider"). */
  subtitle?: string
  /** Liste des actions effectuées par Yaye. */
  actions: YayeAction[]
  /** Boutons CTA en pied (2 max recommandés). */
  buttons?: YayeActionButton[]
  className?: string
}

/**
 * YayeActionCard — carte "Yaye a agi pour toi" dans la conversation IA.
 *
 * Design v4 (yaye-web.jsx §Carte d'action) :
 * - Header avec **avatar Yaye (Y)** + titre en casse normale (teal-deep) → « c'est Yaye qui a agi »
 * - Liste de rows actions (icon + label avec pastille verte)
 * - Grid 2 boutons (primary teal-deep + secondary outlined)
 */
export function YayeActionCard({
  title = 'Yaye a agi pour toi',
  subtitle,
  actions,
  buttons,
  className = '',
}: YayeActionCardProps) {
  return (
    <div
      className={`bg-white border-[1.5px] border-gj-teal rounded-gj-xl overflow-hidden ${className}`}
    >
      <div
        className="flex items-center gap-space-2 px-space-3 py-space-2 border-b border-gj-line"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--gj-teal-soft), var(--gj-surface))' }}
      >
        <YayeAvatar size={24} />
        <div className="flex-1 min-w-0">
          <div className="text-fs-200 font-bold text-gj-teal-deep">{title}</div>
          {subtitle && <div className="text-fs-100 text-gj-grey">{subtitle}</div>}
        </div>
      </div>

      <ul className="flex flex-col gap-space-2 px-space-3 py-space-3 list-none m-0">
        {actions.map((a, i) => (
          <li key={i} className="flex items-center gap-space-2 text-fs-300 text-gj-ink">
            <span
              className="w-[18px] h-[18px] rounded-full bg-gj-green-soft text-gj-green inline-flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Icon name={a.icon} size={11} />
            </span>
            <span className="min-w-0">{a.label}</span>
          </li>
        ))}
      </ul>

      {buttons && buttons.length > 0 && (
        <div className="flex gap-space-2 px-space-3 pb-space-3">
          {buttons.map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={b.onClick}
              className={`flex-1 rounded-gj-lg px-space-3 py-space-2 text-fs-300 font-bold
                ${b.primary
                  ? 'bg-gj-teal-deep text-white border-0'
                  : 'bg-white text-gj-teal-deep border-[1.5px] border-gj-line'}
              `}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
