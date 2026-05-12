'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeconnexionPage() {
  const router = useRouter()
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .finally(() => {
        setDone(true)
        const t = setTimeout(() => router.replace('/'), 2000)
        return () => clearTimeout(t)
      })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gj-bg px-space-4">
      <div className="bg-white rounded-gj-2xl shadow-gj-md p-space-8 text-center w-full max-w-[360px]">
        {done ? (
          <>
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-space-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-green-600" aria-hidden>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
              Vous êtes déconnecté
            </h1>
            <p className="text-fs-200 text-color-text-secondary">
              Redirection vers l&apos;accueil…
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-gj-bg rounded-full flex items-center justify-center mx-auto mb-space-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-gj-grey animate-spin" aria-hidden>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </div>
            <p className="text-fs-300 text-color-text-secondary">Déconnexion en cours…</p>
          </>
        )}
      </div>
    </div>
  )
}
