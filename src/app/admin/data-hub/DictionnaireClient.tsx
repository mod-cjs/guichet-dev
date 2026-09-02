'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import {
  filtrerDictionnaire,
  type ColonneDictionnaire,
  type FluxDictionnaire,
  type TierFiltre,
} from '@/lib/datahub/dictionnaire'
import type { Volumes } from '@/lib/datahub/volumes'
import type { Fraicheur } from '@/lib/datahub/fraicheur'

interface DictionnaireClientProps {
  flux: FluxDictionnaire[]
  /** Recherche portée par l'URL — rend un état de la page partageable par simple lien. */
  requeteInitiale?: string
  tierInitial?: TierFiltre
  /** État du dernier run du pipeline ; absent tant que rien n'a jamais été publié. */
  fraicheur?: Fraicheur
}

const ROUTE = '/admin/data-hub'
const ROUTE_EXPORT = '/api/admin/data-hub/export'
const ROUTE_IMPRESSION = '/admin/data-hub/imprimer'

/**
 * Paramètres communs à l'URL de la page et au lien d'export : les deux décrivent le même
 * état, et les faire diverger produirait un export qui ne correspond pas à l'écran.
 */
function parametres(requete: string, tier: TierFiltre): URLSearchParams {
  const params = new URLSearchParams()
  if (requete.trim().length > 0) params.set('q', requete)
  if (tier !== 'tous') params.set('tier', tier)
  return params
}

const MONO = '"SFMono-Regular", Menlo, Consolas, monospace'

/** Le tier de gouvernance se lit d'un coup d'œil : `pseudonyme` appelle une vigilance CDP. */
function TierBadge({ tier }: { tier: string }) {
  return <Badge variant={tier === 'public' ? 'green' : 'yellow'}>{tier}</Badge>
}

function TableColonnes({ colonnes }: { colonnes: ColonneDictionnaire[] }) {
  return (
    <DataTable<ColonneDictionnaire>
      data={colonnes}
      emptyMessage="Aucune colonne ne correspond"
      columns={[
        {
          key: 'nom',
          label: 'Colonne',
          render: (_valeur, colonne) => (
            <div>
              <span style={{ fontFamily: MONO, fontWeight: 700 }}>{colonne.nom}</span>
              <div className="text-[12px] mt-[2px]" style={{ color: 'var(--gj-grey)' }}>
                {colonne.type}
                {colonne.format ? ` · ${colonne.format}` : ''}
                {colonne.nullable ? ' · nullable' : ''}
              </div>
            </div>
          ),
        },
        { key: 'description', label: 'Description' },
        {
          key: 'valeurs',
          label: 'Valeurs admises',
          render: (_valeur, colonne) =>
            colonne.valeurs ? (
              <span style={{ fontFamily: MONO, fontSize: 12 }}>{colonne.valeurs.join(', ')}</span>
            ) : (
              '—'
            ),
        },
        {
          key: 'tier',
          label: 'Gouvernance',
          render: (_valeur, colonne) => <TierBadge tier={colonne.tier} />,
        },
      ]}
    />
  )
}

/**
 * Volume du flux. `undefined` = comptage pas encore arrivé (ou indisponible) : on n'affiche
 * alors RIEN plutôt qu'un zéro, qui se lirait comme « ce flux est vide » — le contraire de
 * ce qu'on sait.
 */
function VolumeFlux({ volume }: { volume: number | null | undefined }) {
  if (volume === undefined || volume === null) return null
  if (volume === 0) {
    return (
      <Badge variant="red" bordered>
        vide
      </Badge>
    )
  }
  return (
    <span className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>
      {volume.toLocaleString('fr-FR')} lignes
    </span>
  )
}

/**
 * Bandeau de fraîcheur.
 *
 * `role="alert"` UNIQUEMENT sur un échec : un lecteur d'écran doit être interrompu quand
 * les données affichées ne sont pas fiables, pas quand tout va bien. Un bandeau vert qui
 * s'annonce à chaque visite est un bandeau qu'on apprend à ignorer.
 */
