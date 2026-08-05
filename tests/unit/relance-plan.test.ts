/**
 * GUIC-692 (PR-C) — planRelance : résout cibles × canaux livrables, en gérant les
 * findings du spike : candidat sans téléphone (WhatsApp/SMS ignorés) et recruteur
 * non résoluble (offre sans compte). TDD — RED d'abord.
 */
import { planRelance } from '@/lib/notifications/relance-plan'

describe('GUIC-692 — planRelance', () => {
  it('Les_deux : in-app/e-mail partout, WhatsApp ignoré pour le candidat sans téléphone', () => {
    const r = planRelance({ destinataire: 'Les_deux', canaux: ['in_app', 'email', 'whatsapp'], candidatHasPhone: false, recruteurResolvable: true })
    // candidat : in_app + email ; recruteur : in_app + email + whatsapp
    expect(r.envois).toEqual(expect.arrayContaining([
      { cible: 'candidat', canal: 'in_app' },
      { cible: 'candidat', canal: 'email' },
      { cible: 'recruteur', canal: 'in_app' },
      { cible: 'recruteur', canal: 'email' },
      { cible: 'recruteur', canal: 'whatsapp' },
    ]))
    expect(r.envois).not.toContainEqual({ cible: 'candidat', canal: 'whatsapp' })
    expect(r.ignores).toContainEqual({ cible: 'candidat', canal: 'whatsapp', raison: 'pas_de_telephone' })
  })

  it('candidat AVEC téléphone : SMS/WhatsApp livrables', () => {
    const r = planRelance({ destinataire: 'Candidat', canaux: ['sms', 'whatsapp'], candidatHasPhone: true, recruteurResolvable: true })
    expect(r.envois).toEqual(expect.arrayContaining([
      { cible: 'candidat', canal: 'sms' },
      { cible: 'candidat', canal: 'whatsapp' },
    ]))
    expect(r.ignores).toHaveLength(0)
  })

  it('Recruteur non résoluble : tous ses canaux ignorés (offre sans compte)', () => {
    const r = planRelance({ destinataire: 'Recruteur', canaux: ['in_app', 'email'], candidatHasPhone: true, recruteurResolvable: false })
    expect(r.envois).toHaveLength(0)
    expect(r.ignores).toEqual(expect.arrayContaining([
      { cible: 'recruteur', canal: 'in_app', raison: 'recruteur_introuvable' },
      { cible: 'recruteur', canal: 'email', raison: 'recruteur_introuvable' },
    ]))
  })

  it('aucun canal → aucun envoi', () => {
    const r = planRelance({ destinataire: 'Les_deux', canaux: [], candidatHasPhone: true, recruteurResolvable: true })
    expect(r.envois).toHaveLength(0)
  })
})
