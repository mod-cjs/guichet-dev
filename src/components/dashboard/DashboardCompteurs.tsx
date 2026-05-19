import { Card } from '@/components/ui'
import { IconCandidature, IconEvenement, IconFavori, IconCertificat, IconExperience, IconDiplome } from './icons'
import type { DashboardCounts } from '@/types/profil'
import type { ReactNode } from 'react'

interface Stat { label: string; value: number; icon: ReactNode; tone: 'teal' | 'yellow' }

interface Props { counts: DashboardCounts }

function Group({ title, stats }: { title: string; stats: Stat[] }) {
  return (
    <div className="flex flex-col gap-space-3">
      <h3 className="text-fs-200 font-bold uppercase tracking-wider text-color-text-secondary">
        {title}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-3">
        {stats.map(s => (
          <Card
            key={s.label}
            className="flex flex-col items-start gap-space-2 p-space-4
              hover:border-gj-teal-deep transition-colors"
          >
            <div className={s.tone === 'teal' ? 'text-gj-teal-deep' : 'text-gj-yellow-ink'}>
              {s.icon}
            </div>
            <p className="text-fs-500 font-black text-color-text-primary leading-none">
              {s.value}
            </p>
            <p className="text-fs-200 text-color-text-secondary">{s.label}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function DashboardCompteurs({ counts }: Props) {
  const parcours: Stat[] = [
    { label: 'Diplômes',     value: counts.diplomes,     icon: <IconDiplome />,     tone: 'teal' },
    { label: 'Expériences',  value: counts.experiences,  icon: <IconExperience />,  tone: 'teal' },
    { label: 'Certificats',  value: counts.certificats,  icon: <IconCertificat />,  tone: 'teal' },
    { label: 'Candidatures', value: counts.candidatures, icon: <IconCandidature />, tone: 'teal' },
  ]
  const interactions: Stat[] = [
    { label: 'Événements', value: counts.eventsInscrits, icon: <IconEvenement />, tone: 'yellow' },
    { label: 'Favoris',    value: counts.favoris,        icon: <IconFavori />,    tone: 'yellow' },
  ]

  return (
    <div className="flex flex-col gap-space-5">
      <Group title="Mon parcours"       stats={parcours} />
      <Group title="Mes interactions"   stats={interactions} />
    </div>
  )
}
