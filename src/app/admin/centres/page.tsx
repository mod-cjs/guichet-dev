import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Centres' }

export default function Page() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-cjs-vert mb-4">Centres</h1>
      <p className="text-cjs-gris">Sprint 3 — M8 : Gestion des centres</p>
    </div>
  )
}
