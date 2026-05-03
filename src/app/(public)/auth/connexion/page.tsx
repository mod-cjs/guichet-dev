'use client'
import { buildAuthorizeUrl } from '@/lib/sso-client'

export default function ConnexionPage() {
  function handleLogin() {
    // PKCE + state générés côté client pour le redirect SSO
    // Implémentation complète dans lib/sso-client.ts
    window.location.href = '/api/auth/login'
  }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-cjs-vert mb-2">Se connecter</h1>
        <p className="text-cjs-gris mb-8">
          Un seul compte pour tout l&apos;écosystème CJS
        </p>
        <button onClick={handleLogin} className="btn-primary w-full">
          Continuer avec le Guichet CJS
        </button>
      </div>
    </div>
  )
}
