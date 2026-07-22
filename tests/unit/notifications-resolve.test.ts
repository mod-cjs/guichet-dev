/**
 * @jest-environment node
 *
 * Tests de la résolution des canaux (GUIC-548) — cœur du centre multicanal :
 * canaux envoyés = config_admin(event × rôle) ∩ préférence ∩ consentement CDP ∩ contact.
 */
import { resolveChannels, type ResolveInput } from '@/lib/notifications/resolve'

const base = (over: Partial<ResolveInput> = {}): ResolveInput => ({
  eventKey: 'candidature.statut_change', // catalogue: in_app + whatsapp, critique
  role: 'beneficiaire',
  configCanaux: null,
  prefs: {
    whatsapp: { consentGiven: true, enabled: true },
    sms: { consentGiven: true, enabled: true },
    email: { consentGiven: true, enabled: true },
  },
  categoriesOff: [],
  contact: { telephone: true, email: true },
  ...over,
})

describe('resolveChannels', () => {
  it('sans config admin, utilise les canaux par défaut du catalogue', () => {
    expect(resolveChannels(base()).sort()).toEqual(['in_app', 'whatsapp'])
  })

  it('la config admin surcharge le catalogue', () => {
    const r = resolveChannels(base({ configCanaux: ['in_app', 'sms'] }))
    expect(r.sort()).toEqual(['in_app', 'sms'])
  })

  it('in_app est toujours retenu sans consentement requis', () => {
    const r = resolveChannels(
      base({ prefs: {}, contact: { telephone: false, email: false } }),
    )
    expect(r).toEqual(['in_app'])
  })

  it('whatsapp est retiré sans consentement', () => {
    const r = resolveChannels(base({ prefs: { whatsapp: { consentGiven: false, enabled: true } } }))
    expect(r).toEqual(['in_app'])
  })

  it('whatsapp est retiré sans numéro de téléphone', () => {
    const r = resolveChannels(base({ contact: { telephone: false, email: true } }))
    expect(r).toEqual(['in_app'])
  })

  it('email est retiré sans consentement ou sans adresse', () => {
    const cfg = base({ configCanaux: ['in_app', 'email'] })
    expect(resolveChannels({ ...cfg, prefs: { email: { consentGiven: false, enabled: true } } })).toEqual(['in_app'])
    expect(resolveChannels({ ...cfg, contact: { telephone: true, email: false } })).toEqual(['in_app'])
  })

  it('un canal désactivé (enabled=false) est retiré', () => {
    const r = resolveChannels(base({ prefs: { whatsapp: { consentGiven: true, enabled: false } } }))
    expect(r).toEqual(['in_app'])
  })

  it('categoriesOff supprime un événement non critique entièrement', () => {
    const r = resolveChannels(
      base({ eventKey: 'ressource.published', role: 'beneficiaire', categoriesOff: ['ressource.published'] }),
    )
    expect(r).toEqual([])
  })

  it('categoriesOff conserve in_app pour un événement critique', () => {
    const r = resolveChannels(base({ categoriesOff: ['candidature.statut_change'] }))
    expect(r).toEqual(['in_app'])
  })

  it('événement inconnu sans config renvoie une liste vide', () => {
    const r = resolveChannels(base({ eventKey: 'inconnu.event', configCanaux: null }))
    expect(r).toEqual([])
  })

  it('sans ligne de préférence, un canal payant est retiré (consentement absent par défaut)', () => {
    const r = resolveChannels(base({ prefs: {} }))
    expect(r).toEqual(['in_app'])
  })
})
