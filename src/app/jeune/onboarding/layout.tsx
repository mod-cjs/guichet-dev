import Link from 'next/link'

/**
 * Layout dédié /jeune/onboarding — funnel obligatoire.
 *
 * Pas de BottomNav (cf MobileShellGate, exclusion), pas de Header marketing
 * (le user n'a pas finalisé son onboarding, il ne doit pas pouvoir naviguer
 * ailleurs). Juste un mini-topbar avec logo (non cliquable, simple repère
 * visuel) pour ne pas laisser l'utilisateur "perdu" sans aucun chrome.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="sticky top-0 bg-white border-b border-gj-line"
        style={{ zIndex: 'var(--gj-z-nav)', paddingTop: 'var(--safe-top)' }}
      >
        <div className="flex items-center justify-between gap-space-3 px-space-3 h-12">
          <div className="flex items-center gap-[6px] flex-shrink-0">
            <div className="w-8 h-8 bg-gj-teal rounded-[7px] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 13 13" fill="none" aria-hidden>
                <circle cx="6.5" cy="3.5" r="2.1" fill="#F9C400"/>
                <path d="M1.5 12c0-2.8 2.3-4.3 5-4.3s5 1.5 5 4.3" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-fs-300 font-black text-gj-teal-deep leading-none">
              Guichet<b className="text-gj-yellow-ink">Jeunesse</b>
            </span>
          </div>
          <Link
            href="/api/auth/logout"
            className="text-fs-200 text-gj-grey hover:text-gj-red no-underline whitespace-nowrap"
          >
            Se déconnecter
          </Link>
        </div>
      </header>
      <main id="main" className="container-page py-space-5">
        {children}
      </main>
    </>
  )
}
