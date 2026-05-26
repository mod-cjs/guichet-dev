import type { Metadata } from 'next'
import { MesCandidatures } from '@/components/jeune/MesCandidatures'

export const metadata: Metadata = { title: 'Mes candidatures' }

export default function MesCandidaturesPage() {
  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Mes candidatures</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Suivi de vos candidatures aux opportunités
        </p>
      </div>
      <MesCandidatures />
    </div>
  )
}
