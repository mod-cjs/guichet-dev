import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tableau de bord admin' }

export default function Page() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-cjs-vert mb-4">Tableau de bord admin</h1>
      <p className="text-cjs-gris">Sprint 3 — M8 : Dashboard administrateur</p>
    </div>
  )
}
