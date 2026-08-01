'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const CLS = 'rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[8px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-admin-gold)] w-full max-w-[260px]'

/**
 * Recherche SERVEUR URL-bound (GUIC-687) : met à jour `<prefix>Q` (debounce) et réinitialise
 * `<prefix>Page` à 1. Comme le filtrage se fait côté serveur, la recherche porte sur TOUT le
 * jeu de données (plus seulement la page chargée) — corrige la fausse exhaustivité.
 */
export function CentreSearch({ prefix, placeholder, label }: { prefix: string; placeholder: string; label: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get(`${prefix}Q`) ?? ''
  const [value, setValue] = useState(current)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resynchronise si l'URL change ailleurs (navigation onglet, reset).
  useEffect(() => { setValue(current) }, [current])

  function onChange(v: string) {
    setValue(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      const t = v.trim()
      if (t === '') next.delete(`${prefix}Q`)
      else next.set(`${prefix}Q`, t)
      next.delete(`${prefix}Page`) // toute nouvelle recherche repart page 1
      router.push(`?${next.toString()}`, { scroll: false })
    }, 300)
  }

  return <input className={CLS} placeholder={placeholder} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
}
