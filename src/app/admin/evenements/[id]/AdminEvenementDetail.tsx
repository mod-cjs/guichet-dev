import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { StatutEvenement, StatutInscription, TypeEvenement } from '@prisma/client'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EvenementInscrit {
  id: string
  prenom: string
  nom: string
  statut: StatutInscription
  inscritA: Date
}

export interface EvenementDetailStats {
  inscrits: number
  presents: number
  listeAttente: number
  annules: number
  /** % capacité occupée (inscrits / capaciteMax) */
  tauxRemplissage: number
  /** % de présence (présents / inscrits) */
  tauxPresence: number
}

export interface EvenementDetailData {
  id: string
  titre: string
  type: TypeEvenement
  statut: StatutEvenement
  dateDebut: Date
  lieu: string
  centreNom: string | null
  capaciteMax: number | null
  stats: EvenementDetailStats
  inscrits: EvenementInscrit[]
  /** Vrai si l'événement a eu lieu (en_cours ou terminé) — affiche le taux de présence. */
  presencePertinente: boolean
  /** Mention à afficher si la liste est tronquée (> 300 inscrits). */
  mentionTroncature?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const INSCRIT_LABEL: Record<string, string> = {
  inscrit: 'Inscrit',
  liste_attente: 'En attente',
  present: 'Présent',
  annule: 'Annulé',
}
function inscritColors(s: string): { bg: string; fg: string } {
  switch (s) {
    case 'present': return { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' }
    case 'annule': return { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' }
    case 'liste_attente': return { bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' }
    default: return { bg: 'var(--gj-blue-soft)', fg: 'var(--gj-blue-ink)' }
  }
}
const EVENT_STATUT_LABEL: Record<string, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
}

function initials(prenom: string, nom: string): string {
  return ((prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')).toUpperCase()
}
function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Stat({ icon, label, value, suffix }: { icon: IconName; label: string; value: number; suffix?: string }) {
  return (
    <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 12, padding: 14 }}>
      <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
        <Icon name={icon} size={15} />
      </span>
      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)', marginTop: 8, lineHeight: 1 }}>{value}{suffix ?? ''}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gj-grey)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ─── Composant principal (lecture seule — supervision) ──────────────────────

export function AdminEvenementDetail({ data }: { data: EvenementDetailData }) {
  const exportUrl = `/api/admin/evenements/${data.id}/participants`

  return (
    <div style={{ padding: '22px 28px 40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/admin/evenements" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--gj-grey)', textDecoration: 'none', marginBottom: 14 }}>
          <Icon name="chevron-left" size={15} />
          Événements
        </Link>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)' }}>{data.titre}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>{data.type}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gj-grey)' }}>{EVENT_STATUT_LABEL[data.statut] ?? data.statut}</span>
              <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{formatDate(data.dateDebut)} · {data.lieu}{data.centreNom ? ` · ${data.centreNom}` : ''}</span>
            </div>
          </div>
          <a href={exportUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, padding: '0 14px', minHeight: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', background: 'var(--gj-surface)', color: 'var(--gj-ink)', textDecoration: 'none' }}>
            <Icon name="download" size={15} />
            Exporter les participants
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 22 }} className="md:!grid-cols-4">
          <Stat icon="users" label="Inscrits" value={data.stats.inscrits} />
          <Stat icon="check" label="Présents" value={data.stats.presents} />
          <Stat icon="clock" label="Liste d'attente" value={data.stats.listeAttente} />
          <Stat icon="trending" label="Taux de remplissage" value={data.stats.tauxRemplissage} suffix="%" />
        </div>

        {/* Liste des inscrits */}
        <h2 style={{ fontSize: 13, fontWeight: 900, color: 'var(--gj-ink)', marginBottom: 12 }}>
          Participants ({data.inscrits.length})
          {data.presencePertinente
            ? ` · présence ${data.stats.tauxPresence}%`
            : null}
        </h2>
        <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, overflow: 'hidden' }}>
          {data.inscrits.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>
              Aucun inscrit pour le moment.
            </div>
          ) : (
            data.inscrits.map((i) => {
              const c = inscritColors(i.statut)
              return (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--gj-line)' }}>
                  <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))', color: 'var(--gj-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12.5 }}>
                    {initials(i.prenom, i.nom)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--gj-ink)' }}>{i.prenom} {i.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--gj-grey)' }}>Inscrit le {formatDate(i.inscritA)}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
                    {INSCRIT_LABEL[i.statut] ?? i.statut}
                  </span>
                </div>
              )
            })
          )}
        </div>
        {data.mentionTroncature && (
          <p style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 8, textAlign: 'center' }}>
            {data.mentionTroncature}
          </p>
        )}
      </div>
    </div>
  )
}
