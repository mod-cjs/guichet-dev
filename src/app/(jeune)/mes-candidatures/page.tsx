import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mes candidatures' }

export default function Page() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-cjs-vert mb-4">Mes candidatures</h1>
      <p className="text-cjs-gris">Sprint 1 — M3 : Suivi des candidatures</p>
    </div>
  )
}
