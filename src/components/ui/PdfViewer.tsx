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
  // GUIC-375 — Fallback toujours visible sous l'iframe : si le navigateur
  // refuse d'afficher le PDF (CSP, plugin manquant, source bloquée…), le
  // jeune dispose d'un lien direct pour télécharger ou ouvrir le fichier.
  const downloadUrl = url.includes('?') ? `${url}&download=1` : `${url}?download=1`
  return (
    <div className={`flex flex-col gap-space-2 ${className}`}>
      <iframe
        src={url}
        title={title}
        className="w-full rounded-gj-md border border-gj-line bg-gj-surface"
        style={{ height }}
      >
        Votre navigateur ne supporte pas l&apos;affichage des PDF.
      </iframe>
      <p className="text-fs-200 text-color-text-muted">
        Le PDF ne s&apos;affiche pas&nbsp;?{' '}
        <a
          href={downloadUrl}
          rel="noopener noreferrer"
          className="font-bold text-gj-teal-deep hover:underline"
        >
          Télécharger le fichier
        </a>{' '}
        ou{' '}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-gj-teal-deep hover:underline"
        >
          ouvrir dans un nouvel onglet
        </a>
        .
      </p>
    </div>
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
