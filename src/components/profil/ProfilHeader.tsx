'use client'

import { Avatar } from '@/components/ui'
import { getProfilePhotoUrl } from '@/lib/avatar/profile-photo'
import { CompletionBar } from './CompletionBar'

interface ProfilHeaderProps {
  nom:             string
  prenom:          string
  email:           string | null
  completionScore: number
  /**
   * @deprecated GUIC-369 — la photo est désormais résolue via `cjsUid` et le
   * proxy `/api/profil/photo/file`. Conservé pour la compat ascendante : si
   * fourni, on l'utilise directement (utile en aperçu d'upload local).
   */
  photoUrl?:       string | null
  /** GUIC-369 — identifiant SSO pour résoudre l'URL proxy de la photo. */
  cjsUid?:         string | null
}

export function ProfilHeader({ nom, prenom, email, completionScore, photoUrl, cjsUid }: ProfilHeaderProps) {
  // GUIC-369 — Si on a un `cjsUid` on PRIVILÉGIE le proxy (le `photoUrl` brut
  // issu de `ProfilJeune.photoUrl` pointe sur un Blob privé Vercel non
  // accessible directement). `photoUrl` reste un fallback (legacy).
  // GUIC-447 — `hasPhoto` dérivé de `photoUrl` (ProfilJeune.photoUrl) : pas de
  // requête proxy si pas de photo.
  const resolvedSrc = getProfilePhotoUrl(cjsUid ?? undefined, Boolean(photoUrl)) ?? photoUrl ?? undefined
  return (
    <div className="flex flex-col gap-space-4">
      <div className="flex items-center gap-space-4">
        <Avatar nom={nom} prenom={prenom} src={resolvedSrc ?? undefined} size="lg" />
        <div className="min-w-0">
          <p className="text-fs-500 font-black text-color-text-primary truncate">
            {prenom} {nom}
          </p>
          {email && (
            <p className="text-fs-300 text-color-text-secondary truncate">{email}</p>
          )}
        </div>
      </div>
      <CompletionBar score={completionScore} />
    </div>
  )
}
