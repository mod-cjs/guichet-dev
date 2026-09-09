/**
 * @jest-environment node
 *
 * GUIC-690 — Fondation design v5 : la vérité est calculée, pas déclarée.
 *
 * Le handoff v5 (design-guichet-v5/tokens.css) annote ses couleurs de
 * revendications de contraste (« 7.2:1 sur blanc », « AA passé »). Ces tests
 * ne recopient aucune revendication : ils RECALCULENT les ratios WCAG depuis
 * les valeurs réelles de src/styles/tokens.css. Si une future livraison design
 * casse une paire, c'est la CI qui alerte — pas une relecture humaine.
 *
 * Sentinelles également couvertes :
 *  - tokens admin (--gj-admin-*) strictement intouchés (session parallèle) ;
 *  - focus ring : statu quo #00B287 — l'ambre v5 est REJETÉ (É-04, registre
 *    .agent_context/specs/design-v5-deviations.md : 1.91:1 sur --gj-bg,
 *    WCAG 1.4.11 exige 3:1) ;
 *  - structurels repo conservés (container 1280, plancher 11px, tap 44px).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { GJ_COLORS } from '@/styles/design-tokens'

const ROOT = resolve(__dirname, '../..')
const cssSource = readFileSync(resolve(ROOT, 'src/styles/tokens.css'), 'utf-8')
const layoutSource = readFileSync(resolve(ROOT, 'src/app/layout.tsx'), 'utf-8')

/** Déclarations du bloc :root principal (jusqu'à sa première accolade
 *  fermante — les blocs d'accessibilité data-* plus bas redéfinissent
 *  volontairement certains tokens et ne doivent pas polluer la lecture).
 *  Dernière occurrence gagnante, comme en CSS. */
function parseRootTokens(css: string): Map<string, string> {
  const start = css.indexOf(':root {')
  const end = css.indexOf('\n}', start)
  const block = css.slice(start, end)
  const tokens = new Map<string, string>()
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(m[1], m[2].trim())
  }
  return tokens
}

const tokens = parseRootTokens(cssSource)

function token(name: string): string {
  const v = tokens.get(name)
  if (!v) throw new Error(`Token absent de tokens.css :root — ${name}`)
  return v
}

/** Résout les var(--x) imbriquées jusqu'à une valeur littérale. */
function resolveToken(name: string, depth = 0): string {
  if (depth > 5) throw new Error(`Boucle de var() sur ${name}`)
  const v = token(name)
  const ref = v.match(/^var\((--[\w-]+)\)$/)
  return ref ? resolveToken(ref[1], depth + 1) : v
}

