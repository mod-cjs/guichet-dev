import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui/Icon'

/**
 * GUIC-526 — Écran d'attente des espaces conseiller (D1) et recruteur (D4).
 *
 * Affiché par le layout de l'espace quand l'utilisateur porte le rôle SSO mais
 * que son périmètre Guichet n'est pas encore provisionné par un administrateur
 * (rattachement `AgentCentre` pour le conseiller, `Organisation` liée pour le
 * recruteur). Pas de redirect silencieux : l'utilisateur comprend où il en est.
 */

const VARIANTS: Record<
  'conseiller' | 'recruteur',
  { icon: IconName; titre: string; detail: string; accent: string; accentSoft: string }
> = {
  conseiller: {
    icon: 'users',
    titre: 'Compte conseiller en attente de rattachement',
    detail:
      'Votre compte porte bien le rôle conseiller, mais il n’est pas encore rattaché à un centre. ' +
      'Un administrateur CJS doit effectuer ce rattachement — votre espace s’ouvrira automatiquement dès que ce sera fait.',
    accent: 'var(--gj-ink-teal)',
    accentSoft: 'var(--gj-teal-soft)',
  },
  recruteur: {
    icon: 'employment',
    titre: 'Compte recruteur en attente de liaison',
    detail:
      'Votre compte porte bien le rôle recruteur, mais il n’est pas encore lié à une organisation. ' +
      'Un administrateur CJS doit effectuer cette liaison — votre espace s’ouvrira automatiquement dès que ce sera fait.',
    accent: 'var(--gj-blue-ink, var(--gj-teal-deep))',
    accentSoft: 'var(--gj-teal-soft)',
  },
}

export function EspaceEnAttente({ espace }: { espace: 'conseiller' | 'recruteur' }) {
  const v = VARIANTS[espace]
  return (
    <main
      id="main"
      className="min-h-[100svh] flex items-center justify-center px-space-4"
      style={{ background: 'var(--gj-bg)' }}
    >
      <div
        className="w-full text-center"
        style={{
          maxWidth: 460,
          background: 'var(--gj-surface)',
          border: '1.5px solid var(--gj-line)',
          borderRadius: 14,
          padding: '40px 28px',
        }}
      >
        <span
          aria-hidden
          className="inline-flex items-center justify-center"
          style={{ width: 64, height: 64, borderRadius: '50%', background: v.accentSoft, color: v.accent }}
        >
          <Icon name={v.icon} size={30} />
        </span>
        <h1 className="text-fs-500 font-black mt-space-4" style={{ color: 'var(--gj-ink)' }}>
          {v.titre}
        </h1>
        <p className="text-fs-300 mt-space-3" style={{ color: 'var(--gj-grey)', lineHeight: 1.55 }}>
          {v.detail}
        </p>
        <p className="text-fs-200 mt-space-3" style={{ color: 'var(--gj-grey)' }}>
          Besoin d&apos;aide&nbsp;? Contactez votre administrateur CJS.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-space-5 font-bold no-underline hover:underline"
          style={{ color: 'var(--gj-teal-deep)' }}
        >
          <Icon name="chevron-left" size={16} />
          Retour à l&apos;accueil
        </Link>
        {/* GUIC-673 — Sortie explicite : sans ça, l'utilisateur sans rattachement est en impasse.
            `<a>` (pas Link) : /api/auth/logout est une route serveur (navigation complète). */}
        <a
          href="/api/auth/logout"
          className="inline-flex items-center gap-2 mt-space-3 font-semibold no-underline hover:underline"
          style={{ color: 'var(--gj-grey)' }}
        >
          <Icon name="logout" size={15} />
          Se déconnecter
        </a>
      </div>
    </main>
  )
}
