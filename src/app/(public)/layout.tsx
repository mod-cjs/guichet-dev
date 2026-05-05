import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-space-2 focus:left-space-2
          focus:z-[900] focus:bg-gj-teal focus:text-white focus:px-space-3 focus:py-space-2
          focus:rounded-gj-md focus:text-fs-300 focus:font-bold focus:no-underline"
      >
        Aller au contenu principal
      </a>
      <Header />
      <main id="main" className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
