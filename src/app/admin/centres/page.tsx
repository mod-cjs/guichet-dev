import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Centres CJS' }

export default function Page() {
  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Centres CJS</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">Gestion des 9 centres du réseau</p>
      </div>
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        Centres CJS — Sprint 3 (M8)
      </div>
    </div>
  )
}
