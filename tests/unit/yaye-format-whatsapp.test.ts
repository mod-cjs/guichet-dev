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
  expect(out).toContain('/opportunites/dev-web?src=wa')
})

test('tronque à 4096 caractères max (contrainte Meta)', () => {
  const out = formatBlocksForWhatsApp([{ kind: 'text', text: 'a'.repeat(5000) }])
  expect(out.length).toBeLessThanOrEqual(4096)
  expect(out.endsWith('…')).toBe(true)
})

test('bloc escalade → titre + message + référence à citer', () => {
  const out = formatBlocksForWhatsApp([
    {
      kind: 'escalade',
      reference: 'YAYE-AB12CD',
      title: 'Demande transmise à un conseiller',
      message: 'Un membre de l\'équipe CJS va prendre le relais.',
      button: { label: 'Trouver un centre CJS', href: '/centres' },
    },
  ])
  expect(out).toContain('Demande transmise à un conseiller')
  expect(out).toContain('Référence : YAYE-AB12CD')
})

test('aucun bloc → message par défaut', () => {
  expect(formatBlocksForWhatsApp([])).toMatch(/pas de réponse/i)
})

test('carte CJS → fallback texte + lien (WhatsApp ne rend pas la carte visuelle)', () => {
  const out = formatBlocksForWhatsApp([
    { kind: 'carte_cjs', cjsUid: 'abc123', user: { prenom: 'Awa', nom: 'Diop', matricule: 'GJS · AD · ABC123', membreDepuis: '03/2025' } },
  ])
  expect(out).toContain('Ta carte CJS')
  expect(out).toContain('GJS · AD · ABC123')
  expect(out).toContain('/jeune/ma-carte')
})

test('événements → liste avec date + lieu + deep link agenda', () => {
  const out = formatBlocksForWhatsApp([
    { kind: 'evenements', items: [
      { id: 'ev1', titre: 'Forum emploi', type: 'Forum', dateDebut: '2026-09-10T14:00:00Z', dateFin: null, lieu: 'Grand Hall', centre: 'CJS Thiès', estGratuit: true },
    ] },
  ])
  expect(out).toContain('Forum emploi')
  expect(out).toContain('CJS Thiès')
  expect(out).toContain('/agenda/ev1?src=wa')
})

test('ressources → liste PDF/guide + lien', () => {
  const out = formatBlocksForWhatsApp([{ kind: 'ressources', items: [
    { id: 'r1', titre: 'Guide CV', type: 'Guide', theme: 'Emploi', niveau: null },
  ] }])
  expect(out).toContain('Guide CV')
  expect(out).toContain('/ressources/r1?src=wa')
})

test('centres → nom + adresse + lien slug', () => {
  const out = formatBlocksForWhatsApp([{ kind: 'centres', items: [
    { id: 'c1', slug: 'cjs-dakar', nom: 'CJS Dakar', ville: 'Dakar', region: 'Dakar', adresse: 'Rue 1', telephone: '+221990000000', services: ['WiFi'] },
  ] }])
  expect(out).toContain('CJS Dakar')
  expect(out).toContain('/centres/cjs-dakar?src=wa')
})

test('notifications → titres + contenu', () => {
  const out = formatBlocksForWhatsApp([{ kind: 'notifications', items: [
    { id: 'n1', type: 'Deadline', titre: 'Échéance', contenu: 'Offre X ferme demain', lien: '/opportunites/x', metaPill: 'J-1', lu: false },
  ] }])
  expect(out).toContain('Échéance')
  expect(out).toContain('Offre X ferme demain')
  // GUIC-688 — un lien de notification est un lien de catalogue comme un autre :
  // sans marqueur, le clic se confond avec le trafic web organique.
  expect(out).toContain('/opportunites/x?src=wa')
})

test('lien de notification déjà porteur d’une query → src ajouté en second paramètre', () => {
  const out = formatBlocksForWhatsApp([{ kind: 'notifications', items: [
    { id: 'n1', type: 'Deadline', titre: 'Échéance', contenu: 'Postule', lien: '/opportunites/x?postuler=1', metaPill: 'J-1', lu: false },
  ] }])
  expect(out).toContain('/opportunites/x?postuler=1&src=wa')
})

test('lien externe de notification laissé intact (ce n’est pas notre trafic)', () => {
  const out = formatBlocksForWhatsApp([{ kind: 'notifications', items: [
    { id: 'n1', type: 'Info', titre: 'Partenaire', contenu: 'Voir', lien: 'https://exemple.org/page', metaPill: null, lu: true },
  ] }])
  expect(out).toContain('https://exemple.org/page')
  expect(out).not.toContain('exemple.org/page?src=wa')
})

test('cards issues d’une reco → le clic porte aussi l’origine', () => {
  const out = formatBlocksForWhatsApp([{ kind: 'opportunites', items: [
    { id: 'o1', slug: 'dev-web', titre: 'Développeur web', type: 'Emploi', organisation: 'ACME', region: 'Dakar', deadline: null, origine: 'reco' },
  ] }])
  expect(out).toContain('/opportunites/dev-web?src=wa&from=reco')
})
