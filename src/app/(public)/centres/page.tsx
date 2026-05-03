import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Centres CJS' }

export default function Page() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-cjs-vert mb-4">Centres CJS</h1>
      <p className="text-cjs-gris">Sprint 2 — M4 : Carte interactive des centres</p>
    </div>
  )
}
