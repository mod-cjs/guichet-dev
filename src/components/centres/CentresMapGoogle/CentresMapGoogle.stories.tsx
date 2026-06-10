import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CentresMapGoogle, type CentresMapGoogleCentre, type CentresMapGoogleListItem } from './index'

const SAMPLE_CENTRES: CentresMapGoogleCentre[] = [
  { id: 'dakar', nom: 'CJS Dakar', latitude: 14.6928, longitude: -17.4467 },
  { id: 'thies', nom: 'CJS Thiès', latitude: 14.7886, longitude: -16.9246 },
  { id: 'saint-louis', nom: 'CJS Saint-Louis', latitude: 16.0179, longitude: -16.4896 },
  { id: 'tamba', nom: 'CJS Tambacounda', latitude: 13.7724, longitude: -13.6671 },
  { id: 'kedougou', nom: 'CJS Kédougou', latitude: 12.5557, longitude: -12.1747 },
]

const SAMPLE_LIST: CentresMapGoogleListItem[] = [
  { id: 'dakar', nom: 'CJS Dakar', region: 'Dakar', slug: 'cjs-dakar' },
  { id: 'thies', nom: 'CJS Thiès', region: 'Thiès', slug: 'cjs-thies' },
  { id: 'saint-louis', nom: 'CJS Saint-Louis', region: 'Saint-Louis', slug: 'cjs-saint-louis' },
  { id: 'tamba', nom: 'CJS Tambacounda', region: 'Tambacounda', slug: 'cjs-tambacounda' },
  { id: 'kedougou', nom: 'CJS Kédougou', region: 'Kédougou', slug: 'cjs-kedougou' },
]

const meta: Meta<typeof CentresMapGoogle> = {
  title: 'Centres/CentresMapGoogle',
  component: CentresMapGoogle,
  tags: ['centres', 'lot7'],
  args: {
    centres: SAMPLE_CENTRES,
    centresForList: SAMPLE_LIST,
    height: 460,
    zoom: 6,
  },
}

export default meta

type Story = StoryObj<typeof CentresMapGoogle>

export const Default: Story = {}

export const WithActivePin: Story = {
  args: { activeId: 'tamba' },
}

export const Interactive: Story = {
  args: {
    onPinClick: (id) => alert(`Pin cliqué : ${id}`),
  },
}

export const MobileHeight: Story = {
  args: { height: 230 },
}
