import type { Meta, StoryObj } from '@storybook/react'
import { CJSCardFlip } from './index'

const meta: Meta<typeof CJSCardFlip> = {
  title: 'Centres/CJSCardFlip',
  component: CJSCardFlip,
}
export default meta

type Story = StoryObj<typeof CJSCardFlip>

const baseUser = {
  prenom: 'Aminata',
  nom: 'Diop',
  matricule: 'GJS · AD · 23045',
  membreDepuis: '03/2025',
  centrePrincipal: { nom: 'CJS Dakar', region: 'Dakar' },
}

export const SansToken: Story = {
  args: { user: baseUser, cjsUid: 'demo-uid' },
}

export const AvecToken: Story = {
  args: {
    user: baseUser,
    cjsUid: 'demo-uid',
    qrToken: 'demo.jwt.token',
    qrExpiresAt: new Date(Date.now() + 1000 * 60 * 14),
  },
}
