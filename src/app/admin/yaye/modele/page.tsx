import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getLlmConfig } from '@/lib/ia/llm-config'
import { isLocalProvider, localModel } from '@/lib/ia/llm-client'
import { SUPPORTED_MODELS } from '@/lib/ia/supported-models'
import { ModeleForm } from './ModeleForm'

// GUIC-537 — Panel admin : choix du modèle LLM (Vertex) par usage. RBAC admin.
// Le contenu réel (validation, persistance) est côté API /api/admin/ia/config.

export const metadata: Metadata = { title: 'Modèle IA (Yaye) — Admin CJS' }

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const config = await getLlmConfig()
  const local = isLocalProvider()

  return (
    <div className="flex flex-col gap-space-4 max-w-[720px]">
      <header className="flex flex-col gap-space-1">
        <h1 className="text-fs-600 font-bold text-color-text-primary">Modèle IA</h1>
        <p className="text-fs-300 text-color-text-secondary">
          Fournisseur : <strong>Vertex AI (GCP)</strong>. Choisis le modèle utilisé par chaque usage.
          La modification est prise en compte sans redéploiement.
        </p>
      </header>
      {local && (
        <div className="rounded-gj-md border-[1.5px] border-gj-yellow bg-[var(--focus-ring-soft)] p-space-3 text-fs-200 text-color-text-primary">
          <strong>Mode dev local (LMStudio) actif.</strong> Yaye utilise le modèle local
          « {localModel()} » — les choix ci-dessous (Vertex) sont ignorés tant que
          <code> LLM_PROVIDER=lmstudio</code>.
        </div>
      )}
      <ModeleForm initialConfig={config} models={SUPPORTED_MODELS} />
    </div>
  )
}
