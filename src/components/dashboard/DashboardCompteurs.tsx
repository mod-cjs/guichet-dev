import { Card } from '@/components/ui'
import { IconCandidature, IconEvenement, IconFavori, IconCertificat, IconExperience, IconDiplome } from './icons'
import type { DashboardCounts } from '@/types/profil'
import type { ReactNode } from 'react'

interface Stat { label: string; value: number; icon: ReactNode }

interface Props { counts: DashboardCounts }

export function DashboardCompteurs({ counts }: Props) {
  const stats: Stat[] = [
    { label: 'Candidatures', value: counts.candidatures,   icon: <IconCandidature /> },
    { label: 'Événements',   value: counts.eventsInscrits, icon: <IconEvenement /> },
    { label: 'Favoris',      value: counts.favoris,        icon: <IconFavori /> },
    { label: 'Certificats',  value: counts.certificats,    icon: <IconCertificat /> },
    { label: 'Expériences',  value: counts.experiences,    icon: <IconExperience /> },
    { label: 'Diplômes',     value: counts.diplomes,       icon: <IconDiplome /> },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-space-3">
      {stats.map(s => (
        <Card key={s.label} className="flex flex-col items-start gap-space-2 p-space-4">
          <div className="text-gj-teal-deep">{s.icon}</div>
          <p className="text-fs-500 font-black text-color-text-primary leading-none">{s.value}</p>
          <p className="text-fs-200 text-color-text-secondary">{s.label}</p>
        </Card>
      ))}
    </div>
  )
}
