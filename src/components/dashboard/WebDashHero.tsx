import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

interface Props {
  prenom:               string
  candidaturesEnCours?: number
  oppsRecommandees?:    number
  joursAvantCloture?:   number | null
}

/**
 * WebDashHero — bandeau gradient teal-deep → ink-teal avec salutation,
 * stats clés et CTA Yaye.
 *
 * Référence : design-guichet-v2/web-dashboard.jsx#WebDashHero (L.271-339)
 */
export function WebDashHero({
  prenom,
  candidaturesEnCours = 0,
  oppsRecommandees    = 0,
  joursAvantCloture   = null,
}: Props) {
  return (
    <section
      className="relative overflow-hidden rounded-gj-lg p-space-4 md:p-space-6
        bg-gradient-to-br from-gj-teal-deep to-gj-ink-teal text-white
        grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-space-5 items-center"
    >
      <span
        aria-hidden
        className="absolute -right-12 -top-12 w-72 h-72 rounded-full
          bg-gj-yellow/20 blur-3xl pointer-events-none"
      />
      <div className="relative min-w-0">
        <h1 className="text-fs-500 md:text-fs-700 font-black leading-tight mb-space-2 break-words">
          Bonjour <span className="text-gj-yellow">{prenom || 'à toi'}</span>
        </h1>
        <p className="text-fs-200 md:text-fs-300 opacity-95 leading-relaxed max-w-xl">
          {candidaturesEnCours > 0 ? (
            <>
              Tu as{' '}
              <b className="text-gj-yellow">
                {candidaturesEnCours} candidature{candidaturesEnCours > 1 ? 's' : ''} en cours
              </b>{' '}
              et{' '}
              <b className="text-gj-yellow">{oppsRecommandees} opportunités</b>{' '}
              à 80%+ ton profil cette semaine.
              {joursAvantCloture !== null && joursAvantCloture <= 7 && (
                <>
                  {' '}Une offre ferme dans{' '}
                  <b className="text-gj-yellow">
                    {joursAvantCloture} jour{joursAvantCloture > 1 ? 's' : ''}
                  </b>
                  {' '}— on s&apos;y met&nbsp;?
                </>
              )}
            </>
          ) : (
            <>
              Découvre les <b className="text-gj-yellow">opportunités</b> qui correspondent
              à ton profil et avance avec Yaye.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-space-3 mt-space-4">
          <Link
            href="/opportunites"
            className="inline-flex items-center gap-space-2 px-space-4 py-space-3
              rounded-gj-md bg-gj-yellow text-gj-ink-teal font-black text-fs-300
              hover:bg-gj-yellow-deep transition-colors"
          >
            Explorer les opportunités <Icon name="arrow-right" size={14} />
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-space-2 px-space-4 py-space-3
              rounded-gj-md bg-white/10 text-white border border-white/25
              font-black text-fs-300 hover:bg-white/20 transition-colors"
          >
            <Icon name="chat" size={14} /> Yaye, dis-moi comment continuer
          </button>
        </div>
      </div>
    </section>
  )
}