// ---- WCAG 2.x — luminance relative + ratio de contraste ----
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(hexA: string, hexB: string): number {
  const [la, lb] = [luminance(hexA), luminance(hexB)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const WHITE = '#FFFFFF'

describe('GUIC-690 — palette charte v5 (valeurs exactes)', () => {
  it.each([
    ['--gj-teal', '#027f7e'],
    ['--gj-teal-deep', '#026463'],
    ['--gj-yellow', '#f8a309'],
    ['--gj-ink-teal', '#162c5e'],
    ['--gj-ink', '#202020'],
    ['--gj-action', '#ae0057'],
    ['--gj-blue', '#1e35ba'],
    ['--gj-green', '#0E6234'],
    ['--gj-red', '#C1121F'],
    ['--gj-bg', '#F5F7F8'],
  ])('%s = %s', (name, expected) => {
    expect(token(name).toLowerCase()).toBe(expected.toLowerCase())
  })

  it('les 12 couleurs charte --brand-* sont présentes', () => {
    const brands = [
      'ambre', 'orange', 'magenta', 'indigo', 'rouge', 'rose',
      'cyan', 'vert', 'teal', 'navy', 'noir', 'blanc',
    ]
    for (const b of brands) expect(tokens.has(`--brand-${b}`)).toBe(true)
  })

  it('familles v5 nouvelles complètes (action, cyan, vives, ink-teal-2)', () => {
    for (const t of [
      '--gj-action', '--gj-action-deep', '--gj-action-soft', '--gj-action-ink',
      '--gj-cyan', '--gj-cyan-vif', '--gj-cyan-soft', '--gj-cyan-ink',
      '--gj-red-vif', '--gj-rose', '--gj-green-vif', '--gj-ink-teal-2',
    ]) {
      expect(tokens.has(t)).toBe(true)
    }
  })

  it('7 catégories d’offre × (base, -soft, -ink) — code couleur fixe du retour V3', () => {
    const cats = ['emploi', 'stage', 'formation', 'financement', 'volontariat', 'neutre', 'evenement']
    for (const c of cats) {
      expect(tokens.has(`--cat-${c}`)).toBe(true)
      expect(tokens.has(`--cat-${c}-soft`)).toBe(true)
      expect(tokens.has(`--cat-${c}-ink`)).toBe(true)
    }
  })

  it('sémantiques CTA : --color-cta → action, --color-cta-hover → action-deep', () => {
    expect(token('--color-cta')).toBe('var(--gj-action)')
    expect(token('--color-cta-hover')).toBe('var(--gj-action-deep)')
  })

  it('palette programme : --prog-brm ajouté (indigo → navy)', () => {
    expect(tokens.has('--prog-brm')).toBe(true)
    expect(token('--prog-brm-1').toLowerCase()).toBe('#1e35ba')
    expect(token('--prog-brm-2').toLowerCase()).toBe('#162c5e')
  })
})

describe('GUIC-690 — contraste AA recalculé (jamais les revendications)', () => {
  it.each([
    ['--gj-action'], ['--gj-teal-deep'], ['--gj-cyan'],
    ['--gj-green'], ['--gj-red'], ['--gj-blue'],
  ])('%s porte du texte blanc : ≥ 4.5:1 sur blanc', (name) => {
    expect(contrast(resolveToken(name), WHITE)).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['--gj-action-ink', '--gj-action-soft'],
    ['--gj-yellow-ink', '--gj-yellow-soft'],
    ['--gj-red-ink', '--gj-red-soft'],
    ['--gj-blue-ink', '--gj-blue-soft'],
    ['--gj-green-ink', '--gj-green-soft'],
    ['--gj-cyan-ink', '--gj-cyan-soft'],
  ])('%s sur %s : ≥ 4.5:1', (ink, soft) => {
    expect(contrast(resolveToken(ink), resolveToken(soft))).toBeGreaterThanOrEqual(4.5)
  })

  it('chaque pastille de catégorie (-ink sur -soft) passe AA', () => {
    const cats = ['emploi', 'stage', 'formation', 'financement', 'volontariat', 'neutre', 'evenement']
    for (const c of cats) {
      const r = contrast(resolveToken(`--cat-${c}-ink`), resolveToken(`--cat-${c}-soft`))
      expect(r).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('texte courant : ink sur bg et sur surface ≥ 4.5:1, grey sur surface ≥ 4.5:1', () => {
    expect(contrast(resolveToken('--gj-ink'), resolveToken('--gj-bg'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(resolveToken('--gj-ink'), resolveToken('--gj-surface'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(resolveToken('--gj-grey'), resolveToken('--gj-surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('CTA jaune sur fond sombre (règle v5 : le magenta ne passe pas sur sombre)', () => {
    expect(contrast(resolveToken('--gj-yellow'), resolveToken('--gj-ink-teal'))).toBeGreaterThanOrEqual(4.5)
    // le magenta, lui, ne passe effectivement pas sur navy — la règle a une raison
    expect(contrast(resolveToken('--gj-action'), resolveToken('--gj-ink-teal'))).toBeLessThan(4.5)
  })

  it('É-03 — l’ambre ne portera jamais de texte blanc (2:1 recalculé, texte noir requis)', () => {
    expect(contrast(resolveToken('--gj-yellow'), WHITE)).toBeLessThan(3)
    expect(contrast(resolveToken('--gj-ink'), resolveToken('--gj-yellow'))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('GUIC-690 — police Lexend (next/font, jamais le @import Google du handoff)', () => {
  it('--gj-font-sans commence par la variable next/font Lexend et garde la stack système', () => {
    const font = token('--gj-font-sans')
    expect(font).toMatch(/^var\(--font-lexend/)
    expect(font).toContain('"Segoe UI"')
    expect(font).toContain('system-ui')
  })

  it('layout.tsx charge Lexend via next/font/google et pose la variable sur <html>', () => {
    expect(layoutSource).toContain("from 'next/font/google'")
    expect(layoutSource).toMatch(/Lexend\s*\(/)
    expect(layoutSource).toContain("variable: '--font-lexend'")
    expect(layoutSource).toMatch(/<html[^>]*className=/)
  })

  it('aucun @import de fonts.googleapis dans les styles applicatifs', () => {
    for (const f of ['tokens.css', 'globals.css', 'colors_and_type.css', 'rich-prose.css']) {
      const src = readFileSync(resolve(ROOT, 'src/styles', f), 'utf-8')
      expect(src).not.toContain('fonts.googleapis.com')
    }
  })
})

describe('GUIC-690 — sentinelles de coordination et de structure', () => {
  // Refonte admin (GUIC-701+) — thème CLAIR par défaut (la refonte a remplacé le sombre
  // hérité ; cf. décision consolidation « refonte = base »). Variante sombre conservée plus bas.
  it('tokens admin (thème clair refonte) — baseline verrouillée', () => {
    expect(token('--gj-admin-bg')).toBe('#F4F7F5')
    expect(token('--gj-admin-gold')).toBe('#F4B930')
    expect(token('--gj-admin-on-gold')).toBe('#11201C')
    expect(token('--gj-admin-fg')).toBe('#0F2A22')
    expect(token('--gj-admin-fg-72')).toBe('rgba(15,42,34,.74)')
    expect(token('--gj-admin-fg-60')).toBe('rgba(15,42,34,.56)')
    expect(token('--gj-admin-fg-40')).toBe('rgba(15,42,34,.42)')
    expect(token('--gj-admin-surface')).toBe('rgba(16,45,37,.05)')
    expect(token('--gj-admin-border')).toBe('rgba(16,45,37,.12)')
    expect(token('--gj-admin-border-soft')).toBe('rgba(16,45,37,.08)')
    expect(token('--gj-admin-badge-muted-bg')).toBe('rgba(16,45,37,.08)')
  })

  it('É-04 — focus ring bicolore : l’ambre v5 ET l’ancien teal sont rejetés (WCAG 1.4.11)', () => {
    // Le statu quo #00B287 n'atteignait 3:1 sur AUCUNE surface claire : rejeter
    // l'ambre ne suffisait pas, l'existant était hors norme lui aussi.
    expect(contrast('#00B287', resolveToken('--gj-bg'))).toBeLessThan(3)
    expect(contrast('#f8a309', resolveToken('--gj-bg'))).toBeLessThan(3)

    // Indicateur bicolore : le trait porte sur fond clair, le halo sur fond
    // sombre. Ratios détaillés dans tests/unit/focus-ring-wcag.test.ts.
    expect(contrast(token('--focus-ring-color'), resolveToken('--gj-bg'))).toBeGreaterThanOrEqual(3)
    expect(contrast(token('--focus-ring-color'), token('--focus-ring-halo'))).toBeGreaterThanOrEqual(3)
  })

  it('structurels repo conservés (É-01 : container 1280, plancher 11px, tap 44px…)', () => {
    expect(token('--gj-container-x')).toBe('1280px')
    expect(token('--gj-container-max-xl')).toBe('1440px')
    expect(token('--fs-100')).toBe('11px')
    expect(token('--tap-min')).toBe('44px')
    expect(token('--gj-bottom-nav-h')).toBe('72px')
    expect(tokens.has('--gj-topbar-h')).toBe(true)
    expect(tokens.has('--gj-status-live')).toBe(true)
    expect(tokens.has('--gj-skel-from')).toBe(true)
  })

  it('utilitaires v5 présents (.gj-cta, .gj-cat--*, .gj-fill--*, .gj-urgent, .gj-banner)', () => {
    for (const cls of ['.gj-cta', '.gj-cat--emploi', '.gj-cat--neutre', '.gj-fill--ambre', '.gj-urgent', '.gj-banner']) {
      expect(cssSource).toContain(cls)
    }
  })

  it('É-05 — pas de règle a{} globale (impacterait l’admin hors périmètre)', () => {
    expect(cssSource).not.toMatch(/^a\s*\{/m)
  })

  it('design-tokens.ts (GJ_COLORS) est resynchronisé sur tokens.css', () => {
    expect(GJ_COLORS.teal.toLowerCase()).toBe(token('--gj-teal').toLowerCase())
    expect(GJ_COLORS.tealDeep.toLowerCase()).toBe(token('--gj-teal-deep').toLowerCase())
    expect(GJ_COLORS.yellow.toLowerCase()).toBe(token('--gj-yellow').toLowerCase())
    expect(GJ_COLORS.red.toLowerCase()).toBe(token('--gj-red').toLowerCase())
    expect(GJ_COLORS.blue.toLowerCase()).toBe(token('--gj-blue').toLowerCase())
    expect(GJ_COLORS.green.toLowerCase()).toBe(token('--gj-green').toLowerCase())
    expect(GJ_COLORS.ink.toLowerCase()).toBe(token('--gj-ink').toLowerCase())
    expect(GJ_COLORS.bg.toLowerCase()).toBe(token('--gj-bg').toLowerCase())
  })

  it('la section « Design v5 » existe sur /design-preview', () => {
    const preview = readFileSync(resolve(ROOT, 'src/app/design-preview/page.tsx'), 'utf-8')
    expect(preview).toContain('design-v5')
  })
})
