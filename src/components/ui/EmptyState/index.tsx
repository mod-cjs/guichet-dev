import { Icon, type IconName } from '@/components/ui/Icon'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon = 'sparkle', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="bg-white border-[1.5px] border-gj-line rounded-gj-xl p-space-5 text-center">
      <div
        className="inline-flex items-center justify-center mx-auto mb-space-2"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--gj-teal-soft, rgba(10,128,127,.1))',
          color: 'var(--gj-teal-deep)',
        }}
        aria-hidden
      >
        <Icon name={icon} size={32} />
      </div>
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
