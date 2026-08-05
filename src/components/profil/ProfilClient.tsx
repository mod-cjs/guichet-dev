'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProfileHeroBand }    from './ProfileHeroBand'
import { SectionIdentite }    from './SectionIdentite'
import { SectionProfil }      from './SectionProfil'
import { SectionExperiences } from './SectionExperiences'
import { SectionDiplomes }    from './SectionDiplomes'
import { SectionCertificats } from './SectionCertificats'
import { SectionCv }          from './SectionCv'
import { CompletionChecklist } from './CompletionChecklist'
import { DocumentsCard }      from './DocumentsCard'
import { ObjectiveCard }      from './ObjectiveCard'
import { SkillsCard }         from './SkillsCard'
import { TimelineCard }       from './TimelineCard'
import { Icon }               from '@/components/ui'
import { etatCompletion } from '@/lib/profil-score'
import { construireParcours } from '@/lib/profil-parcours'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

interface Props {
  initial:      ProfilComplet
  ssoProfilUrl: string | null
}

/**
 * <ProfilClient /> — page profil jeune (GUIC-20 / GUIC-191).
 *
 * Layout v2 :
 * - mobile : empilement vertical, MyCard en haut + sections en dessous
 * - desktop : bandeau hero pleine largeur, puis grid `1.6fr/1fr` — sections
 *   éditables en colonne principale (gauche), complétion + carte CJS en aside
 *   droite (GUIC-689, É-17 — la v5 inverse l'ancienne disposition v2).
 */
