import type { Metadata } from 'next'
import { MesFavoris } from '@/components/jeune/MesFavoris'

export const metadata: Metadata = { title: 'Mes favoris' }

export default function MesFavorisPage() {
  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Mes favoris</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Les opportunités que vous avez sauvegardées
        </p>
      </div>
      <MesFavoris />
    </div>
  )
}
