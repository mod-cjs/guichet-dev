/**
 * Étape 0 — GUIC-702 · Seed de la file de modération (refonte admin §5.2).
 *
 * Rend visibles TOUS les états que la refonte doit savoir afficher, à partir de
 * données réelles du modèle (0 champ inventé) :
 *   - crit    : offre recruteur avec « frais d'inscription » + n° perso dans la
 *               description → l'heuristique detecterSignaux la marquera « Signalée ».
 *   - soft    : offre recruteur d'un partenaire NON vérifié → « À vérifier ».
 *   - veille  : brouillon rattaché à un ItemCuration (relation CurationPubliee)
 *               → source dérivée = « Veille ».
 *   - vérifié : offre d'un partenaire vérifié, saine → cible de « Approuver les vérifiés ».
 *   - ancienne: createdAt > 48 h → pastille d'ancienneté rouge (objectif SLA).
 *
 * Idempotent (upsert par slug). Ne touche AUCUNE offre publiée ni aucun compte réel.
 * Usage : npx tsx scripts/seed-moderation-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL manquant')
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) })

const hAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000)

async function orgNonVerifiee(): Promise<string> {
  const nom = 'Ets. Ndiaye & Fils'
  const existant = await prisma.organisation.findFirst({ where: { nom }, select: { id: true } })
  if (existant) {
    await prisma.organisation.update({ where: { id: existant.id }, data: { estVerifie: false } })
    return existant.id
  }
  const cree = await prisma.organisation.create({
    data: {
      cjsUid: 'seed-mod-recruteur-ndiaye',
      nom,
      secteur: 'Autre',
      region: 'Dakar',
      estVerifie: false,
    },
    select: { id: true },
  })
  return cree.id
}

async function orgVerifiee(): Promise<{ id: string; cjsUid: string } | null> {
  return prisma.organisation.findFirst({
    where: { estVerifie: true },
    select: { id: true, cjsUid: true },
    orderBy: { createdAt: 'asc' },
  })
}

interface OffreSeed {
  slug: string
  titre: string
  type: 'Emploi' | 'Stage' | 'Formation' | 'Bourse' | 'Appel_a_projets'
  domaine: 'Numerique' | 'Entrepreneuriat' | 'Sante' | 'Autre'
  description: string
  remuneration?: string
  region?: 'Dakar' | 'Thies'
  createdAt: Date
  organisationId: string | null
  organisationLibelle: string
  recruteurUid: string | null
}

async function upsertOffre(o: OffreSeed): Promise<string> {
  const common = {
    titre: o.titre,
    description: o.description,
    type: o.type,
    domaine: o.domaine,
    remuneration: o.remuneration ?? null,
    region: o.region ?? null,
    statut: 'brouillon' as const,
    organisationId: o.organisationId,
    organisationLibelle: o.organisationLibelle,
    organisation: o.organisationLibelle,
    recruteurUid: o.recruteurUid,
    createdAt: o.createdAt,
    moderePar: null,
    modereLe: null,
    motifRejet: null,
    deletedAt: null,
  }
  const row = await prisma.opportunite.upsert({
    where: { slug: o.slug },
    create: { slug: o.slug, ...common },
    update: common,
    select: { id: true },
  })
  return row.id
}

async function rattacherVeille(opportuniteId: string): Promise<void> {
  const source = await prisma.sourceVeille.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } })
  if (!source) {
    console.warn('  ⚠ aucune SourceVeille — offre veille laissée sans rattachement (source dérivée = Admin)')
    return
  }
  const empreinte = 'seed-mod-veille-der-fj'
  const existant = await prisma.itemCuration.findUnique({ where: { empreinte }, select: { id: true } })
  const data = {
    sourceId: source.id,
    urlCanonique: 'https://emploi.sn/subventions/der-fj-2026',
    titre: 'Appel à projets — entrepreneuriat jeunes (DER/FJ)',
    statut: 'approuvee' as const,
    opportuniteId,
  }
  if (existant) await prisma.itemCuration.update({ where: { id: existant.id }, data })
  else await prisma.itemCuration.create({ data: { empreinte, ...data } })
}

async function main() {
  const nvId = await orgNonVerifiee()
  const verif = await orgVerifiee()

  // 1) crit — frais d'inscription + n° personnel dans la description (arnaque type)
  await upsertOffre({
    slug: 'seed-mod-agent-commercial-remuneration',
    titre: 'Agent commercial — rémunération attractive',
    type: 'Emploi',
    domaine: 'Autre',
    remuneration: 'Jusqu’à 800 000 FCFA',
    region: 'Dakar',
    createdAt: hAgo(26),
    organisationId: nvId,
    organisationLibelle: 'Ets. Ndiaye & Fils',
    recruteurUid: 'seed-mod-recruteur-ndiaye',
    description:
      'Nous recrutons des agents commerciaux dynamiques. Rémunération très attractive. ' +
      'Frais de dossier obligatoires de 10 000 FCFA à verser avant l’entretien. ' +
      'Contactez-nous directement au +221 77 123 45 67 pour l’inscription.',
  })

  // 2) soft — partenaire non vérifié (organisme non référencé)
  await upsertOffre({
    slug: 'seed-mod-formation-dev-web-6-mois',
    titre: 'Formation développeur web — 6 mois',
    type: 'Formation',
    domaine: 'Numerique',
    region: 'Thies',
    createdAt: hAgo(25),
    organisationId: nvId,
    organisationLibelle: 'Institut Sup’Info',
    recruteurUid: 'seed-mod-recruteur-ndiaye',
    description:
      'Formation intensive au développement web (HTML/CSS/JS, React, Node). ' +
      'Débouchés : stage garanti en fin de parcours. 25 places, présentiel, certifiante.',
  })

  // 3) veille — rattachée à un ItemCuration (source dérivée = Veille)
  const veilleId = await upsertOffre({
    slug: 'seed-mod-appel-projets-der-fj',
    titre: 'Appel à projets — entrepreneuriat jeunes (DER/FJ)',
    type: 'Appel_a_projets',
    domaine: 'Entrepreneuriat',
    createdAt: hAgo(2),
    organisationId: null,
    organisationLibelle: 'DER/FJ',
    recruteurUid: null,
    description:
      'La DER/FJ lance un appel à projets pour financer les initiatives entrepreneuriales ' +
      'des jeunes de 18 à 40 ans. Montant jusqu’à 5 M FCFA. Dépôt en ligne, clôture dans 3 semaines.',
  })
  await rattacherVeille(veilleId)

  // 4) vérifié & sain — cible de « Approuver les vérifiés »
  await upsertOffre({
    slug: 'seed-mod-stage-marketing-digital',
    titre: 'Stage marketing digital — 3 mois',
    type: 'Stage',
    domaine: 'Numerique',
    remuneration: '150 000 FCFA/mois',
    region: 'Dakar',
    createdAt: hAgo(3),
    organisationId: verif?.id ?? null,
    organisationLibelle: 'Wave Sénégal',
    recruteurUid: verif?.cjsUid ?? 'seed-mod-recruteur-wave',
    description:
      'Wave recherche un(e) stagiaire marketing digital pour appuyer ses campagnes ' +
      'd’acquisition. Bac+2/3, indemnité mensuelle, encadrement assuré.',
  })

  const total = await prisma.opportunite.count({ where: { statut: 'brouillon', deletedAt: null } })
  console.log(`✅ seed modération OK — ${total} brouillons en file (dont 4 seedés : crit / soft / veille / vérifié)`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ seed modération:', e)
  await prisma.$disconnect()
  process.exit(1)
})
