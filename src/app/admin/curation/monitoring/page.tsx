import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { statsParSource, resumeCuration } from '@/lib/curation/monitoring/stats'
import { MonitoringVue } from './MonitoringVue'

export const metadata: Metadata = { title: 'Monitoring de la curation — Admin CJS' }

/** GUIC-602 — US-7 : vue synthétique de l'activité de veille + alertes par source. */
export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const [stats, resume] = await Promise.all([statsParSource(), resumeCuration()])

  return (
    <MonitoringVue
      resume={resume}
      lignes={stats.map((s) => ({
        sourceId: s.sourceId,
        nom: s.nom,
        actif: s.actif,
        nbRapportees: s.nbRapportees,
        tauxApprobation: s.tauxApprobation,
        tauxRejet: s.tauxRejet,
        nbErreursRecentes: s.nbErreursRecentes,
        derniereVerif: s.derniereVerif ? s.derniereVerif.toLocaleDateString('fr-FR') : 'Jamais',
        alerte: s.alerte,
      }))}
    />
  )
}
