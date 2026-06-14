'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Icon } from '@/components/ui/Icon'
import { PeopleStepper } from '../PeopleStepper'
import {
  ReservationSlotPicker,
  type ReservationSlot,
} from '../ReservationSlotPicker'
import { JustificatifUpload } from '../JustificatifUpload'
import { ReservationRecap } from '../ReservationRecap'
import type { CentreHoraire } from '@/lib/loaders/centres'

export interface ReservationFormRessource {
  id: string
  type: string
  nom: string
  capacite: number
  capaciteUnit?: string | null
  dureeMinCreneauMin: number
  requiresJustif: boolean
}

export interface ReservationFormCentre {
  id: string
  slug: string
  nom: string
  horaires: CentreHoraire[]
}

export interface ReservationFormData {
  ressourceId: string
  dateReservee: string // ISO date
  creneauDebut: string // "HH:MM"
  creneauFin: string // "HH:MM"
  nombrePersonnes: number
  motif: string
  justifFileUrl?: string
}

export interface ReservationFormProps {
  ressource: ReservationFormRessource
  centre: ReservationFormCentre
  cjsUid: string
  /** Override pour tests — sinon POST /api/reservations. */
  onSubmit?: (data: ReservationFormData) => Promise<{ id: string } | void>
  className?: string
}

/** 4 créneaux standards par défaut. Si pas dans horaires centre → unavailable. */
const DEFAULT_SLOTS: Array<{ start: string; end: string }> = [
  { start: '08:00', end: '10:00' },
  { start: '10:00', end: '12:00' },
  { start: '14:00', end: '16:00' },
  { start: '16:00', end: '18:00' },
]

const DAY_BY_JS_INDEX = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const

function jourFromDateIso(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return DAY_BY_JS_INDEX[d.getDay()] ?? ''
}

function computeSlotsForDate(
  centreHoraires: CentreHoraire[],
  dateIso: string,
): ReservationSlot[] {
  const jour = jourFromDateIso(dateIso)
  const today = centreHoraires.find((h) => h.jour === jour)
  if (!today || !today.ouvert || !today.ouvreA || !today.fermeA) {
    return DEFAULT_SLOTS.map((s) => ({ ...s, available: false }))
  }
  const open = today.ouvreA
  const close = today.fermeA
  return DEFAULT_SLOTS.map((s) => ({
    ...s,
    available: s.start >= open && s.end <= close,
  }))
}

const MotifSchema = z.string().min(20, 'Motif trop court (min 20 caractères)')

/** Hier minuit → guard `min` input date. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function maxDateIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toISOString().slice(0, 10)
}

/**
 * <ReservationForm> — formulaire complet réservation ressource centre (W4).
 *
 * Orchestre : date · stepper personnes · slot picker · motif · upload.
 * Validation Zod côté client miroir API. Submit → POST /api/reservations
 * → redirect /jeune/mes-reservations?created=<id>.
 *
 * Spec : M4-centres-lot7.md §5 Wave 4.
 */
