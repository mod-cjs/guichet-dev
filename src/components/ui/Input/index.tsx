import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-space-1">
      {label && (
        <label htmlFor={id} className="text-fs-300 font-bold text-color-text-primary">
          {label}
          {props.required && <span className="text-gj-red ml-1" aria-hidden>*</span>}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-space-3 rounded-gj-md border-[1.5px] bg-white font-[inherit]
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
      {hint && !error && <p className="text-fs-200 text-color-text-muted">{hint}</p>}
      {error && <p className="text-fs-200 text-gj-red">{error}</p>}
    </div>
  )
}
