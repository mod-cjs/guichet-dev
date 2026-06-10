import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SenegalMap, type SenegalMapPin } from './index'

const SAMPLE_PINS: SenegalMapPin[] = [
  { id: 'dakar', x: 28, y: 95, label: 'Dakar' },
  { id: 'thies', x: 55, y: 95, label: 'Thiès' },
  { id: 'saint-louis', x: 65, y: 50, label: 'Saint-Louis' },
  { id: 'louga', x: 90, y: 70, label: 'Louga' },
  { id: 'kaolack', x: 95, y: 115, label: 'Kaolack' },
  { id: 'fatick', x: 75, y: 120, label: 'Fatick' },
  { id: 'ziguinchor', x: 60, y: 165, label: 'Ziguinchor' },
  { id: 'tamba', x: 195, y: 110, label: 'Tambacounda' },
  { id: 'kedougou', x: 215, y: 150, label: 'Kédougou' },
]

const meta: Meta<typeof SenegalMap> = {
  title: 'Centres/SenegalMap',
  component: SenegalMap,
  tags: ['centres', 'lot7'],
  args: { pins: SAMPLE_PINS, height: 320 },
}

export default meta

type Story = StoryObj<typeof SenegalMap>

export const Default: Story = {}

export const WithActivePin: Story = {
  args: { activeId: 'tamba' },
}

export const WithLabels: Story = {
  args: { activeId: 'dakar', showLabels: true },
}

export const Interactive: Story = {
  args: {
    activeId: 'thies',
    onPinClick: (id) => alert(`Clic pin : ${id}`),
  },
}

export const Empty: Story = {
  args: { pins: [] },
}
