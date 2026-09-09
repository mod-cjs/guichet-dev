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
 *
 * GUIC-689 (F-5) — l'`<iframe>` ne détecte PAS les échecs HTTP (404/415/502…) :
 * `onError` ne se déclenche que sur une panne réseau, `onLoad` se déclenche
 * même quand le document chargé est une page/JSON d'erreur. Résultat observé
 * en audit : iframe blanche + violation console CSP `frame-ancestors` (le
 * corps d'erreur JSON du proxy hérite du `frame-ancestors 'none'` global tant
 * qu'aucun header explicite ne l'autorise). On vérifie donc la disponibilité
 * via une requête `HEAD` avant de rendre l'iframe : si elle échoue, seul le
 * fallback texte (déjà existant) s'affiche — jamais d'iframe pointée vers une
 * réponse d'erreur.
 */

import { useEffect, useState } from 'react'
import { Modal, Button, Icon } from '@/components/ui'

type PdfAvailability = 'checking' | 'ok' | 'error'

/** Vérifie que `url` répond avec un statut de succès avant d'y pointer une iframe. */
function usePdfAvailability(url: string): PdfAvailability {
  const [status, setStatus] = useState<PdfAvailability>('checking')

  useEffect(() => {
    let cancelled = false
    setStatus('checking')
    fetch(url, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? 'ok' : 'error')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return status
}

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
  // GUIC-689 (F-5) — pas d'iframe tant que la disponibilité n'est pas confirmée :
  // ni pendant la vérification (évite l'iframe blanche le temps du HEAD), ni en
  // cas d'échec (le proxy peut renvoyer 401/415/502 — jamais affiché en frame).
  const availability = usePdfAvailability(url)

  // GUIC-375 — Fallback toujours visible sous l'iframe : si le navigateur
  // refuse d'afficher le PDF (CSP, plugin manquant, source bloquée…), le
  // jeune dispose d'un lien direct pour télécharger ou ouvrir le fichier.
  const downloadUrl = url.includes('?') ? `${url}&download=1` : `${url}?download=1`
  return (
    <div className={`flex flex-col gap-space-2 ${className}`}>
      {/* Pas de texte enfant dans l'iframe : un enfant texte provoque un mismatch
          d'hydratation (React #418). Le vrai fallback est le <p> ci-dessous. */}
      {availability === 'ok' && (
        <iframe
          src={url}
          title={title}
          className="w-full rounded-gj-md border border-gj-line bg-gj-surface"
          style={{ height }}
        />
      )}
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
