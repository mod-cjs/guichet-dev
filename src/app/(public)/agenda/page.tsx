import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Événements' }

export default function Page() {
  return (
    <div className="container-page py-space-6">
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Agenda & Événements</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Formations, ateliers, forums et webinaires du réseau CJS
        </p>
      </div>
      {/* Sprint 2 — M5 : calendrier + inscriptions */}
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        🚧 Calendrier des événements — Sprint 2 (M5)
      </div>
    </div>
  )
}
