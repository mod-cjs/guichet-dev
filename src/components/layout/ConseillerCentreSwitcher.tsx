'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveCentre } from '@/app/conseiller/actions'
import { Icon } from '@/components/ui/Icon'
import type { ConseillerCentre } from '@/lib/loaders/conseiller'

/**
 * Sélecteur de centre actif (multi-centre). Persiste via cookie (action serveur)
 * puis rafraîchit. `variant='dark'` pour la sidebar teal foncé, `'light'` ailleurs.
 */
export function ConseillerCentreSwitcher({
  centres,
  activeCentreId,
  variant = 'dark',
}: {
  centres: ConseillerCentre[]
  activeCentreId: string
  variant?: 'dark' | 'light'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const onChange = (centreId: string) => {
    if (centreId === activeCentreId) return
    startTransition(async () => {
      await setActiveCentre(centreId)
      router.refresh()
    })
  }

  const dark = variant === 'dark'
  const wrap: React.CSSProperties = dark
    ? { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff' }
    : { background: 'var(--gj-bg)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-ink)' }

  // Un seul centre → simple affichage (pas de sélecteur).
  if (centres.length <= 1) {
    return (
      <div className="inline-flex items-center gap-space-1" style={{ ...wrap, fontSize: 11, fontWeight: 700, padding: '7px 10px', borderRadius: 8, maxWidth: '100%' }}>
        <Icon name="pin" size={13} className="shrink-0" style={{ color: dark ? 'var(--gj-yellow)' : 'var(--gj-teal-deep)' }} />
        <span className="truncate">{centres[0]?.nom}</span>
      </div>
    )
  }

  return (
    <label className="flex items-center gap-space-1 relative" style={{ ...wrap, padding: '6px 10px', borderRadius: 8, opacity: pending ? 0.6 : 1 }}>
      <Icon name="pin" size={13} className="shrink-0" style={{ color: dark ? 'var(--gj-yellow)' : 'var(--gj-teal-deep)' }} />
      <select
        aria-label="Changer de centre"
        value={activeCentreId}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none border-0 cursor-pointer w-full"
        style={{ fontSize: 11.5, fontWeight: 700, color: dark ? '#fff' : 'var(--gj-ink)', fontFamily: 'inherit' }}
      >
        {centres.map((c) => (
          <option key={c.id} value={c.id} style={{ color: 'var(--gj-ink)' }}>{c.nom}</option>
        ))}
      </select>
      <Icon name="chevron-down" size={12} className="shrink-0" style={{ color: dark ? 'rgba(255,255,255,.6)' : 'var(--gj-grey)' }} />
    </label>
  )
}
