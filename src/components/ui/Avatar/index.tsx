import Image from 'next/image'
import { getProfilePhotoUrl } from '@/lib/avatar/profile-photo'

interface AvatarProps {
  nom?: string
  prenom?: string
  /**
   * URL explicite d'une image (prioritaire sur `cjsUid`). Utile pour
   * supporter des cas où le caller a déjà résolu l'URL (ex: image upload
   * locale via `URL.createObjectURL`).
   */
  src?: string
  /**
   * GUIC-369 — Identifiant SSO du user. Si fourni (et `src` absent), l'Avatar
   * affichera la photo de profil via le proxy `/api/profil/photo/file`. Le
   * proxy retournera 404 si pas de photo → fallback initiales automatique
   * (gestion `onError` ci-dessous).
   */
  cjsUid?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'w-8 h-8 text-fs-200',
  md: 'w-10 h-10 text-fs-300',
  lg: 'w-16 h-16 text-fs-500',
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 32,
  md: 40,
  lg: 64,
}

export function Avatar({ nom, prenom, src, cjsUid, size = 'md' }: AvatarProps) {
  const initiales = `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`
  const alt = [prenom, nom].filter(Boolean).join(' ') || 'Avatar'
  const px = SIZE_PX[size]
  const resolvedSrc = src ?? getProfilePhotoUrl(cjsUid ?? undefined)
  return (
    <div className={`${SIZES[size]} rounded-full bg-gj-teal flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {resolvedSrc
        ? <Image src={resolvedSrc} alt={alt} width={px} height={px} unoptimized className="w-full h-full object-cover" />
        : <span className="font-bold text-white">{initiales || '?'}</span>
      }
    </div>
  )
}
