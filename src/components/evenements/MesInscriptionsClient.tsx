'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, Chip, Button, Icon, EmptyState, Toast, Badge } from '@/components/ui'
import { appDomain } from '@/lib/app-url'
import { htmlToPlainText } from '@/lib/rich-html'
import type { MesInscriptionItem, TypeEvenementValue } from '@/lib/loaders/evenements'

interface Props {
  aVenir: MesInscriptionItem[]
  passes: MesInscriptionItem[]
}

const TYPE_BADGE: Record<TypeEvenementValue, 'teal' | 'blue' | 'yellow' | 'green' | 'red'> = {
  Atelier: 'teal',
  Forum: 'blue',
  Formation: 'yellow',
  Webinar: 'green',
  Conference: 'red',
}

const FULL_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

type Tab = 'a-venir' | 'passes'

/**
 * Vue "Mes événements" (page `/jeune/mes-inscriptions`).
 * Onglets À venir / Passés. Actions : voir détail, annuler, ajouter au calendrier (.ics).
 */
export function MesInscriptionsClient({ aVenir, passes }: Props) {
  const [tab, setTab] = useState<Tab>('a-venir')
  const [cancelled, setCancelled] = useState<Set<string>>(new Set())
  const pendingRef = useRef<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'danger' | 'info' } | null>(null)

  const handleCancel = useCallback((evenementId: string) => {
    if (pendingRef.current) return
    pendingRef.current = evenementId
    fetch(`/api/evenements/${evenementId}/inscription`, { method: 'DELETE' })
      .then((r) => {
        if (!r.ok && r.status !== 204) throw new Error(String(r.status))
        setCancelled((prev) => new Set(prev).add(evenementId))
        setToast({ message: 'Inscription annulée', variant: 'success' })
      })
      .catch(() => setToast({ message: 'Action impossible, réessayez', variant: 'danger' }))
      .finally(() => {
        pendingRef.current = null
      })
  }, [])

  const handleIcs = useCallback((item: MesInscriptionItem) => {
    const ics = buildIcs(item)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cjs-${item.evenement.id}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const items = tab === 'a-venir' ? aVenir : passes
  const visibleItems = items.filter((i) => !cancelled.has(i.evenement.id))

  return (
    <div className="flex flex-col gap-space-4">
      <div className="flex gap-space-2" role="tablist" aria-label="Mes inscriptions">
        <Chip selected={tab === 'a-venir'} onClick={() => setTab('a-venir')}>
          À venir ({aVenir.length})
        </Chip>
        <Chip selected={tab === 'passes'} onClick={() => setTab('passes')}>
          Passés ({passes.length})
        </Chip>
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={tab === 'a-venir' ? 'Aucune inscription à venir' : 'Aucun événement passé'}
          description={
            tab === 'a-venir'
              ? "Tu n'es inscrit·e à aucun événement à venir. Explore l'agenda pour t'inscrire."
              : 'Tes événements passés apparaîtront ici.'
          }
          actionLabel="Voir l'agenda"
          onAction={() => {
            window.location.href = '/agenda'
          }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-space-3 list-none p-0 m-0">
          {visibleItems.map((item) => (
            <li key={item.inscriptionId}>
              <Card variant="opportunite" className="flex flex-col sm:flex-row gap-space-3">
                <div className="flex-1 min-w-0 flex flex-col gap-space-1">
                  <div className="flex items-start gap-space-2 flex-wrap">
                    <Badge variant={TYPE_BADGE[item.evenement.type]}>
                      {item.evenement.type}
                    </Badge>
                    {tab === 'passes' && item.statut === 'present' && (
                      <Badge variant="green">Présent·e</Badge>
                    )}
                  </div>
                  <h2 className="text-fs-400 font-black text-color-text-primary">
                    {item.evenement.titre}
                  </h2>
                  {item.evenement.organisation && (
                    <p className="text-fs-200 text-color-text-secondary">
                      {item.evenement.organisation}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-space-3 text-fs-200 text-color-text-secondary mt-space-1">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="calendar" size={14} />
                      <span className="capitalize">
                        {FULL_FMT.format(new Date(item.evenement.dateDebut))}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="clock" size={14} />
                      {TIME_FMT.format(new Date(item.evenement.dateDebut))}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="pin" size={14} />
                      <span className="truncate max-w-[200px]">{item.evenement.lieu}</span>
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-space-2 sm:items-stretch flex-wrap">
                  <Link
                    href={`/agenda/${item.evenement.id}`}
                    className="inline-flex items-center justify-center gap-1 rounded-gj-md font-bold px-space-3 min-h-[var(--tap-min)] md:min-h-[var(--tap-dense)] text-fs-200 bg-gj-teal text-white hover:bg-gj-teal-deep"
                  >
                    Voir le billet
                  </Link>
                  {tab === 'a-venir' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleIcs(item)}
                        aria-label="Ajouter au calendrier"
                      >
                        <Icon name="calendar" size={14} />
                        Calendrier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancel(item.evenement.id)}
                        aria-label={`Annuler l'inscription à ${item.evenement.titre}`}
                      >
                        Annuler
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

/** Génère un fichier .ics minimal RFC5545 pour ajouter l'événement au calendrier. */
function buildIcs(item: MesInscriptionItem): string {
  const ev = item.evenement
  const dtStart = formatIcsDate(new Date(ev.dateDebut))
  const dtEnd = formatIcsDate(ev.dateFin ? new Date(ev.dateFin) : new Date(new Date(ev.dateDebut).getTime() + 60 * 60 * 1000))
  const now = formatIcsDate(new Date())
  const escape = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CJS//Guichet Jeunesse//FR',
    'BEGIN:VEVENT',
    `UID:${ev.id}@${appDomain()}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escape(ev.titre)}`,
    `DESCRIPTION:${escape(htmlToPlainText(ev.description).slice(0, 500))}`,
    `LOCATION:${escape(ev.lieu)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function formatIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}
