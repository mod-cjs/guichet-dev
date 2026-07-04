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

export function BookCard({ b }: { b: BookCardData }) {
  const dispo = b.exemplairesDisponibles > 0
  return (
    <div className="flex flex-col gap-space-2">
      {/* Couverture format livre */}
      <div className="relative rounded-gj-md overflow-hidden" style={{ aspectRatio: '2 / 3', boxShadow: '0 6px 16px rgba(10,40,32,.18)' }}>
        {b.couvertureUrl ? (
          <img src={b.couvertureUrl} alt={`Couverture de ${b.titre}`} className="w-full h-full" style={{ objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))', color: '#fff', padding: '14px 12px 12px 16px' }}>
            {/* dos du livre */}
            <span aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 6, background: 'rgba(0,0,0,.22)' }} />
            <Icon name="learning" size={20} style={{ color: 'var(--gj-yellow)' }} />
            <div>
              <div className="font-black" style={{ fontSize: 13, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.titre}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>{b.auteur}</div>
            </div>
          </div>
        )}
        {/* pastille disponibilité */}
        <span className="absolute font-extrabold" style={{ top: 8, right: 8, fontSize: 9.5, padding: '3px 8px', borderRadius: 999, background: dispo ? 'var(--gj-green)' : 'rgba(10,40,32,.75)', color: '#fff' }}>
          {b.exemplairesDisponibles}/{b.exemplairesTotal}
        </span>
      </div>

      {/* Méta sous la couverture */}
      <div className="min-w-0">
        <div className="font-extrabold text-color-text-primary" style={{ fontSize: 13, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.titre}</div>
        <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5, marginTop: 1 }}>{b.auteur}</div>
        {b.emplacement && <div className="text-color-text-secondary truncate" style={{ fontSize: 10.5, marginTop: 2 }}>📍 {b.emplacement}</div>}
      </div>
    </div>
  )
}
