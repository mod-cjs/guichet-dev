import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { Icon, type IconName } from '@/components/ui/Icon'
import { getRecruteurContext, getRecruteurDashboard, getRecruteurUrgences, getRecruteurFunnel, scoreColors } from '@/lib/loaders/recruteur'
import type { FunnelTone } from '@/lib/recruteur/funnel'

export const metadata: Metadata = { title: 'Tableau de bord — Espace Recruteur' }
export const dynamic = 'force-dynamic'

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'En validation', publiee: 'Publiée', archivee: 'Archivée', expiree: 'Expirée',
}

// Couleurs des segments du funnel (design v4 : bleu → teal → ambre → vert → rouge).
const FUNNEL_TONE: Record<FunnelTone, string> = {
  recue: 'var(--gj-blue, #1A4ED8)',
  presel: 'var(--gj-teal-deep, #0F766E)',
  entretien: 'var(--gj-yellow-ink, #B45309)',
  retenue: 'var(--gj-green, #16A34A)',
  refusee: 'var(--gj-red, #DC2626)',
}

function initials(prenom: string, nom: string): string {
  return ((prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')).toUpperCase()
}
/** Ancienneté relative en français à partir d'une date ISO. */
function ilYa(iso?: string): { label: string; enRetard: boolean } | null {
  if (!iso) return null
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  if (!Number.isFinite(j) || j < 0) return null
  const label = j === 0 ? "aujourd'hui" : j === 1 ? 'hier' : `il y a ${j} j`
  return { label, enRetard: j > 7 }
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
  const [dash, urgences, funnel] = await Promise.all([
    getRecruteurDashboard(session.cjsUid, ctx.organisationId),
    getRecruteurUrgences(session.cjsUid, ctx.organisationId),
    getRecruteurFunnel(session.cjsUid, ctx.organisationId),
  ])

  // Bande « À traiter » : seulement les urgences réellement présentes (>0).
  const urgencesConfig: { n: number; label: string; icon: IconName; href: string; tone: string }[] = [
    { n: urgences.candidatsEnRetard, label: `candidat${urgences.candidatsEnRetard > 1 ? 's' : ''} en attente +7 j`, icon: 'clock', href: '/recruteur/candidatures', tone: 'var(--gj-red, #DC2626)' },
    { n: urgences.entretiensAujourdhui, label: `entretien${urgences.entretiensAujourdhui > 1 ? 's' : ''} aujourd'hui`, icon: 'calendar', href: '/recruteur/entretiens', tone: 'var(--gj-blue, #1A4ED8)' },
    { n: urgences.messagesNonLus, label: `message${urgences.messagesNonLus > 1 ? 's' : ''} non lu${urgences.messagesNonLus > 1 ? 's' : ''}`, icon: 'chat', href: '/recruteur/messagerie', tone: 'var(--gj-blue, #1A4ED8)' },
    { n: urgences.offresExpirantBientot, label: `offre${urgences.offresExpirantBientot > 1 ? 's' : ''} expirant sous 7 j`, icon: 'employment', href: '/recruteur/mes-offres', tone: 'var(--gj-yellow-ink, #B45309)' },
  ]
  const aTraiter = urgencesConfig.filter((u) => u.n > 0)

  // Taux de conversion vues → candidatures (métrique de décision, pas de vanité).
  const conversion = dash.vuesTotales > 0 ? Math.round((dash.candidaturesRecues / dash.vuesTotales) * 100) : null

  // Recruteur sans aucune offre → onboarding guidé plutôt que des compteurs à zéro.
  const vide = dash.offres.length === 0

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <header className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-[26px] font-black" style={{ color: 'var(--gj-ink)' }}>
            Bonjour {ctx.prenom || 'recruteur'}
          </h1>
          <p className="text-[13.5px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
            Voici l&apos;activité de recrutement{ctx.organisationNom ? ` de ${ctx.organisationNom}` : ''} sur le Guichet Jeunesse.
          </p>
        </div>
        <Link href="/recruteur/mes-offres/nouvelle" className="inline-flex items-center gap-[7px] font-black text-[13px] rounded-[10px] px-[18px] min-h-[44px] no-underline" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff' }}>
          <Icon name="plus" size={15} /> Nouvelle offre
        </Link>
      </header>

      {/* À traiter aujourd'hui (P1) — n'apparaît que s'il y a des urgences réelles */}
      {aTraiter.length > 0 && (
        <section aria-label="À traiter" className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-wide mb-[8px]" style={{ color: 'var(--gj-grey)' }}>À traiter</h2>
          <div className="flex flex-wrap gap-[10px]">
            {aTraiter.map((u) => (
              <Link key={u.label} href={u.href} className="inline-flex items-center gap-[9px] rounded-[12px] px-[14px] py-[10px] no-underline" style={{ background: 'var(--gj-surface)', border: `1.5px solid ${u.tone}` }}>
                <span className="inline-flex items-center justify-center rounded-[9px]" style={{ width: 30, height: 30, background: u.tone, color: '#fff', flexShrink: 0 }}>
                  <Icon name={u.icon} size={15} />
                </span>
                <span className="text-[19px] font-black leading-none" style={{ color: 'var(--gj-ink)' }}>{u.n}</span>
                <span className="text-[12.5px] font-bold" style={{ color: 'var(--gj-grey)' }}>{u.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {vide ? (
        <section className="rounded-[16px] p-[32px] text-center" style={{ background: 'linear-gradient(135deg, var(--gj-blue-soft, #E8EFFF), var(--gj-surface))', border: '1.5px solid var(--gj-blue, #1A4ED8)' }}>
          <span className="inline-flex items-center justify-center rounded-[14px] mb-[14px]" style={{ width: 56, height: 56, background: 'var(--gj-blue, #1A4ED8)', color: '#fff' }}>
            <Icon name="employment" size={26} />
          </span>
          <h2 className="text-[18px] font-black" style={{ color: 'var(--gj-ink)' }}>Publiez votre première offre</h2>
          <p className="text-[13.5px] mt-[6px] mx-auto" style={{ color: 'var(--gj-grey)', maxWidth: 460 }}>
            Décrivez le poste et les compétences attendues : les jeunes du réseau CJS pourront candidater, et vous suivrez ici vos candidatures, entretiens et statistiques.
          </p>
          <Link href="/recruteur/mes-offres/nouvelle" className="inline-flex items-center gap-[7px] font-black text-[13px] rounded-[10px] px-[20px] min-h-[46px] no-underline mt-[16px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff' }}>
            <Icon name="plus" size={15} /> Créer une offre
          </Link>
        </section>
      ) : (
      <>
      <div className="grid gap-[12px] mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Kpi icon="employment" value={dash.offresActives} label="Offres actives" href="/recruteur/mes-offres" />
        <Kpi icon="document" value={dash.candidaturesRecues} label="Candidatures reçues" href="/recruteur/candidatures" hint={dash.candidaturesCetteSemaine > 0 ? `+${dash.candidaturesCetteSemaine} cette semaine` : undefined} />
        <Kpi icon="clock" value={dash.aExaminer} label="À examiner" href="/recruteur/candidatures" accent />
        <Kpi icon="eye" value={dash.vuesTotales} label="Vues totales" href="/recruteur/mes-offres" hint={conversion != null ? `${conversion}% converti en candidature` : undefined} />
      </div>

      {/* Funnel de recrutement (P2) — Reçues → Présélection → Entretien → Retenues → Refusées */}
      {funnel.total > 0 && (
        <section className="rounded-[14px] p-[18px] mb-6" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
          <div className="flex items-center justify-between gap-3 mb-[14px]">
            <h2 className="text-[14px] font-black" style={{ color: 'var(--gj-ink)' }}>Pipeline de recrutement</h2>
            <Link href="/recruteur/candidatures" className="text-[12.5px] font-bold no-underline" style={{ color: 'var(--gj-blue-ink, #1A3FA8)' }}>Ouvrir le kanban →</Link>
          </div>

          {/* Barre proportionnelle */}
          <div className="flex rounded-[6px] overflow-hidden" style={{ height: 12, background: 'var(--gj-line)' }} role="img" aria-label={`Répartition : ${funnel.segments.map((s) => `${s.label} ${s.count}`).join(', ')}`}>
            {funnel.segments.filter((s) => s.count > 0).map((s) => (
              <span key={s.id} title={`${s.label} : ${s.count} (${s.pct}%)`} style={{ flexGrow: s.count, background: FUNNEL_TONE[s.id] }} />
            ))}
          </div>

          {/* Compteurs par étape (cliquables) */}
          <div className="grid gap-[10px] mt-[14px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
            {funnel.segments.map((s) => (
              <Link key={s.id} href="/recruteur/candidatures" className="no-underline rounded-[10px] px-[10px] py-[8px]" style={{ border: '1px solid var(--gj-line)' }}>
                <div className="flex items-center gap-[6px]">
                  <span aria-hidden style={{ width: 9, height: 9, borderRadius: 3, background: FUNNEL_TONE[s.id], flexShrink: 0 }} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wide truncate" style={{ color: 'var(--gj-grey)' }}>{s.label}</span>
                </div>
                <div className="text-[22px] font-black mt-[2px]" style={{ color: 'var(--gj-ink)' }}>{s.count}</div>
                <div className="text-[11px] font-bold" style={{ color: 'var(--gj-grey)' }}>{s.pct}%</div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
                const age = ilYa(c.soumiseA)
                return (
                <Link key={c.id} href={`/recruteur/candidatures/${c.id}`} className="flex items-center gap-3 no-underline">
                  <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-blue, #1A4ED8), var(--gj-blue-ink, #1A3FA8))', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12.5 }}>{initials(c.prenom, c.nom)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold truncate" style={{ color: 'var(--gj-ink)' }}>{c.prenom} {c.nom}</div>
                    <div className="text-[11.5px] truncate flex items-center gap-[6px]" style={{ color: 'var(--gj-grey)' }}>
                      <span className="truncate">{c.offreTitre}</span>
                      {age && <span className="shrink-0 font-bold" style={{ color: age.enRetard ? 'var(--gj-red-ink, #B91C1C)' : 'var(--gj-grey)' }}>· {age.label}</span>}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full text-[10px] font-black px-[7px] py-[1px]"
                    title={c.score == null ? 'Score non calculé (profil ou offre sans compétences)' : `Adéquation ${c.score}%`}
                    style={{ background: sc.bg, color: sc.fg }}
                  >{sc.label}</span>
                </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  )
}
