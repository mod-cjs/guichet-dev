/**
 * Seed de démonstration — Bibliothèque physique (Lot 3, GUIC-274).
 *
 * Crée un petit catalogue réaliste : ~10 livres, des exemplaires répartis sur les
 * 4 premiers centres, et quelques emprunts (initié + en cours) pour alimenter les
 * tableaux de bord staff/admin. Idempotent : les livres sont retrouvés par
 * (titre, auteur) et les exemplaires upsertés par code-barre.
 *
 * Usage : npx tsx scripts/seed-bibliotheque.ts
 * Puis :  npm run yaye:reproject   (projette Livre/Exemplaire dans Neo4j)
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

const LIVRES = [
  { titre: 'Une si longue lettre', auteur: 'Mariama Bâ', theme: 'Littérature', niveau: 'Tous', langue: 'fr', isbn: '9782708701801', resume: 'Roman épistolaire sénégalais, classique de la littérature africaine.' },
  { titre: 'Les Bouts de bois de Dieu', auteur: 'Ousmane Sembène', theme: 'Littérature', niveau: 'Tous', langue: 'fr', isbn: '9782266025676', resume: 'La grève des cheminots du Dakar-Niger.' },
  { titre: "L'Aventure ambiguë", auteur: 'Cheikh Hamidou Kane', theme: 'Littérature', niveau: 'Lycée', langue: 'fr', isbn: '9782264031679', resume: 'Confrontation entre tradition et modernité.' },
  { titre: 'Introduction à l’algorithmique', auteur: 'Cormen et al.', theme: 'Informatique', niveau: 'Supérieur', langue: 'fr', isbn: '9782100545261', resume: 'Référence en algorithmique et structures de données.' },
  { titre: 'Apprendre à programmer en Python', auteur: 'Gérard Swinnen', theme: 'Informatique', niveau: 'Débutant', langue: 'fr', isbn: '9782212674040', resume: 'Initiation à la programmation avec Python.' },
  { titre: 'Histoire générale du Sénégal', auteur: 'Collectif', theme: 'Histoire', niveau: 'Tous', langue: 'fr', isbn: '9782353260000', resume: 'Panorama historique du Sénégal.' },
  { titre: 'Petit traité d’économie', auteur: 'Jacques Généreux', theme: 'Économie', niveau: 'Supérieur', langue: 'fr', isbn: '9782021034028', resume: 'Comprendre les mécanismes économiques.' },
  { titre: "Guide de l’entrepreneuriat", auteur: 'Robert Papin', theme: 'Développement personnel', niveau: 'Tous', langue: 'fr', isbn: '9782100707000', resume: 'Créer et gérer son entreprise.' },
  { titre: 'Agriculture durable en zone sahélienne', auteur: 'Amadou Diop', theme: 'Agriculture', niveau: 'Professionnel', langue: 'fr', isbn: '9782709900000', resume: 'Pratiques agricoles adaptées au Sahel.' },
  { titre: 'Santé communautaire', auteur: 'OMS', theme: 'Santé', niveau: 'Professionnel', langue: 'fr', isbn: '9789242560000', resume: 'Principes de santé publique de proximité.' },
]

const RAYONS = ['A', 'B', 'C', 'D']

async function main(): Promise<void> {
  const { prisma } = await import('../src/lib/prisma')

  const centres = await prisma.centre.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' }, take: 4 })
  if (centres.length === 0) throw new Error('Aucun centre en base — impossible de seeder des exemplaires.')

  let nbLivres = 0
  let nbExemplaires = 0
  const exemplairesDisponibles: string[] = []

  for (let i = 0; i < LIVRES.length; i++) {
    const l = LIVRES[i]
    // Livre : find-or-create (idempotent par titre+auteur).
    let livre = await prisma.livre.findFirst({ where: { titre: l.titre, auteur: l.auteur } })
    if (!livre) {
      livre = await prisma.livre.create({ data: l })
      nbLivres++
    }

    // 1 à 3 exemplaires répartis sur des centres, code-barre déterministe.
    const nbCopies = (i % 3) + 1
    for (let c = 0; c < nbCopies; c++) {
      const centre = centres[(i + c) % centres.length]
      const codeBarre = `BIB-${String(i + 1).padStart(3, '0')}-${c + 1}`
      const ex = await prisma.exemplaire.upsert({
        where: { codeBarre },
        update: {},
        create: {
          livreId: livre.id,
          centreId: centre.id,
          codeBarre,
          rayon: RAYONS[i % RAYONS.length],
          etagere: String((c % 5) + 1),
          position: String((i % 20) + 1),
          statut: 'disponible',
        },
      })
      nbExemplaires++
      if (ex.statut === 'disponible') exemplairesDisponibles.push(ex.id)
    }
  }

  // Quelques emprunts de démo (si aucun n'existe encore) pour alimenter les dashboards.
  const empruntsExistants = await prisma.emprunt.count()
  let nbEmprunts = 0
  if (empruntsExistants === 0) {
    const users = await prisma.utilisateur.findMany({ where: { deletedAt: null }, select: { cjsUid: true }, take: 2 })
    if (users.length > 0 && exemplairesDisponibles.length >= 2) {
      // 1 emprunt initié (à confirmer au centre).
      const ex1 = exemplairesDisponibles[0]
      await prisma.emprunt.create({ data: { cjsUid: users[0].cjsUid, exemplaireId: ex1, statut: 'initie' } })
      await prisma.exemplaire.update({ where: { id: ex1 }, data: { statut: 'reserve' } })
      nbEmprunts++

      // 1 emprunt en cours (à rendre), avec date de retour prévue.
      const ex2 = exemplairesDisponibles[1]
      const retour = new Date()
      retour.setDate(retour.getDate() + 14)
      await prisma.emprunt.create({
        data: { cjsUid: users[Math.min(1, users.length - 1)].cjsUid, exemplaireId: ex2, statut: 'en_cours', confirmeA: new Date(), dateRetourPrevue: retour },
      })
      await prisma.exemplaire.update({ where: { id: ex2 }, data: { statut: 'emprunte' } })
      nbEmprunts++
    }
  }

  const totals = {
    livres: await prisma.livre.count(),
    exemplaires: await prisma.exemplaire.count(),
    emprunts: await prisma.emprunt.count(),
  }
  console.log(`✅ Seed biblio : +${nbLivres} livres, +${nbExemplaires} exemplaires (upsert), +${nbEmprunts} emprunts de démo`)
  console.log(`   Totaux en base : ${JSON.stringify(totals)}`)
  console.log(`   Centres utilisés : ${centres.map(c => c.nom).join(', ')}`)
  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ seed biblio échoué:', err)
    process.exit(1)
  })
