import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { getLivreDetailCentre, type ExemplaireDetail } from '@/lib/loaders/conseiller-bibliotheque'
import { BookCover } from '@/components/bibliotheque/BookCard'
import { Icon } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/** GUIC-522 — Fiche livre (détail) côté conseiller : métadonnées + exemplaires du centre. */
const TONE: Record<ExemplaireDetail['statutTone'], [string, string]> = {
  green: ['var(--gj-green-soft)', 'var(--gj-green-ink)'],
  yellow: ['var(--gj-yellow-soft)', 'var(--gj-yellow-ink)'],
  blue: ['var(--gj-blue-soft)', 'var(--gj-blue-ink)'],
  grey: ['var(--gj-bg)', 'var(--gj-grey)'],
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-extrabold text-color-text-secondary" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
      <div className="font-bold text-color-text-primary" style={{ fontSize: 13.5, marginTop: 2 }}>{value}</div>
    </div>
  )
}

export default async function LivreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const { id } = await params
  const livre = await getLivreDetailCentre(ctx.centreId, id)
  if (!livre) notFound()

  return (
    <div className="flex flex-col gap-space-5" style={{ maxWidth: 880, margin: '0 auto' }}>
      <Link href="/conseiller/bibliotheque/catalogue" className="inline-flex items-center gap-space-1 no-underline font-extrabold" style={{ color: 'var(--gj-teal-deep)', fontSize: 13 }}>
        <Icon name="chevron-left" size={16} /> Catalogue
      </Link>

      {/* En-tête : couverture + méta */}
      <div className="bg-white rounded-gj-lg p-space-5 flex gap-space-5 flex-wrap" style={{ border: '1.5px solid var(--gj-line)' }}>
        <div className="shrink-0" style={{ width: 140, height: 210 }}>
          <BookCover titre={livre.titre} auteur={livre.auteur} couvertureUrl={livre.couvertureUrl} />
        </div>
        <div className="flex-1" style={{ minWidth: 220 }}>
          <div className="flex items-center gap-space-2 flex-wrap">
            <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 22, lineHeight: 1.2 }}>{livre.titre}</h1>
            <span className="inline-flex font-extrabold" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: livre.disponibles > 0 ? 'var(--gj-green-soft)' : 'var(--gj-bg)', color: livre.disponibles > 0 ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }}>
              {livre.disponibles}/{livre.total} disponible{livre.disponibles > 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-color-text-secondary" style={{ fontSize: 14, marginTop: 4 }}>{livre.auteur}</div>
          <div className="grid gap-space-4 mt-space-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            <Info label="Thème" value={livre.theme} />
            {livre.niveau && <Info label="Niveau" value={livre.niveau} />}
            <Info label="Langue" value={livre.langue} />
            {livre.isbn && <Info label="ISBN" value={livre.isbn} />}
          </div>
          {livre.resume && <p className="text-color-text-secondary" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>{livre.resume}</p>}
        </div>
      </div>

      {/* Exemplaires du centre */}
      <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
        <h2 className="font-black text-color-text-primary" style={{ fontSize: 15, marginBottom: 12 }}>Exemplaires à {ctx.centreNom}</h2>
        <div className="flex flex-col">
          {livre.exemplaires.map((e) => (
            <div key={e.id} className="flex items-center gap-space-3 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
              <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 38, height: 38, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
                <Icon name="learning" size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13 }}>{e.codeBarre}</div>
                <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5 }}>
                  {e.emplacement}{e.emprunteur ? ` · ${e.emprunteur}` : ''}
                </div>
              </div>
              <span className="inline-flex font-extrabold shrink-0" style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 999, background: TONE[e.statutTone][0], color: TONE[e.statutTone][1] }}>{e.statutLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
