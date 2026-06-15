'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon, type IconName } from '@/components/ui'
import { RessourceShareButton } from '@/components/ressources/RessourceShareButton'
import type { RessourceDetail, TypeRessourceValue } from '@/lib/loaders/ressources'

interface RessourceDetailClientProps {
  detail: RessourceDetail
  /** URL canonique de cette page (pour partage). */
  pageUrl: string
}

const CTA_LABEL: Record<TypeRessourceValue, string> = {
  PDF: 'Télécharger le PDF',
  Video: 'Regarder la vidéo',
  Lien: 'Ouvrir le lien',
  Guide: 'Lire le guide',
  Outil: 'Utiliser l’outil',
}

const CTA_ICON: Record<TypeRessourceValue, IconName> = {
  PDF: 'document',
  Video: 'play',
  Lien: 'external',
  Guide: 'document',
  Outil: 'bolt',
}

/**
 * Bandeau d'actions (Consulter / Partager / Favoris) — GUIC-363.
 *
 * Workflow consultation :
 *  - PDF / Guide → ouverture dans nouvel onglet (le navigateur gère le viewer).
 *  - Video → nouvel onglet vers la source (YouTube/Vimeo embed serait à
 *    ajouter quand le modèle stockera l'identifiant du player).
 *  - Lien externe → nouvel onglet avec rel="noopener noreferrer".
 *  - Outil → nouvel onglet.
 *
 * Favoris : pattern hérité de `ResourceCard` / `RessourcesClient` (toggle POST,
 * redirige vers /auth/connexion en cas de 401).
 */
export function RessourceDetailClient({ detail, pageUrl }: RessourceDetailClientProps) {
  const router = useRouter()
  const [isFavori, setIsFavori] = useState(false)
  const [favoriPending, setFavoriPending] = useState(false)

  // Hydrate l'état favori au montage (best-effort, ignoré si non authentifié).
  useEffect(() => {
    let cancelled = false
    fetch('/api/favoris/ressources/ids', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.data) return
        const ids = j.data as string[]
        setIsFavori(ids.includes(detail.id))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [detail.id])

  const toggleFavori = async () => {
    if (favoriPending) return
    setFavoriPending(true)
    const previous = isFavori
    setIsFavori(!previous)
    try {
      const res = await fetch(`/api/ressources/${detail.id}/favori`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 401) {
        setIsFavori(previous)
        router.push('/auth/connexion')
        return
      }
      if (!res.ok) {
        setIsFavori(previous)
      }
    } catch {
      setIsFavori(previous)
    } finally {
      setFavoriPending(false)
    }
  }

  const ctaLabel = CTA_LABEL[detail.type]
  const ctaIcon = CTA_ICON[detail.type]
  const isExternal = /^https?:\/\//.test(detail.url)

  return (
    <div
      className="flex flex-wrap items-center gap-space-2"
      data-testid="ressource-detail-actions"
    >
      <a
        href={detail.url}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        aria-label={ctaLabel}
        data-testid="ressource-consult-cta"
        className="inline-flex items-center gap-1 px-space-4 py-[10px] rounded-gj-pill
          text-fs-300 font-black bg-gj-teal text-white hover:bg-gj-teal-deep
          min-h-[var(--tap-min)] focus:outline-none
          focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]"
      >
        <Icon name={ctaIcon} size={16} aria-hidden />
        {ctaLabel}
      </a>

      <Button
        type="button"
        variant="ghost"
        onClick={toggleFavori}
        aria-pressed={isFavori}
        aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        data-testid="ressource-detail-favori"
        disabled={favoriPending}
      >
        <Icon name="bookmark" size={16} aria-hidden />
        <span className="ml-1">{isFavori ? 'Favori' : 'Ajouter aux favoris'}</span>
      </Button>

      <RessourceShareButton
        title={detail.titre}
        text={detail.description.slice(0, 140)}
        url={pageUrl}
        testId="ressource-detail-share"
      />
    </div>
  )
}
