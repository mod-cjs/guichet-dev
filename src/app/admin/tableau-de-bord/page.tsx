import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tableau de bord — Administration' }

export default function Page() {
  return (
    <div>
      <div className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">Administration</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Gestion de la plateforme Guichet Jeunesse
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-4 mb-space-5">
        {['Utilisateurs', 'Opportunités', 'Événements', 'Ressources'].map(label => (
          <div key={label} className="bg-white border border-color-border-default rounded-gj-xl p-space-4">
            <p className="text-fs-200 text-color-text-muted mb-space-1">{label}</p>
            <p className="text-fs-700 font-black text-color-text-primary">—</p>
          </div>
        ))}
      </div>
      <div className="bg-gj-teal-soft border border-gj-teal rounded-gj-lg p-space-4 text-gj-teal-deep text-fs-300">
        Dashboard administrateur complet — Sprint 3 (M8)
      </div>
    </div>
  )
}
