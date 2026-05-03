import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-cjs-vert">404</h1>
      <p className="text-cjs-gris">Cette page n&apos;existe pas.</p>
      <Link href="/" className="text-cjs-vert underline">
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}
