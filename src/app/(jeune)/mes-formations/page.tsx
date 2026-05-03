import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mes formations' }

export default function Page() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-cjs-vert mb-4">Mes formations</h1>
      <p className="text-cjs-gris">Sprint 4 — M10 : Certifications Moodle</p>
    </div>
  )
}
