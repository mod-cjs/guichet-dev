import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getFlags } from '@/lib/flags'
import { getFlagHits } from '@/lib/flags/metrics'
import { canManageFlags, canViewFlags } from '@/lib/flags/rbac'
import { FEATURE_FLAGS } from '@/lib/flags/catalog'
import { FonctionnalitesForm } from './FonctionnalitesForm'

// GUIC-706 — Pilotage du lancement séquentiel. Lecture ouverte à l'administration,
// écriture à l'administration nationale seule. La validation métier vit dans `setFlag` ;
// cette page n'est qu'une vue.

export const metadata: Metadata = { title: 'Fonctionnalités — Admin CJS' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  if (!session || !canViewFlags(session.roles)) redirect('/auth/connexion')

  const flags = await getFlags()
  const hits = await getFlagHits(FEATURE_FLAGS.map((f) => f.key))

  return (
    <div className="flex flex-col gap-space-4 max-w-[980px]">
      <header className="flex flex-col gap-space-1">
        <h1 className="text-fs-600 font-bold text-color-text-primary">Fonctionnalités</h1>
        <p className="text-fs-300 text-color-text-secondary">
          Ouvrez la plateforme progressivement, module par module. Une fonctionnalité masquée
          devient invisible pour les publics concernés — <strong>vous gardez l’accès complet
          à tout ce qui est masqué</strong>, afin de préparer le contenu avant l’ouverture.
          Une bascule prend effet en quelques secondes, sans redéploiement.
        </p>
      </header>
      <FonctionnalitesForm
        catalogue={FEATURE_FLAGS}
        initialFlags={flags}
        hits={hits}
        canManage={canManageFlags(session.roles)}
      />
    </div>
  )
}
