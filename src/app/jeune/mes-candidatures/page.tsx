import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mes candidatures' }

export default function Page() {
  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Mes candidatures</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Suivi de vos candidatures aux opportunités
        </p>
      </div>
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        🚧 Suivi des candidatures — Sprint 1 (M3)
      </div>
    </div>
  )
}
