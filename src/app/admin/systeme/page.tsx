import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { Icon, type IconName } from '@/components/ui/Icon'

export const metadata: Metadata = { title: 'Système & Exploitation — Admin CJS' }

/**
 * Système & Exploitation (GUIC-679) — page-hub transverse.
 * Regroupe les écrans secondaires sortis de la sidebar (fidélité maquette) :
 * statistiques, notifications, onboarding, analytics, veille, configuration Yaye.
 * Ils restent ainsi découvrables (pas orphelins) en attendant leur re-logement
 * définitif en onglets de leurs pages-hub respectives.
 */
const LINKS: { href: string; icon: IconName; label: string; desc: string }[] = [
  { href: '/admin/data-hub', icon: 'trending', label: 'Statistiques & Data Hub', desc: 'Exports CDP et indicateurs nationaux.' },
  { href: '/admin/notifications', icon: 'bell', label: 'Notifications', desc: 'Diffusions et rappels de la plateforme.' },
  { href: '/admin/onboarding', icon: 'target', label: 'Onboarding', desc: 'Parcours d’accueil des bénéficiaires.' },
  { href: '/admin/analytics/centres', icon: 'chart', label: 'Fréquentation centres', desc: 'Analytics de présence par centre.' },
  { href: '/admin/analytics/evenements', icon: 'calendar', label: 'Analytics événements', desc: 'Inscriptions & présence aux événements.' },
  { href: '/admin/types-opportunite', icon: 'employment', label: 'Types d’opportunité', desc: 'Référentiel des types d’offres.' },
  { href: '/admin/sources-veille', icon: 'trending', label: 'Sources de veille', desc: 'Flux surveillés pour la curation.' },
  { href: '/admin/curation/monitoring', icon: 'chart', label: 'Monitoring veille', desc: 'Santé des exécutions de veille.' },
  { href: '/admin/yaye/sessions', icon: 'chat', label: 'Sessions Yaye', desc: 'Historique des conversations IA.' },
  { href: '/admin/yaye/modele', icon: 'settings', label: 'Modèle IA', desc: 'Configuration LLM (LlmConfig).' },
]

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>Système &amp; Exploitation</h1>
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>Écrans transverses &amp; configuration — accès rapide.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]" style={{ marginTop: 18 }}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="gj-registre-card is-interactive"
              style={{ display: 'block', background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 15, padding: 16, textDecoration: 'none', color: 'inherit' }}
            >
              <span style={{ display: 'inline-grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', boxShadow: 'var(--gj-edge)' }}>
                <Icon name={l.icon} size={18} />
              </span>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--gj-ink)', marginTop: 10 }}>{l.label}</div>
              <div style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 3 }}>{l.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
