import type { Meta, StoryObj } from '@storybook/react'
import { CentreDescriptionSection } from './index'

const meta: Meta<typeof CentreDescriptionSection> = {
  title: 'centres/CentreDescriptionSection',
  component: CentreDescriptionSection,
}
export default meta
type Story = StoryObj<typeof CentreDescriptionSection>

export const Standard: Story = {
  args: {
    description:
      'Le centre CJS de Tambacounda accompagne les jeunes 15-35 ans dans leur insertion professionnelle.\nNos services : conseil en orientation, ateliers, accès numérique, et soutien à l’entrepreneuriat agricole.',
  },
}

export const Vide: Story = {
  args: {
    description: null,
  },
}
