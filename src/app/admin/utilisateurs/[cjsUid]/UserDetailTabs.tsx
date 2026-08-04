'use client'

import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { StatutCompte } from '@prisma/client'

export interface UserDetailData {
  cjsUid: string; prenom: string; nom: string
  email: string | null; telephone: string | null
  region: string | null; commune: string | null; genre: string | null
  statut: StatutCompte; role: string | null
  createdAt: string; lastSeenAt: string | null
  profil: {
    completionScore: number; niveauEtude: string | null; situationEmploi: string | null
    biographie: string | null; photoUrl: string | null; centrePrincipalNom: string | null
    competences: string[]; domainesInteret: string[]; cvUrl: string | null
  } | null
  activite: { candidatures: number; candidaturesRetenues: number; inscriptions: number; reservations: number; checkIns: number; favoris: number; insertions: number }
  parcours: {
    experiences: { id: string; poste: string; organisation: string; periode: string }[]
    diplomes: { id: string; intitule: string; etablissement: string; annee: number; niveau: string; mention: string | null }[]
    certificats: { id: string; formation: string; obtenuLe: string }[]
    cvUrl: string | null
  }
  conformite: { consentements: { version: string; date: string; ip: string }[]; notifCandidatures: boolean; notifMessages: boolean; createdAt: string; updatedAt: string; lastSeenAt: string | null; deletedAt: string | null }
}

const TABS = ['Profil', 'Activité', 'Parcours', 'Rôles & accès', 'Conformité CDP'] as const
type Tab = typeof TABS[number]

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18, boxShadow: 'var(--gj-edge)' }
const H6: CSSProperties = { margin: '0 0 12px', paddingBottom: 9, borderBottom: '1px solid var(--gj-line)', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)', display: 'flex', alignItems: 'center', gap: 9 }
const KV: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px 16px' }
const KVI: CSSProperties = { display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gj-grey)', marginBottom: 4 }
function tick() { return <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flex: 'none' }} /> }
function Fld({ label, children }: { label: string; children: React.ReactNode }) { return <span style={{ fontSize: 13, color: 'var(--gj-ink)', fontWeight: 600 }}><i style={KVI}>{label}</i>{children}</span> }
function roleLabel(r: string | null): string { return r == null || r === 'jeune' || r === 'beneficiaire' ? 'Bénéficiaire' : ({ conseiller: 'Conseiller', recruteur: 'Recruteur', admin: 'Admin' }[r] ?? r) }

