import Link from 'next/link'
import { Card, EmptyState, Icon, Input, type IconName } from '@/components/ui'
import { ResourceCard } from './ResourceCard'
import type { RessourceCategorieCount, RessourceListItem } from '@/lib/loaders/ressources'

export interface MediathequeHomeProps {
  categories: RessourceCategorieCount[]
  recentes: RessourceListItem[]
  populaires: RessourceListItem[]
}

/** Icône du sprite associée à un thème (`Ressource.theme`, texte libre). */
const THEME_ICONS: Record<string, IconName> = {
  'emploi': 'employment',
  'entrepreneuriat': 'project',
  'formation': 'learning',
  'soft skills': 'users',
  'financements': 'funding',
}

/** Fallback générique si le thème ne fait pas partie des libellés connus. */
const DEFAULT_THEME_ICON: IconName = 'resources'

function themeIcon(theme: string): IconName {
  return THEME_ICONS[theme.trim().toLowerCase()] ?? DEFAULT_THEME_ICON
}

/** Tons flat (fond clair + texte lisible) cyclés par index — pas de dégradé. */
const CATEGORY_TONES = [
  'bg-gj-teal-soft text-gj-teal-deep',
  'bg-gj-yellow-soft text-gj-yellow-ink',
  'bg-gj-blue-soft text-gj-blue-ink',
  'bg-gj-green-soft text-gj-green-ink',
  'bg-gj-cyan-soft text-gj-cyan-ink',
]

/**
 * Écran d'accueil « médiathèque » de `/ressources` (GUIC-689 Lot F2).
 *
 * Référence : `design-guichet-v5/resources-web.jsx#ResHomeContent` (L63-125).
 * Écarts assumés vis-à-vis de la maquette (données réelles, cf. rapport) :
 *  - « Explorer par catégorie » dérive de `theme` (pas `categorie`, vide en
 *    base à 100 %).
 *  - Pas d'étagère « Mises en avant » (aucun champ `featured`/`misEnAvant`
 *    en base) : remplacée par « Ajoutées récemment » (`createdAt` desc).
 *  - « Les plus téléchargés » → « Les plus consultées » (`vues`, il n'existe
 *    aucun compteur de téléchargements).
 */
