import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tableau de bord' }

export default function Page() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-cjs-vert mb-4">Tableau de bord</h1>
      <p className="text-cjs-gris">Sprint 4 — M9 : Espace recruteur</p>
    </div>
  )
}
