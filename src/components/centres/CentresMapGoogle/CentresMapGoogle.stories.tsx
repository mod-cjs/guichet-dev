import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  CentresMapGoogle,
  type CentresMapGoogleCentre,
  type CentresMapGoogleListItem,
} from './index'

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

/**
 * Variant fallback : aucune clé Google Maps disponible.
 *
 * En Storybook, `process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY` est généralement
 * absente — cette story documente explicitement le placeholder visuel rendu
 * (icône pin + message + lien vers la liste).
 */
export const FallbackSansCle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Affiché quand NEXT_PUBLIC_GOOGLE_MAPS_KEY est absente. Placeholder visuel a11y + liste alternative.',
      },
    },
  },
}

/**
 * Variant Storybook-only : injecte un `window.google` factice pour permettre
 * au composant de croire que Google Maps est chargé sans appel réseau.
 *
 * Strictement réservé à Storybook — ne modifie pas le comportement production.
 */
export const MapMocked: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Simule une carte chargée en injectant window.google factice côté preview. Pas de map réelle rendue, mais l’état "loaded" est atteint.',
      },
    },
  },
  decorators: [
    (Story) => {
      if (typeof window !== 'undefined') {
        // Stub minimal pour que le Loader/Map/Marker ne plantent pas.
        const w = window as unknown as { google?: unknown }
        w.google = w.google ?? {
          maps: {
            Map: function () {
              return { setZoom: () => {}, setCenter: () => {} }
            },
            Marker: function () {
              return { setMap: () => {}, addListener: () => {} }
            },
            LatLng: function () {},
          },
        }
      }
      return <Story />
    },
  ],
}
