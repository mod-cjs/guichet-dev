/**
 * Seed de dé-risquage (Étape 0, refonte Candidatures §5.11) — enrichit des candidatures
 * existantes pour rendre VISIBLES au rendu TOUS les états de la future fiche/liste :
 * snapshot formulaireData, CV+lettre, consentement CDP, entretiens, conversation,
 * lien recruteur (relance), score « en cours » (null), candidat avec/sans téléphone,
 * candidature « bloquée » (>14j). Idempotent sur les cibles.
 *
 * Usage : DATABASE_URL="mysql://guichet:...@localhost:3307/guichet_jeunesse" npx tsx scripts/seed-candidatures-fiche.ts
 */
import { config } from 'dotenv'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

config({ path: '.env.local' })
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL as string) })

// Recruteur de test = compte lié à l'organisation Sonatel (cjs_uid est un Utilisateur valide).
const RECRUTEUR_UID = '000016dd-3ec7-4d17-aa8c-7dcc58cd0835'
const ORG_ID = 'seed-org-1'

const NIVEAUX = ['Licence', 'Master', 'BFEM', 'Baccalauréat', 'BTS', 'Doctorat']
const SITUATIONS = ['En recherche', 'En formation', 'En emploi', 'Sans emploi']
const COMPETENCES = [['JavaScript', 'React', 'Node.js'], ['Comptabilité', 'Sage', 'Excel'], ['Vente', 'Relation client'], ['Python', 'SQL', 'Data']]
const DOMAINES = [['Numérique', 'Startup'], ['Finance'], ['Commerce', 'Distribution'], ['Éducation']]

function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d }

async function main() {
  const cands = await prisma.candidature.findMany({
    orderBy: { soumiseA: 'desc' },
    take: 40,
    select: { id: true, opportuniteId: true, cjsUid: true, statut: true },
  })
  if (cands.length === 0) throw new Error('Aucune candidature à enrichir.')
  console.log(`Cibles : ${cands.length} candidatures.`)

  let iEnrich = 0, iEntretien = 0, iConv = 0, iNullScore = 0, iPhone = 0, iBloquee = 0
  const oppIds = new Set<string>()

  for (let k = 0; k < cands.length; k++) {
    const c = cands[k]
    const prenomBase = `candidat${k}`

    // 1) Lien recruteur sur l'opportunité (chemin de la relance) — une seule fois par opp.
    if (!oppIds.has(c.opportuniteId)) {
      oppIds.add(c.opportuniteId)
      // updateMany : renvoie un count (pas la ligne) → évite le TransformError de
      // l'adapter MariaDB sur la relecture d'une colonne d'`opportunites`.
      await prisma.opportunite.updateMany({
        where: { id: c.opportuniteId },
        data: { recruteurUid: RECRUTEUR_UID, organisationId: ORG_ID },
      })
    }

    // 2) Enrichissement candidature : snapshot + docs + consentement.
    const nullScore = k < 4 // 4 premières = score en cours de calcul
    const withPhone = k % 8 === 0 // ~1/8 des candidats ont un tel (teste WhatsApp/SMS)
    await prisma.candidature.update({
      where: { id: c.id },
      data: {
        formulaireData: {
          email: `${prenomBase}@exemple.sn`,
          telephone: withPhone ? `+2217700000${String(10 + k).slice(-2)}` : null,
          niveauEtude: NIVEAUX[k % NIVEAUX.length],
          situationEmploi: SITUATIONS[k % SITUATIONS.length],
          competences: COMPETENCES[k % COMPETENCES.length],
          domainesInteret: DOMAINES[k % DOMAINES.length],
        },
        cvUrl: `https://example.blob/cv/${c.id}.pdf`,
        lettreMotivation: `Madame, Monsieur,\n\nVivement intéressé(e) par cette opportunité, je vous adresse ma candidature. Mon parcours et ma motivation correspondent au profil recherché.\n\nCordialement.`,
        consentAt: daysAgo(k + 1),
        cguVersion: 'v2.1',
        consentIp: `41.82.140.${(k % 250) + 1}`,
        notificationsConsent: k % 3 !== 0,
        ...(nullScore
          ? { scoreAdequation: null, scoreRaison: null, scoreCalculeLe: null }
          : { scoreRaison: 'Correspondance compétences / profil de l’offre (Groq · GUIC-487).', scoreCalculeLe: daysAgo(k) }),
      },
    })
    iEnrich++
    if (nullScore) iNullScore++
    if (withPhone) {
      iPhone++
      await prisma.utilisateur.update({ where: { cjsUid: c.cjsUid }, data: { telephone: `+2217700000${String(10 + k).slice(-2)}` } }).catch(() => {})
    }

    // 3) Candidature « bloquée » : quelques En_attente soumises il y a > 14j.
    if (c.statut === 'En_attente' && iBloquee < 5) {
      await prisma.candidature.update({ where: { id: c.id }, data: { soumiseA: daysAgo(20 + k) } })
      iBloquee++
    }

    // 4) Entretiens (mix mode/statut) sur les 6 premières.
    if (k < 6) {
      await prisma.entretien.deleteMany({ where: { candidatureId: c.id } })
      const modes = ['Visio', 'Presentiel', 'Telephone'] as const
      const statuts = ['Planifie', 'Termine', 'Planifie'] as const
      await prisma.entretien.create({
        data: {
          candidatureId: c.id, recruteurUid: RECRUTEUR_UID, candidatUid: c.cjsUid,
          dateHeure: k % 2 === 0 ? daysAgo(-3) : daysAgo(5),
          mode: modes[k % 3], statut: statuts[k % 3],
          lieu: modes[k % 3] === 'Visio' ? `https://meet.guichet.sn/entretien-${k}` : 'Siège Sonatel, Dakar',
          notes: 'Entretien de sélection.',
        },
      })
      iEntretien++
    }

    // 5) Conversation + messages sur les 5 premières.
    if (k < 5) {
      await prisma.conversation.deleteMany({ where: { candidatureId: c.id } })
      await prisma.conversation.create({
        data: {
          candidatureId: c.id, recruteurUid: RECRUTEUR_UID, candidatUid: c.cjsUid,
          messages: {
            create: [
              { senderUid: RECRUTEUR_UID, corps: 'Bonjour, merci pour votre candidature. Êtes-vous disponible cette semaine ?', createdAt: daysAgo(4) },
              { senderUid: c.cjsUid, corps: 'Bonjour, oui je suis disponible jeudi après-midi.', createdAt: daysAgo(3), luLe: daysAgo(3) },
              { senderUid: RECRUTEUR_UID, corps: 'Parfait, je vous envoie une invitation.', createdAt: daysAgo(2) },
            ],
          },
        },
      })
      iConv++
    }
  }

  console.log(`✓ Enrichies: ${iEnrich} · score null: ${iNullScore} · téléphone: ${iPhone} · bloquées: ${iBloquee} · entretiens: ${iEntretien} · conversations: ${iConv} · opportunités liées recruteur: ${oppIds.size}`)
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
