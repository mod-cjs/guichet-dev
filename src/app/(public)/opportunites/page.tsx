import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Opportunités' }

export default function Page() {
  return (
    <div className="container-page py-space-6">
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Opportunités</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Emplois, stages, formations et bourses pour les jeunes du Sénégal
        </p>
      </div>
      {/* Sprint 1 — M3 : filtres + liste + candidature */}
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        🚧 Catalogue des opportunités — Sprint 1 (M3)
      </div>
    </div>
  )
}
