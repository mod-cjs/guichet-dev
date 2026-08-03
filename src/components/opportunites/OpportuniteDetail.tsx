'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Button, Icon, RichContent, Toast } from '@/components/ui'
import type { ViewerInfo } from './CandidatureModal'
import { useFavoris } from './FavorisProvider'
import { YayeMatchCard, type YayeMatch } from './YayeMatchCard'
import { ProgrammeBadges } from './ProgrammeBadges'
import { TYPE_CAT, type CatFamily } from './opportunite-type-meta'
import type { OpportuniteDetail as Detail } from '@/types/candidature'
import type { CandidatureListItem } from '@/types/candidature'
import {
  DEADLINE_VISIBLE_DAYS,
  MS_PER_DAY,
  URGENT_DAYS_THRESHOLD,
} from '@/lib/constants/candidature'
import { loginUrl, opportuniteSlugUrl } from '@/lib/routes'
import { regionLabel } from '@/lib/regions'
import { appDomain } from '@/lib/app-url'

// Lazy-load le formulaire de candidature : il n'est jamais nécessaire au premier
// rendu (anonyme ou avant clic CTA). Bénéfice mesuré attendu : ~25 KB gzip
// économisés sur le bundle de la page slug pour les visiteurs anonymes.
const CandidatureModal = dynamic(
  () => import('./CandidatureModal').then((m) => m.CandidatureModal),
  { ssr: false },
)

