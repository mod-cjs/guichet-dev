/**
 * Sentinelle GUIC-689 — zéro hex en dur dans le périmètre « CTA de conversion
 * magenta + code couleur catégories » (design v5).
 *
 * CLAUDE.md / CJS_AGENT_RULES.md interdisent tout hex en dehors des dossiers
 * de référence design (`design-guichet-` et `public/design-`) : toute couleur
 * doit passer par un token `gj-*` / `cat-*` (variable CSS ou classe Tailwind).
 */
import fs from 'fs'
import path from 'path'

const FILES = [
  'src/components/opportunites/CandidatureModal.tsx',
  'src/components/opportunites/ProgrammeBadges.tsx',
  'src/components/opportunites/OpportuniteDetail.tsx',
  'src/components/opportunites/YayeMatchCard.tsx',
]

describe('Sentinelle — zéro hex en dur (G. hex en dur du périmètre, GUIC-689)', () => {
  it.each(FILES)('%s ne contient aucun hex #RRGGBB en dur', (relPath) => {
    const abs = path.join(process.cwd(), relPath)
    const content = fs.readFileSync(abs, 'utf-8')
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || []
    expect(hexMatches).toEqual([])
  })
})
