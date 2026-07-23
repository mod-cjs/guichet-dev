/**
 * GUIC-153 — Factory de seed E2E (graphe à IDs stables, isolée du seed de dev).
 *
 * Chaque helper est IDEMPOTENT (upsert) et renvoie un `cleanup()` en cascade, à l'image des
 * fixtures existantes (`centres.ts`). Convention : tout id de test est préfixé `e2e-` pour un
 * nettoyage sûr même si un test plante avant son `cleanup`.
 *
 * IMPORTANT — rôles & autorisation : les rôles d'espace viennent du claim SSO `cjs_roles`
 * (émis par le mock, cf. `mock-sso.ts`), JAMAIS d'un champ DB. Ces helpers ne créent que
 * l'utilisateur et ses RATTACHEMENTS (`Organisation`, `AgentCentre`) + le contenu à tester.
 *
 * À exécuter uniquement contre une base de dev/test isolée (jamais prod) — cf. DATABASE_URL.
 */

import { getPrisma } from './prisma'

/** cjsUid stables partagés par le mock SSO (claims) et le seed (rattachements). */
export const E2E_UIDS = {
  jeune:      'e2e-jeune',       // onboardingComplete=true, profil complet
  jeuneOnb:   'e2e-jeune-onb',   // onboardingComplete=false (parcours A2)
  recruteur:  'e2e-recruteur',   // + Organisation liée
  admin:      'e2e-admin',
  conseiller: 'e2e-conseiller',  // + AgentCentre
  candidat:   'e2e-candidat',    // candidat d'une Candidature (ne se connecte pas)
} as const

type CleanupFn = () => Promise<void>

/** Compose plusieurs cleanups en un seul (ordre inverse de création). */
export function combineCleanups(...fns: CleanupFn[]): CleanupFn {
  return async () => {
    for (const fn of [...fns].reverse()) await fn().catch(() => {})
  }
}

/**
 * Utilisateur de test idempotent. `onboardingComplete=true` par défaut (sinon le middleware
 * renvoie toute route `/jeune/*` vers l'onboarding — cf. fixtures centres).
 */
export async function ensureUtilisateur(
  cjsUid: string,
  opts: {
    prenom?: string
    nom?: string
    email?: string
    telephone?: string | null
    region?: string | null
    onboardingComplete?: boolean
  } = {},
): Promise<CleanupFn> {
  const prisma = getPrisma()
  const data = {
    prenom:             opts.prenom ?? 'Test',
    nom:                opts.nom ?? 'E2E',
    email:              opts.email ?? `${cjsUid}@example.sn`,
    // Téléphone UNIQUE en base → null par défaut (le vrai numéro vient des claims SSO au login).
    telephone:          opts.telephone ?? null,
    region:             (opts.region ?? 'Dakar') as never, // enum Region
    onboardingComplete: opts.onboardingComplete ?? true,
  }
  await prisma.utilisateur.upsert({
    where:  { cjsUid },
    update: data,
    create: { cjsUid, ...data },
  })
  return async () => {
    await prisma.utilisateur.delete({ where: { cjsUid } }).catch(() => {})
  }
}

/** Organisation liée à un recruteur (bascule l'accès recruteur `attente` → `ok`). */
export async function seedOrganisation(
  cjsUid: string,
  opts: { nom?: string } = {},
): Promise<{ organisationId: string; cleanup: CleanupFn }> {
  const prisma = getPrisma()
  const id = `e2e-org-${cjsUid}`
  await prisma.organisation.upsert({
    where:  { id },
    update: {},
    create: {
      id,
      cjsUid,
      nom:        opts.nom ?? 'Organisation E2E',
      secteur:    'Numerique',
      region:     'Dakar',
      estVerifie: true,
    },
  })
  return {
    organisationId: id,
    cleanup: async () => {
      await prisma.organisation.delete({ where: { id } }).catch(() => {})
    },
  }
}

/** Rattachement conseiller ↔ centre (bascule l'accès conseiller vers `ok`). */
export async function seedAgentCentre(
  cjsUid: string,
  centreId: string,
): Promise<CleanupFn> {
  const prisma = getPrisma()
  await prisma.agentCentre.upsert({
    where:  { cjsUid_centreId: { cjsUid, centreId } },
    update: {},
    create: { cjsUid, centreId, role: 'conseiller' },
  })
  return async () => {
    await prisma.agentCentre
      .deleteMany({ where: { cjsUid, centreId } })
      .catch(() => {})
  }
}

/**
 * Opportunité. `statut` par défaut `publiee` (visible public). Passer `brouillon` pour la
 * file de modération admin (Ad1) — avec `recruteurUid`/`organisationId` pour simuler R1.
 */
