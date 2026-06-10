import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ressources' }

export default function Page() {
  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Ressources</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">Gestion de la bibliothèque pédagogique</p>
      </div>
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        Ressources — Sprint 3 (M8)
      </div>
    </div>
  )
}
