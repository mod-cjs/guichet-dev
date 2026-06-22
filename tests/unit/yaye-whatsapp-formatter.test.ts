/**
 * @jest-environment node
 *
 * Formateur de sortie multi-canal WhatsApp (GUIC-263/317, Lot 5).
 * - planWhatsAppDelivery : PUR — choix texte / boutons (≤3) / liste (4–10), mapping value→id.
 * - sendYayeBlocksToWhatsApp : émet le bon type Meta + retourne les formats.
 * - shouldSuggestWeb : bascule web une seule fois au seuil.
 */

const mockText = jest.fn()
const mockButtons = jest.fn()
const mockList = jest.fn()
jest.mock('@/lib/whatsapp', () => ({
  sendTextMessage: (...a: unknown[]) => mockText(...a),
  sendInteractiveButtons: (...a: unknown[]) => mockButtons(...a),
  sendInteractiveList: (...a: unknown[]) => mockList(...a),
}))
jest.mock('@/lib/app-url', () => ({ appUrl: () => 'https://app.test' }))

import { planWhatsAppDelivery, sendYayeBlocksToWhatsApp, shouldSuggestWeb } from '@/lib/ia/format-whatsapp'
import type { YayeBlock } from '@/lib/ia/blocks'

beforeEach(() => jest.clearAllMocks())

const textBlock: YayeBlock = { kind: 'text', text: 'Voici une offre **clé**' }
const oppBlock: YayeBlock = { kind: 'opportunites', items: [{ id: 'o1', slug: 'stage-x', titre: 'Stage X', type: 'stage', organisation: 'ACME', region: 'Dakar', deadline: null }] }
const qr = (n: number): YayeBlock => ({ kind: 'quick_replies', replies: Array.from({ length: n }, (_, i) => ({ label: `Choix ${i + 1}`, value: `action ${i + 1}` })) })

// ── planWhatsAppDelivery (pur) ──────────────────────────────────────────────────

test('plan : texte seul → pas d’interactif', () => {
  const p = planWhatsAppDelivery([textBlock])
  expect(p.interactive).toBeNull()
  expect(p.text).toContain('Voici une offre')
})

test('plan : opportunités → liste numérotée + deep link', () => {
  const p = planWhatsAppDelivery([textBlock, oppBlock])
  expect(p.text).toMatch(/1\. \*Stage X\*/)
  expect(p.text).toContain('https://app.test/opportunites/stage-x')
})

test('plan : ≤3 quick_replies → boutons, value encodée dans id', () => {
  const p = planWhatsAppDelivery([textBlock, qr(3)])
  expect(p.interactive?.kind).toBe('buttons')
  expect(p.interactive?.options[0]).toEqual({ id: 'action 1', title: 'Choix 1' })
})

test('plan : 4–10 quick_replies → liste', () => {
  const p = planWhatsAppDelivery([textBlock, qr(5)])
  expect(p.interactive?.kind).toBe('list')
  expect(p.interactive?.options).toHaveLength(5)
})

test('plan : quick_replies seuls → pas de texte de repli', () => {
  const p = planWhatsAppDelivery([qr(2)])
  expect(p.text).toBe('')
  expect(p.interactive?.kind).toBe('buttons')
})

// ── sendYayeBlocksToWhatsApp ────────────────────────────────────────────────────

test('send : texte seul → sendTextMessage, formats [text]', async () => {
  const { formats } = await sendYayeBlocksToWhatsApp('221770000000', [textBlock])
  expect(mockText).toHaveBeenCalledTimes(1)
  expect(mockButtons).not.toHaveBeenCalled()
  expect(formats).toEqual(['text'])
})

test('send : texte + 2 quick_replies → texte + boutons', async () => {
  const { formats } = await sendYayeBlocksToWhatsApp('221770000000', [textBlock, qr(2)])
  expect(mockText).toHaveBeenCalledTimes(1)
  expect(mockButtons).toHaveBeenCalledTimes(1)
  expect(formats).toEqual(['text', 'interactive_buttons'])
})

test('send : 6 quick_replies → liste interactive', async () => {
  const { formats } = await sendYayeBlocksToWhatsApp('221770000000', [textBlock, qr(6)])
  expect(mockList).toHaveBeenCalledTimes(1)
  expect(formats).toContain('interactive_list')
})

// ── bascule web ─────────────────────────────────────────────────────────────────

test('shouldSuggestWeb : vrai une seule fois au seuil (5 échanges = 10 entrées)', () => {
  expect(shouldSuggestWeb(8)).toBe(false)
  expect(shouldSuggestWeb(10)).toBe(true)
  expect(shouldSuggestWeb(12)).toBe(false)
})
