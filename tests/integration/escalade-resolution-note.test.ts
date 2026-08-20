/**
 * @jest-environment node
 *
 * GUIC-259 (Phase 1) — clôture qualifiée d'escalade : la note de résolution est persistée
 * à la résolution, ignorée avant, effacée si on rouvre. Base réelle.
 */
import { prisma } from '@/lib/prisma'
import { setEscaladeStatut, EscaladeConflictError } from '@/lib/ia/admin/escalades'

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

  it('résolue puis rouverte (en_attente) → note CONSERVÉE (pas de perte silencieuse), affectation effacée', async () => {
    await setEscaladeStatut(escId, 'resolue', 'conseiller-x', 'Rappel effectué, dossier suivi.')
    await setEscaladeStatut(escId, 'en_attente', null)
    const e = await prisma.escaladeYaye.findUnique({ where: { id: escId } })
    // La note du dernier traitement reste comme historique — seule l'affectation est effacée.
    expect(e?.resolutionNote).toBe('Rappel effectué, dossier suivi.')
    expect(e?.traitePar).toBeNull()
    expect(e?.traiteA).toBeNull()
  })

  it('résolue avec note vide/espaces → null (pas de note fantôme)', async () => {
    await setEscaladeStatut(escId, 'resolue', 'conseiller-x', '   ')
    const e = await prisma.escaladeYaye.findUnique({ where: { id: escId } })
    expect(e?.resolutionNote).toBeNull()
  })

  it('concurrence : prise en charge avec expectedFrom obsolète → EscaladeConflictError, pas d’écrasement', async () => {
    // Un premier opérateur prend en charge.
    await setEscaladeStatut(escId, 'prise_en_charge', 'conseiller-A', undefined, 'en_attente')
    // Un second, qui voyait encore « en_attente », tente la même transition.
    await expect(
      setEscaladeStatut(escId, 'prise_en_charge', 'conseiller-B', undefined, 'en_attente'),
    ).rejects.toBeInstanceOf(EscaladeConflictError)
    const e = await prisma.escaladeYaye.findUnique({ where: { id: escId } })
    expect(e?.traitePar).toBe('conseiller-A') // le premier n'a pas été écrasé
  })

  it('transition avec expectedFrom cohérent → applique le changement', async () => {
    await setEscaladeStatut(escId, 'prise_en_charge', 'conseiller-A', undefined, 'en_attente')
    const e = await prisma.escaladeYaye.findUnique({ where: { id: escId } })
    expect(e?.statut).toBe('prise_en_charge')
  })
})
