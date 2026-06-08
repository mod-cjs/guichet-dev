import { Icon, type IconName } from '../Icon'

interface EmptyStateProps {
  /** Icône du sprite SVG (préféré au design v2). */
  icon?: IconName
  /** @deprecated Préférer `icon`. Fallback emoji legacy — gardé pour rétro-compatibilité. */
  emoji?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, emoji, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="bg-white border-[1.5px] border-gj-line rounded-gj-xl p-space-5 text-center">
      {icon ? (
        <div className="mb-space-2 inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-gj-teal-soft text-gj-teal-deep">
          <Icon name={icon} size={32} />
        </div>
      ) : (
        <div className="text-[48px] mb-space-2 leading-none" aria-hidden="true">{emoji ?? '🌱'}</div>
      )}
      <h3 className="text-fs-500 font-bold text-color-text-primary mb-[6px]">{title}</h3>
      {description && (
        <p className="text-fs-300 text-color-text-secondary max-w-[240px] mx-auto mb-space-3 leading-snug">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-gj-teal text-white rounded-gj-md font-bold text-fs-300
            min-h-[var(--tap-min)] px-space-4 cursor-pointer border-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