export async function seedOpportunite(opts: {
  slug?: string
  titre?: string
  statut?: 'brouillon' | 'publiee' | 'archivee' | 'expiree'
  type?: string
  domaine?: string
  region?: string
  deadlineDansJours?: number
  recruteurUid?: string
  organisationId?: string
} = {}): Promise<{ id: string; slug: string; cleanup: CleanupFn }> {
  const prisma = getPrisma()
  const slug = opts.slug ?? `e2e-opp-${Date.now().toString(36)}`
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + (opts.deadlineDansJours ?? 30))
  const opp = await prisma.opportunite.upsert({
    where:  { slug },
    update: { statut: opts.statut ?? 'publiee' },
    create: {
      slug,
      titre:          opts.titre ?? 'Opportunité E2E — Développeur junior',
      description:    'Description E2E suffisamment longue pour un rendu réaliste du détail.',
      type:           (opts.type ?? 'Stage') as never,
      organisation:   'Organisation E2E',
      domaine:        (opts.domaine ?? 'Numerique') as never,
      region:         (opts.region ?? 'Dakar') as never,
      deadline,
      statut:         (opts.statut ?? 'publiee') as never,
      recruteurUid:   opts.recruteurUid ?? null,
      organisationId: opts.organisationId ?? null,
    },
  })
  return {
    id:   opp.id,
    slug: opp.slug,
    cleanup: async () => {
      await prisma.candidature.deleteMany({ where: { opportuniteId: opp.id } }).catch(() => {})
      await prisma.opportunite.delete({ where: { id: opp.id } }).catch(() => {})
    },
  }
}

/** Profil jeune COMPLET (débloque la candidature — évite le 403 PROFILE_INCOMPLETE). */
export async function seedProfilJeuneComplet(
  cjsUid: string,
  opts: { complet?: boolean } = {},
): Promise<CleanupFn> {
  const prisma = getPrisma()
  const complet = opts.complet ?? true
  const data = {
    niveauEtude:     complet ? 'Licence' : null,
    situationEmploi: complet ? 'en_recherche' : null,
    domainesInteret: complet ? ['Numerique'] : [],
  }
  await prisma.profilJeune.upsert({
    where:  { cjsUid },
    update: data as never,
    create: { cjsUid, ...data } as never,
  })
  return async () => {
    await prisma.profilJeune.deleteMany({ where: { cjsUid } }).catch(() => {})
  }
}

/** Événement à venir (inscriptible). */
export async function seedEvenement(opts: {
  titre?: string
  type?: string
  dansJours?: number
  capaciteMax?: number | null
} = {}): Promise<{ id: string; cleanup: CleanupFn }> {
  const prisma = getPrisma()
  const dateDebut = new Date()
  dateDebut.setDate(dateDebut.getDate() + (opts.dansJours ?? 14))
  const dateFin = new Date(dateDebut)
  dateFin.setHours(dateFin.getHours() + 2)
  const ev = await prisma.evenement.create({
    data: {
      titre:       opts.titre ?? 'Événement E2E — Atelier CV',
      description: 'Atelier E2E pour tester le parcours inscription.',
      type:        (opts.type ?? 'Atelier') as never,
      statut:      'a_venir',
      dateDebut,
      dateFin,
      lieu:        'Centre E2E, Dakar',
      capaciteMax: opts.capaciteMax === undefined ? 50 : opts.capaciteMax,
    },
  })
  return {
    id: ev.id,
    cleanup: async () => {
      await prisma.inscriptionEvenement.deleteMany({ where: { evenementId: ev.id } }).catch(() => {})
      await prisma.evenement.delete({ where: { id: ev.id } }).catch(() => {})
    },
  }
}

/** Candidature (défaut `En_attente`) — pour le parcours décision recruteur (R2). */
export async function seedCandidature(opts: {
  cjsUid: string
  opportuniteId: string
  statut?: string
}): Promise<{ id: string; cleanup: CleanupFn }> {
  const prisma = getPrisma()
  const c = await prisma.candidature.upsert({
    where:  { cjsUid_opportuniteId: { cjsUid: opts.cjsUid, opportuniteId: opts.opportuniteId } },
    update: { statut: (opts.statut ?? 'En_attente') as never },
    create: {
      cjsUid:           opts.cjsUid,
      opportuniteId:    opts.opportuniteId,
      statut:           (opts.statut ?? 'En_attente') as never,
      lettreMotivation: 'Lettre de motivation E2E — suffisamment détaillée pour être réaliste.',
    },
  })
  return {
    id: c.id,
    cleanup: async () => {
      await prisma.candidature.delete({ where: { id: c.id } }).catch(() => {})
    },
  }
}
