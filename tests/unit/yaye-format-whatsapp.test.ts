/**
 * @jest-environment node
 *
 * Formateur de sortie WhatsApp (GUIC-259, Lot 0) : blocs → texte.
 */
import { formatBlocksForWhatsApp } from '@/lib/ia/format-whatsapp'

test('bloc texte → texte brut', () => {
  expect(formatBlocksForWhatsApp([{ kind: 'text', text: 'Bonjour Awa' }])).toBe('Bonjour Awa')
})

test('opportunités → liste numérotée + deep link', () => {
  const out = formatBlocksForWhatsApp([
    { kind: 'text', text: 'Voici une offre :' },
    {
      kind: 'opportunites',
      items: [
        { id: 'o1', slug: 'dev-web', titre: 'Développeur web', type: 'Emploi', organisation: 'ACME', region: 'Dakar', deadline: null },
      ],
    },
  ])
  expect(out).toContain('1. *Développeur web*')
  expect(out).toContain('Emploi · Dakar')
  expect(out).toContain('/opportunites/dev-web')
})

test('tronque à 4096 caractères max (contrainte Meta)', () => {
  const out = formatBlocksForWhatsApp([{ kind: 'text', text: 'a'.repeat(5000) }])
  expect(out.length).toBeLessThanOrEqual(4096)
  expect(out.endsWith('…')).toBe(true)
})

test('aucun bloc → message par défaut', () => {
  expect(formatBlocksForWhatsApp([])).toMatch(/pas de réponse/i)
})
