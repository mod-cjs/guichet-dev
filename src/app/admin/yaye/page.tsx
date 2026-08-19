import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { computeYayeSante } from '@/lib/ia/admin/sante'
import { canManageYaye } from '@/lib/ia/admin/rbac'
import { SanteClient } from './SanteClient'

// Hub admin « Santé de Yaye » (Phase 4, GUIC-435) — landing de l'espace Yaye : une photo
// unique des signaux qui vivaient sur des écrans séparés (qualité/YQS, escalades & SLA,
// couverture d'éval, dérive de calibration, intentions en échec) + alertes opérationnelles.

export const metadata: Metadata = { title: 'Santé de Yaye — Admin CJS' }

export default async function Page() {
  const session = await getSession()
  if (!session || !canManageYaye(session.roles)) redirect('/auth/connexion')

  const sante = await computeYayeSante()

  return <SanteClient sante={sante} />
}
