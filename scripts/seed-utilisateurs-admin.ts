/**
 * Seed de dé-risquage (Étape 0, refonte Utilisateurs §5.10) — enrichit des comptes
 * existants pour rendre VISIBLES au rendu tous les états de l'écran : rôles (jeune/
 * conseiller/recruteur/admin), régions, genres, profils + completionScore variés,
 * anonymisés (PII effacées), lastSeenAt échelonnés (+ null), rattachements AgentCentre,
 * parcours (Experience/Diplome/CertificatMoodle), CV. Idempotent sur les cibles.
 *
 * Usage : npx tsx scripts/seed-utilisateurs-admin.ts
 */
import { config } from 'dotenv'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

config({ path: '.env.local' })
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL as string) })

const REGIONS = ['Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Louga', 'Saint_Louis', 'Ziguinchor', 'Kolda', 'Matam'] as const
const GENRES = ['M', 'F'] as const
const CENTRE = '11111111-1111-4111-8111-000000000001'
const NIVEAUX = ['BFEM', 'Baccalauréat', 'Licence', 'Master', 'BTS', 'Doctorat']
const SITU = ['En recherche', 'En formation', 'En emploi', 'Sans emploi']
const COMPS = [['JavaScript', 'React'], ['Comptabilité', 'Excel'], ['Vente'], ['Python', 'SQL'], ['Menuiserie'], ['Marketing digital']]
const DOMS = [['Numérique'], ['Finance'], ['Commerce'], ['Data'], ['Artisanat'], ['Communication']]

/** Ne pas toucher les comptes réels/e2e connus. */
const PRESERVES = new Set(['diopous1@gmail.com', 'e2e-admin@example.sn', 'odiallo@consortiumjeunessesenegal.org', 'ryhow99@gmail.com'])

function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d }

async function main() {
  // Cibles : comptes bénéficiaires « nus » (pas les vrais staff/e2e), pour enrichir librement.
  const users = await prisma.utilisateur.findMany({
    where: { email: { not: null }, statut: 'actif' },
    orderBy: { createdAt: 'asc' },
    take: 80,
    select: { cjsUid: true, email: true, prenom: true, nom: true },
  })
  const cibles = users.filter((u) => u.email && !PRESERVES.has(u.email) && !u.email.startsWith('e2e-')).slice(0, 60)
  if (cibles.length === 0) throw new Error('Aucune cible.')
  console.log(`Cibles : ${cibles.length}`)

  let iRole = { conseiller: 0, recruteur: 0, admin: 0, jeune: 0 }
  let iProfil = 0, iAnon = 0, iRattach = 0, iParcours = 0, iNull = 0

  for (let k = 0; k < cibles.length; k++) {
    const u = cibles[k]
    // Répartition rôles : 0-5 conseiller, 6-11 recruteur, 12-14 admin, reste jeune.
    const role = k < 6 ? 'conseiller' : k < 12 ? 'recruteur' : k < 15 ? 'admin' : 'jeune'
    const region = REGIONS[k % REGIONS.length]
    const genre = GENRES[k % 2]
    // lastSeenAt échelonné : k%9===0 → jamais vu (null) ; sinon aujourd'hui→~5 mois.
    const lastSeen = k % 9 === 0 ? null : daysAgo(k * 3)
    if (lastSeen === null) iNull++

    await prisma.utilisateur.update({
      where: { cjsUid: u.cjsUid },
      data: { role, region: region as never, genre: genre as never, lastSeenAt: lastSeen, onboardingComplete: role === 'jeune' && k % 3 !== 0 },
    })
    iRole[role as keyof typeof iRole]++

    // Profil + complétude variée pour les jeunes.
    if (role === 'jeune') {
      const comp = (k * 137) % 101 // 0→100 pseudo-varié
      const profil = await prisma.profilJeune.upsert({
        where: { cjsUid: u.cjsUid },
        create: {
          cjsUid: u.cjsUid, completionScore: comp,
          competences: COMPS[k % COMPS.length], domainesInteret: DOMS[k % DOMS.length],
          niveauEtude: NIVEAUX[k % NIVEAUX.length], situationEmploi: SITU[k % SITU.length],
          cvUrl: k % 4 === 0 ? `https://example.blob/cv/${u.cjsUid}.pdf` : null,
          biographie: 'Jeune motivé, en recherche d’opportunités.',
        },
        update: {
          completionScore: comp, competences: COMPS[k % COMPS.length], domainesInteret: DOMS[k % DOMS.length],
          niveauEtude: NIVEAUX[k % NIVEAUX.length], situationEmploi: SITU[k % SITU.length],
          cvUrl: k % 4 === 0 ? `https://example.blob/cv/${u.cjsUid}.pdf` : null,
        },
      })
      iProfil++

      // Parcours (exp/diplôme/certificat) sur ~1 jeune sur 3.
      if (k % 3 === 0) {
        await prisma.experience.deleteMany({ where: { profilId: profil.id } })
        await prisma.experience.create({ data: { profilId: profil.id, poste: 'Stagiaire', organisation: 'Sonatel', dateDebut: daysAgo(400), dateFin: daysAgo(280), description: 'Stage de fin d’études.' } })
        await prisma.diplome.deleteMany({ where: { profilId: profil.id } })
        await prisma.diplome.create({ data: { profilId: profil.id, intitule: 'Licence Informatique', etablissement: 'UCAD', anneeObtention: 2024, niveau: 'Licence', mention: 'Bien' } })
        await prisma.certificatMoodle.deleteMany({ where: { profilId: profil.id } })
        await prisma.certificatMoodle.create({ data: { profilId: profil.id, moodleCertId: `cert-${u.cjsUid.slice(0, 8)}`, formation: 'Initiation au numérique', obtenuLe: daysAgo(120) } })
        iParcours++
      }
    }

    // Rattachement centre pour les conseillers.
    if (role === 'conseiller') {
      await prisma.agentCentre.upsert({
        where: { cjsUid_centreId: { cjsUid: u.cjsUid, centreId: CENTRE } },
        create: { cjsUid: u.cjsUid, centreId: CENTRE },
        update: {},
      })
      iRattach++
    }
  }

  // ~5 anonymisés : PII effacées + statut (on prend les 5 derniers jeunes de la liste).
  const aAnon = cibles.slice(-5)
  for (const u of aAnon) {
    await prisma.utilisateur.update({
      where: { cjsUid: u.cjsUid },
      data: { statut: 'anonymise', nom: '—', prenom: '—', email: null, telephone: null, dateNaissance: null, deletedAt: new Date() },
    })
    await prisma.profilJeune.updateMany({ where: { cjsUid: u.cjsUid }, data: { biographie: null, photoUrl: null, cvUrl: null } })
    iAnon++
  }

  console.log(`✓ rôles: ${JSON.stringify(iRole)} · profils: ${iProfil} · parcours: ${iParcours} · rattachements: ${iRattach} · anonymisés: ${iAnon} · lastSeen null: ${iNull}`)
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
