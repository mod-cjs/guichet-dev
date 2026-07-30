import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = { title: 'Connexion' }

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state:    'Requête invalide. Veuillez réessayer.',
  no_role:          'Votre compte n\'a pas accès à cette plateforme.',
  auth_failed:      'La connexion a échoué. Veuillez réessayer.',
  forbidden:        'Vous n\'avez pas les droits pour accéder à cette page.',
  session_expired:  'Votre session a expiré. Veuillez vous reconnecter.',
}

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function ConnexionPage({ searchParams }: Props) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Une erreur est survenue.') : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-color-bg-page px-space-4">
      <div className="bg-white border border-color-border-default rounded-gj-2xl shadow-gj-md
        w-full max-w-[400px] p-space-6 text-center">

        {/* Logo — image unifiée cf. AppTopbar/BenefSidebar */}
        <div className="flex items-center justify-center mb-space-4">
          <Image
            src="/logo-guichet.png"
            alt="Guichet Jeunesse"
            width={160}
            height={40}
            priority
            style={{ height: 40, width: 'auto' }}
          />
        </div>

        <h1 className="text-fs-700 font-black text-color-text-primary mb-space-1">
          Bienvenue sur Guichet Jeunesse
        </h1>
        <p className="text-fs-300 text-color-text-secondary mb-space-5">
          Emploi · Formation · Opportunités — tout en un seul endroit
        </p>

        {/* Avantages */}
        <ul className="text-left mb-space-5 flex flex-col gap-space-2">
          {[
            'Des offres d\'emploi adaptées à votre profil',
            'Des formations et bourses accessibles',
            'Un accompagnement personnalisé par Yaye',
          ].map(item => (
            <li key={item} className="flex items-start gap-space-2 text-fs-200 text-color-text-secondary">
              <Icon name="check" size={16} className="text-gj-teal mt-[2px] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        {errorMessage && (
          <div
            role="alert"
            className="mb-space-4 rounded-gj-md bg-gj-red-soft border border-gj-red
              px-space-3 py-space-2 text-fs-200 text-gj-red-ink text-left"
          >
            {errorMessage}
          </div>
        )}

        {/* Bouton SSO — redirige vers /api/auth/login (PKCE côté serveur).
            Une connexion n'est pas un CTA de conversion : teal-deep en base
            (réf auth-screens.jsx:59), jamais gj-action/gj-teal. */}
        <a
          href="/api/auth/login"
          className="flex items-center justify-center gap-space-2 w-full
            bg-gj-teal-deep text-white font-bold text-fs-400 rounded-gj-md
            min-h-[var(--tap-min)] px-space-4
            hover:bg-gj-teal-deep-2 transition-colors no-underline"
        >
          Continuer avec mon compte CJS
        </a>

        <p className="text-fs-100 text-color-text-muted mt-space-4">
          En vous connectant, vous acceptez les{' '}
          <Link href="/legal/mentions-legales" className="underline hover:text-color-text-primary">
            conditions d&apos;utilisation
          </Link>.
        </p>
      </div>
    </div>
  )
}
