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
import { seedProgrammes } from './programmes'
import { seedOpportuniteTypes } from './opportunite-types'
import { seedSkills } from './skills'
import { seedTags } from './tags'

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
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
