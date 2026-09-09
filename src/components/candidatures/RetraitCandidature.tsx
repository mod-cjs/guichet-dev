'use client'

/**
 * GUIC-689 — Retrait de candidature à l'initiative du candidat.
 *
 * Ce bouton a existé une première fois sans `onClick`, sans route et sans statut
 * en base : il annonçait une action qui n'existait pas. Il est reconstruit ici
 * avec sa route (`POST /api/candidatures/[id]/retrait`), qui refait côté serveur
 * chacun des contrôles ci-dessous — l'affichage n'est jamais une autorisation.
 *
 * Règles de la maquette v5 (`candidatures-web.jsx:204,216`) :
 *  - masqué dès qu'une décision existe : le retrait n'a plus de sens, et
 *    l'offrir conduirait à un 409 incompréhensible ;
 *  - confirmation obligatoire, l'action étant irréversible (la contrainte
 *    d'unicité empêche de re-candidater à la même offre).
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button, Modal } from '@/components/ui'

/** États depuis lesquels le retrait reste ouvert (miroir de la route). */
const RETIRABLES = new Set(['En_attente', 'Vue'])

export interface RetraitCandidatureProps {
  candidatureId: string
  statut: string
  titreOffre: string
}

export function RetraitCandidature({
  candidatureId,
  statut,
  titreOffre,
}: RetraitCandidatureProps) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  if (!RETIRABLES.has(statut)) return null

  async function confirmer() {
    setEnCours(true)
    setErreur(null)
    try {
      const res = await fetch(`/api/candidatures/${candidatureId}/retrait`, { method: 'POST' })
      if (!res.ok) {
        // Le message du serveur distingue « déjà retirée » de « le recruteur a
        // statué » : le recopier évite d'inventer une explication à sa place.
        const corps = await res.json().catch(() => null)
        setErreur(corps?.error?.message ?? 'Le retrait a échoué. Réessaie dans un instant.')
        return
      }
      setOuvert(false)
      router.refresh()
    } catch {
      setErreur('Le retrait a échoué. Vérifie ta connexion et réessaie.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setErreur(null); setOuvert(true) }}
        data-testid="detail-cta-retrait"
        className="inline-flex items-center justify-center rounded-gj-md px-space-4 py-space-2
          min-h-[var(--tap-min)] text-fs-200 font-bold text-gj-red hover:bg-gj-red-soft"
      >
        Retirer ma candidature
      </button>

      <Modal
        isOpen={ouvert}
        onClose={() => setOuvert(false)}
        title="Retirer cette candidature ?"
        size="sm"
      >
        <p className="text-fs-200 text-color-text-secondary">
          Ta candidature à «&nbsp;{titreOffre}&nbsp;» sera définitivement retirée. Le recruteur
          en sera informé. Cette action est irréversible.
        </p>

        {erreur && (
          <p role="alert" className="mt-space-3 text-fs-200 font-bold text-gj-red">
            {erreur}
          </p>
        )}

        <div className="mt-space-4 flex flex-col gap-space-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOuvert(false)} disabled={enCours}>
            Garder ma candidature
          </Button>
          <Button variant="danger" onClick={confirmer} disabled={enCours}>
            {enCours ? 'Retrait…' : 'Retirer'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
