import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui/Icon'
import { ParametresForm } from './ParametresForm'

export const metadata: Metadata = { title: 'Paramètres — Espace Recruteur' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/auth/connexion')

  const u = await prisma.utilisateur.findUnique({
    where: { cjsUid: session.cjsUid },
    select: { notifCandidatures: true, notifMessages: true },
  })

  const infos: [string, string][] = ([
    ['Nom', `${session.prenom ?? ''} ${session.nom ?? ''}`.trim()],
    ['Email', session.email ?? ''],
    ['Téléphone', session.telephone ?? ''],
    ['Rôle', 'Recruteur'],
  ] as [string, string][]).filter(([, v]) => Boolean(v))

  const card: React.CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18 }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 className="text-[24px] font-black mb-6" style={{ color: 'var(--gj-ink)' }}>Paramètres</h1>

      {/* Mon compte (lecture seule — géré par le SSO CJS) */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 className="text-[14px] font-black mb-[10px]" style={{ color: 'var(--gj-ink)' }}>Mon compte</h2>
        <dl className="grid gap-[8px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {infos.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--gj-grey)' }}>{k}</dt>
              <dd className="text-[13.5px]" style={{ color: 'var(--gj-ink)' }}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] mt-[12px]" style={{ color: 'var(--gj-grey)' }}>Votre compte est géré par le SSO CJS — ces informations ne sont pas modifiables ici.</p>
      </div>

      {/* Préférences de notification */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 className="text-[14px] font-black mb-[6px]" style={{ color: 'var(--gj-ink)' }}>Notifications</h2>
        <ParametresForm notifCandidatures={u?.notifCandidatures ?? true} notifMessages={u?.notifMessages ?? true} />
      </div>

      {/* Déconnexion */}
      <Link href="/api/auth/logout" className="inline-flex items-center gap-[8px] font-bold text-[13px] rounded-[10px] px-[18px] min-h-[44px] no-underline" style={{ color: 'var(--gj-red-ink, #B91C1C)', border: '1.5px solid var(--gj-red, #DC2626)' }}>
        <Icon name="external" size={15} /> Se déconnecter
      </Link>
    </div>
  )
}
