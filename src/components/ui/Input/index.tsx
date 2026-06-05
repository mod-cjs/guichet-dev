import { InputHTMLAttributes } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  /** Icône optionnelle affichée à gauche de l'input. */
  prefixIcon?: IconName
}

export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  prefixIcon,
  ...props
}: InputProps) {
  const padLeft = prefixIcon ? 'pl-[40px]' : 'px-space-3'
  const padRight = prefixIcon ? 'pr-space-3' : ''
  return (
    <div className="flex flex-col gap-space-1">
      {label && (
        <label htmlFor={id} className="text-fs-300 font-bold text-color-text-primary">
          {label}
          {props.required && <span className="text-gj-red ml-1" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        {prefixIcon && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-space-3 top-1/2 -translate-y-1/2
              text-color-text-muted inline-flex items-center"
          >
            <Icon name={prefixIcon} size={18} />
          </span>
        )}
        <input
          id={id}
          className={`w-full ${padLeft} ${padRight} rounded-gj-md border-[1.5px] bg-white font-[inherit]
            text-[16px] min-h-[var(--tap-input)]
            transition-colors duration-200
            ${error
              ? 'border-gj-red focus:border-gj-red'
              : 'border-gj-line focus:border-gj-teal-deep'
            }
            focus:outline-none focus:ring-[3px] focus:ring-[var(--focus-ring-soft)]
            disabled:bg-gj-bg disabled:text-gj-grey
            ${className}`}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-fs-200 text-color-text-muted">{hint}</p>}
      {error && <p className="text-fs-200 text-gj-red">{error}</p>}
    </div>
  )
}
