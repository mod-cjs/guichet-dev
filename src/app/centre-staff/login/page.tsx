/**
 * GUIC-387 — Login MVP staff centre.
 *
 * Page publique (pas d'auth). Liste les centres pour sélection.
 */

import { prisma } from '@/lib/prisma'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function StaffLoginPage() {
  const centres = await prisma.centre.findMany({
    where:   { estActif: true },
    select:  { id: true, nom: true, ville: true },
    orderBy: { nom: 'asc' },
    take:    200,
  })

  return (
    <main className="min-h-screen bg-color-surface-base flex flex-col items-center justify-center p-space-5">
      <div className="w-full max-w-md rounded-gj-lg bg-white p-space-5 shadow-gj-md">
        <h1 className="text-fs-600 font-bold text-color-text-primary mb-space-2">
          Connexion staff centre
        </h1>
        <p className="text-fs-300 text-color-text-secondary mb-space-4">
          Identifiants conseiller (MVP : whitelist email).
        </p>
        <LoginForm centres={centres.map((c) => ({ id: c.id, label: c.ville ? `${c.nom} — ${c.ville}` : c.nom }))} />
      </div>
    </main>
  )
}
