/**
 * GUIC-689 — Recalcul des scores de complétion après rééquilibrage du barème.
 *
 * Le barème totalisait 110 points plafonnés à 100 (`Math.min(s, 100)`) : un
 * profil auquel il ne manquait que la commune atteignait 105 et s'affichait
 * « 100 % » avec une étape encore listée. Il totalise désormais exactement 100
 * (biographie 20→15, secteurs 15→10).
 *
 * Sans ce recalcul, `profils_jeunes.completion_score` garde l'ANCIENNE valeur
 * jusqu'au prochain enregistrement du profil — et ce champ ne sert pas qu'à
 * l'affichage : il part dans l'export Data Hub (`completion_score`, palier
 * public) et dans la projection du graphe Yaye. L'écran afficherait la valeur
 * recalculée pendant que les exports et les recommandations en utiliseraient
 * une autre.
 *
 * IDEMPOTENT : recalcule depuis les données sources, rejouable sans effet de
 * bord. N'écrit que les lignes dont le score change réellement.
 *
 * Usage :
 *   npx tsx scripts/recalcul-scores-completion.ts            # exécution
 *   npx tsx scripts/recalcul-scores-completion.ts --dry-run  # simulation
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const { prisma } = await import('../src/lib/prisma')
  const { calculerScore } = await import('../src/lib/profil-score')

  const utilisateurs = await prisma.utilisateur.findMany({
    where: { profil: { isNot: null } },
    select: {
      cjsUid: true,
      region: true,
      commune: true,
      genre: true,
      dateNaissance: true,
      profil: {
        select: {
          id: true,
          biographie: true,
          niveauEtude: true,
          situationEmploi: true,
          domainesInteret: true,
          competences: true,
          completionScore: true,
          _count: { select: { experiences: true, diplomes: true } },
        },
      },
    },
  })

  let inchanges = 0
  const changements: { cjsUid: string; avant: number; apres: number }[] = []

  for (const u of utilisateurs) {
    const p = u.profil
    if (!p) continue
    const apres = calculerScore(
      { region: u.region, commune: u.commune, genre: u.genre, dateNaissance: u.dateNaissance },
      {
        biographie:      p.biographie,
        niveauEtude:     p.niveauEtude,
        situationEmploi: p.situationEmploi,
        domainesInteret: p.domainesInteret,
        competences:     p.competences,
      },
      p._count.experiences,
      p._count.diplomes,
    )
    if (apres === p.completionScore) {
      inchanges++
      continue
    }
    changements.push({ cjsUid: u.cjsUid, avant: p.completionScore, apres })
    if (!dryRun) {
      await prisma.profilJeune.update({ where: { id: p.id }, data: { completionScore: apres } })
    }
  }

  console.log(`profils examinés : ${utilisateurs.length}`)
  console.log(`inchangés        : ${inchanges}`)
  console.log(`${dryRun ? 'à mettre à jour' : 'mis à jour'}  : ${changements.length}`)
  for (const c of changements.slice(0, 20)) {
    console.log(`  ${c.cjsUid}  ${c.avant} → ${c.apres}`)
  }
  if (changements.length > 20) console.log(`  … et ${changements.length - 20} autres`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
