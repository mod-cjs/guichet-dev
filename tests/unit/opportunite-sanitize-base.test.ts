/**
 * @jest-environment node
 *
 * GUIC-508/506 — Sanitisation des champs riches d'une opportunité à l'écriture.
 * Les corps riches (description + sections mission/profil/conditions) sont saisis
 * par des tiers : ils doivent traverser sanitizeRichHtml avant persistance, sans
 * toucher aux champs structurés (titre, slug, domaine…) qui alimentent le KG.
 */
import { sanitizeOpportuniteRichFields } from '@/lib/opportunite/sanitize-base'

describe('GUIC-508 — sanitizeOpportuniteRichFields', () => {
  it('sanitise description + mission/profilRecherche/conditions', () => {
    const out = sanitizeOpportuniteRichFields({
      titre: 'Dev web',
      slug: 'dev-web',
      description: '<p>ok</p><script>alert(1)</script>',
      mission: '<h2>Mission</h2><img src="x" onerror="alert(1)">',
      profilRecherche: '<p>profil</p>',
      conditions: '<a href="javascript:alert(1)">x</a>',
    })
    expect(out.description).toContain('<p>ok</p>')
    expect(out.description).not.toMatch(/<script/i)
    expect(out.mission).toContain('<h2>Mission</h2>')
    expect(out.mission).not.toMatch(/onerror/i)
    expect(out.profilRecherche).toContain('<p>profil</p>')
    expect(out.conditions).not.toMatch(/javascript:/i)
  })

  it('ne touche pas aux champs structurés (KG)', () => {
    const out = sanitizeOpportuniteRichFields({
      titre: 'Titre <b>brut</b>',
      slug: 'mon-slug',
      description: '<p>x</p>',
      domaine: 'Numerique',
      region: 'Dakar',
    })
    // Les champs non-riches passent tels quels (pas de sanitisation appliquée).
    expect(out.titre).toBe('Titre <b>brut</b>')
    expect(out.slug).toBe('mon-slug')
    expect(out.domaine).toBe('Numerique')
    expect(out.region).toBe('Dakar')
  })

  it('laisse les sections absentes indéfinies (pas de clé fantôme)', () => {
    const out = sanitizeOpportuniteRichFields({
      titre: 't', slug: 's', description: '<p>x</p>',
    })
    expect('mission' in out).toBe(false)
    expect(out.description).toBe('<p>x</p>')
  })

  it('préserve null pour une section explicitement vidée', () => {
    const out = sanitizeOpportuniteRichFields({
      titre: 't', slug: 's', description: '<p>x</p>', mission: null,
    })
    expect(out.mission).toBeNull()
  })
})
