import { ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'

type AlertType = 'info' | 'success' | 'warning' | 'error'

interface AlertProps { type?: AlertType; title?: string; children: ReactNode }

const STYLES: Record<AlertType, string> = {
  info:    'bg-gj-blue-soft border-gj-blue text-gj-blue-ink',
  success: 'bg-gj-green-soft border-gj-green text-gj-green-ink',
  warning: 'bg-gj-yellow-soft border-gj-yellow text-gj-yellow-ink',
  error:   'bg-gj-red-soft border-gj-red text-gj-red-ink',
}

/**
 * GUIC-689 — Lot C2.1 : icônes du sprite SVG (jamais de glyphe texte brut
 * comme icône — règle projet). `success`/`warning`/`error` portent déjà leur
 * propre forme (cercle, triangle, croix), donc pas de badge circulaire
 * superflu autour.
 */
const ICONS: Record<AlertType, { name: IconName; label: string }> = {
  info:    { name: 'info',         label: 'Information' },
  success: { name: 'check-circle', label: 'Succès' },
  warning: { name: 'alert',        label: 'Avertissement' },
  error:   { name: 'close',        label: 'Erreur' },
}

export function Alert({ type = 'info', title, children }: AlertProps) {
  const icon = ICONS[type]
  return (
    <div className={`border-[1.5px] rounded-gj-lg p-space-3 flex gap-space-3 ${STYLES[type]}`}>
      <Icon name={icon.name} title={icon.label} size={20} className="flex-shrink-0 mt-[1px]" />
      <div>
        {title && <p className="font-bold text-fs-300 mb-[2px]">{title}</p>}
        <div className="text-fs-300">{children}</div>
      </div>
    </div>
  )
}
