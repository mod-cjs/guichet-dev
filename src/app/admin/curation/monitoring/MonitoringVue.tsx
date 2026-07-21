import Link from 'next/link'
import type { ResumeCuration } from '@/lib/curation/monitoring/stats'

/** GUIC-602 — US-7 : rendu du monitoring (synthèse + alertes + tableau par source). */

interface Ligne {
  sourceId: string
  nom: string
  actif: boolean
  nbRapportees: number
  tauxApprobation: number | null
  tauxRejet: number | null
  nbErreursRecentes: number
  derniereVerif: string
  alerte: 'erreur_repetee' | 'chute_zero' | null
}

const LIBELLE_ALERTE: Record<'erreur_repetee' | 'chute_zero', string> = {
  erreur_repetee: 'Erreurs répétées',
  chute_zero: 'Chute à zéro — sélecteurs à revoir',
}

const GRID = '1.6fr 0.8fr 0.9fr 0.9fr 0.8fr 1fr'

export function MonitoringVue({ resume, lignes }: { resume: ResumeCuration; lignes: Ligne[] }) {
  const enAlerte = lignes.filter((l) => l.alerte !== null)

  return (
    <div style={{ padding: '22px 28px 40px', overflowY: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: '0 0 4px' }}>
          Monitoring de la curation
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 0, marginBottom: 16 }}>
          {resume.nbSources.toLocaleString('fr-FR')} sources · {resume.nbEnAlerte} en alerte ·{' '}
          {(resume.parStatut.a_valider ?? 0)} à valider · {(resume.parStatut.approuvee ?? 0)} approuvées
        </p>

        {/* Bandeau alertes */}
        {enAlerte.length > 0 && (
          <div
            role="alert"
            style={{
              border: '1px solid var(--gj-red)',
              background: 'var(--gj-surface)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 900, color: 'var(--gj-red)', marginBottom: 6 }}>
              {enAlerte.length} source(s) à revoir
            </div>
            {enAlerte.map((l) => (
              <div key={l.sourceId} style={{ fontSize: 13, marginBottom: 2 }}>
                <strong>{l.nom}</strong> — {l.alerte ? LIBELLE_ALERTE[l.alerte] : ''}
              </div>
            ))}
          </div>
        )}

        {/* Tableau par source */}
        <div style={{ background: 'var(--gj-surface)', borderRadius: 14, border: '1px solid var(--gj-border)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              gap: 10,
              padding: '10px 16px',
              fontSize: 11.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: 'var(--gj-grey)',
              borderBottom: '1px solid var(--gj-border)',
            }}
          >
            <span>Source</span>
            <span>Rapportées</span>
            <span>Approbation</span>
            <span>Rejet</span>
            <span>Erreurs</span>
            <span style={{ textAlign: 'right' }}>Dernière vérif.</span>
          </div>

          {lignes.length === 0 && (
            <p style={{ padding: '28px 16px', fontSize: 13.5, color: 'var(--gj-grey)', margin: 0 }}>
              Aucune source configurée.
            </p>
          )}

          {lignes.map((l) => (
            <div
              key={l.sourceId}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                gap: 10,
                padding: '12px 16px',
                alignItems: 'center',
                borderBottom: '1px solid var(--gj-border)',
                fontSize: 13.5,
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--gj-ink)' }}>
                {l.nom}
                {l.alerte && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--gj-red)',
                      border: '1px solid var(--gj-red)',
                      borderRadius: 6,
                      padding: '1px 6px',
                    }}
                  >
                    Alerte
                  </span>
                )}
              </span>
              <span>{l.nbRapportees}</span>
              <span style={{ fontWeight: 800, color: 'var(--gj-teal-deep)' }}>
                {l.tauxApprobation === null ? '—' : `${l.tauxApprobation}%`}
              </span>
              <span>{l.tauxRejet === null ? '—' : `${l.tauxRejet}%`}</span>
              <span style={{ color: l.nbErreursRecentes > 0 ? 'var(--gj-red)' : 'var(--gj-grey)' }}>
                {l.nbErreursRecentes}
              </span>
              <span style={{ textAlign: 'right', color: 'var(--gj-grey)', fontSize: 12.5 }}>{l.derniereVerif}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--gj-grey)', marginTop: 14 }}>
          <Link href="/admin/sources-veille" style={{ color: 'var(--gj-teal-deep)' }}>
            Gérer les sources de veille
          </Link>{' '}
          ·{' '}
          <Link href="/admin/curation" style={{ color: 'var(--gj-teal-deep)' }}>
            File de curation
          </Link>
        </p>
      </div>
    </div>
  )
}
