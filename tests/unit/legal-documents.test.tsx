/**
 * @jest-environment jsdom
 *
 * GUIC-605 / 606 / 607 — Documents légaux CDP.
 *
 * La régression d'origine : les 3 liens légaux du Footer pointaient vers des
 * dossiers vides, donc des 404 en production. Les gardes ci-dessous existent
 * pour qu'un lien de pied de page ne puisse plus exister sans document, et
 * pour que les coordonnées CDP ne repartent pas en contradiction d'une page à
 * l'autre — c'est exactement ce que relève un contrôle.
 */

import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/layout/Footer'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { MentionFormulaire } from '@/components/legal/MentionFormulaire'
import {
  CGU,
  CONFIDENTIALITE,
  CONTACT_CDP,
  DOCUMENTS_LEGAUX,
  INFORMATIONS_COLLECTE,
  LIENS_FOOTER_LEGAUX,
  MENTIONS_LEGALES,
  VOS_DROITS,
  getDocumentLegal,
} from '@/content/legal'
import { DROITS_CDP } from '@/content/legal/droits'
import { NB_ARTICLES_CONFIDENTIALITE } from '@/content/legal/confidentialite'

describe('registre des documents légaux', () => {
  it('résout chaque slug du pied de page vers un document réel', () => {
    for (const { slug } of LIENS_FOOTER_LEGAUX) {
      expect(getDocumentLegal(slug)).toBeDefined()
    }
  })

  it('n’expose aucun document orphelin (absent du pied de page)', () => {
    const slugsFooter = LIENS_FOOTER_LEGAUX.map((l) => l.slug).sort()
    const slugsDocs = DOCUMENTS_LEGAUX.map((d) => d.slug).sort()
    expect(slugsFooter).toEqual(slugsDocs)
  })

  it('n’a pas de slug dupliqué', () => {
    const slugs = DOCUMENTS_LEGAUX.map((d) => d.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('porte une version et une date de mise à jour sur chaque document', () => {
    for (const doc of DOCUMENTS_LEGAUX) {
      // `version` sera la valeur horodatée avec le consentement en GUIC-608.
      expect(doc.version).toMatch(/^\d{4}-\d{2}$/)
      expect(doc.dateMaj.length).toBeGreaterThan(0)
      expect(doc.titre.length).toBeGreaterThan(0)
      expect(doc.resume.length).toBeGreaterThan(0)
    }
  })

  it('n’autorise un contenu incomplet que sur les coquilles déclarées', () => {
    for (const doc of DOCUMENTS_LEGAUX) {
      if (doc.estCoquille) continue
      expect(doc.sections.length).toBeGreaterThan(0)
      for (const section of doc.sections) {
        expect(section.titre.length).toBeGreaterThan(0)
        expect(section.blocs.length).toBeGreaterThan(0)
      }
    }
  })

  it('ne laisse subsister aucun placeholder non résolu du .docx source', () => {
    const serialise = JSON.stringify(DOCUMENTS_LEGAUX)
    expect(serialise).not.toContain('[finalité')
    expect(serialise).not.toMatch(/\[à compléter\]/i)
  })
})

describe('cohérence des coordonnées CDP entre documents', () => {
  const serialise = JSON.stringify(DOCUMENTS_LEGAUX)

  it('ne publie que le délai de réponse arbitré (15 jours, jamais 30)', () => {
    expect(CONTACT_CDP.delaiReponse).toBe('15 jours')
    expect(serialise).not.toContain('30 jours')
  })

  it('ne publie que le téléphone retenu (jamais celui de la notice §5)', () => {
    expect(serialise).not.toContain('33 824 83 83')
  })

  it('ne publie que l’adresse retenue (jamais SICAP Point E)', () => {
    expect(serialise).not.toContain('SICAP Point E')
  })

  it('corrige la typo `guichetjeunesse.ss` de l’Article 1', () => {
    expect(serialise).not.toContain('guichetjeunesse.ss')
    expect(serialise).toContain('guichetjeunesse.sn')
  })
})

describe('contenu fidèle aux .docx sources', () => {
  it('rend les 11 articles de la politique de confidentialité', () => {
    expect(CONFIDENTIALITE.sections).toHaveLength(NB_ARTICLES_CONFIDENTIALITE)
    render(<LegalDocument document={CONFIDENTIALITE} />)
    for (const section of CONFIDENTIALITE.sections) {
      expect(screen.getByRole('heading', { name: section.titre })).toBeInTheDocument()
    }
  })

  it('rend les sections de la notice de collecte', () => {
    render(<LegalDocument document={INFORMATIONS_COLLECTE} />)
    expect(screen.getByRole('heading', { name: 'Quelles données collectons-nous ?' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Combien de temps conservons-nous vos données ?' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quels sont vos droits ?' })).toBeInTheDocument()
  })

  it('rétablit le droit d’opposition avalé par la mise en forme du .docx', () => {
    // Dans la source, « Droit d'opposition » était fondu dans la puce du droit
    // de rectification (`…incomplètes.• Droit d'opposition`).
    expect(DROITS_CDP.map((d) => d.terme)).toEqual([
      "Droit d'accès",
      'Droit de rectification',
      "Droit d'opposition",
      "Droit à l'effacement",
    ])

    render(<LegalDocument document={VOS_DROITS} />)
    for (const droit of DROITS_CDP) {
      expect(screen.getByText(droit.terme)).toBeInTheDocument()
    }
  })

  it('affiche sur « Vos droits » les modalités d’exercice et le recours CDP', () => {
    render(<LegalDocument document={VOS_DROITS} />)
    expect(screen.getByText(new RegExp(CONTACT_CDP.emailDonnees))).toBeInTheDocument()
    expect(screen.getByText(/15 jours/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Réclamation' })).toBeInTheDocument()
  })

  it('signale les CGU provisoires au lieu de les faire passer pour en vigueur', () => {
    // GUIC-233 les qualifiait de « version provisoire, à compléter par le
    // service juridique » — la mention doit rester visible.
    expect(CGU.estCoquille).toBe(true)
    render(<LegalDocument document={CGU} />)
    expect(screen.getByText(/Document en cours de rédaction/i)).toBeInTheDocument()
  })

  it('conserve le contenu GUIC-233 des CGU et des mentions légales', () => {
    // Ces deux pages existaient déjà (GUIC-233) : le passage au modèle typé
    // ne doit rien perdre.
    expect(CGU.sections.map((s) => s.titre)).toEqual([
      '1. Objet',
      '2. Accès au service',
      '3. Engagements de l’utilisateur',
      '4. Modification & résiliation',
    ])
    expect(JSON.stringify(CGU)).toContain('Aucun mot de passe local n’est stocké')
    expect(JSON.stringify(MENTIONS_LEGALES)).toContain('Vercel Inc.')
    expect(JSON.stringify(MENTIONS_LEGALES)).toContain('coordinateur national')
  })

  it('complète les mentions légales, qui ne sont donc plus une coquille', () => {
    // GUIC-233 signalait « coordonnées complètes à compléter » ; l'Article 1
    // de la politique les fournit.
    expect(MENTIONS_LEGALES.estCoquille).toBeUndefined()
    expect(JSON.stringify(MENTIONS_LEGALES)).toContain(CONTACT_CDP.ninea)
  })

  it('n’affiche pas d’avertissement sur un document en vigueur', () => {
    render(<LegalDocument document={CONFIDENTIALITE} />)
    expect(screen.queryByRole('img', { name: 'Avertissement' })).not.toBeInTheDocument()
  })
})

describe('Footer — garde anti-404', () => {
  it('ne rend que des liens légaux adossés à un document existant', () => {
    render(<Footer />)
    for (const { slug, libelle } of LIENS_FOOTER_LEGAUX) {
      const lien = screen.getByRole('link', { name: libelle })
      expect(lien).toHaveAttribute('href', `/legal/${slug}`)
      expect(getDocumentLegal(slug)).toBeDefined()
    }
  })

  it('expose la notice de collecte et la page Vos droits, absentes avant GUIC-605', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Collecte des données' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vos droits' })).toBeInTheDocument()
  })
})

describe('MentionFormulaire — information au point de collecte (GUIC-607)', () => {
  it('inscrit la finalité réelle du formulaire dans la mention', () => {
    render(<MentionFormulaire finalite="créer votre compte" />)
    expect(screen.getByTestId('mention-formulaire')).toHaveTextContent(
      /traitées par le Consortium Jeunesse Sénégal \(CJS\) pour créer votre compte/,
    )
  })

  it('donne le contact d’exercice des droits et les liens permanents', () => {
    render(<MentionFormulaire finalite="créer votre compte" />)
    expect(screen.getByRole('link', { name: CONTACT_CDP.emailDonnees })).toHaveAttribute(
      'href',
      `mailto:${CONTACT_CDP.emailDonnees}`,
    )
    expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute(
      'href',
      '/legal/confidentialite',
    )
    expect(screen.getByRole('link', { name: 'vos droits' })).toHaveAttribute(
      'href',
      '/legal/vos-droits',
    )
  })
})
