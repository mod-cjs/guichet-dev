'use client'

export default function ConnexionPage() {
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()

  const error = params.get('error')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gj-bg)]">
      <div className="w-full max-w-sm p-8 rounded-2xl shadow-lg bg-white space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-[var(--gj-teal)]">Guichet Jeunesse</h1>
          <p className="text-sm text-[var(--gj-gray)]">
            Un seul compte pour tout l&apos;écosystème CJS
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-center text-[var(--gj-red)]">
            {error === 'invalid_state'
              ? 'Session expirée. Veuillez réessayer.'
              : 'Connexion échouée. Veuillez réessayer.'}
          </p>
        )}

        <a href="/api/auth/login" className="btn-primary block w-full text-center">
          Se connecter avec le Guichet CJS
        </a>
      </div>
    </div>
  )
}
