import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { ProgrammesField } from './ProgrammesField'

const OPTIONS = [
  { slug: 'yaakaar', nom: 'Yaakaar' },
  { slug: 'yeah', nom: 'YEAH' },
  { slug: 'yjc', nom: 'YJC' },
  { slug: 'edupop', nom: 'EduPop' },
]

const meta: Meta<typeof ProgrammesField> = {
  title: 'Admin/ProgrammesField',
  component: ProgrammesField,
  args: { options: OPTIONS, value: [] },
}

export default meta

type Story = StoryObj<typeof ProgrammesField>

/** Cas courant : aucun programme encore choisi. */
export const Vide: Story = {}

/** Un seul programme — pas de choix de principal, il est implicite. */
export const UnProgramme: Story = {
  args: { value: ['yeah'] },
}

/** Plusieurs programmes — le sélecteur de principal apparaît. */
export const MultiProgramme: Story = {
  args: { value: ['yeah', 'edupop'], principal: 'edupop' },
}

/** Erreur de validation : la création exige au moins un programme. */
export const EnErreur: Story = {
  args: { value: [], error: 'Sélectionne au moins un programme.' },
}

/** Version interactive (état géré) — pour éprouver le parcours complet. */
export const Interactif: Story = {
  render: function Render() {
    const [value, setValue] = useState<string[]>(['yeah'])
    const [principal, setPrincipal] = useState<string | null>(null)
    return (
      <ProgrammesField
        options={OPTIONS}
        value={value}
        onChange={setValue}
        principal={principal}
        onPrincipalChange={setPrincipal}
      />
    )
  },
}