export function ReservationForm({
  ressource,
  centre,
  cjsUid: _cjsUid,
  onSubmit,
  className = '',
}: ReservationFormProps) {
  const router = useRouter()
  const [date, setDate] = useState<string>('')
  const [people, setPeople] = useState<number>(1)
  const [slot, setSlot] = useState<string | null>(null)
  const [motif, setMotif] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slots = useMemo(
    () => computeSlotsForDate(centre.horaires, date),
    [centre.horaires, date],
  )

  const dateObj = date ? new Date(`${date}T12:00:00`) : null

  const track = (type: string, metadata: Record<string, unknown> = {}) => {
    try {
      void fetch('/api/v1/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          centreId: centre.id,
          metadata: { ressourceId: ressource.id, ...metadata },
        }),
        keepalive: true,
      })
    } catch {
      /* silencieux */
    }
  }

  const validate = (): string | null => {
    if (!date) return 'Sélectionne une date.'
    if (date < todayIso())
      return 'La date doit être dans le futur.'
    if (date > maxDateIso())
      return 'La date doit être au maximum à +90 jours.'
    if (!slot) return 'Sélectionne un créneau.'
    if (people < 1 || people > ressource.capacite)
      return `Le nombre de personnes doit être entre 1 et ${ressource.capacite}.`
    const motifCheck = MotifSchema.safeParse(motif)
    if (!motifCheck.success)
      return motifCheck.error.issues[0]?.message ?? 'Motif invalide.'
    if (ressource.requiresJustif && !file)
      return 'Une pièce justificative est requise pour cette ressource.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const v = validate()
    if (v) {
      setError(v)
      track('centre_reservation_validation_error', { message: v })
      return
    }
    if (!slot) return
    const [creneauDebut, creneauFin] = slot.split('-')

    setSubmitting(true)
    try {
      // GUIC-385 — upload réel du justif vers Vercel Blob privé avant POST
      // (avant ce fix le client envoyait `local://...` qui cassait Zod URL → 400).
      let justifFileUrl: string | undefined
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('ressourceId', ressource.id)
        const up = await fetch('/api/reservations/justif/upload', {
          method: 'POST',
          body: fd,
        })
        if (!up.ok) {
          const detail = (await up.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null
          setError(detail?.error?.message ?? 'Échec de l’upload du justificatif.')
          setSubmitting(false)
          return
        }
        const upBody = (await up.json()) as { data: { url: string } }
        justifFileUrl = upBody.data.url
      }

      const payload: ReservationFormData = {
        ressourceId: ressource.id,
        dateReservee: new Date(`${date}T12:00:00.000Z`).toISOString(),
        creneauDebut,
        creneauFin,
        nombrePersonnes: people,
        motif: motif.trim(),
        justifFileUrl,
      }

      track('centre_reservation_submitted')
      if (onSubmit) {
        const res = await onSubmit(payload)
        if (res && 'id' in res) {
          router.push(`/jeune/mes-reservations?created=${res.id}`)
        }
        return
      }
      const r = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await r.json().catch(() => null)) as {
        data?: { reservation: { id: string } }
        error?: { code: string; message: string }
      } | null
      if (r.status === 201 && json?.data?.reservation) {
        router.push(
          `/jeune/mes-reservations?created=${json.data.reservation.id}`,
        )
        return
      }
      const code = json?.error?.code ?? 'UNKNOWN'
      const msg = json?.error?.message ?? 'Erreur lors de la réservation.'
      setError(msg)
      track('centre_reservation_validation_error', { code, message: msg })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau.'
      setError(msg)
      track('centre_reservation_validation_error', { message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const fieldLabel = (t: string) => (
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: 'var(--gj-ink)',
        marginBottom: 7,
        display: 'block',
      }}
    >
      {t}
    </span>
  )

  const submitButton = (
    <button
      type="submit"
      form="reservation-form"
      disabled={submitting}
      style={{
        marginTop: 6,
        background: 'var(--gj-teal-deep)',
        color: 'var(--gj-surface)',
        border: 0,
        minHeight: 50,
        borderRadius: 10,
        fontWeight: 800,
        fontSize: 14.5,
        cursor: submitting ? 'progress' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        opacity: submitting ? 0.7 : 1,
      }}
    >
      <Icon name="check" size={17} aria-hidden="true" />
      {submitting ? 'Envoi…' : 'Envoyer la demande'}
    </button>
  )

  return (
    <form
      id="reservation-form"
      onSubmit={handleSubmit}
      className={className}
      noValidate
      aria-label="Formulaire de réservation"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: '1fr',
          gap: 22,
        }}
      >
        <div className="lg:grid lg:gap-22" style={{ display: 'contents' }}>
          <div
            className="lg-grid-2cols"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr)',
              gap: 22,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: 'var(--gj-surface)',
                  border: '1.5px solid var(--gj-line)',
                  borderRadius: 14,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                  }}
                >
                  <div>
                    {fieldLabel('Date')}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1.5px solid var(--gj-line)',
                        borderRadius: 9,
                        padding: '0 13px',
                        minHeight: 46,
                        background: 'var(--gj-bg)',
                      }}
                    >
                      <Icon
                        name="calendar"
                        size={15}
                        aria-hidden="true"
                        style={{ color: 'var(--gj-teal-deep)' }}
                      />
                      <input
                        type="date"
                        aria-label="Date de la réservation"
                        min={todayIso()}
                        max={maxDateIso()}
                        value={date}
                        onChange={(e) => {
                          setDate(e.target.value)
                          setSlot(null)
                        }}
                        required
                        style={{
                          flex: 1,
                          minHeight: 44,
                          border: 0,
                          background: 'transparent',
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--gj-ink)',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    {fieldLabel(
                      `Nombre de ${ressource.capaciteUnit ?? 'personnes'}`,
                    )}
                    <PeopleStepper
                      value={people}
                      min={1}
                      max={ressource.capacite}
                      onChange={setPeople}
                    />
                  </div>
                </div>

                <div>
                  {fieldLabel('Créneau horaire')}
                  <ReservationSlotPicker
                    value={slot}
                    onChange={setSlot}
                    availableSlots={slots}
                  />
                </div>

                <div>
                  {fieldLabel('Motif / objet de la réservation')}
                  <textarea
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    rows={2}
                    required
                    minLength={20}
                    aria-label="Motif de la réservation"
                    placeholder="Décris brièvement l'usage prévu (min 20 caractères)…"
                    style={{
                      width: '100%',
                      border: '1.5px solid var(--gj-line)',
                      borderRadius: 9,
                      padding: '11px 13px',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      color: 'var(--gj-ink)',
                      background: 'var(--gj-bg)',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                <div>
                  {fieldLabel(
                    ressource.requiresJustif
                      ? 'Pièce justificative (requise)'
                      : 'Pièce justificative (facultatif)',
                  )}
                  <JustificatifUpload
                    required={ressource.requiresJustif}
                    file={file}
                    onChange={setFile}
                  />
                </div>

                {error ? (
                  <div
                    role="alert"
                    style={{
                      fontSize: 12.5,
                      color: 'var(--gj-red-ink)',
                      background: 'var(--gj-red-soft)',
                      padding: '10px 12px',
                      borderRadius: 9,
                      fontWeight: 700,
                    }}
                  >
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <ReservationRecap
          className="lg:sticky lg:top-4"
          ressource={{ nom: ressource.nom, type: ressource.type }}
          centre={{ nom: centre.nom }}
          date={dateObj}
          slot={slot}
          people={people}
          submitButton={submitButton}
        />
      </div>
    </form>
  )
}
