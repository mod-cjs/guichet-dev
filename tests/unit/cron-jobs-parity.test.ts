/**
 * @jest-environment node
 *
 * GUIC-570 — Sentinelle : l'ordonnanceur OVH (`scripts/cron/jobs.json`) couvre EXACTEMENT les
 * crons de `vercel.json`, chemin ET horaire.
 *
 * Pourquoi c'est vital : sur OVH, Vercel Cron n'existe plus. Oublier une tâche dans la migration
 * ne casse RIEN visiblement — le site répond — mais les données de rétention s'accumulent en
 * silence (ex. `cleanup-cv` non exécuté = CV orphelins jamais purgés = MANQUEMENT CDP). Cette
 * sentinelle rend l'oubli impossible : ajouter/retirer un cron Vercel sans mettre à jour
 * l'ordonnanceur OVH fait échouer la CI.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface CronEntry {
  path: string
  schedule: string
}

function lire<T>(rel: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), rel), 'utf8')) as T
}

const vercel = lire<{ crons?: CronEntry[] }>('vercel.json')
const ovh = lire<{ jobs: CronEntry[] }>('scripts/cron/jobs.json')

const cle = (c: CronEntry) => `${c.path} @ ${c.schedule}`

describe('GUIC-570 — parité ordonnanceur OVH ↔ vercel.json', () => {
  it('vercel.json déclare bien des crons', () => {
    expect(vercel.crons && vercel.crons.length).toBeGreaterThan(0)
  })

  it('couvre EXACTEMENT les mêmes tâches (aucune oubliée, aucune en trop)', () => {
    const attendues = new Set((vercel.crons ?? []).map(cle))
    const declarees = new Set(ovh.jobs.map(cle))

    const oubliees = [...attendues].filter((k) => !declarees.has(k))
    const enTrop = [...declarees].filter((k) => !attendues.has(k))

    // Messages explicites : une tâche oubliée = risque CDP silencieux.
    expect({ oubliees, enTrop }).toEqual({ oubliees: [], enTrop: [] })
  })

  it('chaque tâche OVH a un chemin /api/ et un horaire cron à 5 champs', () => {
    for (const j of ovh.jobs) {
      expect(j.path).toMatch(/^\/api\//)
      expect(j.schedule.trim().split(/\s+/)).toHaveLength(5)
    }
  })
})
