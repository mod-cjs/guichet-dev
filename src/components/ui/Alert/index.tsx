import { ReactNode } from 'react'

type AlertType = 'info' | 'success' | 'warning' | 'error'

interface AlertProps { type?: AlertType; title?: string; children: ReactNode }

const STYLES: Record<AlertType, string> = {
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-cjs-vert',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error:   'bg-red-50 border-red-200 text-cjs-rouge',
}

export function Alert({ type = 'info', title, children }: AlertProps) {
  return (
    <div className={`border rounded-cjs p-4 ${STYLES[type]}`}>
      {title && <p className="font-semibold mb-1">{title}</p>}
      <div className="text-sm">{children}</div>
    </div>
  )
}
