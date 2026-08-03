/**
 * GUIC-153 — Seed global E2E (données stables read-mostly).
 *
 * Crée, une fois par run, le graphe de rattachements stable : un centre, les utilisateurs de test
 * et leurs rattachements (Organisation recruteur, AgentCentre conseiller, ProfilJeune complet).
 * Idempotent : réutilise le centre existant. Les données MUTABLES (opportunités, événements,
 * candidatures) sont seedées par chaque spec avec cleanup, pour éviter toute interférence.
 *
 * Requiert DATABASE_URL dans l'environnement du runner (base de dev/test isolée — jamais prod).
 */

import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { seedCentreWithRessource } from './_fixtures/centres'
import {
  ensureUtilisateur,
  seedOrganisation,
  seedAgentCentre,
  seedProfilJeuneComplet,
  E2E_UIDS,
} from './_fixtures/seed-e2e'
import { E2E_CENTRE_SLUG } from './_fixtures/roles'

export default async function globalSetup(): Promise<void> {
  const prisma = getPrisma()

  // Centre stable (idempotent : réutilise si déjà présent).
  let centre = await prisma.centre.findFirst({
    where: { slug: E2E_CENTRE_SLUG },
    select: { id: true },
  })
  if (!centre) {
    const seeded = await seedCentreWithRessource({ slug: E2E_CENTRE_SLUG, cjsUid: E2E_UIDS.jeune })
    centre = { id: seeded.centreId }
  }

  // Utilisateurs + rattachements stables.
  await ensureUtilisateur(E2E_UIDS.jeune, { onboardingComplete: true })
  await ensureUtilisateur(E2E_UIDS.jeuneOnb, { onboardingComplete: false, prenom: 'Moussa', nom: 'Sow' })
  await ensureUtilisateur(E2E_UIDS.recruteur, { prenom: 'Bineta', nom: 'Fall' })
  await ensureUtilisateur(E2E_UIDS.admin, { prenom: 'Ibrahima', nom: 'Ba' })
  await ensureUtilisateur(E2E_UIDS.conseiller, { prenom: 'Sokhna', nom: 'Diop' })
  await ensureUtilisateur(E2E_UIDS.candidat, { prenom: 'Awa', nom: 'Ndiaye' })

  await seedProfilJeuneComplet(E2E_UIDS.jeune, { complet: true })
  await seedOrganisation(E2E_UIDS.recruteur)
  await seedAgentCentre(E2E_UIDS.conseiller, centre.id)

  await disconnectPrisma()
}
