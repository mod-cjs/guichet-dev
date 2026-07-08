'use client'

/**
 * GUIC-526 — Section « Rôles & rattachements » de la fiche utilisateur admin.
 *
 * L'admin provisionne ici le PÉRIMÈTRE des rôles d'espace :
 * - rattachements centre (`AgentCentre`) → accès + périmètre espace conseiller
 * - organisation liée (`Organisation.cjsUid`) → périmètre espace recruteur
 * Le rôle SSO lui-même (`conseiller` / `recruteur`) s'attribue dans l'admin SSO
 * et prend effet à la reconnexion de l'utilisateur.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon, Select, Input, Toast } from '@/components/ui'
import {
  ajouterRattachementCentre,
  retirerRattachementCentre,
  lierOrganisation,
  creerOrganisationPourRecruteur,
} from '../actions'

export interface RattachementItem {
  id: string
  role: string
  centreNom: string
}

export interface OptionItem {
  id: string
  nom: string
}

const ROLE_AGENT_OPTIONS = [
  { value: 'conseiller', label: 'Conseiller' },
  { value: 'directeur', label: 'Directeur' },
  { value: 'admin_centre', label: 'Admin centre' },
]

const ERROR_LABELS: Record<string, string> = {
  FORBIDDEN: 'Accès refusé.',
  VALIDATION: 'Saisie invalide.',
  DEJA_RATTACHE: 'Cet utilisateur est déjà rattaché à ce centre.',
  INTROUVABLE: 'Élément introuvable (déjà supprimé ?).',
  ERREUR: 'Erreur inattendue — réessayez.',
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18 }}>
      {children}
    </div>
  )
}

export function RolesRattachementsSection({
  cjsUid,
  rattachements,
  centres,
  organisation,
  organisations,
}: {
  cjsUid: string
  rattachements: RattachementItem[]
  centres: OptionItem[]
  organisation: OptionItem | null
  organisations: OptionItem[]
}) {
  const router = useRouter()
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'danger' } | null>(null)
  const [pending, setPending] = useState(false)

  const [centreId, setCentreId] = useState('')
  const [roleAgent, setRoleAgent] = useState('conseiller')
  const [orgId, setOrgId] = useState('')
  const [orgNom, setOrgNom] = useState('')

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setPending(true)
    try {
      const res = await action()
      if (res.ok) {
        setToast({ message: success, variant: 'success' })
        router.refresh()
      } else {
        setToast({ message: ERROR_LABELS[res.error ?? 'ERREUR'] ?? ERROR_LABELS.ERREUR, variant: 'danger' })
      }
    } catch {
      setToast({ message: ERROR_LABELS.ERREUR, variant: 'danger' })
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-labelledby="roles-rattachements" style={{ marginTop: 16 }}>
      <h2
        id="roles-rattachements"
        style={{ fontSize: 15, fontWeight: 900, color: 'var(--gj-ink)', margin: '0 0 10px' }}
      >
        Rôles &amp; rattachements
      </h2>
      <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '0 0 12px' }}>
        Le rôle SSO (conseiller, recruteur…) s&apos;attribue dans l&apos;administration du SSO CJS et prend
        effet à la reconnexion. Ici, on définit le périmètre : centre(s) du conseiller, organisation du recruteur.
      </p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }} className="md:!grid-cols-2">
        {/* ── Espace conseiller : rattachements centre ── */}
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--gj-ink)', margin: '0 0 10px' }}>
            Rattachements centre (espace conseiller)
          </h3>

          {rattachements.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '0 0 12px' }}>
              Aucun rattachement — sans centre, l&apos;espace conseiller reste en attente.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rattachements.map((r) => (
                <li
                  key={r.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--gj-line)', borderRadius: 10, padding: '8px 10px' }}
                >
                  <Icon name="pin" size={14} aria-hidden />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)' }} className="truncate">
                    {r.centreNom}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
                    {ROLE_AGENT_OPTIONS.find((o) => o.value === r.role)?.label ?? r.role}
                  </span>
                  <button
                    type="button"
                    aria-label={`Retirer le rattachement à ${r.centreNom}`}
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Retirer le rattachement à « ${r.centreNom} » ?`)) return
                      void run(() => retirerRattachementCentre(r.id), 'Rattachement retiré.')
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--gj-line)', background: 'transparent', color: 'var(--gj-red)', cursor: 'pointer' }}
                  >
                    <Icon name="close" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Select
              id="rattachement-centre"
              aria-label="Centre à rattacher"
              placeholder="Choisir un centre…"
              options={centres.map((c) => ({ value: c.id, label: c.nom }))}
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Select
                  id="rattachement-role"
                  aria-label="Rôle agent"
                  options={ROLE_AGENT_OPTIONS}
                  value={roleAgent}
                  onChange={(e) => setRoleAgent(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                disabled={pending || !centreId}
                onClick={() =>
                  void run(
                    () => ajouterRattachementCentre({ cjsUid, centreId, role: roleAgent }),
                    'Rattachement ajouté — l’espace conseiller est ouvert.',
                  )
                }
              >
                Rattacher
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Espace recruteur : organisation liée ── */}
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--gj-ink)', margin: '0 0 10px' }}>
            Organisation (espace recruteur)
          </h3>

          {organisation ? (
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)', margin: '0 0 12px' }}>
              <Icon name="check-circle" size={15} aria-hidden />
              Liée à «&nbsp;{organisation.nom}&nbsp;»
            </p>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '0 0 12px' }}>
              Aucune organisation liée — sans organisation, l&apos;espace recruteur reste en attente.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Select
                  id="liaison-organisation"
                  aria-label="Organisation existante"
                  placeholder="Lier une organisation existante…"
                  options={organisations.map((o) => ({ value: o.id, label: o.nom }))}
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                disabled={pending || !orgId}
                onClick={() =>
                  void run(
                    () => lierOrganisation({ cjsUid, organisationId: orgId }),
                    'Organisation liée — l’espace recruteur est ouvert.',
                  )
                }
              >
                Lier
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input
                  id="creation-organisation"
                  aria-label="Nom de la nouvelle organisation"
                  placeholder="Ou créer : nom de l’organisation"
                  value={orgNom}
                  onChange={(e) => setOrgNom(e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                disabled={pending || orgNom.trim().length < 2}
                onClick={() =>
                  void run(
                    () => creerOrganisationPourRecruteur({ cjsUid, nom: orgNom.trim() }),
                    'Organisation créée et liée.',
                  )
                }
              >
                Créer
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </section>
  )
}
