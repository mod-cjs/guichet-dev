import { Card } from '@/components/ui'
import { IconCandidature, IconEvenement, IconFavori, IconCertificat, IconExperience, IconDiplome } from './icons'
import { timeAgo } from '@/lib/time-ago'
import type { ActivityItem } from '@/types/profil'
import type { ReactNode } from 'react'

interface Props { items: ActivityItem[] }

function describe(item: ActivityItem): { icon: ReactNode; text: string } {
  switch (item.type) {
    case 'candidature':           return { icon: <IconCandidature />, text: `Candidature envoyée à « ${item.opportuniteTitre} »` }
    case 'inscription_evenement': return { icon: <IconEvenement />,   text: `Inscription à « ${item.evenementTitre} »` }
    case 'favori_ressource':      return { icon: <IconFavori />,      text: `Ressource ajoutée aux favoris : ${item.ressourceTitre}` }
    case 'experience_ajoutee':    return { icon: <IconExperience />,  text: `Expérience ajoutée : ${item.poste} chez ${item.organisation}` }
    case 'diplome_ajoute':        return { icon: <IconDiplome />,     text: `Diplôme ajouté : ${item.intitule} (${item.anneeObtention})` }
    case 'certificat_recu':       return { icon: <IconCertificat />,  text: `Certificat reçu : ${item.intitule}` }
  }
}

export function ActivityFeed({ items }: Props) {
  return (
    <Card>
      <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-4">Activités récentes</h2>

      {items.length === 0 ? (
        <p className="text-fs-300 text-color-text-secondary italic">
          Aucune activité pour le moment. Postulez à une opportunité ou complétez votre profil pour commencer.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-gj-line">
          {items.map(item => {
            const { icon, text } = describe(item)
            return (
              <li key={`${item.type}:${item.id}`} className="py-space-3 first:pt-0 last:pb-0 flex items-start gap-space-3">
                <div className="text-gj-teal-deep flex-shrink-0 mt-[2px]">{icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-fs-300 text-color-text-primary">{text}</p>
                  <p className="text-fs-200 text-color-text-secondary mt-space-1">{timeAgo(item.date)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
