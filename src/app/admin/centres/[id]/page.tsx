import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui/Icon'
import { CentresMapGoogle } from '@/components/centres/CentresMapGoogle'
import { regionLabel } from '@/lib/regions'
import { centreAccent } from '@/lib/centre-accent'
import { parseTab } from '@/lib/centre-fiche-tabs'
import { getCentresAnalytics } from '@/lib/loaders/centres-analytics'
import { CentreFicheTabs } from './CentreFicheTabs'
import { CentreFrequentation } from './CentreFrequentation'
import { AdminCentreRessources, type RessourceCentreItem } from './ressources/AdminCentreRessources'

export const metadata: Metadata = { title: 'Fiche centre — Admin CJS' }

const JOUR_ORDER: Record<string, number> = { Lundi: 0, Mardi: 1, Mercredi: 2, Jeudi: 3, Vendredi: 4, Samedi: 5, Dimanche: 6 }
const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }
const h2: CSSProperties = { fontSize: 15, fontWeight: 900, color: 'var(--gj-ink)', margin: '0 0 12px' }

function initials(nom: string): string {
  const parts = nom.replace(/^CJS\s+/i, '').trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { id } = await params
  const tab = parseTab((await searchParams).tab)

  const centre = await prisma.centre.findUnique({
    where: { id },
    select: {
      id: true, nom: true, region: true, adresse: true, ville: true, telephone: true,
      email: true, responsable: true, description: true, latitude: true, longitude: true,
      slug: true, estActif: true, services: true,
      horaires: { select: { jour: true, ouvert: true, ouvreA: true, fermeA: true } },
      _count: { select: { profilsRattaches: true, agents: true, ressources: true, insertions: true } },
    },
  })
  if (!centre) notFound()

  const accent = centreAccent(String(centre.region))
  const services = Array.isArray(centre.services) ? (centre.services as string[]) : []
  const horaires = [...centre.horaires].sort((a, b) => (JOUR_ORDER[a.jour] ?? 9) - (JOUR_ORDER[b.jour] ?? 9))

  const kpis = [
    { label: 'Jeunes rattachés', value: centre._count.profilsRattaches.toLocaleString('fr-FR') },
    { label: 'Agents', value: String(centre._count.agents) },
    { label: 'Ressources', value: String(centre._count.ressources) },
    { label: 'Insertions', value: String(centre._count.insertions) },
  ]

  // ── Données de l'onglet actif ──────────────────────────────────────────────
  let ressourceItems: RessourceCentreItem[] = []
  if (tab === 'ressources') {
    const r = await prisma.ressourceCentre.findMany({
      where: { centreId: id },
      orderBy: [{ type: 'asc' }, { nom: 'asc' }],
      select: { id: true, type: true, nom: true, description: true, capacite: true, capaciteUnit: true, dureeMinCreneauMin: true, requiresJustif: true, estActive: true, _count: { select: { reservations: true } } },
    })
    ressourceItems = r.map((x) => ({ id: x.id, type: x.type, nom: x.nom, description: x.description, capacite: x.capacite, capaciteUnit: x.capaciteUnit, dureeMinCreneauMin: x.dureeMinCreneauMin, requiresJustif: x.requiresJustif, estActive: x.estActive, reservationsCount: x._count.reservations }))
  }
  const analytics = tab === 'frequentation'
    ? await getCentresAnalytics({ from: new Date(Date.now() - 90 * 86_400_000), to: new Date(), centreIds: [id] })
    : null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <Link href="/admin/centres" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--gj-teal-deep)', textDecoration: 'none', marginBottom: 14 }}>
        <Icon name="chevron-left" size={15} /> Retour aux centres
      </Link>

      {/* Header letterhead (couleur région) */}
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: `var(${accent.soft})`, borderBottom: '1px solid var(--gj-line)' }}>
          <span aria-hidden style={{ width: 52, height: 52, borderRadius: 13, flexShrink: 0, display: 'inline-grid', placeItems: 'center', color: 'var(--color-text-on-dark)', fontWeight: 900, fontSize: 17, background: `var(${accent.ink})`, boxShadow: 'var(--gj-edge)' }}>
            {initials(centre.nom).toUpperCase()}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>{centre.nom}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--gj-grey)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Icon name="pin" size={13} /> {regionLabel(String(centre.region)) ?? centre.region}
              {centre.adresse ? ` · ${centre.adresse}` : ''}
            </div>
          </div>
          <span style={{ flexShrink: 0, borderRadius: 999, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', padding: '4px 10px', background: centre.estActif ? 'var(--gj-green-soft)' : 'var(--gj-line)', color: centre.estActif ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }}>
            {centre.estActif ? 'Actif' : 'Inactif'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 0 }}>
          {kpis.map((k, i) => (
            <div key={k.label} style={{ textAlign: 'center', padding: '14px 8px', borderLeft: i % 4 === 0 ? 'none' : '1px solid var(--gj-line)', borderTop: i >= 2 ? '1px solid var(--gj-line)' : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gj-ink)', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gj-grey)', marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ marginBottom: 16 }}>
        <CentreFicheTabs centreId={id} active={tab} />
      </div>

      {/* Contenu de l'onglet */}
      {tab === 'vue' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-[16px] items-start">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <h2 style={h2}>Coordonnées</h2>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', margin: 0 }}>
                {[['Responsable', centre.responsable], ['Téléphone', centre.telephone], ['Email', centre.email], ['Ville', centre.ville]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string}>
                    <dt style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gj-grey)' }}>{k}</dt>
                    <dd style={{ margin: 0, fontSize: 13.5, color: 'var(--gj-ink)', wordBreak: 'break-word' }}>{v}</dd>
                  </div>
                ))}
              </dl>
              {services.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gj-grey)', margin: '14px 0 8px' }}>Services</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {services.map((s) => (
                      <span key={s} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>{s.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={card}>
              <h2 style={h2}>Horaires</h2>
              {horaires.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gj-grey)' }}>Aucun horaire renseigné.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {horaires.map((hr) => (
                    <div key={hr.jour} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--gj-line)', fontSize: 13 }}>
                      <span style={{ color: 'var(--gj-ink)', fontWeight: 600 }}>{hr.jour}</span>
                      <span style={{ color: hr.ouvert ? 'var(--gj-ink)' : 'var(--gj-grey)' }}>{hr.ouvert && hr.ouvreA ? `${hr.ouvreA} – ${hr.fermeA}` : 'Fermé'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={card}>
            <h2 style={h2}>Localisation</h2>
            <CentresMapGoogle centres={[{ id: centre.id, nom: centre.nom, latitude: centre.latitude, longitude: centre.longitude }]} centresForList={[{ id: centre.id, nom: centre.nom, region: String(centre.region), slug: centre.slug ?? '' }]} height={280} zoom={13} disableUI />
          </div>
        </div>
      )}

      {tab === 'ressources' && <AdminCentreRessources centreId={id} centreNom={centre.nom} items={ressourceItems} />}
      {tab === 'frequentation' && analytics && <CentreFrequentation analytics={analytics} />}
    </div>
  )
}
