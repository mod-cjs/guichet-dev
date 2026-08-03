'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button, Icon, Toast } from '@/components/ui'

interface Props {
  evenementId: string
  isAuthenticated: boolean
  initialInscrit: boolean
  ouvertInscription: boolean
  complet: boolean
}

/**
 * CTA d'inscription/désinscription pour la page détail (`/agenda/[id]`).
 * Couche client minimale : redirection auth si pas connecté, POST/DELETE
 * sinon. Optimiste + rollback en cas d'erreur.
 */
export function EvenementInscriptionCta({
  evenementId,
  isAuthenticated,
  initialInscrit,
  ouvertInscription,
  complet,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [inscrit, setInscrit] = useState(initialInscrit)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'danger' } | null>(null)

  const onClick = useCallback(() => {
    if (!isAuthenticated) {
      const ret = encodeURIComponent(pathname || '/agenda')
      router.push(`/auth/connexion?return=${ret}`)
      return
    }
    if (pendingRef.current) return
    const wasInscrit = inscrit
    pendingRef.current = true
    setPending(true)
    setInscrit(!wasInscrit)

    const url = `/api/evenements/${evenementId}/inscription`
    const req = wasInscrit ? fetch(url, { method: 'DELETE' }) : fetch(url, { method: 'POST' })

    req
      .then((r) => {
        if (!r.ok && r.status !== 409) throw new Error(String(r.status))
        setToast({
          message: wasInscrit ? 'Désinscription confirmée' : 'Inscription confirmée',
          variant: 'success',
        })
      })
      .catch(() => {
        setInscrit(wasInscrit)
        setToast({ message: 'Action impossible, réessayez', variant: 'danger' })
      })
      .finally(() => {
        pendingRef.current = false
        setPending(false)
      })
  }, [isAuthenticated, inscrit, evenementId, pathname, router])

  if (!ouvertInscription) {
    return (
      <Button variant="ghost" disabled aria-label="Inscriptions fermées">
        Inscriptions fermées
      </Button>
    )
  }

  if (complet && !inscrit) {
    return (
      <Button variant="ghost" disabled aria-label="Événement complet">
        Complet
      </Button>
    )
  }

  let label: string
  let variant: 'conversion' | 'ghost' = 'conversion'
  if (!isAuthenticated) {
    label = "Se connecter pour s'inscrire"
  } else if (inscrit) {
    label = 'Se désinscrire'
    variant = 'ghost'
  } else {
    label = "S'inscrire — c'est gratuit"
  }

  return (
    <>
      <Button onClick={onClick} variant={variant} disabled={pending} aria-label={label}>
        {!isAuthenticated && <Icon name="user" size={16} />}
        {label}
      </Button>
      {inscrit && isAuthenticated && (
        <span className="inline-flex items-center justify-center gap-1 text-fs-200 font-bold text-gj-green-ink bg-gj-green-soft rounded-gj-md py-space-1">
          <Icon name="check-circle" size={14} />
          Tu es inscrit·e
        </span>
      )}
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </>
  )
}
