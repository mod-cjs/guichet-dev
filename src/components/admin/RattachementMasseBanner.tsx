'use client'

/**
 * GUIC-684 — Bannière de reprise du stock.
 *
 * Le rattachement à un programme est obligatoire, mais tout le contenu antérieur au
 * ticket n'en a aucun : sans cette action, l'admin ne peut plus enregistrer une fiche
 * ancienne sans d'abord la rattacher à la main. La bannière n'apparaît QUE s'il reste
 * des contenus orphelins — elle disparaît d'elle-même une fois le stock soldé.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { rattacherContenusSansProgramme } from '@/app/admin/programmes/actions'
import type { ProgrammeOption } from './ProgrammesField'

export interface RattachementMasseBannerProps {
  entite: 'opportunite' | 'ressource' | 'evenement'
  /** Nombre de contenus sans aucun programme (0 → rien n'est rendu). */
  sansProgramme: number
  programmes: ProgrammeOption[]
  /** Libellé pluriel de l'entité, pour un message lisible. */
  libelle: string
}

export function RattachementMasseBanner({
  entite,
  sansProgramme,
  programmes,
  libelle,
}: RattachementMasseBannerProps) {
  const router = useRouter()
  const [choisi, setChoisi] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)

  if (sansProgramme === 0) return null

  function rattacher() {
    if (!choisi) return
    start(async () => {
      try {
        const { count } = await rattacherContenusSansProgramme(entite, choisi as string)
        setFeedback({
          message: `${count} ${libelle} rattaché(e)s au programme.`,
          variant: 'success',
        })
        router.refresh()
      } catch {
        setFeedback({ message: 'Échec du rattachement en masse.', variant: 'error' })
      }
    })
  }

  return (
    <>
      <Alert type="warning" title="Contenus sans programme">
        <div className="flex flex-col gap-space-2">
          <p>
            <strong>{sansProgramme}</strong> {libelle} ne relèvent d’aucun programme. Tant qu’elles
            ne sont pas rattachées, toute modification de leur fiche est refusée.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {programmes.map((p) => (
              <Chip key={p.slug} selected={choisi === p.slug} onClick={() => setChoisi(p.slug)}>
                {p.nom}
              </Chip>
            ))}
            <Button type="button" variant="primary" disabled={!choisi || pending} onClick={rattacher}>
              Rattacher les {sansProgramme}
            </Button>
          </div>
        </div>
      </Alert>
      {feedback && (
        <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />
      )}
    </>
  )
}
