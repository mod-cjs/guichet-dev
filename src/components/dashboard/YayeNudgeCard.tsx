import Link from 'next/link'
import { Icon, YayeAvatar } from '@/components/ui'

export interface YayeNudgeCardProps {
  /** Nombre de conseils en attente. */
  nbConseils?: number
  /** Lien vers la conversation Yaye. */
  href?:       string
  /** Message custom (sinon dérivé de `nbConseils`). */
  message?:    string
}

/**
 * Carte d'invitation à parler à Yaye, l'assistant IA du Guichet.
 * Visuel : dégradé teal-deep → ink-teal, texte clair, icône Yaye.
 */
export function YayeNudgeCard({
  nbConseils = 3,
  href       = '/jeune/yaye',
  message,
}: YayeNudgeCardProps) {
  const txt =
    message ??
    `Yaye a ${nbConseils} conseil${nbConseils > 1 ? 's' : ''} pour toi`

  return (
    <Link
      href={href}
      className="block rounded-gj-lg p-space-4 text-white relative overflow-hidden
        transition-shadow duration-200 hover:shadow-gj-md"
      style={{
        backgroundImage:
          'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))',
      }}
    >
      <div
        className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gj-yellow/20 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-center gap-space-3">
        <YayeAvatar size={48} />
        <div className="flex-1 min-w-0">
          <div className="text-fs-100 uppercase tracking-wider font-black opacity-80">
            Yaye · IA
          </div>
          <div className="text-fs-300 font-black mt-1 leading-snug">{txt}</div>
          <p className="text-fs-200 opacity-90 leading-snug mt-1">
            Découvre ses recommandations personnalisées.
          </p>
        </div>
        <Icon name="arrow-right" size={20} className="flex-shrink-0 opacity-90" />
      </div>
    </Link>
  )
}
