import type { LabelHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'

export interface FieldLabelProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'> {
  /** ID du champ associé (htmlFor). */
  htmlFor: string
  /** Marque le champ comme requis (astérisque rouge). */
  required?: boolean
  /** Icône optionnelle à gauche du label. */
  icon?: IconName
  children: ReactNode
}

/**
 * <FieldLabel /> — label de champ en majuscules,
 * conforme au design v2 (uppercase 12px, letter-spacing 0.4px,
 * color text-muted, * rouge si required).
 */
export function FieldLabel({
  htmlFor,
  required = false,
  icon,
  children,
  className = '',
  ...rest
}: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`inline-flex items-center gap-1 uppercase
                  text-[12px] font-bold tracking-[0.4px]
                  text-color-text-muted ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      <span>{children}</span>
      {required ? (
        <span className="text-gj-red" aria-hidden="true">
          *
        </span>
      ) : null}
      {required ? <span className="sr-only"> (requis)</span> : null}
    </label>
  )
}