export function MediathequeHome({ categories, recentes, populaires }: MediathequeHomeProps) {
  const isEmpty = categories.length === 0 && recentes.length === 0 && populaires.length === 0

  // Seules les ressources RÉELLEMENT consultées peuvent être classées.
  const classees = populaires.filter((r) => (r.vues ?? 0) > 0)

  return (
    <div className="flex flex-col gap-space-6">
      {/* Hero + recherche — formulaire GET natif, aucun JS requis. */}
      <section
        className="relative overflow-hidden rounded-gj-lg p-space-5 md:p-space-6
          bg-gradient-to-br from-gj-teal-deep to-gj-ink-teal text-white"
        aria-labelledby="mediatheque-home-title"
      >
        <span
          aria-hidden
          className="absolute -right-12 -top-12 w-72 h-72 rounded-full
            bg-gj-yellow/20 blur-3xl pointer-events-none"
        />
        <div className="relative max-w-[620px] flex flex-col gap-space-3">
          <h1 id="mediatheque-home-title" className="text-fs-800 font-black leading-tight">
            Médiathèque du Guichet Jeunesse
          </h1>
          <p className="text-fs-300 opacity-95 leading-relaxed">
            Guides, modèles et boîtes à outils gratuits pour préparer ta candidature, créer ton
            entreprise et avancer dans tes démarches.
          </p>
          <form method="GET" action="/ressources" className="max-w-[480px]">
            <label htmlFor="mediatheque-home-q" className="sr-only">
              Rechercher un guide, un modèle…
            </label>
            <Input
              id="mediatheque-home-q"
              name="q"
              type="search"
              prefixIcon="search"
              placeholder="Rechercher un guide, un modèle…"
            />
            <button type="submit" className="sr-only">
              Rechercher
            </button>
          </form>
          {/* GUIC-689 — l'accès à la liste complète vivait DANS l'étagère des plus
              consultées, puis dans celle des catégories : deux sections
              conditionnelles. Masquer l'une supprimait le seul chemin vers la
              liste. Il appartient au hero, qui est toujours rendu. */}
          <Link
            href="/ressources?vue=liste"
            className="text-fs-200 font-black text-white underline underline-offset-4 w-fit"
          >
            Toutes les ressources →
          </Link>
        </div>
      </section>

      {isEmpty ? (
        <EmptyState
          icon="document"
          title="Aucune ressource publiée pour le moment"
          description="Revenez bientôt : la médiathèque est mise à jour régulièrement."
        />
      ) : (
        <>
          {categories.length > 0 && (
            <section aria-labelledby="mediatheque-categories-title">
              {/* GUIC-689 — l'accès à la liste complète vivait DANS l'étagère des
                  plus consultées. En masquant celle-ci faute de consultations, on
                  supprimait le seul lien vers la liste. Il appartient à la page. */}
              <div className="flex items-baseline justify-between mb-space-3">
                <h2
                  id="mediatheque-categories-title"
                  className="text-fs-500 font-black text-color-text-primary"
                >
                  Explorer par catégorie
                </h2>
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-3 list-none p-0 m-0">
                {categories.map((c, i) => (
                  <li key={c.theme}>
                    <Card variant="opportunite" className="relative flex flex-col gap-space-2">
                      <Link
                        href={`/ressources?theme=${encodeURIComponent(c.theme)}`}
                        aria-label={`Explorer la catégorie ${c.theme} (${c.count} ressource${c.count > 1 ? 's' : ''})`}
                        className="absolute inset-0 rounded-gj-lg"
                      />
                      <span
                        aria-hidden
                        className={`inline-flex items-center justify-center w-[44px] h-[44px] rounded-gj-md ${CATEGORY_TONES[i % CATEGORY_TONES.length]}`}
                      >
                        <Icon name={themeIcon(c.theme)} size={22} />
                      </span>
                      <span className="text-fs-300 font-black text-color-text-primary leading-tight">
                        {c.theme}
                      </span>
                      <span className="text-fs-200 font-bold text-color-text-muted">
                        {c.count} ressource{c.count > 1 ? 's' : ''}
                      </span>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recentes.length > 0 && (
            <section aria-labelledby="mediatheque-recentes-title">
              <div className="flex items-baseline justify-between mb-space-3">
                <h2
                  id="mediatheque-recentes-title"
                  className="text-fs-500 font-black text-color-text-primary"
                >
                  Ajoutées récemment
                </h2>
                <Link
                  href="/ressources?date=recent"
                  className="text-fs-200 font-black text-gj-teal-deep"
                >
                  Tout voir →
                </Link>
              </div>
              <ul className="flex gap-space-3 overflow-x-auto pb-space-2 list-none p-0 m-0">
                {recentes.map((r) => (
                  <li key={r.id} className="shrink-0 w-[280px]">
                    <ResourceCard item={r} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* GUIC-689 — un palmarès ne s'affiche QUE s'il repose sur des
              consultations réelles. Avec 19 ressources sur 20 à zéro vue, le tri
              `vues desc, createdAt desc` retombait sur la date : les deux
              étagères montraient la même chose, et les pastilles 1-5 donnaient à
              cet ordre l'autorité d'un classement. Sans mesure, on ne classe pas. */}
          {classees.length > 0 && (
            <section aria-labelledby="mediatheque-populaires-title">
              <div className="flex items-baseline justify-between mb-space-3">
                <h2
                  id="mediatheque-populaires-title"
                  className="text-fs-500 font-black text-color-text-primary"
                >
                  Les plus consultées
                </h2>
              </div>
              <ul className="flex gap-space-3 overflow-x-auto pb-space-2 list-none p-0 m-0">
                {classees.map((r, i) => (
                  <li key={r.id} className="relative shrink-0 w-[280px]">
                    <ResourceCard item={r} />
                    <span
                      aria-hidden
                      className="absolute -top-2 -left-2 z-[1] inline-flex items-center justify-center
                        w-[24px] h-[24px] rounded-full bg-gj-yellow text-gj-ink
                        text-fs-200 font-black shadow-gj-md"
                    >
                      {i + 1}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
