'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  memoriserIntentionFavori,
  consommerIntentionFavori,
  lienConnexionAvecRetour,
} from '@/lib/ressources/favori-intent'
import { Button, Icon, type IconName, PdfViewer, VideoEmbed } from '@/components/ui'
import { RessourceShareButton } from '@/components/ressources/RessourceShareButton'
import { parseVideoEmbedUrl } from '@/lib/parsers/video-url'
import { htmlToPlainText } from '@/lib/rich-html'
import type { RessourceDetail, TypeRessourceValue } from '@/lib/loaders/ressources'

interface RessourceDetailClientProps {
  detail: RessourceDetail
  /** URL canonique de cette page (pour partage). */
  pageUrl: string
  /** GUIC-689 — session calculée côté serveur (motif /centres) : sans elle,
   *  l'hydratation du favori 401-erait en console pour chaque anonyme. */
  userIsConnected?: boolean
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
 * Visionneuse inline + bandeau d'actions (Consulter / Partager / Favoris).
 *
 * Affichage du contenu (GUIC-366, désormais branché) :
 *  - PDF → `<PdfViewer>` inline via le proxy `/api/ressources/[id]/proxy`
 *    (contourne `X-Frame-Options` des sources externes) + fallback download/ouvrir.
 *  - Video → `<VideoEmbed>` inline (YouTube/Vimeo) si l'URL est reconnue, sinon CTA.
 *  - Guide / Lien / Outil → CTA « ouvrir » (nouvel onglet, rel="noopener noreferrer").
 *
 * Le bouton CTA reste affiché dans tous les cas (télécharger / ouvrir la source).
 *
 * Favoris : pattern hérité de `ResourceCard` / `RessourcesClient` (toggle POST,
 * redirige vers /auth/connexion en cas de 401).
 */
export function RessourceDetailClient({ detail, pageUrl, userIsConnected = false }: RessourceDetailClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isFavori, setIsFavori] = useState(false)
  const [favoriPending, setFavoriPending] = useState(false)

  // Hydrate l'état favori au montage — uniquement connecté (GUIC-689 : en
  // anonyme le 401 systématique polluait la console de chaque visiteur).
  useEffect(() => {
    if (!userIsConnected) return
    let cancelled = false
    fetch('/api/favoris/ressources/ids', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.data) return
        const ids = j.data as string[]
        const dejaFavori = ids.includes(detail.id)
        setIsFavori(dejaFavori)

        // GUIC-689 — l'utilisateur revient peut-être d'une connexion qu'il a
        // déclenchée en cliquant ce bouton. On rejoue son intention.
        // Elle est consommée dans tous les cas : l'API est un toggle, une
        // intention qui survit retirerait au montage suivant le favori qu'elle
        // vient de poser.
        const intention = consommerIntentionFavori()
        if (intention !== detail.id || dejaFavori) return
        fetch(`/api/ressources/${detail.id}/favori`, {
          method: 'POST',
          credentials: 'include',
        })
          .then((r) => {
            if (!cancelled && r.ok) setIsFavori(true)
          })
          .catch(() => {})
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [detail.id, userIsConnected])

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
        // GUIC-689 — on retient la ressource visée et le chemin courant : au
        // retour du SSO, l'utilisateur retrouve sa ressource ET son favori.
        // L'intention passe par sessionStorage, jamais par l'URL : un lien
        // forgé écrirait sinon dans le compte de qui le suit.
        memoriserIntentionFavori(detail.id)
        router.push(lienConnexionAvecRetour(pathname))
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

  // GUIC-709 — un PDF s'emporte par NOTRE proxy, pas par l'URL de la source.
  // C'est le seul point qui prouve qu'un fichier est réellement parti, donc le
  // seul endroit où le compter. Tant que le CTA pointait la source, le fichier
  // ne traversait jamais nos serveurs et le compteur serait resté à zéro par
  // construction — un compteur vide qu'on croit juste est pire que pas de
  // compteur du tout.
  //
  // Les autres types gardent leur lien direct : le proxy ne sert en pièce
  // jointe que le PDF, et « emporter » ne veut rien dire d'une vidéo ou d'une
  // page. On n'invente pas un événement pour uniformiser.
  const ctaHref =
    detail.type === 'PDF' ? `/api/ressources/${detail.id}/proxy?download=1` : detail.url

  // Le proxy répond `Content-Disposition: attachment` : le navigateur télécharge
  // sans naviguer. Un `target="_blank"` laisserait un onglet vide derrière lui.
  const isExternal = /^https?:\/\//.test(ctaHref)

  // Visionneuse inline : PDF via proxy (self) ; vidéo embeddable via parser.
  const videoEmbed = detail.type === 'Video' ? parseVideoEmbedUrl(detail.url) : null

  return (
    <div className="flex flex-col gap-space-4">
      {detail.type === 'PDF' && (
        <PdfViewer
          url={`/api/ressources/${detail.id}/proxy`}
          title={detail.titre}
          height={640}
        />
      )}
      {videoEmbed && <VideoEmbed embedUrl={videoEmbed.embedUrl} title={detail.titre} />}

      <div
        className="flex flex-wrap items-center gap-space-2"
        data-testid="ressource-detail-actions"
      >
      <a
        href={ctaHref}
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
        text={htmlToPlainText(detail.description).slice(0, 140)}
        url={pageUrl}
        testId="ressource-detail-share"
      />
      </div>
    </div>
  )
}
