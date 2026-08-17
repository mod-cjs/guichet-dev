import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Actions serveur + router mockés (unitaire).
jest.mock('@/app/admin/opportunites/actions', () => ({
  creerOpportunite: jest.fn().mockResolvedValue({ id: 'new-1' }),
  modifierOpportunite: jest.fn().mockResolvedValue({ ok: true }),
}))
const push = jest.fn()
const refresh = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

// L'éditeur riche (Tiptap) est peu testable en jsdom et lourd à monter : on le
// remplace par un textarea léger. La logique du formulaire est ce qu'on teste ici ;
// l'éditeur a sa propre couverture (sanitize-html / rich-content).
jest.mock('@/components/ui/RichTextEditor', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RichTextEditor: ({ label, name, value, onChange }: any) => (
    <textarea
      aria-label={label}
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

import { OpportuniteForm } from '@/app/admin/opportunites/OpportuniteForm'
import { creerOpportunite, modifierOpportunite } from '@/app/admin/opportunites/actions'

const TYPES = [
  { slug: 'bourse' as const, libelle: 'Bourse' },
  { slug: 'emploi' as const, libelle: 'Emploi' },
]

// GUIC-684 — le rattachement à un programme est obligatoire : les formulaires
// reçoivent la liste des programmes actifs, et un choix est exigé avant soumission.
const PROGRAMMES = [
  { slug: 'yeah', nom: 'YEAH' },
  { slug: 'edupop', nom: 'EduPop' },
]

beforeEach(() => jest.clearAllMocks())

describe('GUIC-28 — OpportuniteForm (création)', () => {
  it('affiche les champs mère + les champs du 1er sous-type (bourse)', () => {
    render(<OpportuniteForm types={TYPES} programmes={PROGRAMMES} />)
    expect(screen.getByLabelText(/Titre/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
    // Champs spécifiques bourse
    expect(screen.getByLabelText(/Montant total/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Organisme financeur/)).toBeInTheDocument()
  })

  it('changer de type bascule les champs de sous-type', async () => {
    render(<OpportuniteForm types={TYPES} programmes={PROGRAMMES} />)
    await userEvent.selectOptions(screen.getByLabelText(/Type d’opportunité/), 'emploi')
    expect(screen.getByLabelText(/Type de contrat/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Montant total/)).toBeNull()
  })

  it('soumettre appelle creerOpportunite avec le type + la base', async () => {
    const user = userEvent.setup()
    render(<OpportuniteForm types={TYPES} programmes={PROGRAMMES} />)
    await user.type(screen.getByLabelText(/Titre/), 'Bourse mobilité')
    // La description est un éditeur riche (Tiptap) — saisie non simulable en jsdom ;
    // ce test vérifie le passage type + base + details, pas le corps riche lui-même.
    await user.type(screen.getByLabelText(/^Organisation/), 'CJS')
    await user.selectOptions(screen.getByLabelText(/Domaine/), 'Economie')
    await user.type(screen.getByLabelText(/Montant total/), '500000')
    await user.type(screen.getByLabelText(/Organisme financeur/), 'CJS')
    await user.click(screen.getByRole('button', { name: 'YEAH' }))
    await user.click(screen.getByRole('button', { name: /Créer l’opportunité/ }))

    expect(creerOpportunite).toHaveBeenCalledTimes(1)
    const arg = (creerOpportunite as jest.Mock).mock.calls[0][0]
    expect(arg.type).toBe('bourse')
    expect(arg.base.titre).toBe('Bourse mobilité')
    expect(arg.base.slug).toBe('bourse-mobilite') // auto-slug
    expect(arg.details.montantTotalFcfa).toBe(500000)
    expect(arg.base.programmeSlugs).toEqual(['yeah'])
  })

  it('refuse la soumission sans programme, sans appeler le serveur', async () => {
    const user = userEvent.setup()
    render(<OpportuniteForm types={TYPES} programmes={PROGRAMMES} />)
    await user.type(screen.getByLabelText(/Titre/), 'Bourse sans programme')
    await user.type(screen.getByLabelText(/^Organisation/), 'CJS')
    await user.type(screen.getByLabelText(/Montant total/), '1')
    await user.type(screen.getByLabelText(/Organisme financeur/), 'CJS')
    await user.click(screen.getByRole('button', { name: /Créer l’opportunité/ }))

    expect(creerOpportunite).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/au moins un programme/i)
  })
})

describe('GUIC-28 — OpportuniteForm (édition)', () => {
  const initial = {
    id: 'opp-9',
    type: 'emploi' as const,
    base: { titre: 'Dev', slug: 'dev', description: 'x', organisationLibelle: 'Sonatel', domaine: 'Economie', statut: 'publiee' },
    details: { typeContrat: 'CDI', teletravail: true },
    programmeSlugs: ['yeah'],
  }

  it('préremplit + verrouille le type et le slug', () => {
    render(<OpportuniteForm types={TYPES} programmes={PROGRAMMES} initial={initial} />)
    expect(screen.getByLabelText(/Titre/)).toHaveValue('Dev')
    expect(screen.getByLabelText(/Type d’opportunité/)).toBeDisabled()
    expect(screen.getByLabelText(/Slug/)).toBeDisabled()
    expect(screen.getByLabelText(/Type de contrat/)).toHaveValue('CDI')
  })

  it('soumettre appelle modifierOpportunite(id, patch)', async () => {
    render(<OpportuniteForm types={TYPES} programmes={PROGRAMMES} initial={initial} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Enregistrer/ }))
    expect(modifierOpportunite).toHaveBeenCalledTimes(1)
    expect((modifierOpportunite as jest.Mock).mock.calls[0][0]).toBe('opp-9')
  })
})
