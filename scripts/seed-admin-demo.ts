/**
 * Seed démo ADMIN (GUIC-679) — données réalistes pour la refonte du back-office.
 *
 * Stratégie : RESET CIBLÉ + RESEED des entités qui alimentent le dashboard/sidebar,
 * SANS toucher aux utilisateurs, centres ni opportunités existants.
 * Idempotent : ré-exécutable (les tables reset sont vidées puis re-remplies ;
 * organisations + source de veille en upsert par id déterministe).
 *
 *   npx tsx scripts/seed-admin-demo.ts
 */
import { prisma } from '../src/lib/prisma'

const DAY = 86_400_000
const now = Date.now()
const pick = <T>(arr: T[], i: number): T => arr[i % arr.length]

async function main() {
  // ── 1. RESET CIBLÉ ────────────────────────────────────────────────────────
  await prisma.inscriptionEvenement.deleteMany({})
  await prisma.evenement.deleteMany({})
  await prisma.candidature.deleteMany({})
  await prisma.itemCuration.deleteMany({})
  await prisma.escaladeYaye.deleteMany({})
  await prisma.insertion.deleteMany({})
  await prisma.yayeFeedback.deleteMany({})
  await prisma.yayeSessionSummary.deleteMany({})
  await prisma.auditLog.deleteMany({})
  console.log('Reset : candidatures / événements / curation / escalades / insertions / yaye / audit vidés.')

  // ── 2. Références existantes ──────────────────────────────────────────────
  const users = await prisma.utilisateur.findMany({ select: { cjsUid: true }, take: 140 })
  const opps = await prisma.opportunite.findMany({ select: { id: true }, take: 50 })
  const centres = await prisma.centre.findMany({ select: { id: true } })
  if (users.length < 10 || opps.length < 5) {
    throw new Error(`Pas assez de références (users=${users.length}, opps=${opps.length}).`)
  }
  const uid = (i: number) => pick(users, i).cjsUid
  const oppId = (i: number) => pick(opps, i).id

  // ── 3. Organisations (partenaires) — upsert idempotent ────────────────────
  const ORGS = [
    { nom: 'Sonatel', secteur: 'Numerique', region: 'Dakar', estVerifie: true },
    { nom: 'Wave Sénégal', secteur: 'Numerique', region: 'Dakar', estVerifie: true },
    { nom: 'Orange Digital Center', secteur: 'Numerique', region: 'Dakar', estVerifie: true },
    { nom: 'DER/FJ', secteur: 'Entrepreneuriat', region: 'Dakar', estVerifie: true },
    { nom: 'Baobab Agri', secteur: 'Agriculture', region: 'Diourbel', estVerifie: false },
    { nom: 'Institut Santé Plus', secteur: 'Sante', region: 'Saint_Louis', estVerifie: true },
    { nom: 'Éduc Avenir', secteur: 'Education', region: 'Ziguinchor', estVerifie: false },
    { nom: 'Kaay Culture', secteur: 'Culture', region: 'Thies', estVerifie: true },
    { nom: 'Green Sénégal', secteur: 'Environnement', region: 'Fatick', estVerifie: false },
    { nom: 'Citoyens Actifs', secteur: 'Citoyennete', region: 'Kaolack', estVerifie: true },
  ] as const
  for (let i = 0; i < ORGS.length; i++) {
    const o = ORGS[i]
    await prisma.organisation.upsert({
      where: { id: `seed-org-${i + 1}` },
      update: { estVerifie: o.estVerifie, secteur: o.secteur, region: o.region },
      create: {
        id: `seed-org-${i + 1}`,
        cjsUid: uid(i),
        nom: o.nom,
        description: `${o.nom} — organisation partenaire du réseau Guichet Jeunesse.`,
        secteur: o.secteur,
        region: o.region,
        email: `contact@${o.nom.toLowerCase().replace(/[^a-z]/g, '')}.sn`,
        estVerifie: o.estVerifie,
      },
    })
  }
  console.log(`Organisations : ${ORGS.length} partenaires (upsert).`)

  // ── 4. Candidatures — funnel réaliste ─────────────────────────────────────
  // 100 users × 2 candidatures = 200 paires (cjsUid, opportunite) distinctes.
  const STATUT = ['En_attente', 'Vue', 'Retenue', 'Refusee'] as const
  const PIPE = ['Recue', 'Preselection', 'Entretien', 'Decision'] as const
  const cand: {
    cjsUid: string; opportuniteId: string; statut: (typeof STATUT)[number];
    pipelineStage: (typeof PIPE)[number]; scoreAdequation: number; soumiseA: Date; favoriRecruteur: boolean
  }[] = []
  const nUsers = Math.min(100, users.length)
  for (let u = 0; u < nUsers; u++) {
    for (let k = 0; k < 2; k++) {
      const i = u * 2 + k
      const r = i / (nUsers * 2) // 0..1 progression pour un funnel décroissant
      let statut: (typeof STATUT)[number]
      let stage: (typeof PIPE)[number]
      if (r < 0.28) { stage = 'Recue'; statut = 'En_attente' }
      else if (r < 0.5) { stage = 'Preselection'; statut = 'Vue' }
      else if (r < 0.72) { stage = 'Entretien'; statut = 'Vue' }
      else if (r < 0.86) { stage = 'Decision'; statut = 'Retenue' }
      else { stage = 'Decision'; statut = 'Refusee' }
      // Retenues récentes (ce mois) pour le KPI ; le reste étalé sur ~5 mois.
      const ageDays = statut === 'Retenue' ? (i % 20) : 10 + ((i * 13) % 150)
      cand.push({
        cjsUid: uid(u),
        opportuniteId: oppId(u * 2 + k),
        statut, pipelineStage: stage,
        scoreAdequation: 40 + ((i * 7) % 60),
        soumiseA: new Date(now - ageDays * DAY),
        favoriRecruteur: i % 11 === 0,
      })
    }
  }
  await prisma.candidature.createMany({ data: cand, skipDuplicates: true })
  console.log(`Candidatures : ${cand.length} (funnel Reçue→Décision).`)

  // ── 5. Événements ─────────────────────────────────────────────────────────
  const EVTYPES = ['Atelier', 'Forum', 'Webinar', 'Formation', 'Conference'] as const
  const EVENTS = Array.from({ length: 16 }, (_, i) => {
    const past = i < 9 // 9 passés (dont ateliers tenus) + 7 à venir
    return {
      titre: `${pick(EVTYPES, i)} — ${['CV & LinkedIn', 'Entrepreneuriat jeunes', 'Réussir ses candidatures', 'Métiers du numérique', 'Emploi vert', 'Financer son projet'][i % 6]}`,
      description: 'Événement du réseau Guichet Jeunesse — session démo.',
      type: pick(EVTYPES, i),
      statut: past ? 'termine' : 'a_venir' as const,
      dateDebut: new Date(now + (past ? -(i + 1) * 6 * DAY : (i - 8) * 5 * DAY)),
      lieu: centres.length ? 'CJS ' + ['Dakar', 'Thiès', 'Saint-Louis', 'Kaolack'][i % 4] : 'En ligne',
      centreId: centres.length ? pick(centres, i).id : null,
      capaciteMax: 30 + (i % 5) * 20,
      estGratuit: true,
    }
  })
  for (const e of EVENTS) {
    await prisma.evenement.create({ data: e as never })
  }
  console.log(`Événements : ${EVENTS.length} (9 tenus + 7 à venir).`)

  // ── 6. Veille + Curation (items à valider) ────────────────────────────────
  const source = await prisma.sourceVeille.upsert({
    where: { url: 'https://demo.emploi.sn/flux' },
    update: {},
    create: { id: 'seed-source-1', nom: 'Emploi.sn (démo)', url: 'https://demo.emploi.sn/flux', actif: true },
  })
  const CUR_STATUTS = ['a_valider', 'a_valider', 'a_valider', 'decouvert', 'approuvee', 'rejetee'] as const
  const items = Array.from({ length: 14 }, (_, i) => ({
    sourceId: source.id,
    urlCanonique: `https://demo.emploi.sn/offre/${1000 + i}`,
    empreinte: `seedcur${String(i).padStart(6, '0')}`,
    titre: `Offre veille #${i + 1} — ${['Développeur', 'Comptable', 'Agent commercial', 'Technicien agricole'][i % 4]}`,
    scoreCompletude: 55 + ((i * 9) % 45),
    statut: pick(CUR_STATUTS, i),
    createdAt: new Date(now - (i % 12) * DAY),
  }))
  await prisma.itemCuration.createMany({ data: items, skipDuplicates: true })
  const nAValider = items.filter((x) => x.statut === 'a_valider').length
  console.log(`Curation : ${items.length} items (${nAValider} à valider).`)

  // ── 7. Escalades Yaye ─────────────────────────────────────────────────────
  const CANAUX = ['web', 'whatsapp'] as const
  const ESC = Array.from({ length: 5 }, (_, i) => ({
    sessionId: `seed-sess-${i + 1}`,
    cjsUid: uid(i),
    canal: pick(CANAUX, i),
    raison: ['Question hors périmètre', 'Demande sensible', 'Blocage inscription'][i % 3],
    priorite: i === 0 ? 1 : 0,
    statut: i < 3 ? ('en_attente' as const) : ('resolue' as const),
    createdAt: new Date(now - i * 2 * DAY),
  }))
  await prisma.escaladeYaye.createMany({ data: ESC, skipDuplicates: true })
  console.log(`Escalades Yaye : ${ESC.length} (3 en attente).`)

  // ── 8. Insertions (jeunes placés) — pour le taux d'insertion + funnel ─────
  const INS_TYPES = ['Emploi', 'Stage', 'Formation'] as const
  const insertions = Array.from({ length: 22 }, (_, i) => ({
    cjsUid: uid(i),
    opportuniteId: oppId(i),
    centreId: centres.length ? pick(centres, i).id : null,
    type: pick(INS_TYPES, i),
    dateInsertion: new Date(now - (i % 60) * DAY),
  }))
  await prisma.insertion.createMany({ data: insertions, skipDuplicates: true })
  console.log(`Insertions : ${insertions.length} jeunes placés.`)

  // ── 9. Yaye — sessions (auto-résolution) + feedback (satisfaction) ────────
  const CANAUX2 = ['web', 'whatsapp'] as const
  const INTENTS = ['candidature', 'orientation', 'centre', 'ressource', 'evenement']
  const sessions = Array.from({ length: 48 }, (_, i) => {
    const escalade = i < 4 // ~8% escaladées
    const resolu = !escalade && i % 9 !== 0 // ~80% auto-résolues
    return {
      sessionId: `seed-yqs-${i + 1}`,
      cjsUid: uid(i),
      centreId: centres.length ? pick(centres, i).id : null,
      canal: pick(CANAUX2, i),
      nbTours: 3 + (i % 8),
      dureeMs: 60_000 + (i % 10) * 30_000,
      escalade,
      resolu,
      converti: resolu && i % 3 === 0,
      yqs: 55 + ((i * 7) % 45),
      drapeauRouge: i % 23 === 0,
      intentionPrinc: pick(INTENTS, i),
    }
  })
  await prisma.yayeSessionSummary.createMany({ data: sessions, skipDuplicates: true })
  const feedback = Array.from({ length: 34 }, (_, i) => ({
    sessionId: `seed-yqs-${(i % 48) + 1}`,
    cjsUid: uid(i),
    canal: pick(CANAUX2, i),
    note: i % 6 === 0 ? -1 : 1, // ~83% 👍
  }))
  await prisma.yayeFeedback.createMany({ data: feedback, skipDuplicates: true })
  const resolus = sessions.filter((s) => s.resolu).length
  const positifs = feedback.filter((f) => f.note === 1).length
  console.log(`Yaye : ${sessions.length} sessions (${resolus} auto-résolues) · ${feedback.length} feedback (${positifs} 👍).`)

  // ── 10. AuditLog — activité récente (pouls) ───────────────────────────────
  const admin = uid(0)
  const ACTS: [string, string, string][] = [
    ['opportunite.publiee', 'opportunite', 'Offre « Développeur backend » publiée'],
    ['opportunite.rejetee', 'opportunite', 'Offre « Agent commercial » rejetée (signalée)'],
    ['partenaire.verifie', 'organisation', 'Partenaire « Wave Sénégal » vérifié'],
    ['curation.approuvee', 'item_curation', 'Item de veille approuvé → publié'],
    ['escalade.prise_en_charge', 'escalade', 'Escalade Yaye reprise en humain'],
    ['centre.modifie', 'centre', 'Horaires du CJS Thiès mis à jour'],
    ['candidature.exportee', 'export', 'Export CDP candidatures (pseudonymisé)'],
    ['evenement.valide', 'evenement', 'Atelier « CV & LinkedIn » validé'],
    ['utilisateur.role_change', 'utilisateur', 'Rôle conseiller attribué'],
    ['partenaire.suspendu', 'organisation', 'Compte recruteur suspendu'],
  ]
  const audit = Array.from({ length: 14 }, (_, i) => {
    const a = ACTS[i % ACTS.length]
    return {
      actorCjsUid: admin,
      action: a[0],
      targetType: a[1],
      targetId: `seed-${i}`,
      meta: { resume: a[2] },
      createdAt: new Date(now - i * 5 * 3_600_000 - (i % 3) * 1_800_000),
    }
  })
  await prisma.auditLog.createMany({ data: audit })
  console.log(`AuditLog : ${audit.length} entrées d'activité récente.`)

  // ── 11. Fréquentation (CheckIn 30j) — signal réseau ───────────────────────
  await prisma.checkIn.deleteMany({ where: { jwtNonce: { startsWith: 'seed-' } } })
  if (centres.length) {
    const VIA = ['QrCard', 'Manuel'] as const
    const checkins: {
      cjsUid: string; centreId: string; via: (typeof VIA)[number]; effectueA: Date; dwellMinutes: number; jwtNonce: string
    }[] = []
    let ck = 0
    centres.forEach((c, ci) => {
      const volume = 30 - ci * 3 // Dakar le plus fréquenté, dégressif
      for (let k = 0; k < Math.max(2, volume); k++) {
        checkins.push({
          cjsUid: uid(ci * 7 + k),
          centreId: c.id,
          via: pick(VIA, k),
          effectueA: new Date(now - (k % 30) * DAY - (k % 8) * 3_600_000),
          dwellMinutes: 20 + (k % 6) * 15,
          jwtNonce: `seed-ck-${ck++}`,
        })
      }
    })
    await prisma.checkIn.createMany({ data: checkins, skipDuplicates: true })
    console.log(`Fréquentation : ${checkins.length} check-ins (30 j).`)
  }

  // ── 12. Réservations en attente — signal réseau ───────────────────────────
  const ressources = await prisma.ressourceCentre.findMany({ select: { id: true, centreId: true }, take: 60 })
  if (ressources.length) {
    await prisma.reservation.deleteMany({ where: { motif: { startsWith: '[seed]' } } })
    const resv = ressources.slice(0, 14).map((r, i) => ({
      cjsUid: uid(i * 3),
      centreId: r.centreId,
      ressourceId: r.id,
      dateReservee: new Date(now + (i % 7) * DAY),
      creneauDebut: '09:00',
      creneauFin: '10:00',
      nombrePersonnes: 1 + (i % 3),
      motif: `[seed] Réservation démo #${i + 1}`,
      statut: (i % 3 === 0 ? 'EnAttente' : 'Acceptee') as 'EnAttente' | 'Acceptee',
    }))
    await prisma.reservation.createMany({ data: resv, skipDuplicates: true })
    const enAttente = resv.filter((r) => r.statut === 'EnAttente').length
    console.log(`Réservations : ${resv.length} (${enAttente} en attente).`)
  }

  console.log('\n✅ Seed démo admin terminé.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
