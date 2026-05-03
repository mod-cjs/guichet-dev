import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mon profil' }

export default function Page() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-cjs-vert mb-4">Mon profil</h1>
      <p className="text-cjs-gris">Sprint 1 — M2 : Profil et tableau de bord jeune</p>
    </div>
  )
}
