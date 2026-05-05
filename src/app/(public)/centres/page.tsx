import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Centres CJS' }

export default function Page() {
  return (
    <div className="container-page py-space-6">
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Centres CJS</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          9 centres à travers le Sénégal — carte interactive et réservations
        </p>
      </div>
      {/* Sprint 2 — M4 : carte Leaflet + fiches centres */}
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        🚧 Carte interactive des centres — Sprint 2 (M4)
      </div>
    </div>
  )
}
