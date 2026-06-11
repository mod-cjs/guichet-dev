import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, Icon, Badge } from '@/components/ui'
import { EvenementDetailHero } from '@/components/evenements/EvenementDetailHero'
import { EvenementInscriptionCta } from '@/components/evenements/EvenementInscriptionCta'
import { getEvenementById } from '@/lib/loaders/evenements'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GUIC-362 — Détail événement (refonte design v2). Server component.

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const ev = await getEvenementById(id).catch(() => null)
  if (!ev) return { title: 'Événement introuvable' }
  return {
    title: `${ev.titre} — Agenda CJS`,
    description: ev.description.slice(0, 160),
  }
}

const FULL_DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default async function EvenementDetailPage({ params }: PageProps) {
  const { id } = await params
  const [evenement, session] = await Promise.all([getEvenementById(id), getSession()])
  if (!evenement) notFound()

  // Statut d'inscription pour CTA initial (évite un round-trip côté client au mount).
  let initialInscrit = false
  if (session) {
    const insc = await prisma.inscriptionEvenement
      .findUnique({
        where: { cjsUid_evenementId: { cjsUid: session.cjsUid, evenementId: id } },
        select: { statut: true },
      })
      .catch(() => null)
    initialInscrit = !!insc && insc.statut !== 'annule'
  }

  const date = new Date(evenement.dateDebut)
  const dateFin = evenement.dateFin ? new Date(evenement.dateFin) : null
  const isComplet = evenement.placesRestantes != null && evenement.placesRestantes === 0
  const ouvertInscription =
    evenement.statut === 'a_venir' &&
    (!evenement.dateFin || new Date(evenement.dateFin).getTime() > Date.now())

  const lat = evenement.centre?.latitude
  const lng = evenement.centre?.longitude
  const hasMap = typeof lat === 'number' && typeof lng === 'number'
  const mapsUrl = hasMap
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evenement.lieu)}`

  return (
    <div className="container-page py-space-6 flex flex-col gap-space-5">
      <Link
        href="/agenda"
        className="inline-flex items-center gap-1 text-fs-200 font-bold text-gj-teal-deep hover:underline"
      >
        <Icon name="chevron-left" size={16} />
        Retour à l’agenda
      </Link>

      <EvenementDetailHero evenement={evenement} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-space-5 items-start">
        <article className="flex flex-col gap-space-4 min-w-0">
          <section aria-labelledby="evt-desc-title">
            <h2 id="evt-desc-title" className="text-fs-500 font-black text-color-text-primary mb-space-2">
              À propos
            </h2>
            <p className="text-fs-300 text-color-text-primary leading-relaxed whitespace-pre-line">
              {evenement.description}
            </p>
          </section>

          <Card variant="opportunite" className="flex flex-col gap-space-3">
            <h2 className="text-fs-400 font-black text-color-text-primary">Informations pratiques</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-space-3">
              <InfoRow icon="calendar" label="Date">
                <span className="capitalize">{FULL_DATE_FMT.format(date)}</span>
              </InfoRow>
              <InfoRow icon="clock" label="Horaire">
                {TIME_FMT.format(date)}
                {dateFin && ` – ${TIME_FMT.format(dateFin)}`}
              </InfoRow>
              <InfoRow icon="pin" label="Lieu">
                {evenement.lieu}
                {evenement.centre?.ville && (
                  <span className="text-color-text-secondary"> · {evenement.centre.ville}</span>
                )}
              </InfoRow>
              <InfoRow icon="users" label="Capacité">
                {evenement.capaciteMax
                  ? `${evenement.inscriptionsCount} / ${evenement.capaciteMax} inscrits`
                  : 'Sans limite'}
              </InfoRow>
            </dl>
          </Card>

          <Card variant="opportunite" className="flex flex-col gap-space-2">
            <h2 className="text-fs-400 font-black text-color-text-primary inline-flex items-center gap-2">
              <Icon name="pin" size={18} />
              Lieu
            </h2>
            <p className="text-fs-300 text-color-text-primary">{evenement.lieu}</p>
            {evenement.centre?.ville && (
              <p className="text-fs-200 text-color-text-secondary">{evenement.centre.ville}</p>
            )}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-fs-200 font-bold text-gj-teal-deep hover:underline self-start mt-space-1"
            >
              <Icon name="external" size={14} />
              Voir sur Google Maps
            </a>
          </Card>
        </article>

        <aside className="flex flex-col gap-space-3 lg:sticky lg:top-space-4">
          <Card variant="opportunite" className="flex flex-col gap-space-3">
            <div className="flex items-center justify-between">
              <span className="text-fs-500 font-black text-gj-green-ink">
                {evenement.estGratuit ? 'Gratuit' : 'Payant'}
              </span>
              {isComplet && <Badge variant="red">Complet</Badge>}
            </div>

            {evenement.capaciteMax != null && (
              <SeatsBar
                inscrits={evenement.inscriptionsCount}
                capacite={evenement.capaciteMax}
              />
            )}

            <EvenementInscriptionCta
              evenementId={evenement.id}
              isAuthenticated={!!session}
              initialInscrit={initialInscrit}
              ouvertInscription={ouvertInscription}
              complet={isComplet}
            />

            <p className="text-fs-100 text-color-text-muted text-center">
              Inscription en 1 clic avec ton compte. Confirmation immédiate.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: 'calendar' | 'clock' | 'pin' | 'users'
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-space-2">
      <span className="flex-shrink-0 w-8 h-8 rounded-gj-md bg-gj-teal-soft text-gj-teal-deep inline-flex items-center justify-center">
        <Icon name={icon} size={16} />
      </span>
      <div className="flex flex-col">
        <dt className="text-fs-100 font-bold uppercase tracking-wider text-color-text-secondary">
          {label}
        </dt>
        <dd className="text-fs-300 font-bold text-color-text-primary mt-0.5">{children}</dd>
      </div>
    </div>
  )
}

function SeatsBar({ inscrits, capacite }: { inscrits: number; capacite: number }) {
  const restantes = Math.max(0, capacite - inscrits)
  const pct = Math.min(100, Math.round((inscrits / capacite) * 100))
  const low = restantes <= 5 && restantes > 0
  return (
    <div>
      <div className="flex justify-between text-fs-100 font-bold mb-1">
        <span className={low ? 'text-gj-red' : 'text-color-text-secondary'}>
          {restantes} places restantes
        </span>
        <span className="text-color-text-muted">{pct}% rempli</span>
      </div>
      <div
        className="h-[6px] bg-gj-bg rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Taux de remplissage"
      >
        <div
          className={`h-full ${low ? 'bg-gj-red' : 'bg-gj-teal'} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
