// GUIC-21 — rend le slot parallèle `@modal` (route interceptée du détail).
export default function OpportunitesLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