export function ProfilClient({ initial, ssoProfilUrl }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.profil?.photoUrl ?? null)

  // GUIC-689 — la checklist et le score dérivent du MÊME barème
  // (`etatCompletion`) : impossible qu'un gain affiché diffère de ce que le
  // score accordera réellement. Recalculé côté client à partir des données
  // déjà chargées — aucun aller-retour réseau supplémentaire.
  const etat = etatCompletion(
    {
      region:        initial.region,
      commune:       initial.commune,
      genre:         initial.genre,
      dateNaissance: initial.dateNaissance,
    },
    initial.profil
      ? {
          biographie:      initial.profil.biographie,
          niveauEtude:     initial.profil.niveauEtude,
          situationEmploi: initial.profil.situationEmploi,
          domainesInteret: initial.profil.domainesInteret,
          competences:     initial.profil.competences,
        }
      : null,
    initial.experiences.length,
    initial.diplomes.length,
  )

  // Le score PERSISTÉ (`profil.completionScore`) n'est recalculé qu'à
  // l'enregistrement : il était périmé et affichait « 0 % » dans le hero
  // pendant que la checklist annonçait « 5 % ». Une seule valeur circule
  // désormais, celle dérivée des données courantes.
  const [score, setScore] = useState(etat.score)

  function handleSaved(data: PutProfilResponse) {
    setScore(data.completionScore)
  }

  return (
    <div className="flex flex-col gap-space-5">
      {/* GUIC-689 (É-17) — bandeau d'identité pleine largeur (réf v5
          `profil-web.jsx` ProfileHeader) à la place du titre texte plat. */}
      <ProfileHeroBand
        prenom={initial.prenom}
        nom={initial.nom}
        cjsUid={initial.cjsUid}
        photoUrl={photoUrl}
        completionScore={score}
        region={initial.region}
        dateNaissance={initial.dateNaissance}
        genre={initial.genre}
        niveauEtude={initial.profil?.niveauEtude ?? null}
        // Aucune date d'inscription n'est exposée par le contrat profil : la
        // pastille « Membre depuis » s'omet plutôt que d'afficher une date
        // inventée (règle R4 du standard qualité). À exposer dans le DTO si
        // le produit la veut.
        membreDepuis={null}
      />

      {/* Layout desktop conforme design v2 : aside gauche 300px sticky (identité +
          complétude) + colonne droite (sections éditables). Mobile : empilement. */}
      <div className="lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-space-5 flex flex-col gap-space-5">
        {/* Sections éditables */}
        <div className="flex flex-col gap-space-4 min-w-0">
          <SectionIdentite
            data={initial}
            photoUrl={photoUrl}
            ssoProfilUrl={ssoProfilUrl}
            onSaved={handleSaved}
            onPhotoSaved={setPhotoUrl}
          />

          <SectionProfil
            data={initial.profil}
            onSaved={handleSaved}
          />

          {/* GUIC-689 — « Objectif & secteurs visés » puis « Compétences &
              langues », dans l'ordre de la maquette. */}
          <ObjectiveCard
            objectif={initial.profil?.objectif ?? null}
            secteurs={initial.profil?.domainesInteret ?? []}
            typesRecherches={initial.profil?.typesRecherches ?? []}
            regionsMobilite={initial.profil?.regionsMobilite ?? []}
            onSaved={(d) => setScore(d.completionScore)}
          />

          <SkillsCard
            competences={initial.profil?.competences ?? []}
            langues={initial.langues}
            editable
          />

          {/* La timeline ABSORBE les trois anciennes sections (expériences,
              diplômes, certifications) : un parcours se lit dans le temps, pas
              par catégorie administrative. */}
          <TimelineCard
            parcours={construireParcours(initial.experiences, initial.diplomes, initial.engagements)}
          />

          {/* GUIC-689 — La timeline ci-dessus est en LECTURE ; l'édition vit
              dans les trois sections d'origine. Les afficher côte à côte
              montrerait le parcours deux fois : on les replie derrière un
              dépliant, ce qui évite la redite sans supprimer l'édition.
              L'édition en ligne dans la timeline reste à faire. */}
          <details data-testid="parcours-edition" className="group">
            <summary
              className="list-none cursor-pointer flex items-center gap-2 select-none
                text-fs-300 font-extrabold text-gj-teal-deep
                bg-gj-surface border border-gj-line rounded-gj-lg px-space-4
                min-h-[var(--tap-min)]"
            >
              <Icon name="settings" size={16} aria-hidden />
              Ajouter ou modifier une entrée de mon parcours
              <Icon
                name="chevron-right"
                size={14}
                aria-hidden
                className="ml-auto transition-transform group-open:rotate-90"
              />
            </summary>

            <div className="flex flex-col gap-space-4 mt-space-4">
              <SectionExperiences
                experiences={initial.experiences}
                onScoreChange={setScore}
              />

              <SectionDiplomes
                diplomes={initial.diplomes}
                onScoreChange={setScore}
              />

              <SectionCertificats
                certificats={initial.certificats}
              />
            </div>
          </details>

          {/* GUIC-581 — entrée mobile vers la page Inclusion & accessibilité.
              Desktop (≥lg) : la sidebar porte déjà l'entrée → masqué. */}
          <Link
            href="/jeune/accessibilite"
            className="lg:hidden no-underline flex items-center gap-3 bg-gj-teal-soft rounded-gj-lg px-4 py-3.5 min-h-[var(--tap-min)]"
          >
            <span
              aria-hidden
              className="w-[34px] h-[34px] rounded-gj-md shrink-0 bg-white text-gj-teal-deep inline-flex items-center justify-center"
            >
              <Icon name="eye" size={17} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-fs-300 font-extrabold text-gj-teal-deep">
                Inclusion &amp; accessibilité
              </span>
              <span className="block text-fs-100 text-gj-grey mt-0.5">
                Adapter l&apos;application à tes besoins
              </span>
            </span>
            <Icon name="chevron-right" size={14} />
          </Link>
        </div>
        <aside>
          {/* Sticky coordonné avec BenefTopBar (--gj-topbar-h = 64px) — GUIC-401. */}
          {/* GUIC-689 — La carte CJS a QUITTÉ l'aside : la maquette v5
              (`profil-web.jsx` L.746-749) y place la complétion et les
              documents, et la carte a son propre écran (`/jeune/ma-carte`).
              Elle affichait de surcroît deux valeurs fabriquées — un matricule
              bricolé à partir des initiales et de l'UUID, et un « membre
              depuis » figé sur un tiret. */}
          <div className="lg:sticky lg:top-[var(--gj-sticky-offset)] flex flex-col gap-space-4">
            <CompletionChecklist etat={{ score, criteres: etat.criteres }} />
            {/* GUIC-689 — le CV vit ici, pas en colonne principale : la
                maquette regroupe CV et pièces jointes dans une seule carte
                d'aside (`DocumentsCard`). */}
            <DocumentsCard
              cvUrl={initial.profil?.cvUrl ?? null}
              cvUploadedAt={
                initial.profil?.cvUploadedAt
                  ? new Date(initial.profil.cvUploadedAt).toISOString()
                  : null
              }
              diplomes={initial.diplomes}
              certificats={initial.certificats}
            />
          </div>
        </aside>

      </div>
    </div>
  )
}
