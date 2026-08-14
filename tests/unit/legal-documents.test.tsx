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
  AUTORITE_CDP,
  CGU,
  CONFIDENTIALITE,
  CONTACT_CDP,
  DOCUMENTS_LEGAUX,
  INFORMATIONS_COLLECTE,
  LIENS_FOOTER_LEGAUX,
  MENTIONS_LEGALES,
  PHRASE_EXERCICE_DROITS,
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

  it('désigne l’assistant par sa fonction, jamais par son nom de produit', () => {
    // Décision PO 2026-08-14 : les textes légaux décrivent une fonction, pas
    // une marque — un nom de produit change, un contrat lui survit.
    expect(JSON.stringify(DOCUMENTS_LEGAUX)).not.toContain('Yaye')
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

  it('n’attribue jamais au CJS l’adresse SICAP Point E, qui est celle de la CDP', () => {
    // Le .docx de consentement donnait « 3e étage, Bâtiment B, Complexe SICAP
    // Point E » comme adresse courrier du CJS : c'était celle de la CDP, dans
    // le mauvais bloc. Le CJS répond au CDEPS de Guédiawaye.
    expect(CONTACT_CDP.adresse).toContain('CDEPS de Guédiawaye')
    expect(CONTACT_CDP.adresse).not.toContain('SICAP')
    expect(PHRASE_EXERCICE_DROITS).not.toContain('SICAP')
  })

  it('publie l’adresse réelle de la CDP pour le recours', () => {
    // Une adresse de recours fausse est le pire endroit où se tromper : c'est
    // celle qu'un utilisateur utilise quand ses droits n'ont pas été respectés.
    expect(AUTORITE_CDP.adresse).toContain('SICAP Point E')
    expect(AUTORITE_CDP.adresse).toContain('Cheikh Anta Diop')
    expect(serialise).not.toContain('Almadies')
  })

  it('corrige la typo `guichetjeunesse.ss` de l’Article 1', () => {
    expect(serialise).not.toContain('guichetjeunesse.ss')
    expect(serialise).toContain('guichetjeunesse.sn')
  })

  it('ne déclare jamais collecter de mot de passe — le Guichet est en SSO pur', () => {
    // Deux pages du même site se contredisaient : la politique (Art. 2) et la
    // notice (§2) déclaraient un « mot de passe (chiffré) » que les CGU (§2)
    // niaient à juste titre. Sur-déclarer est une fausse déclaration au même
    // titre que sous-déclarer : la CDP vérifierait un traitement inexistant.
    expect(serialise).not.toContain('mot de passe (chiffré)')
    expect(serialise).not.toContain('hachage des mots de passe')
    // La seule affirmation qui subsiste est la bonne, et elle est explicite.
    expect(JSON.stringify(CGU)).toContain('Aucun mot de passe local n’est stocké')
    for (const doc of [CONFIDENTIALITE, INFORMATIONS_COLLECTE]) {
      expect(JSON.stringify(doc)).toContain('Aucun mot de passe n’est collecté')
    }
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

  it('avertit l’utilisateur sur un document encore provisoire', () => {
    // Plus aucun document n'est une coquille aujourd'hui, mais le mécanisme
    // doit rester fonctionnel : on le vérifie sur un document synthétique
    // plutôt que sur un document réel, qui peut être complété à tout moment.
    render(
      <LegalDocument
        document={{ ...CGU, slug: 'test-coquille', estCoquille: true, sections: [] }}
      />,
    )
    expect(screen.getByText(/Document en cours de rédaction/i)).toBeInTheDocument()
  })

  it('conserve la substance GUIC-233 des CGU et des mentions légales', () => {
    // Ces deux pages existaient déjà (GUIC-233) : ni le passage au modèle typé
    // ni la complétion des CGU ne doivent perdre leur contenu d'origine.
    const titres = CGU.sections.map((s) => s.titre)
    for (const attendu of ['Objet', 'Accès au service', 'Engagements', 'Modification & résiliation']) {
      expect(titres.some((t) => t.includes(attendu))).toBe(true)
    }
    expect(JSON.stringify(CGU)).toContain('Aucun mot de passe local n’est stocké')
    expect(JSON.stringify(MENTIONS_LEGALES)).toContain('coordinateur national')
  })

  it('couvre dans les CGU les services réellement rendus', () => {
    // GUIC-233 s'arrêtait à 4 sections génériques : le contrat ne disait rien
    // des candidatures, des réservations, de l'agent conversationnel ni de la
    // responsabilité sur les annonces de tiers. Un contrat muet sur le service
    // n'en est pas un.
    const cgu = JSON.stringify(CGU)
    expect(cgu).toContain('agent conversationnel')
    expect(cgu).toContain('candidature')
    expect(cgu).toContain('mineur')
    expect(cgu).toContain('gratuit')
    expect(cgu).toContain('droit sénégalais')
    // L'assistant est présenté comme faillible, jamais comme un conseil.
    expect(cgu).toMatch(/ne remplacent ni un conseiller/)
  })

  it('déclare l’hébergeur réel — jamais Vercel ni les États-Unis (GUIC-568)', () => {
    const mentions = JSON.stringify(MENTIONS_LEGALES)
    // GUIC-233 annonçait « Vercel Inc., Californie, États-Unis ». La production
    // a migré sur OVH (cf. scripts/deploy/deploy.sh) et les serveurs sont en
    // Belgique : ces deux mentions ne doivent jamais réapparaître comme
    // hébergeur, une adresse d'hébergement fausse est une fausse déclaration.
    expect(mentions).not.toContain('Vercel')
    expect(mentions).toContain('OVH')
    expect(mentions).toContain('Belgique')
    // Des mentions légales doivent porter le nom ET l'adresse de l'hébergeur :
    // l'un sans l'autre ne remplit pas l'obligation.
    expect(mentions).toContain('2 rue Kellermann')
    expect(mentions).toContain('424 761 419')
  })

  it('déclare les traitements qui sortent de l’Union européenne', () => {
    // L'Article 6 de la politique ne parle que de « prestataires techniques ».
    // Tant qu'il n'est pas révisé, les mentions légales sont le seul endroit où
    // l'utilisateur apprend que ses échanges avec l'agent conversationnel
    // partent aux États-Unis (llm-client.ts — DEFAULT_LOCATION = 'us-central1',
    // non surchargé en prod).
    const section = MENTIONS_LEGALES.sections.find((s) => s.titre.includes('transferts'))
    expect(section).toBeDefined()
    const texte = JSON.stringify(section)
    expect(texte).toContain('agent conversationnel')
    expect(texte).toContain('États-Unis')
    expect(texte).toContain('WhatsApp')
    // Ces transferts ont été déclarés à la CDP (info PO 2026-08-14) : le dire
    // est à l'avantage de l'utilisateur, et le taire donnerait l'impression
    // d'un transfert sauvage alors que la formalité légale est remplie.
    expect(texte).toContain('déclarés à la Commission de Protection des Données Personnelles')
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
