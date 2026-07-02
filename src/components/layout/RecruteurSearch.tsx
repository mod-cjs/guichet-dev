'use client'

/**
 * GUIC-489 (US-7) — Barre de recherche candidat du TopBar recruteur.
 * Navigue vers la page Candidatures filtrée (`?q=`) — recherche bornée aux
 * candidats des offres du recruteur (côté loader).
 */
import { useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

export function RecruteurSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const ref = useRef<HTMLInputElement>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = ref.current?.value.trim() ?? ''
    if (!q) {
      router.push('/recruteur/candidatures')
      return
    }
    // Conserve le filtre statut courant si présent dans l'URL.
    const sp = new URLSearchParams()
    const statut = params?.get('statut')
    if (statut) sp.set('statut', statut)
    sp.set('q', q)
    router.push(`/recruteur/candidatures?${sp.toString()}`)
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2"
      style={{ background: 'var(--gj-bg)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 14px', minHeight: 42, width: 260 }}
    >
      <button type="submit" aria-label="Rechercher" className="inline-flex items-center border-0 bg-transparent p-0" style={{ color: 'var(--gj-grey)' }}>
        <Icon name="search" size={16} />
      </button>
      <input
        ref={ref} name="q" type="search" placeholder="Rechercher un candidat…"
        defaultValue={params?.get('q') ?? ''}
        className="flex-1 bg-transparent outline-none border-0 text-[13.5px]"
        style={{ color: 'var(--gj-ink)' }}
      />
    </form>
  )
}
