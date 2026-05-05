'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Page intermédiaire — déclenche le POST logout dès le montage du composant.
// Évite d'exposer /api/auth/logout en GET (CSRF).
export default function DeconnexionPage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .then(() => router.replace('/'))
      .catch(() => router.replace('/'))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gj-bg">
      <p className="text-gj-grey text-sm">Déconnexion en cours…</p>
    </div>
  )
}
