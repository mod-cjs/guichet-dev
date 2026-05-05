import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ressources' }

export default function Page() {
  return (
    <div className="container-page py-space-6">
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Bibliothèque de ressources</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Guides, vidéos et outils pédagogiques
        </p>
      </div>
      {/* Sprint 2 — M6 : catalogue + filtres + favoris */}
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        🚧 Bibliothèque de ressources — Sprint 2 (M6)
      </div>
    </div>
  )
}
