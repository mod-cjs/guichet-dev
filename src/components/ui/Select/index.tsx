import { SelectHTMLAttributes } from 'react'

interface SelectOption { value: string; label: string }

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, id, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-space-1">
      {label && (
        <label htmlFor={id} className="text-fs-300 font-bold text-color-text-primary">{label}</label>
      )}
      <select
        id={id}
        className={`w-full px-space-3 rounded-gj-md border-[1.5px] bg-white font-[inherit]
          text-[16px] min-h-[var(--tap-input)]
          transition-colors cursor-pointer
          ${error ? 'border-gj-red' : 'border-gj-line focus:border-gj-teal-deep'}
          focus:outline-none focus:ring-[3px] focus:ring-[var(--focus-ring-soft)]
          ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-fs-200 text-gj-red">{error}</p>}
    </div>
  )
}
