import { Icon } from '@/components/ui/Icon'

/**
 * GUIC-522 — Carte-livre : couverture (format 2:3) + titre/auteur + disponibilité.
 * Affiche `couvertureUrl` si présente, sinon une couverture générée (dos + titre).
 */
export interface BookCardData {
  titre: string
  auteur: string
  theme?: string
  couvertureUrl?: string | null
  exemplairesDisponibles: number
  exemplairesTotal: number
  emplacement?: string | null
}

/** Couverture seule (réutilisable en vignette). */
export function BookCover({ titre, auteur, couvertureUrl, badge }: {
  titre: string; auteur: string; couvertureUrl?: string | null; badge?: string
}) {
  return (
    <div className="relative rounded-gj-md overflow-hidden w-full h-full" style={{ boxShadow: '0 6px 16px rgba(10,40,32,.18)' }}>
      {couvertureUrl ? (
        <img src={couvertureUrl} alt={`Couverture de ${titre}`} className="w-full h-full" style={{ objectFit: 'cover' }} loading="lazy" />
      ) : (
        <div className="w-full h-full flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))', color: '#fff', padding: '12px 10px 10px 14px' }}>
          <span aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 5, background: 'rgba(0,0,0,.22)' }} />
          <Icon name="learning" size={16} style={{ color: 'var(--gj-yellow)' }} />
          <div>
            <div className="font-black" style={{ fontSize: 11, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{titre}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>{auteur}</div>
          </div>
        </div>
      )}
      {badge && (
        <span className="absolute font-extrabold" style={{ top: 6, right: 6, fontSize: 9, padding: '2px 7px', borderRadius: 999, background: 'var(--gj-green)', color: '#fff' }}>{badge}</span>
      )}
    </div>
  )
}

export function BookCard({ b }: { b: BookCardData }) {
  const dispo = b.exemplairesDisponibles > 0
  return (
    <div className="flex flex-col gap-space-2">
      <div style={{ aspectRatio: '2 / 3' }}>
        <div className="relative w-full h-full">
          <BookCover titre={b.titre} auteur={b.auteur} couvertureUrl={b.couvertureUrl} />
          <span className="absolute font-extrabold" style={{ top: 8, right: 8, fontSize: 9.5, padding: '3px 8px', borderRadius: 999, background: dispo ? 'var(--gj-green)' : 'rgba(10,40,32,.75)', color: '#fff' }}>
            {b.exemplairesDisponibles}/{b.exemplairesTotal}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="font-extrabold text-color-text-primary" style={{ fontSize: 13, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.titre}</div>
        <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5, marginTop: 1 }}>{b.auteur}</div>
        {b.emplacement && <div className="text-color-text-secondary truncate" style={{ fontSize: 10.5, marginTop: 2 }}>📍 {b.emplacement}</div>}
      </div>
    </div>
  )
}
