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
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-cjs-noir">{label}</label>
      )}
      <select
        id={id}
        className={`w-full px-4 py-3 rounded-cjs border bg-white transition-colors
          ${error ? 'border-cjs-rouge' : 'border-gray-300 focus:border-cjs-vert'}
          focus:outline-none focus:ring-2 focus:ring-cjs-vert focus:ring-opacity-20 ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-cjs-rouge">{error}</p>}
    </div>
  )
}
