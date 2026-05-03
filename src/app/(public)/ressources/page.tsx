import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ressources' }

export default function Page() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-cjs-vert mb-4">Ressources</h1>
      <p className="text-cjs-gris">Sprint 2 — M6 : Bibliothèque de ressources</p>
    </div>
  )
}
