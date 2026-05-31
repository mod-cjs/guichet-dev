export const GJ_COLORS = {
  teal:        '#009F76',
  tealDeep:    '#007A5C',
  tealSoft:    '#E1F5EE',
  tealDeep2:   '#005A43',
  yellow:      '#F9C400',
  yellowSoft:  '#FFF8E0',
  yellowInk:   '#6B5300',
  red:         '#D92A1E',
  redSoft:     '#FEE9E7',
  redInk:      '#8A1810',
  blue:        '#1A4ED8',
  blueSoft:    '#E8EFFF',
  green:       '#15803D',
  greenSoft:   '#E5F6E9',
  indigo:      '#6366F1',
  indigoSoft:  '#E0E7FF',
  whatsapp:    '#25D366',
  ink:         '#111111',
  grey:        '#4A4A4A',
  grey2:       '#767676',
  line:        '#DDE5E1',
  lineStrong:  '#B8C4BE',
  bg:          '#F5F7F6',
  surface:     '#FFFFFF',
} as const

// Aliases de compatibilité (ancien naming CJS v1)
export const CJS_COLORS = {
  vert:      GJ_COLORS.teal,
  vertClair: GJ_COLORS.tealDeep,
  or:        GJ_COLORS.yellow,
  rouge:     GJ_COLORS.red,
  noir:      GJ_COLORS.ink,
  gris:      GJ_COLORS.grey,
  fond:      GJ_COLORS.bg,
} as const

export const CJS_FONT   = "var(--gj-font-sans)"
export const CJS_RADIUS = '8px'

export type GJColor  = keyof typeof GJ_COLORS
export type CJSColor = keyof typeof CJS_COLORS
