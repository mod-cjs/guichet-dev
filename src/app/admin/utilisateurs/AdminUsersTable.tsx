'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'

// ─── Types exportés (utilisés par le test + server page) ──────────────────

export interface AdminUserRow {
  cjsUid: string
  nom: string
  prenom: string
  email: string | null
  commune: string | null
  statut: 'actif' | 'inactif' | 'anonymise'
  /** Rôle principal mis en cache depuis le SSO (null = non encore synchronisé). */
  role: string | null
  createdAt: Date
  centrePrincipalNom: string | null
}

/** Libellé d'affichage du rôle (fallback Bénéficiaire si non synchronisé). */
const ROLE_LABEL: Record<string, string> = {
  beneficiaire: 'Bénéficiaire',
  conseiller: 'Conseiller',
  recruteur: 'Recruteur',
  admin: 'Admin',
  data_steward: 'Data steward',
}
function roleLabel(role: string | null): string {
  if (!role) return 'Bénéficiaire'
  return ROLE_LABEL[role] ?? role
}

export interface StatutCount {
  statut: string
  _count: { cjsUid: number }
}

export interface AdminUsersTableProps {
  rows: AdminUserRow[]
  statutCounts: StatutCount[]
  total: number
  currentPage: number
  totalPages: number
  /** Terme de recherche actuel */
  q: string
  /** Filtre statut actuel ('' = tous) */
  statut: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function initials(prenom: string, nom: string): string {
  const p = prenom.trim()[0] ?? ''
  const n = nom.trim()[0] ?? ''
  return (p + n).toUpperCase()
}

function statutLabel(s: string): string {
  switch (s) {
    case 'actif':     return 'Actif'
    case 'inactif':   return 'Inactif'
    case 'anonymise': return 'Anonymisé'
    default:          return s
  }
}

function statutDotColor(s: string): string {
  switch (s) {
    case 'actif':     return 'var(--gj-green)'
    case 'inactif':   return 'var(--gj-yellow-deep)'
    case 'anonymise': return 'var(--gj-grey)'
    default:          return 'var(--gj-grey)'
  }
}

function statutTextColor(s: string): string {
  switch (s) {
    case 'actif':     return 'var(--gj-green-ink)'
    case 'inactif':   return 'var(--gj-yellow-ink)'
    case 'anonymise': return 'var(--gj-grey)'
    default:          return 'var(--gj-grey)'
  }
}

function relativeDate(d: Date): string {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 jour'
  if (days < 30)  return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  if (months === 1) return 'il y a 1 mois'
  if (months < 12)  return `il y a ${months} mois`
  const years = Math.floor(months / 12)
  return years === 1 ? 'il y a 1 an' : `il y a ${years} ans`
}

// ─── Composant principal ───────────────────────────────────────────────────

export function AdminUsersTable({
  rows,
  statutCounts,
  total,
  currentPage,
  totalPages,
  q,
  statut,
}: AdminUsersTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const buildUrl = useCallback(
    (params: Record<string, string | number>) => {
      const sp = new URLSearchParams()
      if (q)      sp.set('q', q)
      if (statut) sp.set('statut', statut)
      sp.set('page', '1')
      Object.entries(params).forEach(([k, v]) => {
        if (v === '' || v === undefined) sp.delete(k)
        else sp.set(k, String(v))
      })
      const qs = sp.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [pathname, q, statut],
  )

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = (new FormData(e.currentTarget).get('q')?.toString() ?? '').trim()
    startTransition(() => {
      const sp = new URLSearchParams()
      if (value) sp.set('q', value)
      if (statut) sp.set('statut', statut)
      router.push(sp.toString() ? `${pathname}?${sp}` : pathname)
    })
  }

  function handleStatut(value: string) {
    startTransition(() => {
      const sp = new URLSearchParams()
      if (q)     sp.set('q', q)
      if (value) sp.set('statut', value)
      router.push(sp.toString() ? `${pathname}?${sp}` : pathname)
    })
  }

  // Chips : Tous + un par statut
  const TOUS_TOTAL = statutCounts.reduce((acc, s) => acc + s._count.cjsUid, 0)

  const STATUTS: { value: string; label: string }[] = [
    { value: 'actif',     label: 'Actif' },
    { value: 'inactif',   label: 'Inactif' },
    { value: 'anonymise', label: 'Anonymisé' },
  ]

  // URL de base pour Pagination (sans le param page mais avec q+statut)
  const paginationBase = (() => {
    const sp = new URLSearchParams()
    if (q)      sp.set('q', q)
    if (statut) sp.set('statut', statut)
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  })()

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* ── En-tête ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}
            >
              Utilisateurs
            </h1>
            <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3 }}>
              {total} comptes
            </p>
          </div>

          {/* Recherche */}
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
              borderRadius: 10,
              padding: '0 13px',
              minHeight: 42,
              width: 240,
            }}
          >
            <span
              aria-hidden
              style={{
                color: 'var(--gj-grey)',
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="search" size={16} />
            </span>
            <input
              type="search"
              name="q"
              placeholder="Rechercher… (Entrée)"
              defaultValue={q}
              aria-label="Rechercher un utilisateur"
              style={{
                flex: 1,
                border: 0,
                outline: 0,
                background: 'transparent',
                fontSize: 13.5,
                fontFamily: 'inherit',
                color: 'var(--gj-ink)',
              }}
            />
            <button type="submit" aria-label="Lancer la recherche" style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
              <Icon name="arrow-right" size={15} style={{ color: 'var(--gj-grey)' }} />
            </button>
          </form>
        </div>

        {/* ── Chips filtre statut ── */}
        <div
          style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}
        >
          <Chip
            selected={statut === ''}
            aria-pressed={statut === ''}
            onClick={() => handleStatut('')}
          >
            Tous ({TOUS_TOTAL})
          </Chip>
          {STATUTS.map((s) => {
            const count =
              statutCounts.find((sc) => sc.statut === s.value)?._count.cjsUid ?? 0
            return (
              <Chip
                key={s.value}
                selected={statut === s.value}
                aria-pressed={statut === s.value}
                onClick={() => handleStatut(s.value)}
              >
                {s.label} ({count})
              </Chip>
            )
          })}
        </div>

        {/* ── Table ── */}
        <div
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {/* En-têtes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 0.6fr',
              gap: 14,
              padding: '12px 18px',
              borderBottom: '1.5px solid var(--gj-line)',
              background: 'var(--gj-bg)',
              fontSize: 10.5,
              fontWeight: 800,
              color: 'var(--gj-grey)',
              textTransform: 'uppercase' as const,
              letterSpacing: '.4px',
            }}
          >
            <span>Utilisateur</span>
            <span>Rôle</span>
            <span>Centre / Commune</span>
            <span>Statut</span>
            <span />
          </div>

          {/* Rows */}
          {rows.length === 0 ? (
            <div
              style={{
                padding: '40px 18px',
                textAlign: 'center',
                color: 'var(--gj-grey)',
                fontSize: 14,
              }}
            >
              Aucun utilisateur trouvé.
            </div>
          ) : (
            rows.map((u) => {
              const init = initials(u.prenom, u.nom)
              const location = u.centrePrincipalNom ?? u.commune ?? '—'
              return (
                <div
                  key={u.cjsUid}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 0.6fr',
                    gap: 14,
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--gj-line)',
                    alignItems: 'center',
                  }}
                >
                  {/* Colonne Utilisateur */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    {/* Avatar initiales */}
                    <span
                      aria-hidden
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background:
                          'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
                        color: 'var(--gj-surface)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {init}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: 'var(--gj-ink)',
                        }}
                      >
                        {u.prenom} {u.nom}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gj-grey)' }}>
                        {statutLabel(u.statut)} · {relativeDate(u.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Colonne Rôle */}
                  <span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: 'var(--gj-teal-soft)',
                        color: 'var(--gj-teal-deep)',
                      }}
                    >
                      {roleLabel(u.role)}
                    </span>
                  </span>

                  {/* Colonne Centre / Commune */}
                  <span
                    style={{ fontSize: 12.5, color: 'var(--gj-ink)' }}
                  >
                    {location}
                  </span>

                  {/* Colonne Statut */}
                  <span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: statutTextColor(u.statut),
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: statutDotColor(u.statut),
                          flexShrink: 0,
                        }}
                      />
                      {statutLabel(u.statut)}
                    </span>
                  </span>

                  {/* Colonne Action */}
                  <button
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1.5px solid var(--gj-line)',
                      background: 'var(--gj-surface)',
                      color: 'var(--gj-grey)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      justifySelf: 'end',
                    }}
                    aria-label={`Gérer ${u.prenom} ${u.nom}`}
                    type="button"
                  >
                    <Icon name="settings" size={15} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 24,
            }}
          >
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl={paginationBase}
              ariaLabel="Pagination"
            />
          </div>
        )}

        {/* ── Version mobile : cartes ── */}
        {rows.length > 0 && (
          <div
            style={{ display: 'none' }}
            aria-hidden
            data-mobile-cards
          >
            {rows.map((u) => (
              <div
                key={`m-${u.cjsUid}`}
                style={{
                  background: 'var(--gj-surface)',
                  border: '1px solid var(--gj-line)',
                  borderRadius: 13,
                  padding: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
                    color: 'var(--gj-surface)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {initials(u.prenom, u.nom)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)' }}
                  >
                    {u.prenom} {u.nom}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 2 }}>
                    {u.centrePrincipalNom ?? u.commune ?? '—'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'var(--gj-teal-soft)',
                    color: 'var(--gj-teal-deep)',
                  }}
                >
                  {roleLabel(u.role)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
