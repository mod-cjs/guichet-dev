import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mes formations' }

export default function Page() {
  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Mes formations</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Certifications Moodle et parcours de formation
        </p>
      </div>
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        🚧 Certifications Moodle — Sprint 4 (M10)
      </div>
    </div>
  )
}