function BandeauFraicheur({ fraicheur }: { fraicheur: Fraicheur }) {
  const alerte = fraicheur.niveau === 'echec'
  const couleurs: Record<Fraicheur['niveau'], { fond: string; texte: string; bord: string }> = {
    ok: { fond: 'var(--gj-green-soft)', texte: 'var(--gj-green-ink)', bord: 'var(--gj-green)' },
    retard: {
      fond: 'var(--gj-yellow-soft)',
      texte: 'var(--gj-yellow-ink)',
      bord: 'var(--gj-yellow-deep)',
    },
    echec: { fond: 'var(--gj-red-soft)', texte: 'var(--gj-red-ink)', bord: 'var(--gj-red)' },
    inconnu: { fond: 'var(--gj-bg)', texte: 'var(--gj-grey)', bord: 'var(--gj-line)' },
  }
  const c = couleurs[fraicheur.niveau]

  return (
    <div
      role={alerte ? 'alert' : 'status'}
      className="flex items-center gap-[8px] rounded-[12px] px-[14px] py-[10px] mb-4 text-[13px] font-bold"
      style={{ background: c.fond, color: c.texte, border: `1.5px solid ${c.bord}` }}
    >
      <Icon name={alerte ? 'alert' : 'check-circle'} size={16} />
      <span>{fraicheur.libelle}</span>
    </div>
  )
}

function CarteFlux({ flux, volume }: { flux: FluxDictionnaire; volume: number | null | undefined }) {
  return (
    <section
      className="rounded-[14px] overflow-hidden"
      style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}
    >
      <header className="p-[18px] pb-[14px]">
        <div className="flex items-center gap-[10px] flex-wrap">
          <h2 className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>
            {flux.nom}
          </h2>
          <Badge variant={flux.replication === 'INCREMENTAL' ? 'teal' : 'grey'} bordered>
            {flux.replication}
          </Badge>
          <span className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>
            {flux.colonnes.length} colonne{flux.colonnes.length > 1 ? 's' : ''}
          </span>
          <VolumeFlux volume={volume} />
        </div>
        <p className="text-[12.5px] mt-[6px]" style={{ fontFamily: MONO, color: 'var(--gj-grey)' }}>
          {flux.chemin}
        </p>
        <p className="text-[12.5px] mt-[4px]" style={{ color: 'var(--gj-grey)' }}>
          Clé primaire : <strong>{flux.clesPrimaires.join(' + ')}</strong>
          {flux.cleReplication ? (
            <>
              {' · '}Clé de réplication : <strong>{flux.cleReplication}</strong>
            </>
          ) : (
            ' · rechargement complet à chaque run'
          )}
        </p>
      </header>
      <TableColonnes colonnes={flux.colonnes} />
    </section>
  )
}

/**
 * DictionnaireClient — le contrat d'export du Data Hub, lisible par un humain.
 *
 * Jusqu'ici il n'existait que sous deux formes machine (OpenAPI, catalogue Singer) et une
 * forme hors application (`dbt docs`, qui suppose Docker et un accès à l'entrepôt). Un
 * administrateur qui veut savoir ce qu'un flux contient n'avait donc aucun endroit où
 * regarder.
 */
