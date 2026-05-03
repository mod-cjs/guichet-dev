export const CJS_COLORS = {
  vert:       '#1B7A3D',
  vertClair:  '#2EAB58',
  or:         '#E5A823',
  rouge:      '#C8102E',
  noir:       '#1A1A1A',
  gris:       '#6B7280',
  fond:       '#F9FAFB',
} as const

export const CJS_FONT = 'Lexend, sans-serif'
export const CJS_RADIUS = '8px'

export type CJSColor = keyof typeof CJS_COLORS
