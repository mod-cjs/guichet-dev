/**
 * Seed de développement — Guichet Jeunesse CJS
 *
 * COMPTES DE TEST SSO
 * -------------------
 * Les utilisateurs sont gérés par le SSO CJS (Laravel Passport), pas par ce projet.
 * Les comptes ci-dessous doivent exister dans la base du SSO avant de tester le flow OAuth.
 *
 * Pour les créer via Laravel tinker (sur le conteneur SSO) :
 *
 *   $user = \App\Models\User::create([
 *     'uuid'       => \Ramsey\Uuid\Uuid::uuid4()->toString(),
 *     'first_name' => '<prenom>',
 *     'last_name'  => '<nom>',
 *     'email'      => '<email>',
 *     'phone'      => '+221XXXXXXXXX',
 *     'password'   => bcrypt('<mot_de_passe>'),
 *   ]);
 *   // Assigner un rôle lié à la plateforme Guichet (platform_id = ID de la plateforme)
 *   $user->roles()->attach($roleId, ['platform_id' => $platformId]);
 *
 * COMPTES CRÉÉS POUR L'ENVIRONNEMENT LOCAL (port 80)
 * ---------------------------------------------------
 * | Email                    | Mot de passe | Rôle        | Usage                        |
 * |--------------------------|--------------|-------------|------------------------------|
 * | beneficiaire@cjs.sn      | Test1234!    | beneficiaire| Flow complet jeune           |
 * | recruteur@cjs.sn         | Test1234!    | recruteur   | Espace recruteur             |
 * | admin@cjs.sn             | Test1234!    | admin       | Back-office administration   |
 * | sans-role@cjs.sn         | Test1234!    | (aucun)     | Test message "compte non activé" |
 *
 * CLIENT OAUTH
 * ------------
 * Client ID     : 41
 * Redirect URI  : http://localhost:3000/auth/callback
 * auto_approve  : true (évite l'écran d'autorisation OAuth)
 *
 * PLATEFORME SSO
 * --------------
 * La plateforme "Guichet Jeunesse" doit être enregistrée dans la table `platforms`
 * avec `oauth_client_id = '41'` et `default_role = 'beneficiaire'`.
 *
 * DONNÉES MÉTIER (M2+)
 * --------------------
 * Les seeds de données métier (opportunités, événements, ressources, centres)
 * seront ajoutées ici au fur et à mesure des sprints.
 */

import { prisma } from '../../src/lib/prisma'
import { seedOpportunites } from './opportunites'
import { seedOpportuniteDetails } from './opportunite-details'
import { seedProgrammes } from './programmes'
import { seedOpportuniteTypes } from './opportunite-types'
import { seedRessources } from './ressources'
import { rattacherOpportunites, rattacherRessources } from './programme-rattachements'
import { seedSkills } from './skills'
import { seedTags } from './tags'
import { seedNotifications } from './notifications'
import { seedLot7 } from './lot7-centres'

async function main() {
  // Tables de référence M3 v2 (GUIC-182 / 178a) — ordre indépendant, sans FK croisées
  const nbProgrammes = await seedProgrammes(prisma)
  const nbTypes = await seedOpportuniteTypes(prisma)
  const nbSkills = await seedSkills(prisma)
  const nbTags = await seedTags(prisma)
  console.log(
    `Seed M3 v2 — ${nbProgrammes} programmes, ${nbTypes} types, ${nbSkills} skills, ${nbTags} tags.`,
  )

  // Opportunités legacy (sera repris par 178d via OpportuniteService)
  const count = await seedOpportunites(prisma)
  console.log(`Seed Guichet Jeunesse — ${count} opportunités insérées (GUIC-20).`)

  // GUIC-689 — détails de sous-type. Sans cette étape, les fiches d'offre
  // n'affichent que les champs génériques : les lignes de sous-type héritées
  // de la migration portent des valeurs de remplissage (montant à 0,
  // organisme « À renseigner ») qui donnent une vue faussement pauvre.
  const nbDetails = await seedOpportuniteDetails(prisma)
  console.log(`Seed Guichet Jeunesse — ${nbDetails} détails de sous-type (GUIC-689).`)

  // Ressources M6 (GUIC-239)
  const nbRessources = await seedRessources(prisma)
  console.log(`Seed Guichet Jeunesse — ${nbRessources} ressources insérées (GUIC-239).`)

  // GUIC-684 — rattachement aux programmes. Sans cette étape, une base fraîche est
  // entièrement orpheline : le rattachement étant obligatoire à la création, l'admin
  // d'un environnement neuf est bloqué dès la première fiche qu'il ouvre.
  const nbOppProg = await rattacherOpportunites(prisma)
  const nbResProg = await rattacherRessources(prisma)
  console.log(
    `Seed GUIC-684 — ${nbOppProg} opportunités et ${nbResProg} ressources rattachées à un programme.`,
  )

  // Notifications démo (GUIC-247) — idempotent, premier user actif.
  const nbNotifs = await seedNotifications(prisma)
  if (nbNotifs > 0) {
    console.log(`Seed M11 notifications — ${nbNotifs} notifications insérées (GUIC-247).`)
  }

  // Lot 7 Centres CJS (GUIC-351 / EPIC GUIC-350) — enrichit les 9 centres existants
  // avec horaires + ressources + staff démo (idempotent).
  await seedLot7(prisma)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
