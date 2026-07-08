import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { conseillerSansRattachement } from '@/lib/auth/espace-guards'
import { getConseillerContext, getBeneficiaireDetail } from '@/lib/loaders/conseiller'
import { contacterBeneficiaire } from '../../actions'
import { Icon, type IconName } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProfilRing } from '../profil-ring'

export const dynamic = 'force-dynamic'

/**
 * GUIC-499 — US-7 · Fiche bénéficiaire détaillée (scopée centre du conseiller).
 * Rendu fidèle à `agent-web.jsx` (AgentBenefDetail) — champs réels uniquement.
 */

function Meta({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-space-1 text-color-text-secondary" style={{ fontSize: 12.5, fontWeight: 600 }}>
      <Icon name={icon} size={14} /> {children}
    </span>
  )
}
function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-extrabold text-color-text-secondary" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
      <div className="font-bold text-color-text-primary" style={{ fontSize: 13.5, marginTop: 2 }}>{value}</div>
    </div>
  )
}

const STATUT_TONE = { salle: ['var(--gj-teal-soft)', 'var(--gj-teal-deep)'], vehicule: ['var(--gj-yellow-soft)', 'var(--gj-yellow-ink)'], poste: ['var(--gj-blue-soft)', 'var(--gj-blue-ink)'], atelier: ['var(--gj-green-soft)', 'var(--gj-green-ink)'], equipement: ['var(--gj-teal-soft)', 'var(--gj-teal-deep)'] } as const
const PILL = { yellow: ['var(--gj-yellow-soft)', 'var(--gj-yellow-ink)'], green: ['var(--gj-green-soft)', 'var(--gj-green-ink)'], red: ['var(--gj-red-soft)', 'var(--gj-red-ink)'], grey: ['var(--gj-bg)', 'var(--gj-grey)'] } as const

export default async function BeneficiaireDetailPage({ params }: { params: Promise<{ cjsUid: string }> }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return conseillerSansRattachement(session.roles)

  const { cjsUid } = await params
  const b = await getBeneficiaireDetail(ctx.centreId, cjsUid)
  if (!b) notFound()

  return (
    <div className="flex flex-col gap-space-5" style={{ maxWidth: 980, margin: '0 auto' }}>
      <Link href="/conseiller/beneficiaires" className="inline-flex items-center gap-space-1 no-underline font-extrabold" style={{ color: 'var(--gj-teal-deep)', fontSize: 13 }}>
        <Icon name="chevron-left" size={16} /> Bénéficiaires
      </Link>

      {/* En-tête */}
      <div className="bg-white rounded-gj-lg p-space-5 flex gap-space-4 items-center flex-wrap" style={{ border: '1.5px solid var(--gj-line)' }}>
        <span className="inline-flex items-center justify-center shrink-0" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', fontWeight: 900, fontSize: 22 }}>{b.initials}</span>
        <div className="flex-1" style={{ minWidth: 200 }}>
          <div className="flex items-center gap-space-2 flex-wrap">
            <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 22 }}>{b.name}</h1>
            <span className="inline-flex font-extrabold" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: PILL[b.statutTone][0], color: PILL[b.statutTone][1] }}>{b.statutLabel}</span>
          </div>
          <div className="flex gap-space-4 flex-wrap" style={{ marginTop: 8 }}>
            <Meta icon="pin">{b.commune}</Meta>
            {b.age != null && <Meta icon="users">{b.age} ans{b.genre ? ` · ${b.genre === 'F' ? 'Femme' : 'Homme'}` : ''}</Meta>}
            {b.niveau && <Meta icon="learning">{b.niveau}</Meta>}
            {b.tel && <Meta icon="phone">{b.tel}</Meta>}
            <Meta icon="calendar">Membre depuis {b.memberSince}</Meta>
          </div>
        </div>
        <form action={contacterBeneficiaire.bind(null, b.cjsUid)} className="shrink-0">
          <button type="submit" className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '10px 15px', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}>
            <Icon name="chat" size={15} /> Message
          </button>
        </form>
      </div>

      <div className="grid gap-space-5 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        <div className="flex flex-col gap-space-5" style={{ minWidth: 0 }}>
          {/* Informations */}
          <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
            <h2 className="font-black text-color-text-primary" style={{ fontSize: 15, marginBottom: 14 }}>Informations</h2>
            <div className="grid gap-space-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <KV label="Niveau d'étude" value={b.niveau ?? '—'} />
              <KV label="Candidatures" value={`${b.candidatures} envoyée${b.candidatures > 1 ? 's' : ''}`} />
              <KV label="Dernière activité" value={b.lastActivity} />
              <KV label="Téléphone" value={b.tel ?? '—'} />
              <KV label="Commune" value={b.commune} />
              <KV label="Membre depuis" value={b.memberSince} />
            </div>
          </div>

          {/* Historique réservations */}
          <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
            <h2 className="font-black text-color-text-primary" style={{ fontSize: 15, marginBottom: 14 }}>Historique des réservations</h2>
            {b.reservations.length === 0 ? (
              <EmptyState icon="calendar" title="Aucune réservation" description="Ce bénéficiaire n'a pas encore réservé de ressource dans ce centre." />
            ) : (
              <div className="flex flex-col">
                {b.reservations.map((r) => (
                  <div key={r.id} className="flex items-center gap-space-3 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
                    <span className="inline-flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 9, background: STATUT_TONE[r.kind][0], color: STATUT_TONE[r.kind][1] }}>
                      <Icon name={r.kindIcon} size={17} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13 }}>{r.ressourceNom}</div>
                      <div className="text-color-text-secondary" style={{ fontSize: 11 }}>{r.dateLabel} · {r.slot}</div>
                    </div>
                    <span className="inline-flex font-extrabold shrink-0" style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 999, background: PILL[r.statutTone][0], color: PILL[r.statutTone][1] }}>{r.statutLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aside profil */}
        <aside className="bg-white rounded-gj-lg p-space-5 flex flex-col items-center text-center gap-space-2" style={{ border: '1.5px solid var(--gj-line)' }}>
          <ProfilRing pct={b.completion} size={84} />
          <div className="font-extrabold text-color-text-primary" style={{ fontSize: 13.5 }}>Profil complété</div>
          <div className="text-color-text-secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
            {b.completion >= 90 ? 'Profil complet.' : 'Un profil complet améliore la mise en relation avec les opportunités.'}
          </div>
        </aside>
      </div>
    </div>
  )
}
