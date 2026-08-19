/**
 * @jest-environment node
 *
 * GUIC-259 (Phase 1) — clôture qualifiée d'escalade : la note de résolution est persistée
 * à la résolution, ignorée avant, effacée si on rouvre. Base réelle.
 */
import { prisma } from '@/lib/prisma'
import { setEscaladeStatut } from '@/lib/ia/admin/escalades'

jest.setTimeout(30000)

const PREFIX = 'test-esc-note-259'
let escId = ''

async function purge() {
  await prisma.escaladeYaye.deleteMany({ where: { sessionId: { startsWith: PREFIX } } })
}

beforeEach(async () => {
  await purge()
  const e = await prisma.escaladeYaye.create({
    data: { sessionId: `${PREFIX}-s1`, canal: 'whatsapp', priorite: 1, signalDanger: 'violence', statut: 'en_attente' },
    select: { id: true },
  })
  escId = e.id
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('GUIC-259 — setEscaladeStatut + resolutionNote', () => {
  it('résolue avec note → note persistée + traitePar/traiteA posés', async () => {
    await setEscaladeStatut(escId, 'resolue', 'conseiller-x', '  Rappel effectué, orientée vers le centre. ')
    const e = await prisma.escaladeYaye.findUnique({ where: { id: escId } })
    expect(e?.statut).toBe('resolue')
    expect(e?.resolutionNote).toBe('Rappel effectué, orientée vers le centre.') // trim
    expect(e?.traitePar).toBe('conseiller-x')
    expect(e?.traiteA).not.toBeNull()
  })

  it('prise en charge (pas résolue) → la note est ignorée (null)', async () => {
    await setEscaladeStatut(escId, 'prise_en_charge', 'conseiller-x', 'note prématurée')
    const e = await prisma.escaladeYaye.findUnique({ where: { id: escId } })
    expect(e?.resolutionNote).toBeNull()
    expect(e?.traitePar).toBe('conseiller-x')
  })

  it('résolue puis rouverte (en_attente) → note effacée + affectation effacée', async () => {
    await setEscaladeStatut(escId, 'resolue', 'conseiller-x', 'fait')
    await setEscaladeStatut(escId, 'en_attente', null)
    const e = await prisma.escaladeYaye.findUnique({ where: { id: escId } })
    expect(e?.resolutionNote).toBeNull()
    expect(e?.traitePar).toBeNull()
    expect(e?.traiteA).toBeNull()
  })

  it('résolue avec note vide/espaces → null (pas de note fantôme)', async () => {
    await setEscaladeStatut(escId, 'resolue', 'conseiller-x', '   ')
    const e = await prisma.escaladeYaye.findUnique({ where: { id: escId } })
    expect(e?.resolutionNote).toBeNull()
  })
})
