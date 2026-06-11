'use client'

import { Avatar } from '@/components/ui'
import { CompletionBar } from './CompletionBar'

interface ProfilHeaderProps {
  nom:             string
  prenom:          string
  email:           string | null
  completionScore: number
  photoUrl?:       string | null
}

export function ProfilHeader({ nom, prenom, email, completionScore, photoUrl }: ProfilHeaderProps) {
  return (
    <div className="flex flex-col gap-space-4">
      <div className="flex items-center gap-space-4">
        <Avatar nom={nom} prenom={prenom} src={photoUrl ?? undefined} size="lg" />
        <div className="min-w-0">
          <h1 className="text-fs-600 font-black text-color-text-primary truncate">
            {prenom} {nom}
          </h1>
          {email && (
            <p className="text-fs-300 text-color-text-secondary truncate">{email}</p>
          )}
        </div>
      </div>
      <CompletionBar score={completionScore} />
    </div>
  )
}
