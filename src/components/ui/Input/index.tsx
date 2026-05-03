import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-cjs-noir">
          {label}
          {props.required && <span className="text-cjs-rouge ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-3 rounded-cjs border transition-colors duration-200
          ${error ? 'border-cjs-rouge focus:ring-cjs-rouge' : 'border-gray-300 focus:border-cjs-vert'}
          focus:outline-none focus:ring-2 focus:ring-opacity-20
          disabled:bg-gray-50 disabled:text-cjs-gris ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-cjs-gris">{hint}</p>}
      {error && <p className="text-xs text-cjs-rouge">{error}</p>}
    </div>
  )
}
