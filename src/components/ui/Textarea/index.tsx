import { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

/**
 * Zone de texte multiligne — même grammaire visuelle que `Input` (label/hint/error,
 * tokens `gj-*`, focus-ring). Utilisée pour les champs longs des opportunités
 * (description, mission, profil recherché, conditions).
 */
export function Textarea({ label, error, hint, id, className = '', rows = 4, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-space-1">
      {label && (
        <label htmlFor={id} className="text-fs-300 font-bold text-color-text-primary">
          {label}
          {props.required && <span className="text-gj-red ml-1" aria-hidden>*</span>}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`w-full px-space-3 py-space-2 rounded-gj-md border-[1.5px] bg-white font-[inherit]
          text-[16px] leading-relaxed resize-y
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
