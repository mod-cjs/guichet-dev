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
import { centreRgb } from '@/lib/centre-accent'
import { parseTab } from '@/lib/centre-fiche-tabs'
import { jourCourant, statutOuverture } from '@/lib/centre-horaire'
import { serviceLabel } from '@/lib/centre-services'
import { getCentresAnalytics } from '@/lib/loaders/centres-analytics'
import { getBibliothequeStats, getEmpruntsBibliotheque } from '@/lib/loaders/conseiller-bibliotheque'
import { CentreFicheTabs } from './CentreFicheTabs'
import { CentreBibliotheque, type BiblioEmpruntRow, type BiblioKpis } from './CentreBibliotheque'
import { CentreBiblioCatalogue, type CatalogueLivre } from './CentreBiblioCatalogue'
import { CentreFrequentation } from './CentreFrequentation'
import { CentreEditButton } from './CentreEditButton'
import { CentreLifecycleActions } from './CentreLifecycleActions'
import { AdminCentreRessources, type RessourceCentreItem, type ReservationRow } from './ressources/AdminCentreRessources'
import { CentreEquipe, type CentreAgent } from './CentreEquipe'

export const metadata: Metadata = { title: 'Fiche centre — Admin CJS' }

const JOUR_ORDER: Record<string, number> = { Lundi: 0, Mardi: 1, Mercredi: 2, Jeudi: 3, Vendredi: 4, Samedi: 5, Dimanche: 6 }
const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }

/** En-tête de section fidèle maquette : tiret doré + filet (`.dps h6`). */
function SectionH6({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px', paddingBottom: 9, borderBottom: '1px solid var(--gj-line)', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)' }}>
      <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flex: 'none' }} />
      {children}
    </div>
  )
}

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

  const rgb = centreRgb(String(centre.region))
  const services = Array.isArray(centre.services) ? (centre.services as string[]) : []
  const horaires = [...centre.horaires].sort((a, b) => (JOUR_ORDER[a.jour] ?? 9) - (JOUR_ORDER[b.jour] ?? 9))
  const now = new Date()
  const jourAuj = jourCourant(now)
  const statut = statutOuverture(horaires, now)

  // Métriques de la Vue d'ensemble (fidélité maquette : 4 KPIs + trend réel).
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [frequentationMois, frequentationPrev, ressourcesActives] = await Promise.all([
    prisma.checkIn.count({ where: { centreId: id, effectueA: { gte: monthStart } } }),
    prisma.checkIn.count({ where: { centreId: id, effectueA: { gte: prevMonthStart, lt: monthStart } } }),
    prisma.ressourceCentre.count({ where: { centreId: id, estActive: true } }),
  ])
  const jeunes = centre._count.profilsRattaches
  const tauxInsertion = jeunes > 0 ? Math.round((centre._count.insertions / jeunes) * 100) : 0
  const freqDeltaPct = frequentationPrev > 0 ? Math.round(((frequentationMois - frequentationPrev) / frequentationPrev) * 100) : null

  const kpis: { value: string; label: string; trend?: string }[] = [
    { value: jeunes.toLocaleString('fr-FR'), label: 'Jeunes suivis' },
    { value: frequentationMois.toLocaleString('fr-FR'), label: 'Fréquentation / mois', trend: freqDeltaPct != null && freqDeltaPct >= 0 ? `+${freqDeltaPct}%` : freqDeltaPct != null ? `${freqDeltaPct}%` : undefined },
    { value: `${tauxInsertion} %`, label: "Taux d'insertion" },
    { value: String(ressourcesActives), label: 'Ressources actives' },
  ]

  const editValues = {
    id: centre.id, nom: centre.nom, region: String(centre.region), adresse: centre.adresse,
    ville: centre.ville, latitude: centre.latitude, longitude: centre.longitude,
    telephone: centre.telephone, email: centre.email, responsable: centre.responsable,
    services, estActif: centre.estActif,
    horaires: centre.horaires.map((h) => ({ jour: String(h.jour), ouvert: h.ouvert, ouvreA: h.ouvreA, fermeA: h.fermeA })),
  }

  // ── Données de l'onglet actif ──────────────────────────────────────────────
  let ressourceItems: RessourceCentreItem[] = []
  let reservations: ReservationRow[] = []
  if (tab === 'ressources') {
    const [r, resa] = await Promise.all([
      prisma.ressourceCentre.findMany({
        where: { centreId: id },
        orderBy: [{ type: 'asc' }, { nom: 'asc' }],
        select: { id: true, type: true, nom: true, description: true, capacite: true, capaciteUnit: true, dureeMinCreneauMin: true, requiresJustif: true, estActive: true, _count: { select: { reservations: true } } },
      }),
      prisma.reservation.findMany({
        where: { centreId: id },
        orderBy: [{ dateReservee: 'desc' }, { creneauDebut: 'desc' }],
        take: 60,
        select: {
          id: true, statut: true, dateReservee: true, creneauDebut: true, creneauFin: true,
          motif: true, nombrePersonnes: true, justifFileUrl: true, raisonRefusOuAnnul: true,
          ressource: { select: { nom: true } },
          utilisateur: { select: { prenom: true, nom: true } },
        },
      }),
    ])
    ressourceItems = r.map((x) => ({ id: x.id, type: x.type, nom: x.nom, description: x.description, capacite: x.capacite, capaciteUnit: x.capaciteUnit, dureeMinCreneauMin: x.dureeMinCreneauMin, requiresJustif: x.requiresJustif, estActive: x.estActive, reservationsCount: x._count.reservations }))
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    reservations = resa.map((x) => ({
      id: x.id,
      jeune: `${x.utilisateur.prenom} ${x.utilisateur.nom}`.trim(),
      ressource: x.ressource.nom,
      date: x.dateReservee.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      creneau: `${x.creneauDebut}–${x.creneauFin}`,
      statut: String(x.statut),
      passee: x.dateReservee < today,
      motif: x.motif,
      nombrePersonnes: x.nombrePersonnes,
      justif: Boolean(x.justifFileUrl),
      raison: x.raisonRefusOuAnnul,
    }))
  }
  const analytics = tab === 'frequentation'
    ? await getCentresAnalytics({ from: new Date(Date.now() - 90 * 86_400_000), to: new Date(), centreIds: [id] })
    : null

  // Onglet Équipe & accès : agents rattachés (AgentCentre ↔ Utilisateur par cjs_uid).
  let agents: CentreAgent[] = []
  if (tab === 'equipe') {
    const rels = await prisma.agentCentre.findMany({
      where: { centreId: id }, select: { id: true, cjsUid: true, role: true }, orderBy: { createdAt: 'asc' }, take: 24,
    })
    const users = await prisma.utilisateur.findMany({
      where: { cjsUid: { in: rels.map((r) => r.cjsUid) } }, select: { cjsUid: true, nom: true, prenom: true },
    })
    const umap = new Map(users.map((u) => [u.cjsUid, u]))
    agents = rels.map((r) => {
      const u = umap.get(r.cjsUid)
      return { id: r.id, cjsUid: r.cjsUid, nom: u ? `${u.prenom} ${u.nom}`.trim() : r.cjsUid.slice(0, 8), role: String(r.role) }
    })
  }

  // Onglet Bibliothèque : KPIs + emprunts en cours + catalogue/fonds du centre.
  let biblioKpis: BiblioKpis = { exemplaires: 0, enCours: 0, enRetard: 0, titres: 0 }
  let biblioEmprunts: BiblioEmpruntRow[] = []
  let biblioCatalogue: CatalogueLivre[] = []
  if (tab === 'biblio') {
    const [stats, emprunts, livres] = await Promise.all([
      getBibliothequeStats(id),
      getEmpruntsBibliotheque(id, ['en_cours', 'en_retard'], now),
      prisma.livre.findMany({
        where: { exemplaires: { some: { centreId: id } } },
        orderBy: { titre: 'asc' },
        take: 200,
        select: {
          id: true, titre: true, auteur: true, theme: true, isbn: true, niveau: true, langue: true, resume: true,
          exemplaires: {
            where: { centreId: id },
            orderBy: { codeBarre: 'asc' },
            select: { id: true, codeBarre: true, rayon: true, etagere: true, position: true, statut: true },
          },
        },
      }),
    ])
    biblioKpis = { exemplaires: stats.exemplaires, enCours: stats.enCours, enRetard: stats.enRetard, titres: stats.titres }
    biblioEmprunts = emprunts.map((e) => ({
      id: e.id, titre: e.livreTitre, auteur: e.livreAuteur, emprunteur: e.emprunteur,
      emprunteLe: e.dateLabel, retourPrevu: e.retourLabel, statut: String(e.statut), enRetard: e.enRetard,
    }))
    biblioCatalogue = livres.map((l) => ({
      id: l.id, titre: l.titre, auteur: l.auteur, theme: l.theme, isbn: l.isbn, niveau: l.niveau, langue: l.langue, resume: l.resume,
      exemplaires: l.exemplaires.map((e) => ({ id: e.id, codeBarre: e.codeBarre, rayon: e.rayon, etagere: e.etagere, position: e.position, statut: String(e.statut) })),
    }))
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <Link href="/admin/centres" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--gj-teal-deep)', textDecoration: 'none', marginBottom: 14 }}>
        <Icon name="chevron-left" size={15} /> Retour aux centres
      </Link>

      {/* Header letterhead (couleur région) — statut d'ouverture + Éditer (maquette) */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, background: `rgba(${rgb}, .13)`, marginBottom: 16 }}>
        <span aria-hidden style={{ width: 52, height: 52, borderRadius: 13, flexShrink: 0, display: 'inline-grid', placeItems: 'center', color: 'var(--color-text-on-dark)', fontWeight: 900, fontSize: 17, background: `rgb(${rgb})`, boxShadow: 'var(--gj-edge)' }}>
          {initials(centre.nom).toUpperCase()}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ borderRadius: 999, fontSize: 10.5, fontWeight: 800, padding: '3px 10px', background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>{regionLabel(String(centre.region)) ?? centre.region}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: statut.ouvert ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: statut.ouvert ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }} />
              {statut.label}
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)', margin: '4px 0 0' }}>{centre.nom}</h1>
          <div style={{ fontSize: 12.5, color: 'var(--gj-grey)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <Icon name="pin" size={13} /> {regionLabel(String(centre.region)) ?? centre.region}{centre.adresse ? ` · ${centre.adresse}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <CentreEditButton centre={editValues} />
          <CentreLifecycleActions centreId={centre.id} estActif={centre.estActif} />
        </div>
      </div>

      {/* Onglets */}
      <div style={{ marginBottom: 16 }}>
        <CentreFicheTabs centreId={id} active={tab} />
      </div>

      {/* Contenu de l'onglet — Vue d'ensemble (fidélité maquette) */}
      {tab === 'vue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Carte GPS + Contact côte à côte (maquette : 1.25fr / 1fr) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-[16px] items-start">
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <CentresMapGoogle centres={[{ id: centre.id, nom: centre.nom, latitude: centre.latitude, longitude: centre.longitude }]} centresForList={[{ id: centre.id, nom: centre.nom, region: String(centre.region), slug: centre.slug ?? '' }]} height={280} zoom={13} disableUI />
            </div>
            <div>
              <SectionH6>Contact</SectionH6>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px 16px', margin: 0, background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '14px 15px', boxShadow: 'var(--gj-edge)' }}>
                {[['Responsable', centre.responsable], ['Téléphone', centre.telephone], ['E-mail', centre.email], ['Adresse', centre.adresse]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string}>
                    <dt style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gj-grey)', marginBottom: 4 }}>{k}</dt>
                    <dd style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gj-ink)', wordBreak: 'break-word' }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* 4 tuiles KPI (maquette .ktile : valeur 21px + delta vert en texte simple) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
            {kpis.map((k) => (
              <div key={k.label} style={{ ...card, padding: '13px 15px' }}>
                <b style={{ fontSize: 21, fontWeight: 900, color: 'var(--gj-ink)', display: 'block', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</b>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gj-grey)', display: 'block', marginTop: 6 }}>{k.label}</span>
                {k.trend && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gj-green-ink)', marginTop: 4 }}>{k.trend}</div>
                )}
              </div>
            ))}
          </div>

          {/* Services proposés — grille + puce ronde (maquette .svcgrid) */}
          {services.length > 0 && (
            <div style={card}>
              <SectionH6>Services proposés</SectionH6>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {services.map((s) => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--gj-ink)', background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 9, padding: '8px 11px' }}>
                    <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gj-green-ink)', flexShrink: 0 }} />
                    {serviceLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Horaires — jour courant surligné */}
          <div style={card}>
            <SectionH6>Horaires d&apos;ouverture</SectionH6>
            {horaires.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gj-grey)' }}>Aucun horaire renseigné.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {horaires.map((hr) => {
                  const auj = hr.jour === jourAuj
                  const c = auj ? 'var(--gj-yellow-ink)' : 'var(--gj-ink)'
                  return (
                    <div key={hr.jour} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--gj-line)', fontSize: 13 }}>
                      <span style={{ color: c, fontWeight: auj ? 800 : 600 }}>{hr.jour}{auj ? ' · aujourd’hui' : ''}</span>
                      <span style={{ color: hr.ouvert ? c : 'var(--gj-grey)', fontWeight: auj ? 800 : 400 }}>{hr.ouvert && hr.ouvreA ? `${hr.ouvreA} – ${hr.fermeA}` : 'Fermé'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'equipe' && <CentreEquipe centreId={id} staffCount={centre._count.agents} agents={agents} />}
      {tab === 'ressources' && <AdminCentreRessources centreId={id} items={ressourceItems} reservations={reservations} />}
      {tab === 'frequentation' && analytics && <CentreFrequentation analytics={analytics} />}
      {tab === 'biblio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CentreBibliotheque kpis={biblioKpis} emprunts={biblioEmprunts} />
          <CentreBiblioCatalogue centreId={id} livres={biblioCatalogue} />
        </div>
      )}
    </div>
  )
}