interface OpportuniteDetailProps {
  detail: Detail
  viewer: ViewerInfo | null
  /**
   * Score de correspondance Yaye réel pour ce couple (viewer, opportunité),
   * lu côté serveur (`getRecommandationScore`) et descendu en prop — jamais
   * calculé ni fetché depuis ce composant client (GUIC-689 P2). `null`/`undefined`
   * = aucun score en cache pour ce couple → `YayeMatchCard` ne s'affiche pas.
   */
  matchScore?: YayeMatch | null
  /** Si le détail est rendu dans un slide-over, affiche un bouton « Fermer » dans le hero. */
  onClose?: () => void
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
// F1.2 (GUIC-689) — nombre de vues en français (espace fine insécable comme
// séparateur de milliers), cf. `formatHomeStat` (src/lib/loaders/home-stats.shared.ts).
const VUES_FMT = new Intl.NumberFormat('fr-FR')

// GUIC-689 (F-6) — acronymes courants des enums métier : ils doivent rester en
// majuscules (jamais "cdd"/"pdf" en toutes lettres minuscules).
const ACRONYMES_CONNUS = new Set(['CDD', 'CDI', 'PDF', 'CV', 'ONG'])

/**
 * Formate un enum brut (`SNAKE_CASE`, `PascalCase` ou toute casse Prisma) en
 * libellé lisible : chaque mot est capitalisé (première lettre en majuscule,
 * reste en minuscules), sauf les acronymes connus qui restent en MAJUSCULES.
 *
 * ⚠️ Ne PAS utiliser pour une région : `detail.region` passe par `regionLabel()`
 * (accents + tiret — « Saint_Louis » → « Saint-Louis », « Thies » → « Thiès »),
 * que ce formatage générique ne sait pas reproduire.
 */
const humanize = (v: string) =>
  v
    .split('_')
    .filter(Boolean)
    .map((word) =>
      ACRONYMES_CONNUS.has(word.toUpperCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ')

/**
 * Normalise un libellé pour une comparaison insensible à la casse/accents
 * (P1 GUIC-689 — check-list des prérequis : croise `skills` de l'offre et
 * `viewer.competences`, saisies librement, sans supposer une casse commune).
 */
const normalizeLabel = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

// ─── Formatage des champs de sous-type (GUIC-689 — grille "Détails de l'offre") ───

/** Montant en FCFA avec séparateurs de milliers `Intl.NumberFormat('fr-FR')`. */
const MONTANT_FMT = new Intl.NumberFormat('fr-FR')
const fcfa = (n: number) => `${MONTANT_FMT.format(n)} FCFA`

/** Pourcentage fr-FR (virgule décimale) — ex. taux annuel d'un financement. */
const PCT_FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const pctLabel = (n: number) => `${PCT_FMT.format(n)} %`

// "mois" est invariable en français (1 mois / 12 mois) : pas de pluriel à gérer.
const moisLabel = (n: number) => `${n} mois`
const heuresLabel = (n: number) => `${n} heure${n > 1 ? 's' : ''}`
const placesLabel = (n: number) => `${n} place${n > 1 ? 's' : ''}`

/**
 * Convertit une valeur potentiellement `Decimal` (Prisma) en `number`. Un champ
 * `Decimal` (ex. `OpportuniteFinancement.tauxAnnuel`) traverse la frontière
 * RSC → client déjà sérialisé (le `toJSON()` de Decimal.js renvoie `toString()`) :
 * le type statique reste `Decimal`, mais la valeur réelle reçue ici est une
 * string ou un number selon le chemin de sérialisation — jamais l'instance.
 */
function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v)
  const maybe = v as { toNumber?: () => number; toString?: () => string }
  if (typeof maybe.toNumber === 'function') return maybe.toNumber()
  if (typeof maybe.toString === 'function') return Number(maybe.toString())
  return null
}

/**
 * Nombre de jours restants avant la deadline (peut être négatif si dépassée).
 * Constantes partagées : `MS_PER_DAY`, `DEADLINE_VISIBLE_DAYS` / `URGENT_DAYS_THRESHOLD`
 * pour les bornes d'affichage. Source : `src/lib/constants/candidature.ts`.
 */
function joursAvantDeadline(deadlineIso: string | null): number | null {
  if (!deadlineIso) return null
  const diff = new Date(deadlineIso).getTime() - Date.now()
  return Math.ceil(diff / MS_PER_DAY)
}

interface HeroBadgeProps {
  typeLabel: string
  catFamily: CatFamily
  deadlineIso: string | null
  expired: boolean
}

/** Fond plein + texte blanc par famille catégorie (contraste AA sur hero sombre). */
const CAT_HERO_CLASSES: Record<CatFamily, string> = {
  'cat-emploi':      'bg-cat-emploi',
  'cat-stage':       'bg-cat-stage',
  'cat-formation':   'bg-cat-formation',
  'cat-financement': 'bg-cat-financement',
  'cat-evenement':   'bg-cat-evenement',
  'cat-volontariat': 'bg-cat-volontariat',
  'cat-neutre':      'bg-cat-neutre',
}

/**
 * GUIC-689 — deux pastilles distinctes (catégorie + urgence), plus de badge
 * fusionné « TYPE · CLÔTURE J-X » (« Reponse au retour design V3 » §2). Le
 * rouge n'est jamais utilisé pour la catégorie : il ne signale que l'urgence
 * de la deadline (≤ URGENT_DAYS_THRESHOLD jours) ou l'expiration.
 */
function HeroBadge({ typeLabel, catFamily, deadlineIso, expired }: HeroBadgeProps) {
  const jours = joursAvantDeadline(deadlineIso)
  const urgent = expired || (jours !== null && jours <= URGENT_DAYS_THRESHOLD)

  let deadlineLabel: string | null = null
  if (expired) deadlineLabel = 'CLÔTURÉE'
  else if (jours !== null && jours <= 0) deadlineLabel = 'CLÔTURE AUJOURD’HUI'
  else if (jours !== null && jours <= URGENT_DAYS_THRESHOLD) deadlineLabel = `CLÔTURE J-${jours}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        data-testid="hero-badge-categorie"
        className={`inline-flex items-center gap-2 text-fs-100 font-extrabold uppercase
          tracking-wide text-white px-space-2 py-1 rounded-full
          ${CAT_HERO_CLASSES[catFamily]}`}
      >
        <span className="w-[6px] h-[6px] rounded-full bg-white" aria-hidden />
        <span>{typeLabel}</span>
      </span>
      {urgent && deadlineLabel && (
        <span
          data-testid="hero-badge-urgence"
          className="inline-flex items-center text-fs-100 font-extrabold uppercase
            tracking-wide text-white bg-gj-red px-space-2 py-1 rounded-full"
        >
          {deadlineLabel}
        </span>
      )}
    </div>
  )
}

/** Bouton ghost rond du hero (close / share / bookmark). */
function HeroGhostButton({
  iconName,
  label,
  filled,
  onClick,
  ariaPressed,
}: {
  iconName: 'close' | 'share' | 'bookmark' | 'heart'
  label: string
  filled?: boolean
  onClick: () => void
  ariaPressed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={ariaPressed}
      className={`w-9 h-9 rounded-full inline-flex items-center justify-center
        border-[1.5px] border-white/30 text-white cursor-pointer
        ${filled ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icon name={iconName} size={16} aria-hidden />
    </button>
  )
}

/** Cellule de la grille de détails 2 colonnes (kvCard, design v5 — lot3-opps-web.jsx). */
function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gj-bg border-[1.5px] border-gj-line rounded-gj-md px-space-3 py-space-2">
      <p className="text-fs-100 uppercase font-extrabold text-color-text-secondary tracking-[0.4px]">
        {label}
      </p>
      <p className="text-fs-300 font-bold text-color-text-primary mt-[2px]">{value}</p>
    </div>
  )
}

