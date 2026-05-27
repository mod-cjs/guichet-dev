'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui/Icon'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'

export interface BenefSidebarItem {
  id: string
  href: string
  icon: IconName
  label: string
  /** Badge optionnel (count ou texte court). */
  badge?: string | number
  /** Badge muted (compteur indicatif) vs vif (alerte). */
  badgeMuted?: boolean
}

export interface BenefSidebarSection {
  title?: string
  items: BenefSidebarItem[]
}

export interface BenefSidebarProps {
  /** ID de l'item actif. */
  active?: string
  /** Sections personnalisées (défaut fourni). */
  sections?: BenefSidebarSection[]
  userName?: string
  userMeta?: string
  userInitials?: string
  /** Lien CTA Yaye (défaut /jeune/yaye). */
  yayeHref?: string
}

const DEFAULT_SECTIONS: BenefSidebarSection[] = [
  {
    items: [
      { id: 'home', href: '/jeune/tableau-de-bord', icon: 'home', label: 'Accueil' },
    ],
  },
  {
    title: 'Opportunités',
    items: [
      { id: 'opportunites', href: '/opportunites', icon: 'target', label: 'Toutes les opportunités' },
      { id: 'favoris', href: '/jeune/favoris', icon: 'bookmark', label: 'Mes favoris' },
    ],
  },
  {
    title: 'Mon parcours',
    items: [
      { id: 'candidatures', href: '/jeune/candidatures', icon: 'document', label: 'Mes candidatures' },
      { id: 'agenda', href: '/agenda', icon: 'calendar', label: 'Agenda' },
      { id: 'centres', href: '/centres', icon: 'pin', label: 'Centres CJS' },
      { id: 'ressources', href: '/ressources', icon: 'document', label: 'Ressources' },
    ],
  },
  {
    title: 'Mon compte',
    items: [
      { id: 'profil', href: '/jeune/mon-profil', icon: 'profile', label: 'Mon profil' },
      { id: 'parametres', href: '/jeune/parametres', icon: 'settings', label: 'Paramètres' },
    ],
  },
]

/**
 * BenefSidebar — sidebar gauche web bénéficiaire (≥1024px).
 *
 * Conforme `design-guichet-v2/web-dashboard.jsx` BenefSidebar :
 * - Logo Guichet + sous-titre "Mon espace"
 * - User chip (avatar initiales + nom + meta + chevron)
 * - Sections nav (Accueil / Opportunités / Parcours / Compte)
 * - Footer Yaye CTA permanent (lien vers /jeune/yaye)
 * - 260px largeur, bg-white, border-right
 *
 * Sur mobile (<1024px) : caché (BottomNav prend le relais).
 */
export function BenefSidebar({
  active,
  sections = DEFAULT_SECTIONS,
  userName,
  userMeta,
  userInitials,
  yayeHref = '/jeune/yaye',
}: BenefSidebarProps) {
  return (
    <aside
      role="navigation"
      aria-label="Navigation principale"
      className="hidden lg:flex"
      style={{
        width: 260,
        background: '#fff',
        borderRight: '1px solid var(--gj-line)',
        padding: '16px 12px',
        height: '100%',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 6,
          padding: '4px 6px 16px',
        }}
      >
        <Image
          src="/logo-guichet.png"
          alt="Guichet Jeunesse.sn"
          width={120}
          height={30}
          style={{ height: 30, width: 'auto' }}
        />
        <div
          style={{
            fontSize: 9.5,
            color: 'var(--gj-teal-deep)',
            letterSpacing: '.5px',
            textTransform: 'uppercase',
            fontWeight: 800,
          }}
        >
          Mon espace
        </div>
      </div>

      {/* User chip */}
      {userName || userInitials ? (
        <Link
          href="/jeune/mon-profil"
          className="no-underline"
          style={{
            background: 'var(--gj-bg)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
            color: 'var(--gj-ink)',
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {userInitials ?? ''}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 800,
                color: 'var(--gj-ink)',
                lineHeight: 1.2,
              }}
            >
              {userName}
            </span>
            {userMeta ? (
              <span
                style={{
                  display: 'block',
                  fontSize: 10.5,
                  color: 'var(--gj-grey)',
                  marginTop: 2,
                }}
              >
                {userMeta}
              </span>
            ) : null}
          </span>
          <Icon name="chevron-right" size={13} />
        </Link>
      ) : null}

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <div key={section.title ?? `section-${sIdx}`}>
          {section.title ? (
            <div
              style={{
                fontSize: 9.5,
                color: 'var(--gj-grey)',
                fontWeight: 800,
                letterSpacing: '.4px',
                textTransform: 'uppercase',
                padding: '12px 10px 4px',
              }}
            >
              {section.title}
            </div>
          ) : null}
          {section.items.map(item => {
            const on = item.id === active
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className="no-underline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  color: on ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
                  fontWeight: on ? 800 : 600,
                  minHeight: 38,
                  background: on ? 'var(--gj-teal-soft)' : 'transparent',
                  width: '100%',
                }}
              >
                <Icon name={item.icon} size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge ? (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: item.badgeMuted ? 'var(--gj-line)' : 'var(--gj-red)',
                      color: item.badgeMuted ? 'var(--gj-grey)' : '#fff',
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 10,
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      ))}

      {/* Yaye footer CTA */}
      <Link
        href={yayeHref}
        className="no-underline"
        style={{
          marginTop: 'auto',
          padding: '12px 10px',
          background: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal, var(--gj-ink)))',
          borderRadius: 12,
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <YayeAvatar size={32} />
          <span style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontWeight: 900,
                fontSize: 14,
                color: '#fff',
              }}
            >
              Yaye
            </span>
            <span
              style={{
                background: 'var(--gj-yellow)',
                color: 'var(--gj-teal-deep)',
                fontSize: 8.5,
                fontWeight: 900,
                padding: '1px 5px',
                borderRadius: 999,
                marginLeft: 5,
                letterSpacing: '.3px',
              }}
            >
              IA
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                opacity: 0.85,
                marginTop: 2,
              }}
            >
              Assistant Guichet
            </span>
          </span>
        </span>
        <span
          style={{
            background: 'var(--gj-yellow)',
            color: 'var(--gj-teal-deep)',
            padding: '8px 12px',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 11.5,
            textAlign: 'center',
          }}
        >
          Parler à Yaye
        </span>
      </Link>
    </aside>
  )
}
