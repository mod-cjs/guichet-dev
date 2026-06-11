import type { Meta, StoryObj } from '@storybook/react'
import { CentreHoursTable } from './index'

const meta: Meta<typeof CentreHoursTable> = {
  title: 'centres/CentreHoursTable',
  component: CentreHoursTable,
}
export default meta
type Story = StoryObj<typeof CentreHoursTable>

const standard = [
  { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Mardi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Mercredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Jeudi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Vendredi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  { jour: 'Samedi', ouvert: true, ouvreA: '09:00', fermeA: '13:00' },
  { jour: 'Dimanche', ouvert: false },
]

export const Standard: Story = { args: { horaires: standard } }

export const Alternatif: Story = {
  args: {
    horaires: [
      { jour: 'Lundi', ouvert: false },
      { jour: 'Mardi', ouvert: true, ouvreA: '10:00', fermeA: '16:00' },
      { jour: 'Mercredi', ouvert: true, ouvreA: '10:00', fermeA: '16:00' },
      { jour: 'Jeudi', ouvert: true, ouvreA: '10:00', fermeA: '16:00' },
      { jour: 'Vendredi', ouvert: true, ouvreA: '10:00', fermeA: '16:00' },
      { jour: 'Samedi', ouvert: false },
      { jour: 'Dimanche', ouvert: false },
    ],
  },
}

export const FermeDimanche: Story = {
  args: {
    horaires: standard.map((h) =>
      h.jour === 'Dimanche' ? { ...h, ouvert: false } : h,
    ),
  },
}
