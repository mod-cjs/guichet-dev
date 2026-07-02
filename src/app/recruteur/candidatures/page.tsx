import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getRecruteurContext, getRecruteurCandidatures } from '@/lib/loaders/recruteur'
import { Icon } from '@/components/ui/Icon'
import type { StatutCandidature } from '@prisma/client'

export const metadata: Metadata = { title: 'Candidatures — Espace Recruteur' }

const CAND_LABEL: Record<string, string> = {
  En_attente: 'À examiner', Vue: 'Vue', Retenue: 'Retenue', Refusee: 'Refusée',
}
function candColors(s: string): { bg: string; fg: string } {
  switch (s) {
    case 'Retenue': return { bg: 'var(--gj-green-soft, #e6f6ec)', fg: 'var(--gj-green-ink, #1a7a3d)' }
    case 'Refusee': return { bg: 'var(--gj-red-soft, #fdecec)', fg: 'var(--gj-red-ink)' }
    case 'Vue': return { bg: 'var(--gj-line)', fg: 'var(--gj-grey)' }
    default: return { bg: 'var(--gj-blue-soft, #E8EFFF)', fg: 'var(--gj-blue-ink, #1A3FA8)' }
  }
}
function initials(prenom: string, nom: string): string {
  return ((prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')).toUpperCase()
}

const FILTRES: { value: string; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'En_attente', label: 'À examiner' },
  { value: 'Vue', label: 'Vues' },
  { value: 'Retenue', label: 'Retenues' },
  { value: 'Refusee', label: 'Refusées' },
]
const VALID = new Set(['En_attente', 'Vue', 'Retenue', 'Refusee'])

export default async function Page({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const raw = (await searchParams).statut
  const statut = raw && VALID.has(raw) ? (raw as StatutCandidature) : undefined

  const ctx = await getRecruteurContext(session.cjsUid)
  const candidatures = await getRecruteurCandidatures(session.cjsUid, ctx.organisationId, statut)

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <div className="mb-4">
        <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>Candidatures reçues</h1>
        <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>{candidatures.length} candidature{candidatures.length > 1 ? 's' : ''}</p>
      </div>

      {/* Filtres pipeline */}
      <div className="flex gap-[8px] flex-wrap mb-5">
        {FILTRES.map((f) => {
          const on = (statut ?? '') === f.value
          return (
            <Link
              key={f.value || 'all'}
              href={f.value ? `/recruteur/candidatures?statut=${f.value}` : '/recruteur/candidatures'}
              className="inline-flex items-center font-bold text-[12.5px] rounded-full px-[14px] min-h-[36px] no-underline"
              style={{
                background: on ? 'var(--gj-blue, #1A4ED8)' : '#fff',
                color: on ? '#fff' : 'var(--gj-grey)',
                border: `1.5px solid ${on ? 'var(--gj-blue, #1A4ED8)' : 'var(--gj-line)'}`,
              }}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {candidatures.length === 0 ? (
        <div className="rounded-[14px] p-[32px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
          <p className="text-[14px] font-bold">Aucune candidature{statut ? ' dans ce statut' : ' reçue'}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {candidatures.map((c) => {
            const col = candColors(c.statut)
            return (
              <Link key={c.id} href={`/recruteur/candidatures/${c.id}`} className="rounded-[14px] p-[14px] flex items-center gap-3 flex-wrap no-underline" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
                <span aria-hidden style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-blue, #1A4ED8), var(--gj-blue-ink, #1A3FA8))', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{initials(c.prenom, c.nom)}</span>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-[14px] font-black" style={{ color: 'var(--gj-ink)' }}>{c.prenom} {c.nom}</div>
                  <div className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>{c.offreTitre}</div>
                </div>
                <span className="inline-block rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: col.bg, color: col.fg }}>{CAND_LABEL[c.statut] ?? c.statut}</span>
                <Icon name="chevron-right" size={16} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