/** Fiche utilisateur en 5 onglets (GUIC-701 PR-B). Rôle SSO en LECTURE SEULE. Anonymisé masque les PII. */
export function UserDetailTabs({ data, rolesSection }: { data: UserDetailData; rolesSection: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>('Profil')
  const anon = data.statut === 'anonymise'
  const A = data.activite

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', padding: '22px 28px 40px' }}>
      <Link href="/admin/utilisateurs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--gj-teal-deep, var(--gj-admin-gold))', textDecoration: 'none', marginBottom: 14 }}><Icon name="chevron-left" size={15} /> Retour aux utilisateurs</Link>

      {/* En-tête */}
      <div style={{ ...card, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span aria-hidden style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gj-line)', color: 'var(--gj-admin-gold)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 16 }}>{(data.prenom[0] ?? '') + (data.nom[0] ?? '')}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--gj-ink)' }}>{data.prenom} {data.nom}</h1>
          <div className="num" style={{ fontSize: 11, color: 'var(--gj-grey)', fontFamily: 'ui-monospace, monospace' }}>{data.cjsUid}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}>{roleLabel(data.role)}</span>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: anon ? 'var(--gj-line)' : 'var(--gj-green-soft)', color: anon ? 'var(--gj-grey)' : 'var(--gj-green-ink)' }}>{anon ? 'Anonymisé' : data.statut === 'inactif' ? 'Inactif' : 'Actif'}</span>
      </div>

      {/* Onglets */}
      <div role="tablist" aria-label="Sections de la fiche" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid var(--gj-line)', marginBottom: 16 }}>
        {TABS.map((t) => {
          const on = tab === t
          return (
            <button key={t} role="tab" aria-selected={on} onClick={() => setTab(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 14px', fontSize: 13, fontWeight: on ? 800 : 600, color: on ? 'var(--gj-admin-gold)' : 'var(--gj-grey)', background: 'none', borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent', borderBottomWidth: 2, borderBottomColor: on ? 'var(--gj-admin-gold)' : 'transparent', cursor: 'pointer', marginBottom: -1 }}>{t}</button>
          )
        })}
      </div>

      {/* Contenu */}
      {tab === 'Profil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <h6 style={H6}>{tick()}Identité</h6>
            <div style={KV}>
              <Fld label="E-mail">{anon ? '—' : data.email ?? '—'}</Fld>
              <Fld label="Téléphone">{anon ? '—' : data.telephone ?? '—'}</Fld>
              <Fld label="Région">{data.region?.replace('_', '-') ?? '—'}</Fld>
              <Fld label="Commune">{data.commune ?? '—'}</Fld>
              <Fld label="Genre">{data.genre === 'F' ? 'Femme' : data.genre === 'M' ? 'Homme' : '—'}</Fld>
              <Fld label="Inscrit le">{data.createdAt}</Fld>
            </div>
          </div>
          <div style={card}>
            <h6 style={H6}>{tick()}Profil bénéficiaire</h6>
            {data.profil ? (
              <>
                <div style={KV}>
                  <Fld label="Complétude">{data.profil.completionScore}%</Fld>
                  <Fld label="Centre principal">{data.profil.centrePrincipalNom ?? '—'}</Fld>
                  <Fld label="Niveau d'étude">{data.profil.niveauEtude ?? '—'}</Fld>
                  <Fld label="Situation">{data.profil.situationEmploi ?? '—'}</Fld>
                  <Fld label="Compétences">{data.profil.competences.length ? data.profil.competences.join(', ') : '—'}</Fld>
                  <Fld label="Domaines">{data.profil.domainesInteret.length ? data.profil.domainesInteret.join(', ') : '—'}</Fld>
                </div>
                {data.profil.biographie && <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 12 }}>{data.profil.biographie}</p>}
              </>
            ) : <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>{anon ? 'Données anonymisées.' : 'Profil non renseigné (onboarding incomplet).'}</p>}
          </div>
        </div>
      )}

      {tab === 'Activité' && (
        <div style={card}>
          <h6 style={H6}>{tick()}Activité sur la plateforme</h6>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { lab: 'Candidatures', v: A.candidatures, sub: `${A.candidaturesRetenues} retenue(s)` },
              { lab: 'Inscriptions événements', v: A.inscriptions }, { lab: 'Réservations', v: A.reservations },
              { lab: 'Check-ins centres', v: A.checkIns }, { lab: 'Favoris', v: A.favoris }, { lab: 'Insertions', v: A.insertions },
            ].map((s) => (
              <div key={s.lab} style={{ background: 'var(--gj-bg)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '12px 14px' }}>
                <div className="num" style={{ fontSize: 22, fontWeight: 900, color: 'var(--gj-ink)' }}>{s.v}</div>
                <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', fontWeight: 700 }}>{s.lab}</div>
                {s.sub && <div style={{ fontSize: 10.5, color: 'var(--gj-green-ink)', marginTop: 2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Parcours' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <h6 style={H6}>{tick()}Expériences</h6>
            {data.parcours.experiences.length === 0 ? <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucune expérience.</p> : data.parcours.experiences.map((e) => (
              <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gj-line)' }}><b style={{ fontSize: 13, color: 'var(--gj-ink)' }}>{e.poste}</b> · {e.organisation} <span style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>({e.periode})</span></div>
            ))}
          </div>
          <div style={card}>
            <h6 style={H6}>{tick()}Diplômes & certificats</h6>
            {data.parcours.diplomes.map((d) => (
              <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gj-line)', fontSize: 13, color: 'var(--gj-ink)' }}><b>{d.intitule}</b> · {d.etablissement} · {d.annee} <span style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>{d.niveau}{d.mention ? ` · ${d.mention}` : ''}</span></div>
            ))}
            {data.parcours.certificats.map((c) => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gj-line)', fontSize: 13, color: 'var(--gj-ink)' }}><Icon name="check-circle" size={13} /> {c.formation} <span style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>· {c.obtenuLe} (Moodle)</span></div>
            ))}
            {data.parcours.diplomes.length === 0 && data.parcours.certificats.length === 0 && <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun diplôme ni certificat.</p>}
          </div>
          {data.parcours.cvUrl && <div style={card}><h6 style={H6}>{tick()}CV</h6><Link href={data.parcours.cvUrl} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: 'var(--gj-admin-gold)', textDecoration: 'none' }}><Icon name="download" size={15} /> Télécharger le CV</Link></div>}
        </div>
      )}

      {tab === 'Rôles & accès' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <h6 style={H6}>{tick()}Rôle</h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 11px', borderRadius: 999, background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}>{roleLabel(data.role)}</span>
              <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>Rôle géré par le SSO CJS (lecture seule).</span>
            </div>
          </div>
          {rolesSection}
        </div>
      )}

      {tab === 'Conformité CDP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <h6 style={H6}>{tick()}Consentements CGU</h6>
            {data.conformite.consentements.length === 0 ? <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucun consentement enregistré.</p> : data.conformite.consentements.map((c, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--gj-line)', fontSize: 13, color: 'var(--gj-ink)' }}>Version <b>{c.version}</b> · {c.date} · <span className="num" style={{ color: 'var(--gj-grey)' }}>IP {c.ip}</span></div>
            ))}
          </div>
          <div style={card}>
            <h6 style={H6}>{tick()}Traçabilité & préférences</h6>
            <div style={KV}>
              <Fld label="Notifications candidatures">{data.conformite.notifCandidatures ? 'Acceptées' : 'Refusées'}</Fld>
              <Fld label="Notifications messages">{data.conformite.notifMessages ? 'Acceptées' : 'Refusées'}</Fld>
              <Fld label="Créé le">{data.conformite.createdAt}</Fld>
              <Fld label="Dernière visite">{data.conformite.lastSeenAt ?? 'jamais'}</Fld>
              <Fld label="Dernière modif.">{data.conformite.updatedAt}</Fld>
              <Fld label="Statut">{anon ? 'Anonymisé' : data.statut === 'inactif' ? 'Inactif' : 'Actif'}</Fld>
            </div>
            {data.conformite.deletedAt && <p style={{ fontSize: 12, color: 'var(--gj-red-ink)', marginTop: 10 }}>Anonymisé le {data.conformite.deletedAt} (droit à l&apos;effacement).</p>}
          </div>
        </div>
      )}
    </div>
  )
}
