// Palette charte Yaakaar 2030 — design v5 (GUIC-690).
// Miroir TS de src/styles/tokens.css — la sentinelle
// tests/unit/tokens-v5-fondation.test.ts vérifie la synchronisation.
export const GJ_COLORS = {
  teal:        '#027f7e',
  tealDeep:    '#026463',
  tealSoft:    '#E2F1F1',
  tealDeep2:   '#014B4A',
  yellow:      '#f8a309',
  yellowSoft:  '#FEF3DE',
  yellowInk:   '#7A4E02',
  red:         '#C1121F',
  redSoft:     '#FEE7E9',
  redInk:      '#96101B',
  action:      '#ae0057',
  actionDeep:  '#8C0046',
  actionSoft:  '#FCE4EE',
  blue:        '#1e35ba',
  blueSoft:    '#E7EAFA',
  cyan:        '#0B5F8D',
  cyanSoft:    '#E2F2FD',
  green:       '#0E6234',
  greenSoft:   '#E4F6EB',
  indigo:      '#6366F1',
  indigoSoft:  '#E0E7FF',
  whatsapp:    '#25D366',
  inkTeal:     '#162c5e',
  ink:         '#202020',
  grey:        '#4A4A4A',
  grey2:       '#767676',
  line:        '#E0E4E6',
  lineStrong:  '#B9C1C4',
  bg:          '#F5F7F8',
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