/** Contenu du détail d'une opportunité — partagé entre la page SSR et le slide-over. */
export function OpportuniteDetail({ detail, viewer, matchScore, onClose }: OpportuniteDetailProps) {
  const searchParams = useSearchParams()
  const expired = detail.deadline !== null && new Date(detail.deadline) < new Date()
  const { has: isFavoriOf, toggle: toggleFavoriId } = useFavoris()
  const isFavori = isFavoriOf(detail.id)

  const [modalOpen, setModalOpen] = useState(false)
  const [dejaCandidate, setDejaCandidate] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // État par-utilisateur : a-t-il déjà candidaté ?
  useEffect(() => {
    if (!viewer) return
    fetch('/api/candidatures')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b?.data?.some((c: CandidatureListItem) => c.opportuniteSlug === detail.slug)) {
          setDejaCandidate(true)
        }
      })
      .catch(() => {})
  }, [viewer, detail.slug])

  // Ré-ouverture du formulaire après connexion (?postuler=1).
  useEffect(() => {
    if (viewer && !expired && !dejaCandidate && searchParams.get('postuler') === '1') {
      setModalOpen(true)
    }
  }, [viewer, expired, dejaCandidate, searchParams])

  const toggleFavori = useCallback(() => {
    toggleFavoriId(detail.id)
  }, [toggleFavoriId, detail.id])

  const share = useCallback(() => {
    const url = `${window.location.origin}${opportuniteSlugUrl(detail.slug)}`
    if (navigator.share) {
      navigator.share({ title: detail.titre, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(url).then(
        () => setToast({ message: 'Lien copié', type: 'success' }),
        () => {},
      )
    }
  }, [detail.slug, detail.titre])

  // Chips meta inline du hero (région / rémunération / délai indicatif / domaine / vues).
  const heroChips = useMemo(() => {
    const chips: { icon: 'pin' | 'funding' | 'clock' | 'target' | 'eye'; label: string }[] = []
    if (detail.region) chips.push({ icon: 'pin', label: regionLabel(detail.region) ?? detail.region })
    if (detail.remuneration) chips.push({ icon: 'funding', label: detail.remuneration })
    const jours = joursAvantDeadline(detail.deadline)
    if (jours !== null && jours > 0 && jours <= DEADLINE_VISIBLE_DAYS) {
      chips.push({ icon: 'clock', label: `Décision ${jours}j` })
    }
    // GUIC-689 (B.6) — puce domaine (maquette lot3-opps-web.jsx L.459), 4ᵉ position :
    // `detail.domaine` n'est jamais null, donc toujours affichée (contrairement aux
    // puces ci-dessus, optionnelles selon les données de l'offre).
    chips.push({ icon: 'target', label: humanize(detail.domaine) })
    // F1.2 (GUIC-689) — compteur de vues, jamais affiché jusqu'ici bien que
    // suivi côté serveur (lot3-opps-web.jsx:420-428). Aligné sur la
    // présentation de RessourceDetailHero (singulier/pluriel).
    // P3-B (GUIC-689) — en contexte slide-over (`onClose` fourni), le compteur
    // migre dans le bandeau URL dédié (cf. `<DetailUrlBanner>` ci-dessous) :
    // on ne le duplique jamais. En plein écran, il reste ici (pas de bandeau).
    if (!onClose && typeof detail.vues === 'number') {
      chips.push({
        icon: 'eye',
        label: `${VUES_FMT.format(detail.vues)} vue${detail.vues > 1 ? 's' : ''}`,
      })
    }
    return chips
  }, [detail.region, detail.remuneration, detail.deadline, detail.domaine, detail.vues, onClose])

  // Grille détails 2 colonnes — racine + sous-type discriminé (GUIC-689 : les 10 sous-types).
  const cells = useMemo(() => {
    const out: { label: string; value: string }[] = [
      { label: 'Type', value: humanize(detail.type) },
      { label: 'Domaine', value: humanize(detail.domaine) },
    ]

    // Niveau d'étude minimum : priorité au champ du sous-type quand il en a un
    // (emploi/stage/bourse ont chacun le leur), repli sur le champ racine
    // générique pour les 7 autres sous-types + les rows legacy sans sous-type.
    // Jamais les deux à la fois (pas de doublon de cellule).
    const niveauSousType =
      detail.details?.type === 'emploi' ? detail.details.payload.niveauEtudeMin
      : detail.details?.type === 'stage' ? detail.details.payload.niveauEtudeMin
      : detail.details?.type === 'bourse' ? detail.details.payload.niveauEtudeRequis
      : null
    const niveauEffectif = niveauSousType ?? detail.niveauEtudeMin
    if (niveauEffectif) {
      out.push({ label: "Niveau d'étude minimum", value: humanize(niveauEffectif) })
    }

    if (detail.region) out.push({ label: 'Région', value: regionLabel(detail.region) ?? detail.region })
    if (detail.remuneration) out.push({ label: 'Rémunération', value: detail.remuneration })
    out.push({
      label: 'Échéance',
      value: detail.deadline ? dateFmt.format(new Date(detail.deadline)) : 'Sans échéance',
    })

    // Sous-type : champs porteurs de décision (GUIC-689 §A). Chaque champ optionnel
    // n'est poussé que s'il est renseigné — jamais de cellule vide/« null ».
    if (detail.details?.type === 'emploi') {
      const p = detail.details.payload
      out.push({ label: 'Type de contrat', value: humanize(p.typeContrat) })
      if (p.teletravail) out.push({ label: 'Modalité', value: 'Télétravail possible' })
      if (p.experienceRequise) out.push({ label: 'Expérience requise', value: p.experienceRequise })
    }

    if (detail.details?.type === 'stage') {
      const p = detail.details.payload
      out.push({ label: 'Durée', value: moisLabel(p.dureeMois) })
      if (p.dateDebutPrevue) {
        out.push({ label: 'Début prévu', value: dateFmt.format(new Date(p.dateDebutPrevue)) })
      }
      // `indemnise` est un booléen porteur de sens dans les deux états : un jeune
      // veut savoir si un stage est rémunéré même quand la réponse est non.
      out.push({
        label: 'Indemnisation',
        value: p.indemnise
          ? p.indemniteMensuelleFcfa != null
            ? `${fcfa(p.indemniteMensuelleFcfa)} / mois`
            : 'Stage indemnisé'
          : 'Stage non indemnisé',
      })
      // `conventionneEcole` : seul le `true` est décisif (l'absence de convention
      // est l'état par défaut, pas une information utile à afficher).
      if (p.conventionneEcole) out.push({ label: 'Convention', value: "Convention d'école requise" })
    }

    if (detail.details?.type === 'formation') {
      const p = detail.details.payload
      out.push({ label: 'Modalité', value: humanize(p.modalite) })
      out.push({ label: 'Durée', value: heuresLabel(p.dureeHeures) })
      // `certifiante` : seul le `true` est décisif (même logique que conventionneEcole).
      if (p.certifiante) {
        out.push({
          label: 'Certification',
          value: p.organismeCertificateur ? `Certifiante — ${p.organismeCertificateur}` : 'Formation certifiante',
        })
      }
      if (p.prerequis) out.push({ label: 'Prérequis', value: p.prerequis })
      // `gratuite` est porteur de sens dans les deux états (ex. brief : « Formation
      // payante » quand `false`, avec le montant s'il est renseigné).
      out.push({
        label: 'Frais',
        value: p.gratuite
          ? 'Formation gratuite'
          : p.fraisInscriptionFcfa != null
            ? `Formation payante — ${fcfa(p.fraisInscriptionFcfa)}`
            : 'Formation payante',
      })
    }

    if (detail.details?.type === 'bourse') {
      const p = detail.details.payload
      out.push({ label: 'Montant', value: fcfa(p.montantTotalFcfa) })
      out.push({ label: 'Organisme financeur', value: p.organismeFinanceur })
      if (p.dureeMois != null) out.push({ label: 'Durée', value: moisLabel(p.dureeMois) })
      if (p.paysDestination) out.push({ label: 'Pays de destination', value: p.paysDestination })
      // `coupleObligatoire` : seul le `true` est décisif (la plupart des bourses
      // n'exigent pas de candidature en couple — état par défaut non informatif).
      if (p.coupleObligatoire) out.push({ label: 'Modalité', value: 'Candidature en couple obligatoire' })
    }

    if (detail.details?.type === 'concours') {
      const p = detail.details.payload
      out.push({ label: 'Organisme organisateur', value: p.organismeOrganisateur })
      if (p.dateEpreuves) out.push({ label: 'Date des épreuves', value: dateFmt.format(new Date(p.dateEpreuves)) })
      if (p.lieuEpreuves) out.push({ label: 'Lieu des épreuves', value: p.lieuEpreuves })
      if (p.placesDisponibles != null) {
        out.push({ label: 'Places disponibles', value: placesLabel(p.placesDisponibles) })
      }
      if (p.preuvesDemandees) out.push({ label: 'Pièces demandées', value: p.preuvesDemandees })
    }

    if (detail.details?.type === 'appel_a_projets') {
      const p = detail.details.payload
      // `dossierRequis` / `criteresEligibilite` sont des textes longs (prose) :
      // hors de la grille compacte clé-valeur, comme `conditions`/`mission` déjà
      // rendus en sections dédiées ailleurs sur ce composant.
      if (p.budgetMaxFcfa != null) out.push({ label: 'Budget max', value: fcfa(p.budgetMaxFcfa) })
      if (p.dureeProjetMois != null) out.push({ label: 'Durée du projet', value: moisLabel(p.dureeProjetMois) })
      if (p.thematique) out.push({ label: 'Thématique', value: p.thematique })
    }

    if (detail.details?.type === 'financement') {
      const p = detail.details.payload
      // `garanties` : texte long (prose), hors grille — même raison que dossierRequis.
      out.push({ label: 'Montant', value: fcfa(p.montantFcfa) })
      out.push({ label: 'Type de financement', value: humanize(p.typeFinancement) })
      out.push({ label: 'Organisme financeur', value: p.organismeFinanceur })
      const taux = toNum(p.tauxAnnuel)
      if (taux != null) out.push({ label: 'Taux annuel', value: pctLabel(taux) })
      if (p.dureeRemboursementMois != null) {
        out.push({ label: 'Durée de remboursement', value: moisLabel(p.dureeRemboursementMois) })
      }
      if (p.isContinuous) {
        out.push({ label: 'Dépôt', value: 'Dépôt en continu (pas de date limite)' })
      } else if (p.dateLimiteDepot) {
        out.push({ label: 'Date limite de dépôt', value: dateFmt.format(new Date(p.dateLimiteDepot)) })
      }
    }

    if (detail.details?.type === 'mentorat') {
      const p = detail.details.payload
      out.push({ label: 'Durée', value: moisLabel(p.dureeMois) })
      out.push({ label: 'Modalité', value: humanize(p.modalite) })
      out.push({ label: 'Organisateur', value: p.organisateurLibelle })
      if (p.thematique) out.push({ label: 'Thématique', value: p.thematique })
      if (p.placesDisponibles != null) {
        out.push({ label: 'Places disponibles', value: placesLabel(p.placesDisponibles) })
      }
    }

    if (detail.details?.type === 'mobilite') {
      const p = detail.details.payload
      // `prisEnCharge` : bien que `db.Text` en base, réponse courte en pratique
      // (« Billet + logement ») et directement décisive pour un jeune → dans la grille.
      out.push({ label: 'Destination', value: p.destination })
      out.push({ label: 'Type de mobilité', value: humanize(p.typeMobilite) })
      out.push({ label: 'Durée', value: moisLabel(p.dureeMois) })
      if (p.niveauLangueRequis) out.push({ label: 'Niveau de langue requis', value: p.niveauLangueRequis })
      if (p.prisEnCharge) out.push({ label: 'Prise en charge', value: p.prisEnCharge })
      if (p.dateDepartPrevue) out.push({ label: 'Départ prévu', value: dateFmt.format(new Date(p.dateDepartPrevue)) })
    }

    if (detail.details?.type === 'volontariat') {
      const p = detail.details.payload
      out.push({ label: 'Durée', value: moisLabel(p.dureeMois) })
      out.push({ label: 'Type de volontariat', value: humanize(p.typeVolontariat) })
      out.push({ label: 'Domaine de la mission', value: p.domaineMission })
      // `indemniteMensuelleFcfa` absente : porteur de sens (un volontariat non
      // indemnisé est une information à ne pas cacher), même logique que stage.
      out.push({
        label: 'Indemnité mensuelle',
        value: p.indemniteMensuelleFcfa != null ? fcfa(p.indemniteMensuelleFcfa) : 'Volontariat non indemnisé',
      })
      if (p.placesDisponibles != null) {
        out.push({ label: 'Places disponibles', value: placesLabel(p.placesDisponibles) })
      }
    }

    return out
  }, [detail])

  const competencesRequises = (detail.skills ?? []).filter((s) => s.requise)
  const tags = detail.tags ?? []

  // P1 (GUIC-689) — check-list des prérequis : croise les compétences requises
  // de l'offre avec `viewer.competences` (déjà chargées pour CandidatureModal),
  // comparaison insensible casse/accents. `null` pour un visiteur anonyme — on
  // ne prétend jamais connaître son profil.
  const viewerCompetencesNorm = useMemo(
    () => (viewer ? new Set((viewer.competences ?? []).map(normalizeLabel)) : null),
    [viewer],
  )

  const ctaDisabled = expired || dejaCandidate
  const ctaLabel = dejaCandidate
    ? 'Déjà candidaté'
    : expired
      ? 'Candidatures closes'
      : (detail.actionLabel ?? 'Postuler maintenant')
  const ctaDisabledReason = dejaCandidate
    ? 'Vous avez déjà candidaté à cette opportunité.'
    : expired
      ? 'Les candidatures pour cette opportunité sont closes.'
      : ''

  return (
    <article className="flex flex-col">
      {/* ─── Bandeau URL + vues (slide-over uniquement) ─────────────────
          P3-B (GUIC-689) — réf. design v5 `WebOppSlideOver` (lot3-opps-web.jsx
          L.412-429) : rappelle l'URL publique de l'offre (repère de confiance)
          au-dessus du hero. La page plein écran a déjà cette URL dans la barre
          d'adresse du navigateur — l'y ajouter serait redondant, donc ce
          bandeau ne se rend QUE quand ce composant est en slide-over
          (signal existant : présence de `onClose`, cf. `DetailSheet`). */}
      {onClose && (
        <div
          data-testid="detail-url-banner"
          className="flex items-center gap-2 bg-gj-ink-teal text-white/70 px-space-3 py-1
            text-fs-100 font-mono rounded-t-gj-md"
        >
          <Icon name="shield" size={12} className="text-gj-yellow shrink-0" aria-hidden />
          <span className="flex-1 min-w-0 truncate">
            <span className="text-white/55">{appDomain()}</span>
            <span className="text-gj-yellow">/opportunites/</span>
            <span className="text-white">{detail.slug}</span>
          </span>
          {typeof detail.vues === 'number' && (
            <span
              data-testid="detail-url-banner-vues"
              className="inline-flex items-center gap-1 text-white/55 shrink-0"
            >
              <Icon name="eye" size={12} aria-hidden />
              <b className="text-white font-bold">{VUES_FMT.format(detail.vues)}</b>{' '}
              vue{detail.vues > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ─── Hero compact ────────────────────────────────────────────── */}
      <header
        className={`text-white px-space-4 pt-space-2 pb-space-4
          ${onClose ? 'rounded-b-gj-md' : 'rounded-gj-md'}`}
        style={{
          background: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal, var(--gj-teal-deep)))',
        }}
      >
        <div className="flex items-center justify-between mb-space-3">
          {onClose ? (
            <HeroGhostButton iconName="close" label="Fermer" onClick={onClose} />
          ) : (
            <span aria-hidden className="w-9 h-9" />
          )}
          <div className="flex gap-space-2">
            <HeroGhostButton iconName="share" label="Partager" onClick={share} />
            <HeroGhostButton
              iconName={isFavori ? 'heart' : 'bookmark'}
              label={isFavori ? 'Retirer des favoris' : 'Sauvegarder'}
              filled={isFavori}
              ariaPressed={isFavori}
              onClick={toggleFavori}
            />
          </div>
        </div>

        <HeroBadge
          typeLabel={humanize(detail.type)}
          catFamily={TYPE_CAT[detail.type] ?? 'cat-neutre'}
          deadlineIso={detail.deadline}
          expired={expired}
        />

        <h1
          className="mt-space-2 font-black text-fs-600 sm:text-fs-700 tracking-[-0.2px]"
          style={{ color: 'var(--gj-surface)' }}
        >
          {detail.titre}
        </h1>
        <p className="text-fs-200 opacity-90 mt-1">
          <b>{detail.organisation}</b>
          {detail.region ? <> · {regionLabel(detail.region) ?? detail.region}</> : null}
        </p>

        {/* GUIC-684 — de quel programme CJS relève cette offre. */}
        <div className="mt-space-2">
          <ProgrammeBadges programmes={detail.programmes ?? []} surFondSombre />
        </div>

        {heroChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-space-3">
            {heroChips.map((c) => (
              <span
                key={c.icon}
                className="inline-flex items-center gap-1 text-fs-100 font-semibold
                  bg-white/15 text-white px-space-2 py-1 rounded-full"
              >
                <Icon name={c.icon} size={12} aria-hidden />
                {c.label}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* ─── Contenu défilant (scroll unique — plus de tabs) ─────────── */}
      <div className="flex flex-col gap-space-4 mt-space-4">
        <YayeMatchCard match={matchScore ?? null} />

        <section aria-labelledby="opp-details-heading">
          <h2
            id="opp-details-heading"
            className="text-fs-100 uppercase font-extrabold text-color-text-secondary tracking-wide mb-space-2"
          >
            Détails de l’offre
          </h2>
          <div className="grid grid-cols-2 gap-space-2">
            {cells.map((c) => (
              <DetailCell key={c.label} label={c.label} value={c.value} />
            ))}
          </div>
        </section>

        <section aria-labelledby="opp-description-heading">
          <h2
            id="opp-description-heading"
            className="text-fs-100 uppercase font-extrabold text-color-text-secondary tracking-wide mb-space-2"
          >
            Description
          </h2>
          <RichContent html={detail.description} className="text-fs-300 leading-[1.6]" />
        </section>

        {/* GUIC-257 — sections structurées optionnelles (null si non remplies en BDD). */}
        {detail.profilRecherche && (
          <section aria-labelledby="opp-profil-recherche-heading">
            <h2
              id="opp-profil-recherche-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-secondary tracking-wide mb-space-2"
            >
              Profil recherché
            </h2>
            <RichContent html={detail.profilRecherche} className="text-fs-300 leading-[1.6]" />
          </section>
        )}
        {detail.mission && (
          <section aria-labelledby="opp-mission-heading">
            <h2
              id="opp-mission-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-secondary tracking-wide mb-space-2"
            >
              Mission
            </h2>
            <RichContent html={detail.mission} className="text-fs-300 leading-[1.6]" />
          </section>
        )}
        {detail.conditions && (
          <section aria-labelledby="opp-conditions-heading">
            <h2
              id="opp-conditions-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-secondary tracking-wide mb-space-2"
            >
              Conditions
            </h2>
            <RichContent html={detail.conditions} className="text-fs-300 leading-[1.6]" />
          </section>
        )}

        {competencesRequises.length > 0 && (
          <section aria-labelledby="opp-skills-heading">
            <h2
              id="opp-skills-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-secondary tracking-wide mb-space-2"
            >
              Compétences requises
            </h2>
            {viewerCompetencesNorm ? (
              <ul className="flex flex-col gap-space-1" data-testid="skills-checklist">
                {competencesRequises.map((s) => {
                  const acquise = viewerCompetencesNorm.has(normalizeLabel(s.libelle))
                  return (
                    <li
                      key={s.slug}
                      data-testid={`skill-check-${s.slug}`}
                      data-acquise={acquise}
                      className={`flex items-center gap-space-2 rounded-gj-md px-space-3 py-space-2
                        text-fs-200 font-bold
                        ${acquise ? 'bg-gj-green-soft text-gj-green-ink' : 'bg-gj-yellow-soft text-gj-yellow-ink'}`}
                    >
                      <span
                        aria-hidden
                        className={`w-5 h-5 rounded-full inline-flex items-center justify-center
                          flex-shrink-0 text-white
                          ${acquise ? 'bg-gj-green' : 'bg-gj-yellow-deep'}`}
                      >
                        <Icon name={acquise ? 'check' : 'plus'} size={12} />
                      </span>
                      <span className="flex-1">{s.libelle}</span>
                      {!acquise && (
                        <span className="text-fs-100 font-extrabold uppercase tracking-wide">
                          À compléter
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <ul className="list-disc pl-5 text-fs-300 text-color-text-primary leading-[1.7]">
                {competencesRequises.map((s) => (
                  <li key={s.slug}>{s.libelle}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tags.length > 0 && (
          <section aria-labelledby="opp-tags-heading">
            <h2
              id="opp-tags-heading"
              className="text-fs-100 uppercase font-extrabold text-color-text-secondary tracking-wide mb-space-2"
            >
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t.slug}
                  className="inline-flex items-center text-fs-200 font-semibold
                    bg-gj-bg text-color-text-primary px-space-2 py-1 rounded-full"
                >
                  {t.libelle}
                </span>
              ))}
            </div>
          </section>
        )}

        {detail.lienExterne && (
          <a
            href={detail.lienExterne}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fs-300 font-bold text-gj-teal-deep underline self-start"
          >
            Plus d’informations
          </a>
        )}
      </div>

      {/* ─── Sticky CTA ──────────────────────────────────────────────── */}
      <div
        className="sticky bottom-0 z-10 bg-white border-t border-gj-line
          flex items-center gap-space-2 px-space-3 py-space-3 mt-space-4
          pb-[calc(theme(spacing.space-3)+env(safe-area-inset-bottom,0px))]"
      >
        <button
          type="button"
          onClick={toggleFavori}
          aria-pressed={isFavori}
          aria-label={isFavori ? 'Retirer des favoris' : 'Sauvegarder'}
          className={`flex-shrink-0 w-[50px] h-[50px] rounded-gj-md inline-flex items-center
            justify-center border-[1.5px] cursor-pointer transition-colors
            ${
              isFavori
                ? 'bg-gj-teal-soft border-gj-teal text-gj-teal-deep'
                : 'bg-white border-gj-line text-gj-teal-deep hover:bg-gj-teal-soft'
            }`}
        >
          <Icon name="bookmark" size={18} aria-hidden />
        </button>

        {/* Bouton Partager — desktop seulement (mobile : ghost du hero). */}
        <button
          type="button"
          onClick={share}
          aria-label="Partager"
          className="hidden md:inline-flex flex-shrink-0 w-[50px] h-[50px] rounded-gj-md
            items-center justify-center border-[1.5px] border-gj-line bg-white
            text-gj-teal-deep hover:bg-gj-teal-soft cursor-pointer"
        >
          <Icon name="share" size={18} aria-hidden />
        </button>

        {!viewer ? (
          <a
            href={loginUrl(`${opportuniteSlugUrl(detail.slug)}?postuler=1`)}
            className="flex-1 inline-flex items-center justify-center gap-2
              bg-gj-action hover:bg-gj-action-deep text-white font-extrabold rounded-gj-md
              min-h-[50px] px-space-4"
          >
            Se connecter pour postuler
            <Icon name="arrow-right" size={16} aria-hidden />
          </a>
        ) : (
          <>
            <Button
              variant="cta"
              size="lg"
              // GUIC-689 (B.5) — la primitive Button applique `font-bold` (700) inconditionnellement ;
              // le lien anonyme ci-dessus est en `font-extrabold` (800). Correction locale seulement :
              // la primitive est partagée (admin/recruteur/conseiller), harmonisation globale différée.
              className="flex-1 font-extrabold"
              disabled={ctaDisabled}
              aria-describedby={ctaDisabled ? 'cta-disabled-reason' : undefined}
              onClick={() => setModalOpen(true)}
            >
              {ctaLabel}
              {!ctaDisabled && <Icon name="arrow-right" size={16} aria-hidden />}
            </Button>
            {ctaDisabled && (
              <span id="cta-disabled-reason" className="sr-only">
                {ctaDisabledReason}
              </span>
            )}
          </>
        )}
      </div>

      {viewer && modalOpen && (
        <CandidatureModal
          opportuniteId={detail.id}
          opportuniteTitre={detail.titre}
          viewer={viewer}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            setDejaCandidate(true)
            setToast({ message: 'Candidature envoyée', type: 'success' })
          }}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </article>
  )
}
