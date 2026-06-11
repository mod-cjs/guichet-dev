'use client'

import { useState } from 'react'
import { Badge, Button, Card, Icon, PdfViewer, VideoEmbed } from '@/components/ui'
import { parseVideoEmbedUrl } from '@/lib/parsers/video-url'
import type { RessourceListItem } from '@/lib/loaders/ressources'

interface Props {
  ressource: RessourceListItem
}

/**
 * GUIC-366 — vue détaillée d'une ressource côté client.
 *
 * - PDF  : bouton "Voir" ouvre le `<PdfViewer>` en modal, "Télécharger" force
 *          le download via `download` attribute.
 * - Vidéo : si l'URL match YouTube/Vimeo → `<VideoEmbed>` inline ; sinon lien
 *          externe avec confirmation.
 * - Autres (Lien / Guide / Outil) : CTA externe classique.
 */
export function RessourceDetailClient({ ressource }: Props) {
  const [pdfOpen, setPdfOpen] = useState(false)
  const [confirmExternal, setConfirmExternal] = useState(false)

  const isPdf = ressource.type === 'PDF'
  const isVideo = ressource.type === 'Video'
  const videoEmbed = isVideo ? parseVideoEmbedUrl(ressource.url) : null

  return (
    <div className="mt-space-3 flex flex-col gap-space-5">
      <header className="flex flex-col gap-space-2">
        <div className="flex items-center gap-space-2 flex-wrap">
          <Badge variant="teal">{ressource.type}</Badge>
          {ressource.niveau && <Badge variant="blue">{ressource.niveau}</Badge>}
          {ressource.langue && <Badge variant="yellow">{ressource.langue}</Badge>}
          <span className="text-fs-200 text-color-text-muted">{ressource.theme}</span>
        </div>
        <h1 className="text-fs-800 font-black text-color-text-primary">
          {ressource.titre}
        </h1>
        <p className="text-fs-300 text-color-text-secondary whitespace-pre-line">
          {ressource.description}
        </p>
      </header>

      {/* ---- Vidéo embeddable ---- */}
      {isVideo && videoEmbed && (
        <Card variant="default" className="p-space-3">
          <VideoEmbed embedUrl={videoEmbed.embedUrl} title={ressource.titre} />
        </Card>
      )}

      {/* ---- Vidéo non embeddable → lien externe avec confirmation ---- */}
      {isVideo && !videoEmbed && (
        <Card variant="default" className="p-space-4 flex flex-col gap-space-3">
          <p className="text-fs-300 text-color-text-secondary">
            Cette vidéo est hébergée sur un site externe. Vous allez quitter Guichet Jeunesse.
          </p>
          <div className="flex gap-space-2 flex-wrap">
            <Button
              variant="primary"
              onClick={() => {
                setConfirmExternal(true)
                window.open(ressource.url, '_blank', 'noopener,noreferrer')
              }}
              aria-label="Ouvrir la vidéo dans un nouvel onglet"
            >
              <Icon name="external" size={16} className="mr-1" />
              Ouvrir la vidéo
            </Button>
            {confirmExternal && (
              <span className="text-fs-200 text-color-text-muted self-center">
                Ouverture dans un nouvel onglet…
              </span>
            )}
          </div>
        </Card>
      )}

      {/* ---- PDF — boutons Voir / Télécharger ---- */}
      {isPdf && (
        <Card variant="default" className="p-space-4 flex flex-col gap-space-3">
          <div className="flex gap-space-2 flex-wrap">
            <Button
              variant="primary"
              onClick={() => setPdfOpen(true)}
              aria-label="Voir le PDF en aperçu"
            >
              <Icon name="eye" size={16} className="mr-1" />
              Voir
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const a = document.createElement('a')
                a.href = ressource.url
                a.download = `${ressource.titre}.pdf`
                a.rel = 'noopener noreferrer'
                document.body.appendChild(a)
                a.click()
                a.remove()
              }}
              aria-label="Télécharger le PDF"
            >
              <Icon name="download" size={16} className="mr-1" />
              Télécharger
            </Button>
          </div>
          <PdfViewer
            url={ressource.url}
            title={ressource.titre}
            isOpen={pdfOpen}
            onClose={() => setPdfOpen(false)}
            height={640}
          />
        </Card>
      )}

      {/* ---- Lien / Guide / Outil → CTA externe ---- */}
      {!isPdf && !isVideo && (
        <Card variant="default" className="p-space-4 flex flex-col gap-space-3">
          <a
            href={ressource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-space-1 text-fs-300 font-bold text-gj-teal-deep hover:underline min-h-[var(--tap-min)]"
          >
            <Icon name="external" size={16} />
            Ouvrir la ressource
          </a>
        </Card>
      )}
    </div>
  )
}
