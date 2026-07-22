import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { listMesTemplates } from './actions'
import { ModelesEmailsClient } from './ModelesEmailsClient'

export const metadata: Metadata = { title: 'Modèles d’emails — Recruteur' }
export const dynamic = 'force-dynamic'

export default async function ModelesEmailsPage() {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) redirect('/')

  const templates = await listMesTemplates()

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-black text-gj-ink">Modèles d’emails</h1>
        <p className="mt-1 text-[13px] text-gj-grey">
          Les emails envoyés à vos candidats depuis le pipeline. Personnalisez le sujet et le
          corps — votre version remplace le modèle de base, et « Réinitialiser » y revient.
          Envoi : sélectionnez des candidatures dans le kanban puis « Email ».
        </p>
      </header>
      <ModelesEmailsClient initial={templates} />
    </div>
  )
}
