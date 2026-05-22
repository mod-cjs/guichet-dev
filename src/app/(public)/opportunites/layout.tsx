import { getSession } from '@/lib/auth'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'

// GUIC-21 — rend le slot parallèle `@modal` (route interceptée du détail).
// GUIC-20 — `FavorisProvider` : source unique de l'état des favoris, couvrant
// la liste, la page détail et le slide-over intercepté.
export default async function OpportunitesLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  const session = await getSession()
  return (
    <FavorisProvider isAuthenticated={session !== null}>
      {children}
      {modal}
    </FavorisProvider>
  )
}
