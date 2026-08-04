import Image from 'next/image'
import { getProfilePhotoUrl } from '@/lib/avatar/profile-photo'

export type AvatarTone = 'jeune' | 'recruteur' | 'agent'

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
  /**
   * GUIC-447 — `true` si le user a réellement une photo (`ProfilJeune.photoUrl`).
   * Sans ça, on n'émet pas de requête proxy (qui renverrait un 404 bruyant) et
   * on affiche directement les initiales.
   */
  hasPhoto?: boolean
  size?: 'sm' | 'md' | 'lg'
  /**
   * GUIC-689 — Lot C2.4 : dégradé par rôle (réf. `component-kit.jsx` `av()`)
   * — jeune (teal), recruteur (bleu), agent (doré, admin/conseiller).
   * Défaut : aucun dégradé (fond plat `bg-gj-teal` inchangé) pour ne casser
   * aucun call site existant.
   */
  tone?: AvatarTone
  /** GUIC-689 — Lot C2.4 : pastille de présence « en ligne ». `false` par défaut. */
  online?: boolean
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

const TONE_GRADIENT: Record<AvatarTone, string> = {
  jeune:     'bg-gradient-to-br from-gj-teal to-gj-teal-deep',
  recruteur: 'bg-gradient-to-br from-gj-blue to-gj-blue-ink',
  agent:     'bg-gradient-to-br from-gj-yellow to-gj-yellow-deep',
}

const PRESENCE_SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 10,
  md: 12,
  lg: 16,
}

export function Avatar({ nom, prenom, src, cjsUid, hasPhoto = false, size = 'md', tone, online = false }: AvatarProps) {
  const initiales = `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`
  const alt = [prenom, nom].filter(Boolean).join(' ') || 'Avatar'
  const px = SIZE_PX[size]
  const resolvedSrc = src ?? getProfilePhotoUrl(cjsUid ?? undefined, hasPhoto)
  const toneClass = tone ? TONE_GRADIENT[tone] : 'bg-gj-teal'
  return (
    <span className="relative inline-flex flex-shrink-0">
      <div className={`${SIZES[size]} rounded-full ${toneClass} flex items-center justify-center overflow-hidden`}>
        {resolvedSrc
          ? <Image src={resolvedSrc} alt={alt} width={px} height={px} unoptimized className="w-full h-full object-cover" />
          : <span className="font-bold text-white">{initiales || '?'}</span>
        }
      </div>
      {online && (
        <span
          aria-label="En ligne"
          role="status"
          className="absolute right-0 bottom-0 rounded-full border-2 border-white"
          style={{
            width: PRESENCE_SIZE_PX[size],
            height: PRESENCE_SIZE_PX[size],
            background: 'var(--gj-status-live)',
          }}
        />
      )}
    </span>
  )
}
