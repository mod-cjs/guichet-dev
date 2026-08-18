import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import {
  searchLivres,
  getEmpruntsCentre,
} from '@/lib/bibliotheque/service'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdminBiblioCatalogueClient } from './AdminBiblioCatalogueClient'
import { AdminBiblioEmpruntsClient } from './AdminBiblioEmpruntsClient'

export const metadata: Metadata = { title: 'Bibliothèque — Gestion catalogue · Admin CJS' }

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface SP {
  centreId?: string
  q?: string
  theme?: string
  niveau?: string
  page?: string
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const sp = await searchParams

  // Chargement des centres pour le sélecteur
  const centres = await prisma.centre.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: 'asc' },
  })

  // Centre sélectionné : paramètre URL ou premier de la liste
  const centreId = sp.centreId ?? centres[0]?.id ?? null
  const centreSelectionne = centres.find((c) => c.id === centreId) ?? null

  const q = (sp.q ?? '').trim()
  const theme = (sp.theme ?? '').trim()
  const niveau = (sp.niveau ?? '').trim()
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  // Données pour le centre sélectionné — supervision lecture seule (GUIC-522 F-04) :
  // « à confirmer » n'est plus une file de traitement admin (comptoir = staff via scan QR).
  // Catalogue : recherche + pagination scopées centre, TOUS statuts d'exemplaire (mode
  // gestion — contrairement à la recherche publique dispo-seule). GUIC-522 F-11/F-12.
  const [catalogue, actifs, reserves] = centreId
    ? await Promise.all([
        searchLivres({ centreId, q, theme, niveau, page, pageSize: PAGE_SIZE, emplacements: 'tous' }),
        getEmpruntsCentre(centreId, ['en_cours', 'en_retard']),
        getEmpruntsCentre(centreId, ['initie']),
      ])
    : [{ livres: [], total: 0, page: 1, pageSize: PAGE_SIZE }, [], []]
  const livres = catalogue.livres
  const totalPages = Math.max(1, Math.ceil(catalogue.total / PAGE_SIZE))
  const enCours = actifs.filter((e) => e.statut === 'en_cours')
  const enRetard = actifs.filter((e) => e.statut === 'en_retard')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Link
              href="/admin/bibliotheque"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--gj-teal-deep)',
                textDecoration: 'none',
              }}
            >
              <Icon name="chevron-left" size={14} />
              Supervision
            </Link>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>
            Gestion du catalogue
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 4, marginBottom: 0 }}>
            Créer, modifier, supprimer des livres et gérer les emprunts — sélectionnez un centre.
          </p>
        </div>
      </div>

      {/* ── Sélecteur de centre (formulaire GET natif) ─────────────────── */}
      <form
        method="GET"
        action="/admin/bibliotheque/gestion"
        style={{ marginBottom: 28 }}
      >
        <label
          htmlFor="centre-select"
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--gj-grey)',
            textTransform: 'uppercase',
            letterSpacing: '.4px',
            marginBottom: 6,
          }}
        >
          Centre
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            id="centre-select"
            name="centreId"
            defaultValue={centreId ?? ''}
            style={{
              minWidth: 240,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--gj-line)',
              background: 'var(--gj-surface)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--gj-ink)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            aria-label="Sélectionner un centre"
          >
            {centres.length === 0 && (
              <option value="">Aucun centre disponible</option>
            )}
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1.5px solid var(--gj-teal-deep)',
              background: 'var(--gj-teal-deep)',
              color: 'white',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <Icon name="filter" size={14} />
            Afficher
          </button>
        </div>
      </form>

      {/* ── Contenu conditionnel ───────────────────────────────────────── */}
      {!centreId || !centreSelectionne ? (
        <EmptyState
          illustration="inbox"
          title="Sélectionnez un centre"
          description="Choisissez un centre dans la liste ci-dessus pour gérer son catalogue et ses emprunts."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Indicateur centre actif */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              background: 'var(--gj-teal-soft)',
              borderRadius: 10,
              border: '1.5px solid var(--gj-teal-deep)',
            }}
          >
            <Icon name="pin" size={16} style={{ color: 'var(--gj-teal-deep)' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-teal-deep)' }}>
              {centreSelectionne.nom}
            </span>
            <span style={{ fontSize: 12, color: 'var(--gj-grey)', marginLeft: 'auto' }}>
              {catalogue.total} livre{catalogue.total !== 1 ? 's' : ''} ·{' '}
              {enCours.length} en cours ·{' '}
              {enRetard.length} en retard
            </span>
          </div>

          {/* ── Section : Catalogue CRUD ───────────────────────────────── */}
          <section>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: 'var(--gj-ink)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon name="resources" size={18} style={{ color: 'var(--gj-teal-deep)' }} />
              Catalogue
            </h2>
            <AdminBiblioCatalogueClient
              centreId={centreId}
              livres={livres}
              total={catalogue.total}
              currentPage={page}
              totalPages={totalPages}
              q={q}
              theme={theme}
              niveau={niveau}
            />
          </section>

          {/* ── Section : Emprunts ────────────────────────────────────── */}
          <section>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: 'var(--gj-ink)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon name="trending" size={18} style={{ color: 'var(--gj-teal-deep)' }} />
              Emprunts
            </h2>
            <AdminBiblioEmpruntsClient
              centreId={centreId}
              enCours={enCours}
              enRetard={enRetard}
              reserves={reserves}
            />
          </section>

        </div>
      )}
    </div>
  )
}
