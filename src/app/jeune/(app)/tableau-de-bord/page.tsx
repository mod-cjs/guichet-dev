import { getSession } from '@/lib/auth'

export const metadata = { title: 'Tableau de bord — Guichet Jeunesse' }

export default async function TableauDeBordPage() {
  const session = await getSession()

  return (
    <section className="flex flex-col gap-space-5">
      <div>
        <h1 className="text-fs-600 font-bold text-color-text-primary">
          Bonjour, {session?.prenom} 👋
        </h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Bienvenue sur votre espace jeune.
        </p>
      </div>
    </section>
  )
}
