import { ReactNode } from 'react'

type AlertType = 'info' | 'success' | 'warning' | 'error'

interface AlertProps { type?: AlertType; title?: string; children: ReactNode }

const STYLES: Record<AlertType, string> = {
  info:    'bg-gj-blue-soft border-gj-blue text-gj-blue-ink',
  success: 'bg-gj-green-soft border-gj-green text-gj-green-ink',
  warning: 'bg-gj-yellow-soft border-gj-yellow text-gj-yellow-ink',
  error:   'bg-gj-red-soft border-gj-red text-gj-red-ink',
}

const ICONS: Record<AlertType, { symbol: string; label: string }> = {
  info:    { symbol: 'i',  label: 'Information' },
  success: { symbol: '✓',  label: 'Succès' },
  warning: { symbol: '!',  label: 'Avertissement' },
  error:   { symbol: '✕',  label: 'Erreur' },
}

export function Alert({ type = 'info', title, children }: AlertProps) {
  const icon = ICONS[type]
  return (
    <div className={`border-[1.5px] rounded-gj-lg p-space-3 flex gap-space-3 ${STYLES[type]}`}>
      <span
        className="w-5 h-5 rounded-full border-[1.5px] border-current flex items-center justify-center
          text-fs-100 font-black flex-shrink-0 mt-[1px]"
        role="img"
        aria-label={icon.label}
      >
        {icon.symbol}
      </span>
      <div>
        {title && <p className="font-bold text-fs-300 mb-[2px]">{title}</p>}
        <div className="text-fs-300">{children}</div>
      </div>
    </div>
  )
}
