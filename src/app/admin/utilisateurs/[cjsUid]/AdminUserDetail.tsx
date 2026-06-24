import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui/Icon'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserDetailProfil {
  completionScore: number
  niveauEtude: string | null
  situationEmploi: string | null
  biographie: string | null
  photoUrl: string | null
  centrePrincipalNom: string | null
  domainesInteret: string[]
  diplomesCount: number
  experiencesCount: number
  certificatsCount: number
}

export interface UserDetailActivite {
  candidatures: number
  candidaturesRetenues: number
  inscriptions: number
  reservations: number
  checkIns: number
  favoris: number
  insertions: number
}

export interface UserDetailData {
  cjsUid: string
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  region: string | null
  commune: string | null
  statut: 'actif' | 'inactif' | 'anonymise'
  role: string | null
  createdAt: Date
  profil: UserDetailProfil | null
  activite: UserDetailActivite
}

// ─── Helpers ──────────────────────────────────────────────────────────────

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
function statutLabel(s: string): string {
  return s === 'actif' ? 'Actif' : s === 'inactif' ? 'Inactif' : 'Anonymisé'
}
function statutColor(s: string): string {
  return s === 'actif' ? 'var(--gj-green)' : s === 'inactif' ? 'var(--gj-yellow-deep)' : 'var(--gj-grey)'
}
function initials(prenom: string, nom: string): string {
  return ((prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')).toUpperCase()
}
function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
      <div style={{ fontSize: 13.5, color: 'var(--gj-ink)', marginTop: 2 }}>{value || '—'}</div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18 }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 13, fontWeight: 900, color: 'var(--gj-ink)', marginBottom: 14 }}>{children}</h2>
}

function Stat({ icon, label, value, hint }: { icon: IconName; label: string; value: number; hint?: string }) {
  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 12, padding: 14 }}>
      <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
        <Icon name={icon} size={15} />
      </span>
      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)', marginTop: 8, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gj-grey)', marginTop: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 10.5, color: 'var(--gj-green-ink)', marginTop: 2, fontWeight: 700 }}>{hint}</div>}
    </div>
  )
}

// ─── Composant principal (lecture seule — supervision) ──────────────────────

export function AdminUserDetail({ data }: { data: UserDetailData }) {
  const p = data.profil

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Retour */}
        <Link
          href="/admin/utilisateurs"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--gj-grey)', textDecoration: 'none', marginBottom: 14 }}
        >
          <Icon name="chevron-left" size={15} />
          Utilisateurs
        </Link>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <span aria-hidden style={{ width: 60, height: 60, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))', color: 'var(--gj-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>
            {initials(data.prenom, data.nom)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>{data.prenom} {data.nom}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
                {roleLabel(data.role)}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--gj-grey)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statutColor(data.statut) }} />
                {statutLabel(data.statut)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>Membre depuis {formatDate(data.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Grille : coordonnées + profil */}
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr', marginBottom: 16 }} className="md:!grid-cols-2">
          <Card>
            <SectionTitle>Coordonnées</SectionTitle>
            <Field label="Email" value={data.email} />
            <Field label="Téléphone" value={data.telephone} />
            <Field label="Région" value={data.region} />
            <Field label="Commune" value={data.commune} />
            <Field label="Centre principal" value={p?.centrePrincipalNom} />
          </Card>

          <Card>
            <SectionTitle>Profil</SectionTitle>
            {p ? (
              <>
                {/* Complétude */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Complétude</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--gj-ink)' }}>{p.completionScore}&nbsp;%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: 'var(--gj-line)', marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, p.completionScore))}%`, height: '100%', background: 'linear-gradient(90deg, var(--gj-teal), var(--gj-teal-deep))' }} />
                  </div>
                </div>
                <Field label="Niveau d'études" value={p.niveauEtude} />
                <Field label="Situation" value={p.situationEmploi} />
                {p.domainesInteret.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>Domaines d'intérêt</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {p.domainesInteret.map((d) => (
                        <span key={d} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'var(--gj-bg)', color: 'var(--gj-ink)', border: '1px solid var(--gj-line)' }}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {p.biographie && <Field label="Biographie" value={p.biographie} />}
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--gj-grey)' }}>Profil non renseigné (onboarding incomplet).</p>
            )}
          </Card>
        </div>

        {/* Activité */}
        <SectionTitle>Activité</SectionTitle>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)' }} className="md:!grid-cols-4">
          <Stat icon="employment" label="Candidatures" value={data.activite.candidatures} hint={data.activite.candidaturesRetenues > 0 ? `${data.activite.candidaturesRetenues} retenue${data.activite.candidaturesRetenues > 1 ? 's' : ''}` : undefined} />
          <Stat icon="calendar" label="Inscriptions" value={data.activite.inscriptions} />
          <Stat icon="pin" label="Réservations" value={data.activite.reservations} />
          <Stat icon="check" label="Check-ins" value={data.activite.checkIns} />
          <Stat icon="heart" label="Favoris" value={data.activite.favoris} />
          <Stat icon="trending" label="Insertions" value={data.activite.insertions} />
          {p && <Stat icon="document" label="Diplômes" value={p.diplomesCount} />}
          {p && <Stat icon="learning" label="Certificats" value={p.certificatsCount} />}
        </div>
      </div>
    </div>
  )
}
