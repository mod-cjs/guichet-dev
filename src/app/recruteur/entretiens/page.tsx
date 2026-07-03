import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getRecruteurContext, getRecruteurCandidatures, getRecruteurEntretiens, type RecruteurEntretienItem } from '@/lib/loaders/recruteur'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { PlanifierForm } from './PlanifierForm'
import { AnnulerButton } from './AnnulerButton'
import { TerminerButton } from './TerminerButton'

export const metadata: Metadata = { title: 'Entretiens — Espace Recruteur' }
export const dynamic = 'force-dynamic'

const MODE_LABEL: Record<string, string> = { Visio: 'Visio', Presentiel: 'Présentiel', Telephone: 'Téléphone' }
function fmt(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function Ligne({ e, annulable }: { e: RecruteurEntretienItem; annulable: boolean }) {
  const annule = e.statut === 'Annule'
  return (
    <div className="rounded-[14px] p-[14px] flex items-center gap-3 flex-wrap" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', opacity: annule ? 0.6 : 1 }}>
      <span aria-hidden className="inline-flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, flexShrink: 0, background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
        <Icon name="calendar" size={18} />
      </span>
      <Link href={`/recruteur/candidatures/${e.candidatureId}`} className="flex-1 min-w-[200px] no-underline">
        <div className="text-[14px] font-black" style={{ color: 'var(--gj-ink)' }}>{e.candidatNom}</div>
        <div className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>{fmt(e.dateHeure)} · {MODE_LABEL[e.mode] ?? e.mode}{e.lieu ? ` · ${e.lieu}` : ''}</div>
        <div className="text-[11.5px]" style={{ color: 'var(--gj-grey)' }}>{e.offreTitre}</div>
      </Link>
      {annule ? (
        <span className="rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-red-soft, #fdecec)', color: 'var(--gj-red-ink, #B91C1C)' }}>Annulé</span>
      ) : e.statut === 'Termine' ? (
        <span className="rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-green-soft, #E6F6EE)', color: 'var(--gj-green-ink, #0F6B45)' }}>Terminé</span>
      ) : annulable ? (
        <div className="flex items-center gap-[8px] flex-wrap">
          <TerminerButton id={e.id} />
          <AnnulerButton id={e.id} />
        </div>
      ) : (
        <span className="rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>Passé</span>
      )}
    </div>
  )
}

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const ctx = await getRecruteurContext(session.cjsUid)
  const [entretiens, candidatures] = await Promise.all([
    getRecruteurEntretiens(session.cjsUid),
    getRecruteurCandidatures(session.cjsUid, ctx.organisationId),
  ])

  const now = Date.now()
  const aVenir = entretiens.filter((e) => e.statut === 'Planifie' && new Date(e.dateHeure).getTime() >= now)
  const passes = entretiens.filter((e) => !(e.statut === 'Planifie' && new Date(e.dateHeure).getTime() >= now))

  const candidats = candidatures.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom} · ${c.offreTitre}` }))

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="mb-6">
        <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Entretiens</h1>
        <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>{aVenir.length} à venir</p>
      </div>

      <PlanifierForm candidats={candidats} />

      {entretiens.length === 0 ? (
        <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
          <p className="text-[14px] font-bold">Aucun entretien planifié.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[16px]">
          {aVenir.length > 0 && (
            <section>
              <h2 className="text-[13px] font-black mb-[8px]" style={{ color: 'var(--gj-ink)' }}>À venir</h2>
              <div className="flex flex-col gap-[10px]">{aVenir.map((e) => <Ligne key={e.id} e={e} annulable />)}</div>
            </section>
          )}
          {passes.length > 0 && (
            <section>
              <h2 className="text-[13px] font-black mb-[8px]" style={{ color: 'var(--gj-grey)' }}>Passés / annulés</h2>
              <div className="flex flex-col gap-[10px]">{passes.map((e) => <Ligne key={e.id} e={e} annulable={false} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
