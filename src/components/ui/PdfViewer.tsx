'use client'

/**
 * GUIC-366 — PdfViewer : viewer PDF inline ou modal.
 *
 * Approche minimale : on délègue le rendu au browser via `<iframe>` (tous les
 * navigateurs cibles supportent l'affichage PDF natif). Pas de PDF.js → 0 KB
 * de payload supplémentaire.
 *
 * Deux usages :
 *  - `<PdfViewer url=… title=… />` inline (hauteur par défaut 600 px)
 *  - `<PdfViewer url=… title=… isOpen onClose />` en modal plein écran
 */

import { Modal, Button, Icon } from '@/components/ui'

export interface PdfViewerProps {
  url: string
  title: string
  className?: string
  /** Hauteur en pixels du viewer inline (ignoré en mode modal). Défaut : 600. */
  height?: number
  /** Si défini, le viewer s'affiche dans une Modal. */
  isOpen?: boolean
  onClose?: () => void
}

function PdfFrame({ url, title, height = 600, className = '' }: {
  url: string; title: string; height?: number; className?: string
}) {
  return (
    <iframe
      src={url}
      title={title}
      className={`w-full rounded-gj-md border border-gj-line bg-gj-surface ${className}`}
      style={{ height }}
    />
  )
}

export function PdfViewer({
  url,
  title,
  className = '',
  height = 600,
  isOpen,
  onClose,
}: PdfViewerProps) {
  // Mode modal — quand isOpen est explicitement fourni.
  if (typeof isOpen === 'boolean') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose ?? (() => {})}
        title={title}
        size="lg"
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => {
                // Force download : ouvre dans un nouvel onglet ; le serveur
                // doit envoyer Content-Disposition: attachment pour réellement
                // forcer le download. Sinon le browser affiche le PDF.
                const a = document.createElement('a')
                a.href = url
                a.download = title
                a.rel = 'noopener noreferrer'
                document.body.appendChild(a)
                a.click()
                a.remove()
              }}
            >
              <Icon name="download" size={16} className="mr-1" />
              Télécharger
            </Button>
          </>
        }
      >
        <PdfFrame url={url} title={title} height={Math.min(height, 720)} />
      </Modal>
    )
  }

  // Mode inline.
  return <PdfFrame url={url} title={title} height={height} className={className} />
}
