/**
 * GUIC-704 · Lot 2 — loader des sources de veille + santé (dernière collecte).
 * Helpers purs (santé, mapping) + chargement DB. 0 migration.
 */
import { prisma } from '@/lib/prisma'

export type SanteSource = 'jamais' | 'ok' | 'partiel' | 'echec'

/** Santé dérivée de la dernière exécution : jamais / ok / partiel / echec. */
export function santeSource(exec: { statut: 'ok' | 'partiel' | 'erreur' } | null): SanteSource {
  if (!exec) return 'jamais'
  if (exec.statut === 'ok') return 'ok'
  if (exec.statut === 'partiel') return 'partiel'
  return 'echec'
}

export interface SourceRawRow {
  id: string
  nom: string
  url: string
  methode: string
  frequence: string
  actif: boolean
  typeDefautId: string | null
  derniereVerifLe: Date | null
  derniereExecution: { statut: 'ok' | 'partiel' | 'erreur'; nbNouveautes: number; nbErreurs: number; demarreLe: Date } | null
}

export interface SourceRow {
  id: string
  nom: string
  url: string
  methode: string
  frequence: string
  actif: boolean
  typeDefautId: string | null
  sante: SanteSource
  nbNouveautes: number
  derniereCollecteLabel: string
}

const rel = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
function collecteLabel(d: Date | null, now: Date): string {
  if (!d) return 'jamais collectée'
  const h = Math.round((d.getTime() - now.getTime()) / 3600_000)
  if (h > -1) return "à l'instant"
  if (h > -24) return rel.format(h, 'hour')
  return rel.format(Math.round(h / 24), 'day')
}

export function mapSourceRow(r: SourceRawRow, now: Date): SourceRow {
  return {
    id: r.id,
    nom: r.nom,
    url: r.url,
    methode: r.methode,
    frequence: r.frequence,
    actif: r.actif,
    typeDefautId: r.typeDefautId,
    sante: santeSource(r.derniereExecution),
    nbNouveautes: r.derniereExecution?.nbNouveautes ?? 0,
    derniereCollecteLabel: collecteLabel(r.derniereVerifLe ?? r.derniereExecution?.demarreLe ?? null, now),
  }
}

export interface SourcesData {
  rows: SourceRow[]
  nbActives: number
  nbEnEchec: number
}

/** Charge les sources non supprimées + leur dernière exécution (santé). */
export async function getSourcesData(): Promise<SourcesData> {
  const sources = await prisma.sourceVeille.findMany({
    where: { deletedAt: null },
    orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
    select: {
      id: true,
      nom: true,
      url: true,
      methode: true,
      frequence: true,
      actif: true,
      typeDefautId: true,
      derniereVerifLe: true,
      executions: {
        orderBy: { demarreLe: 'desc' },
        take: 1,
        select: { statut: true, nbNouveautes: true, nbErreurs: true, demarreLe: true },
      },
    },
  })

  const now = new Date()
  const rows = sources.map((s) =>
    mapSourceRow(
      {
        id: s.id,
        nom: s.nom,
        url: s.url,
        methode: s.methode,
        frequence: s.frequence,
        actif: s.actif,
        typeDefautId: s.typeDefautId,
        derniereVerifLe: s.derniereVerifLe,
        derniereExecution: s.executions[0] ?? null,
      } as SourceRawRow,
      now,
    ),
  )

  return {
    rows,
    nbActives: rows.filter((r) => r.actif).length,
    nbEnEchec: rows.filter((r) => r.sante === 'echec').length,
  }
}
