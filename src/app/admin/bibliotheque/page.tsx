import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getBiblioStatsGlobal } from '@/lib/bibliotheque/service'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = { title: 'Bibliothèque — Administration CJS' }

export const dynamic = 'force-dynamic'

// ── Carte de stat ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string
  value: number
  icon: 'resources' | 'chart' | 'check' | 'trending' | 'alert' | 'users'
  highlight?: boolean
}) {
  return (
    <div
      style={{
        background: highlight ? 'var(--gj-red-soft, #fee2e2)' : 'var(--gj-surface)',
        border: highlight
          ? '1.5px solid var(--gj-red, #ef4444)'
          : '1.5px solid var(--gj-line)',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: highlight ? 'rgba(239,68,68,.15)' : 'var(--gj-teal-soft)',
          color: highlight ? 'var(--gj-red, #ef4444)' : 'var(--gj-teal-deep)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={20} />
      </div>
      <div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: highlight ? 'var(--gj-red, #ef4444)' : 'var(--gj-ink)',
            lineHeight: 1.1,
          }}
        >
          {value.toLocaleString('fr-FR')}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--gj-grey)',
            marginTop: 2,
            textTransform: 'uppercase',
            letterSpacing: '.4px',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const stats = await getBiblioStatsGlobal()

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>
            Bibliothèque — Supervision
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 4, marginBottom: 0 }}>
            Vue cross-centres · {stats.livresTotal} titre{stats.livresTotal !== 1 ? 's' : ''} au catalogue
          </p>
        </div>
        <Link href="/admin/bibliotheque/gestion">
          <Button
            variant="primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'var(--gj-teal-deep)',
              color: 'var(--gj-surface)',
              border: 0,
              padding: '11px 18px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            <Icon name="settings" size={15} />
            Gérer le catalogue
          </Button>
        </Link>
      </div>

      {/* ── Cartes de synthèse ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: 14,
          marginBottom: 36,
        }}
      >
        <StatCard label="Titres" value={stats.livresTotal} icon="resources" />
        <StatCard label="Exemplaires" value={stats.totaux.exemplairesTotal} icon="chart" />
        <StatCard label="Disponibles" value={stats.totaux.disponibles} icon="check" />
        <StatCard label="Empruntés" value={stats.totaux.empruntes} icon="trending" />
        <StatCard label="Emprunts actifs" value={stats.totaux.empruntsActifs} icon="users" />
        <StatCard
          label="En retard"
          value={stats.totaux.enRetard}
          icon="alert"
          highlight={stats.totaux.enRetard > 0}
        />
      </div>

      {/* ── Tableau par centre ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--gj-ink)',
            margin: '0 0 14px',
          }}
        >
          Détail par centre
        </h2>

        {stats.centres.length === 0 ? (
          <EmptyState
            illustration="inbox"
            title="Aucun centre"
            description="Aucun centre n'a encore de livres dans la bibliothèque."
          />
        ) : (
          <>
            {/* Desktop */}
            <div
              className="hidden md:block"
              style={{
                background: 'var(--gj-surface)',
                border: '1.5px solid var(--gj-line)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
              aria-label="Tableau bibliothèque par centre"
            >
              {/* Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                  gap: 12,
                  padding: '11px 18px',
                  borderBottom: '1.5px solid var(--gj-line)',
                  background: 'var(--gj-bg)',
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'var(--gj-grey)',
                  textTransform: 'uppercase',
                  letterSpacing: '.4px',
                }}
              >
                <span>Centre</span>
                <span>Exemplaires</span>
                <span>Disponibles</span>
                <span>Empruntés</span>
                <span>Actifs</span>
                <span style={{ color: 'var(--gj-red, #ef4444)' }}>En retard</span>
              </div>

              {stats.centres.map((c) => (
                <div
                  key={c.centreId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                    gap: 12,
                    padding: '13px 18px',
                    borderBottom: '1px solid var(--gj-line)',
                    alignItems: 'center',
                  }}
                >
                  {/* Centre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        flexShrink: 0,
                        background: 'var(--gj-teal-soft)',
                        color: 'var(--gj-teal-deep)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="pin" size={15} />
                    </span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--gj-ink)' }}>
                        {c.centreNom}
                      </div>
                      <Link
                        href={`/admin/bibliotheque/gestion?centreId=${c.centreId}`}
                        style={{ fontSize: 11, color: 'var(--gj-teal-deep)', fontWeight: 600 }}
                      >
                        Gérer
                      </Link>
                    </div>
                  </div>
                  {/* Colonnes chiffres */}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)' }}>
                    {c.exemplairesTotal}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-grey)' }}>
                    {c.disponibles}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-grey)' }}>
                    {c.empruntes}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-grey)' }}>
                    {c.empruntsActifs}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: c.enRetard > 0 ? 'var(--gj-red, #ef4444)' : 'var(--gj-grey)',
                    }}
                  >
                    {c.enRetard > 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'var(--gj-red-soft, #fee2e2)',
                          borderRadius: 20,
                          padding: '2px 10px',
                        }}
                      >
                        <Icon name="alert" size={12} />
                        {c.enRetard}
                      </span>
                    ) : (
                      '0'
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile — cartes */}
            <div
              className="md:hidden flex flex-col"
              style={{ gap: 10 }}
              aria-label="Liste par centre (mobile)"
            >
              {stats.centres.map((c) => (
                <div
                  key={c.centreId}
                  style={{
                    background: 'var(--gj-surface)',
                    border: '1px solid var(--gj-line)',
                    borderRadius: 13,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        flexShrink: 0,
                        background: 'var(--gj-teal-soft)',
                        color: 'var(--gj-teal-deep)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="pin" size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)' }}>
                        {c.centreNom}
                      </div>
                      <Link
                        href={`/admin/bibliotheque/gestion?centreId=${c.centreId}`}
                        style={{ fontSize: 11, color: 'var(--gj-teal-deep)', fontWeight: 600 }}
                      >
                        Gérer ce centre
                      </Link>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 6,
                      fontSize: 12,
                    }}
                  >
                    {[
                      { label: 'Exemplaires', val: c.exemplairesTotal },
                      { label: 'Disponibles', val: c.disponibles },
                      { label: 'Empruntés', val: c.empruntes },
                      { label: 'Actifs', val: c.empruntsActifs },
                      { label: 'En retard', val: c.enRetard, warn: c.enRetard > 0 },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          background: item.warn ? 'var(--gj-red-soft, #fee2e2)' : 'var(--gj-bg)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: item.warn ? 'var(--gj-red, #ef4444)' : 'var(--gj-ink)',
                          }}
                        >
                          {item.val}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--gj-grey)', fontWeight: 700 }}>
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
