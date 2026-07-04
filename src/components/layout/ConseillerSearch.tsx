'use client'

/**
 * GUIC-499 (US-7) — Barre de recherche bénéficiaire du TopBar conseiller.
 * Navigue vers l'annuaire filtré (`?q=`) et reflète le terme actif (defaultValue).
 */
import { useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

export function ConseillerSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const ref = useRef<HTMLInputElement>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = ref.current?.value.trim() ?? ''
    router.push(q ? `/conseiller/beneficiaires?q=${encodeURIComponent(q)}` : '/conseiller/beneficiaires')
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="flex items-center gap-2"
      style={{ background: 'var(--gj-bg)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 14px', minHeight: 42, width: 280 }}
    >
      <button type="submit" aria-label="Rechercher un bénéficiaire" className="inline-flex items-center border-0 bg-transparent p-0" style={{ color: 'var(--gj-grey)' }}>
        <Icon name="search" size={16} />
      </button>
      <input
        ref={ref} name="q" type="search" placeholder="Rechercher un bénéficiaire…"
        defaultValue={params?.get('q') ?? ''}
        aria-label="Rechercher un bénéficiaire"
        className="flex-1 bg-transparent outline-none border-0 text-fs-300"
        style={{ color: 'var(--gj-ink)' }}
      />
    </form>
  )
}
