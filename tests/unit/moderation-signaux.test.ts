/**
 * GUIC-702 · PR-A (RED) — heuristique de signaux de modération.
 *
 * Signal ADVISOIRE (jamais bloquant) calculé sur le contenu d'une offre brouillon.
 * Objectif : repérer les offres-arnaques (frais d'inscription, n° perso, formules
 * d'argent facile) et les partenaires non vérifiés, SANS aucun champ en base.
 * Exigence de robustesse : ZÉRO faux-positif sur une offre saine.
 */
import { detecterSignaux, niveauCarte, type OffreSignalable } from '@/lib/moderation/signaux'

const OFFRE_SAINE: OffreSignalable = {
  titre: 'Stage marketing digital — 3 mois',
  description:
    'Wave recherche un(e) stagiaire marketing digital pour appuyer ses campagnes ' +
    'd’acquisition. Bac+2/3, indemnité mensuelle de 150 000 FCFA, encadrement assuré.',
  remuneration: '150 000 FCFA/mois',
  source: 'recruteur',
  partenaireVerifie: true,
}

describe('GUIC-702 — detecterSignaux', () => {
  it('ne signale RIEN sur une offre saine de partenaire vérifié', () => {
    expect(detecterSignaux(OFFRE_SAINE)).toEqual([])
    expect(niveauCarte(detecterSignaux(OFFRE_SAINE))).toBeNull()
  })

  it('crit — détecte des frais d’inscription / dossier demandés', () => {
    const s = detecterSignaux({
      ...OFFRE_SAINE,
      description:
        'Nous recrutons des agents commerciaux. Frais de dossier obligatoires de ' +
        '10 000 FCFA à verser avant l’entretien.',
    })
    expect(s.some((x) => x.niveau === 'crit' && /frais/i.test(x.motif))).toBe(true)
  })

  it('crit — détecte un numéro de téléphone personnel dans la description', () => {
    const s = detecterSignaux({
      ...OFFRE_SAINE,
      description: 'Contactez-nous directement au +221 77 123 45 67 pour postuler.',
    })
    expect(s.some((x) => x.niveau === 'crit' && /num[ée]ro|t[ée]l[ée]phone/i.test(x.motif))).toBe(true)
  })

  it('crit — détecte une formule d’arnaque (argent facile)', () => {
    const s = detecterSignaux({
      ...OFFRE_SAINE,
      description: 'Gagnez 500 000 FCFA par jour depuis chez vous, argent facile garanti !',
    })
    expect(s.some((x) => x.niveau === 'crit')).toBe(true)
  })

  it('soft — signale un partenaire recruteur NON vérifié', () => {
    const s = detecterSignaux({ ...OFFRE_SAINE, partenaireVerifie: false })
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ niveau: 'soft' })
    expect(s[0].motif).toMatch(/v[ée]rifi/i)
  })

  it('soft — n’applique PAS « partenaire non vérifié » à une offre de veille (sans partenaire)', () => {
    const s = detecterSignaux({
      titre: 'Appel à projets — entrepreneuriat jeunes (DER/FJ)',
      description: 'La DER/FJ finance les initiatives des jeunes. Dépôt en ligne.',
      source: 'veille',
      partenaireVerifie: false,
    })
    expect(s).toEqual([])
  })

  it('niveauCarte — crit prime sur soft', () => {
    const s = detecterSignaux({
      ...OFFRE_SAINE,
      partenaireVerifie: false,
      description: 'Frais d’inscription de 10 000 FCFA obligatoires avant démarrage.',
    })
    expect(niveauCarte(s)).toBe('crit')
  })
})
