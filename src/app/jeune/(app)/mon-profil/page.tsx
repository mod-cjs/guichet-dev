import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mon profil' }

export default function Page() {
  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Mon profil</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Complétez votre profil pour accéder à plus d&apos;opportunités
        </p>
      </div>
      {/* Sprint 1 — M2 : tunnel onboarding + tableau de bord jeune */}
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        🚧 Profil jeune & tableau de bord — Sprint 1 (M2)
      </div>
    </div>
  )
}
