import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Connexion' }

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function ConnexionPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gj-bg)]">
      <div className="w-full max-w-sm p-8 rounded-2xl shadow-lg bg-white space-y-6">

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-[var(--gj-teal)]">Guichet Jeunesse</h1>
          <p className="text-sm text-[var(--gj-grey)]">
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

        <a
          href="/api/auth/login"
          className="flex items-center justify-center w-full font-bold text-sm
            bg-gj-teal hover:bg-gj-teal-deep text-white no-underline rounded-lg
            transition-colors"
          style={{ minHeight: 'var(--tap-min)' }}
        >
          Se connecter avec le Guichet CJS
        </a>

      </div>
    </div>
  )
}
