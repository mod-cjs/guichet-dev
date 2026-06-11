/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReservationForm } from '@/components/centres/ReservationForm'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Bloque fetch (tracking + POST)
beforeEach(() => {
  mockPush.mockClear()
  global.fetch = jest.fn().mockResolvedValue({
    status: 201,
    json: () => Promise.resolve({ data: { reservation: { id: 'res-1' } } }),
  }) as unknown as typeof fetch
})

const RESSOURCE = {
  id: 'r1',
  type: 'Salle',
  nom: 'Salle A',
  capacite: 8,
  capaciteUnit: 'personnes',
  dureeMinCreneauMin: 60,
  requiresJustif: false,
}
const HORAIRES = [
  { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Mardi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Mercredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Jeudi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Vendredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Samedi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Dimanche', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
]
const CENTRE = {
  id: 'c1',
  slug: 'cjs-tba',
  nom: 'CJS Tambacounda',
  horaires: HORAIRES,
}

function futureIso(daysAhead = 5): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

describe('<ReservationForm />', () => {
  it('rend les champs principaux', () => {
    render(<ReservationForm ressource={RESSOURCE} centre={CENTRE} cjsUid="uid" />)
    expect(screen.getByLabelText('Date de la réservation')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: /Créneau/ })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Motif de la réservation/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Envoyer la demande/)).toBeInTheDocument()
  })

  it('refuse submit sans date', async () => {
    render(<ReservationForm ressource={RESSOURCE} centre={CENTRE} cjsUid="uid" />)
    fireEvent.click(screen.getByText(/Envoyer la demande/))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/date/i),
    )
  })

  it('refuse submit si motif < 20 caractères', async () => {
    render(<ReservationForm ressource={RESSOURCE} centre={CENTRE} cjsUid="uid" />)
    fireEvent.change(screen.getByLabelText('Date de la réservation'), {
      target: { value: futureIso(7) },
    })
    fireEvent.click(screen.getAllByRole('radio')[0])
    fireEvent.change(screen.getByLabelText(/Motif de la réservation/), {
      target: { value: 'court' },
    })
    fireEvent.click(screen.getByText(/Envoyer la demande/))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Motif/),
    )
  })

  it('refuse submit si requiresJustif et fichier manquant', async () => {
    render(
      <ReservationForm
        ressource={{ ...RESSOURCE, requiresJustif: true }}
        centre={CENTRE}
        cjsUid="uid"
      />,
    )
    fireEvent.change(screen.getByLabelText('Date de la réservation'), {
      target: { value: futureIso(7) },
    })
    fireEvent.click(screen.getAllByRole('radio')[0])
    fireEvent.change(screen.getByLabelText(/Motif de la réservation/), {
      target: { value: 'Motif suffisamment long pour valider la règle.' },
    })
    fireEvent.click(screen.getByText(/Envoyer la demande/))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/justificative/i),
    )
  })

  it('soumet et redirige sur succès via onSubmit', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ id: 'res-9' })
    render(
      <ReservationForm
        ressource={RESSOURCE}
        centre={CENTRE}
        cjsUid="uid"
        onSubmit={onSubmit}
      />,
    )
    fireEvent.change(screen.getByLabelText('Date de la réservation'), {
      target: { value: futureIso(7) },
    })
    fireEvent.click(screen.getAllByRole('radio')[0])
    fireEvent.change(screen.getByLabelText(/Motif de la réservation/), {
      target: { value: 'Réunion équipe projet maraichage 2026.' },
    })
    fireEvent.click(screen.getByText(/Envoyer la demande/))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/jeune/mes-reservations?created=res-9',
      ),
    )
  })

  it('affiche message d\'erreur si API renvoie 409', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 409,
      json: () =>
        Promise.resolve({
          error: { code: 'CRENEAU_OCCUPE', message: 'Ce créneau est déjà réservé.' },
        }),
    }) as unknown as typeof fetch
    render(<ReservationForm ressource={RESSOURCE} centre={CENTRE} cjsUid="uid" />)
    fireEvent.change(screen.getByLabelText('Date de la réservation'), {
      target: { value: futureIso(7) },
    })
    fireEvent.click(screen.getAllByRole('radio')[0])
    fireEvent.change(screen.getByLabelText(/Motif de la réservation/), {
      target: { value: 'Réunion équipe projet maraichage 2026.' },
    })
    fireEvent.click(screen.getByText(/Envoyer la demande/))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/déjà réservé/),
    )
  })
})
