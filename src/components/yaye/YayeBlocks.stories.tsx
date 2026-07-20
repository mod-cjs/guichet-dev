import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeBlocks } from './YayeBlocks'
import type { YayeBlock } from '@/lib/ia/blocks'

// Galerie de TOUS les kinds de card Yaye dans une même réponse — source de la régression
// visuelle (Piste C). Sert de cible aux snapshots Playwright (3 viewports × 2 thèmes).
const meta: Meta<typeof YayeBlocks> = {
  title: 'Yaye/YayeBlocks',
  component: YayeBlocks,
  parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<typeof YayeBlocks>

const ALL_BLOCKS: YayeBlock[] = [
  { kind: 'text', text: 'Voici ce que j’ai trouvé pour toi 🙂' },
  { kind: 'opportunites', items: [{ id: 'o1', slug: 'dev-web', titre: 'Développeur web junior', type: 'Emploi', typeLabel: 'Emploi', organisation: 'ACME', region: 'Dakar', deadline: '2026-09-01T00:00:00.000Z' }] },
  { kind: 'evenements', items: [{ id: 'e1', titre: 'Forum de l’emploi jeunes', type: 'Forum', dateDebut: '2026-08-20T09:00:00.000Z', dateFin: null, lieu: 'CJS Dakar', centre: 'CJS Dakar', estGratuit: true }] },
  { kind: 'ressources', items: [{ id: 'r1', titre: 'Guide : rédiger un CV percutant', type: 'Guide', theme: 'Emploi', niveau: 'Débutant' }] },
  { kind: 'centres', items: [{ id: 'c1', slug: 'cjs-pikine', nom: 'CJS Pikine', ville: 'Pikine', region: 'Dakar', adresse: 'Rue 10 x Av. Bourguiba', telephone: '+221 33 800 00 00', services: ['WiFi', 'Conseiller', 'Bibliothèque'] }] },
  { kind: 'notifications', items: [
    { id: 'n1', type: 'Deadline', titre: 'Une offre ferme bientôt', contenu: 'Ta candidature pour « Stage agro » expire demain.', lien: '/opportunites/stage-agro', metaPill: 'J-1', lu: false },
    { id: 'n2', type: 'Candidature', titre: 'Candidature vue', contenu: 'Le recruteur a consulté ton dossier.', lien: null, metaPill: null, lu: true },
  ] },
  { kind: 'action', title: 'Récapitulatif de ta candidature', subtitle: 'À valider', actions: [{ icon: 'document', label: 'CV du profil joint' }], buttons: [{ label: 'Je confirme', primary: true }, { label: 'Annuler' }] },
  { kind: 'escalade', reference: 'YAYE-AB12CD', title: 'Demande transmise à un conseiller', message: 'Un conseiller du CJS va prendre le relais et te répondra ici même.' },
  { kind: 'quick_replies', replies: [
    { label: 'Élargir à tout le Sénégal', value: 'Élargis la recherche' },
    { label: 'Voir les formations', value: 'Montre-moi des formations' },
    { label: 'Parler à un conseiller', value: 'Je veux parler à un conseiller' },
  ] },
]

/** Toutes les cards d'un coup, dans une bulle de largeur téléphone. */
export const Galerie: Story = {
  args: { blocks: ALL_BLOCKS, onNavigate: () => {}, onQuickReply: () => {} },
  render: (args) => (
    <div style={{ maxWidth: 420 }}>
      <YayeBlocks {...args} />
    </div>
  ),
}
