import { ReactNode } from 'react'

type AlertType = 'info' | 'success' | 'warning' | 'error'

interface AlertProps { type?: AlertType; title?: string; children: ReactNode }

const STYLES: Record<AlertType, string> = {
  info:    'bg-gj-blue-soft border-gj-blue text-gj-blue-ink',
  success: 'bg-gj-green-soft border-gj-green text-gj-green-ink',
  warning: 'bg-gj-yellow-soft border-gj-yellow text-gj-yellow-ink',
  error:   'bg-gj-red-soft border-gj-red text-gj-red-ink',
}

const ICONS: Record<AlertType, string> = {
  info: 'ℹ️', success: '✅', warning: '⚠️', error: '🔴',
}

export function Alert({ type = 'info', title, children }: AlertProps) {
  return (
    <div className={`border-[1.5px] rounded-gj-lg p-space-3 flex gap-space-3 ${STYLES[type]}`}>
      <span className="text-fs-500 flex-shrink-0 leading-none mt-[1px]">{ICONS[type]}</span>
      <div>
        {title && <p className="font-bold text-fs-300 mb-[2px]">{title}</p>}
        <div className="text-fs-200">{children}</div>
      </div>
    </div>
  )
}
