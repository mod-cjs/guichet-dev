import type { Metadata } from 'next'
import Link from 'next/link'

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

        {/* Logo */}
        <div className="w-12 h-12 bg-gj-teal rounded-gj-lg flex items-center justify-center mx-auto mb-space-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="7" r="4" fill="#F9C400"/>
            <path d="M4 21c0-5 3.6-8 8-8s8 3 8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="text-fs-700 font-black text-color-text-primary mb-space-1">
          Se connecter
        </h1>
        <p className="text-fs-300 text-color-text-secondary mb-space-5">
          Un seul compte pour tout l&apos;écosystème CJS
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mb-space-4 rounded-gj-md bg-red-50 border border-gj-red/30
              px-space-3 py-space-2 text-fs-200 text-gj-red text-left"
          >
            {errorMessage}
          </div>
        )}

        {/* Bouton SSO — redirige vers /api/auth/login (PKCE côté serveur) */}
        <a
          href="/api/auth/login"
          className="flex items-center justify-center gap-space-2 w-full
            bg-gj-teal text-white font-bold text-fs-400 rounded-gj-md
            min-h-[var(--tap-min)] px-space-4
            hover:bg-gj-teal-deep transition-colors no-underline"
        >
          Continuer avec le Guichet CJS
        </a>

        <p className="text-fs-100 text-color-text-muted mt-space-4">
          En vous connectant, vous acceptez les{' '}
          <Link href="/mentions-legales" className="underline hover:text-color-text-primary">
            conditions d&apos;utilisation
          </Link>.
        </p>
      </div>
    </div>
  )
}
