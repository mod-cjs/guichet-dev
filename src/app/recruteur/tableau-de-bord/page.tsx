import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { Icon, type IconName } from '@/components/ui/Icon'
import { getRecruteurContext, getRecruteurDashboard, scoreColors } from '@/lib/loaders/recruteur'

export const metadata: Metadata = { title: 'Tableau de bord — Espace Recruteur' }

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'En validation', publiee: 'Publiée', archivee: 'Archivée', expiree: 'Expirée',
}

function initials(prenom: string, nom: string): string {
  return ((prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')).toUpperCase()
}

function Kpi({ icon, value, label, href, hint, accent }: { icon: IconName; value: number; label: string; href: string; hint?: string; accent?: boolean }) {
  return (
    <Link href={href} className="rounded-[14px] p-[18px] block no-underline" style={{ background: accent ? 'var(--gj-blue-soft, #E8EFFF)' : 'var(--gj-surface)', border: `1.5px solid ${accent ? 'var(--gj-blue, #1A4ED8)' : 'var(--gj-line)'}` }}>
      <span className="inline-flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: accent ? 'var(--gj-blue, #1A4ED8)' : 'var(--gj-blue-soft, #E8EFFF)', color: accent ? '#fff' : 'var(--gj-blue-ink, #1A3FA8)' }}>
        <Icon name={icon} size={18} />
      </span>
      <div className="text-[30px] font-black mt-[8px]" style={{ color: 'var(--gj-ink)' }}>{value.toLocaleString('fr-FR')}</div>
      <div className="text-[12.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>{label}</div>
      {hint && <div className="text-[11.5px] font-bold mt-[2px]" style={{ color: 'var(--gj-green-ink, #0F6B45)' }}>{hint}</div>}
    </Link>
  )
}

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const ctx = await getRecruteurContext(session.cjsUid)
  const dash = await getRecruteurDashboard(session.cjsUid, ctx.organisationId)

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <header className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-[26px] font-black flex items-center gap-2" style={{ color: 'var(--gj-ink)' }}>
            Bonjour {ctx.prenom || 'recruteur'} <span aria-hidden>👋</span>
          </h1>
          <p className="text-[13.5px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
            Voici l&apos;activité de recrutement{ctx.organisationNom ? ` de ${ctx.organisationNom}` : ''} sur le Guichet Jeunesse.
          </p>
        </div>
        <Link href="/recruteur/mes-offres/nouvelle" className="inline-flex items-center gap-[7px] font-black text-[13px] rounded-[10px] px-[18px] min-h-[44px] no-underline" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff' }}>
          <Icon name="plus" size={15} /> Nouvelle offre
        </Link>
      </header>

      <div className="grid gap-[12px] mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Kpi icon="employment" value={dash.offresActives} label="Offres actives" href="/recruteur/mes-offres" />
        <Kpi icon="document" value={dash.candidaturesRecues} label="Candidatures reçues" href="/recruteur/candidatures" hint={dash.candidaturesCetteSemaine > 0 ? `+${dash.candidaturesCetteSemaine} cette semaine` : undefined} />
        <Kpi icon="clock" value={dash.aExaminer} label="À examiner" href="/recruteur/candidatures" accent />
        <Kpi icon="eye" value={dash.vuesTotales} label="Vues totales" href="/recruteur/mes-offres" />
      </div>

      <div className="grid gap-[12px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Offres actives */}
        <div className="rounded-[14px] p-[18px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-black" style={{ color: 'var(--gj-ink)' }}>Offres actives</h2>
            <Link href="/recruteur/mes-offres" className="text-[12.5px] font-bold" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>Toutes →</Link>
          </div>
          {dash.offres.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucune offre pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {dash.offres.slice(0, 6).map((o) => (
                <Link key={o.id} href={`/recruteur/candidatures?offre=${o.id}`} className="flex items-center justify-between gap-3 py-[8px] no-underline" style={{ borderBottom: '1px solid var(--gj-line)' }}>
                  <span className="text-[13.5px] font-bold truncate" style={{ color: 'var(--gj-ink)' }}>{o.titre}</span>
                  <span className="text-[11.5px] font-bold shrink-0" style={{ color: 'var(--gj-grey)' }}>{o.candidatures} cand. · {o.vues} vues · {STATUT_LABEL[o.statut] ?? o.statut}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* À examiner */}
        <div className="rounded-[14px] p-[18px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-black" style={{ color: 'var(--gj-ink)' }}>À examiner</h2>
            <Link href="/recruteur/candidatures" className="text-[12.5px] font-bold" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>Toutes →</Link>
          </div>
          {dash.aExaminerListe.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>Aucune candidature à examiner.</p>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {dash.aExaminerListe.map((c) => {
                const sc = scoreColors(c.score)
                return (
                <Link key={c.id} href={`/recruteur/candidatures/${c.id}`} className="flex items-center gap-3 no-underline">
                  <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-blue, #1A4ED8), var(--gj-blue-ink, #1A3FA8))', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12.5 }}>{initials(c.prenom, c.nom)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold truncate" style={{ color: 'var(--gj-ink)' }}>{c.prenom} {c.nom}</div>
                    <div className="text-[11.5px] truncate" style={{ color: 'var(--gj-grey)' }}>{c.offreTitre}</div>
                  </div>
                  {c.score != null && <span className="shrink-0 rounded-full text-[10px] font-black px-[7px] py-[1px]" style={{ background: sc.bg, color: sc.fg }}>{sc.label}</span>}
                </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