export function DictionnaireClient({
  flux,
  requeteInitiale = '',
  tierInitial = 'tous',
  fraicheur,
}: DictionnaireClientProps) {
  const router = useRouter()
  const [requete, setRequete] = useState(requeteInitiale)
  const [tier, setTier] = useState<TierFiltre>(tierInitial)
  const [volumes, setVolumes] = useState<Volumes | null>(null)

  /**
   * Le comptage arrive APRÈS le rendu. Le dictionnaire ne coûte aucune requête base : le
   * faire attendre dix-neuf `COUNT(*)` pour une information d'appoint serait un mauvais
   * échange. Un échec est silencieux — la page reste entièrement utilisable sans volumes.
   */
  useEffect(() => {
    let vivant = true
    fetch('/api/admin/data-hub/volumes')
      .then((r) => (r.ok ? r.json() : null))
      .then((corps) => {
        if (vivant && corps?.data) setVolumes(corps.data as Volumes)
      })
      .catch(() => {})
    return () => {
      vivant = false
    }
  }, [])

  const visibles = useMemo(() => filtrerDictionnaire(flux, requete, tier), [flux, requete, tier])
  const totalColonnes = useMemo(
    () => flux.reduce((somme, f) => somme + f.colonnes.length, 0),
    [flux],
  )
  const colonnesParTier = useMemo(() => {
    const toutes = flux.flatMap((f) => f.colonnes)
    return {
      tous: toutes.length,
      public: toutes.filter((c) => c.tier === 'public').length,
      pseudonyme: toutes.filter((c) => c.tier === 'pseudonyme').length,
    }
  }, [flux])

  /**
   * L'état de la page vit dans l'URL, pas seulement en mémoire : « regarde cette colonne »
   * doit pouvoir s'envoyer par message. `replace` et non `push` — filtrer n'est pas une
   * navigation, et empiler une entrée d'historique par frappe rendrait le retour arrière
   * inutilisable.
   */
  const synchroniserUrl = useCallback(
    (q: string, t: TierFiltre) => {
      const qs = parametres(q, t).toString()
      router.replace(qs ? `${ROUTE}?${qs}` : ROUTE, { scroll: false })
    },
    [router],
  )

  const changerRequete = useCallback(
    (q: string) => {
      setRequete(q)
      synchroniserUrl(q, tier)
    },
    [synchroniserUrl, tier],
  )

  // L'export suit l'écran : mêmes filtres, même contenu.
  const lienExport = useMemo(() => {
    const qs = parametres(requete, tier).toString()
    return qs ? `${ROUTE_EXPORT}?${qs}` : ROUTE_EXPORT
  }, [requete, tier])

  const lienExportJson = useMemo(() => {
    const params = parametres(requete, tier)
    params.set('format', 'json')
    return `${ROUTE_EXPORT}?${params.toString()}`
  }, [requete, tier])

  // Le PDF passe par la vue document, qui ouvre la boîte d'impression du navigateur : le
  // projet n'embarque aucune bibliothèque PDF, et le moteur d'impression rend mieux ce
  // tableau (pagination, en-têtes répétés, accents) que ce qu'on écrirait à la main.
  const lienPdf = useMemo(() => {
    const qs = parametres(requete, tier).toString()
    return qs ? `${ROUTE_IMPRESSION}?${qs}` : ROUTE_IMPRESSION
  }, [requete, tier])

  const changerTier = useCallback(
    (t: TierFiltre) => {
      setTier(t)
      synchroniserUrl(requete, t)
    },
    [synchroniserUrl, requete],
  )

  return (
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>
              Dictionnaire du Data Hub
            </h1>
            <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
              Contrat servi aux consommateurs machine · {flux.length} flux · {totalColonnes}{' '}
              colonnes
            </p>
          </div>
          <div className="flex items-end gap-[10px] flex-wrap">
            <a
              href={lienExport}
              className="inline-flex items-center gap-[6px] text-[12.5px] font-bold rounded-[9px] px-[12px] py-[9px]"
              style={{
                background: 'var(--gj-surface)',
                color: 'var(--gj-ink)',
                border: '1.5px solid var(--gj-line)',
              }}
            >
              <Icon name="download" size={15} />
              CSV
            </a>
            <a
              href={lienPdf}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-[6px] text-[12.5px] font-bold rounded-[9px] px-[12px] py-[9px]"
              style={{
                background: 'var(--gj-surface)',
                color: 'var(--gj-ink)',
                border: '1.5px solid var(--gj-line)',
              }}
            >
              <Icon name="download" size={15} />
              PDF
            </a>
            <a
              href={lienExportJson}
              className="inline-flex items-center gap-[6px] text-[12.5px] font-bold rounded-[9px] px-[12px] py-[9px]"
              style={{
                background: 'var(--gj-surface)',
                color: 'var(--gj-ink)',
                border: '1.5px solid var(--gj-line)',
              }}
            >
              <Icon name="download" size={15} />
              JSON
            </a>
          </div>
          <div className="w-full sm:w-[280px]">
            <Input
              label="Rechercher"
              prefixIcon="search"
              placeholder="Un flux, une colonne…"
              value={requete}
              onChange={(e) => changerRequete(e.target.value)}
            />
          </div>
        </div>

        {fraicheur ? <BandeauFraicheur fraicheur={fraicheur} /> : null}

        <div className="mb-4">
          <Tabs<TierFiltre>
            value={tier}
            onChange={changerTier}
            ariaLabel="Filtrer par tier de gouvernance"
            items={[
              { value: 'tous', label: 'Toutes', count: colonnesParTier.tous },
              { value: 'public', label: 'Publiques', count: colonnesParTier.public },
              { value: 'pseudonyme', label: 'Pseudonymes', count: colonnesParTier.pseudonyme },
            ]}
          />
        </div>

        {visibles.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--gj-grey)' }}>
            Aucun flux ne correspond à « {requete} ».
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-[16px]">
            {visibles.map((f) => (
              <CarteFlux key={f.id} flux={f} volume={volumes?.[f.nom]} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
