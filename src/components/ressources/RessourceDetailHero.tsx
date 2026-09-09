import { Badge, Icon, RichContent, type IconName } from '@/components/ui'
import { formaterPoids } from '@/lib/ressources/poids-fichier'
import type { RessourceDetail, TypeRessourceValue } from '@/lib/loaders/ressources'

interface RessourceDetailHeroProps {
  detail: RessourceDetail
}

/**
 * Couleur par type de ressource.
 *
 * GUIC-691 — le PDF était rouge. En v5 le rouge ne signale QUE l'urgence
 * d'échéance : l'attribuer à un format de fichier vide le signal de son sens,
 * un jeune finit par ne plus distinguer « ça ferme dans 2 jours » de « c'est un
 * PDF ». Le PDF passe donc sur le bleu indigo, et la vidéo sur le cyan, les deux
 * couleurs de contenu de la palette v5.
 *
 * Exporté pour que la sentinelle de conformité puisse le vérifier.
 */
export const TYPE_META_RESSOURCE: Record<
  TypeRessourceValue,
  { icon: IconName; bg: string; text: string; badge: 'blue' | 'cyan' | 'teal' | 'yellow' | 'green' }
> = {
  PDF:   { icon: 'document', bg: 'bg-gj-blue-soft',   text: 'text-gj-blue-ink',   badge: 'blue'   },
  Video: { icon: 'play',     bg: 'bg-gj-cyan-soft',   text: 'text-gj-cyan-ink',   badge: 'cyan'   },
  Lien:  { icon: 'external', bg: 'bg-gj-teal-soft',   text: 'text-gj-teal-deep',  badge: 'teal'   },
  Guide: { icon: 'document', bg: 'bg-gj-yellow-soft', text: 'text-gj-yellow-ink', badge: 'yellow' },
  Outil: { icon: 'bolt',     bg: 'bg-gj-green-soft',  text: 'text-gj-green-ink',  badge: 'green'  },
}

const TYPE_META = TYPE_META_RESSOURCE

/**
 * Hero de la page détail ressource — GUIC-363.
 * Server component (pas de state). Rend titre, badges (type/niveau/langue),
 * thème, description longue. Bouton « Consulter » et favoris sont
 * placés dans le client sibling.
 */
export function RessourceDetailHero({ detail }: RessourceDetailHeroProps) {
  const meta = TYPE_META[detail.type]

  const poids = formaterPoids(detail.poidsOctets)
  const mesures = [
    detail.vues > 0 ? `${detail.vues} vue${detail.vues > 1 ? 's' : ''}` : null,
    detail.telechargements > 0
      ? `${detail.telechargements} téléchargement${detail.telechargements > 1 ? 's' : ''}`
      : null,
    poids,
  ].filter((m): m is string => m !== null)

  return (
    <section
      aria-labelledby="ressource-detail-title"
      className="flex flex-col gap-space-4"
      data-testid="ressource-detail-hero"
    >
      <div className="flex items-start gap-space-3">
        <div
          className={`flex-shrink-0 flex items-center justify-center rounded-gj-md ${meta.bg} ${meta.text} w-[72px] h-[72px]`}
          aria-hidden
        >
          <Icon name={meta.icon} size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-space-1 mb-space-2">
            <Badge variant={meta.badge}>{detail.type}</Badge>
            {detail.niveau && <Badge variant="grey">{detail.niveau}</Badge>}
            {detail.langue && detail.langue !== 'Wolof' && (
              <Badge variant="grey">{detail.langue}</Badge>
            )}
          </div>
          <h1
            id="ressource-detail-title"
            className="text-fs-800 font-black text-color-text-primary"
          >
            {detail.titre}
          </h1>
          <p className="text-fs-300 text-color-text-secondary mt-space-1">
            {detail.theme}
            {detail.categorie ? ` · ${detail.categorie}` : ''}
          </p>
          {detail.langue === 'Wolof' && (
            <div
              className="inline-flex items-center gap-space-1 mt-space-2 rounded-gj-md
                bg-gj-teal-soft text-gj-teal-deep text-fs-200 font-bold px-space-3 py-space-1"
            >
              <Icon name="play" size={14} />
              Version audio en Wolof disponible
            </div>
          )}
        </div>
      </div>

      <RichContent html={detail.description} className="text-fs-300" />

      {/* GUIC-709 — n'affiche que ce qui est mesuré. « 0 vue » était rendu tel
          quel : un compteur à zéro n'informe de rien et fait passer une
          ressource neuve pour une ressource délaissée. Même règle pour les
          téléchargements, et le poids ne paraît que s'il a été relevé à la
          source (`null` = non mesuré, jamais « vide »). */}
      {mesures.length > 0 && (
        <div className="text-fs-200 text-color-text-muted">
          {mesures.join(' · ')}
        </div>
      )}
    </section>
  )
}
