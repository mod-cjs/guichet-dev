'use server'

/**
 * GUIC-513 — Édition du profil entreprise par le recruteur (self-service).
 * Ownership : l'organisation liée à `session.cjsUid`. `nom` et `estVerifie` restent
 * gérés par l'admin (GUIC-510) → non modifiables ici (strippés par le schéma).
 */
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import { htmlToPlainText } from '@/lib/rich-html'
import type { CJSSession } from '@/types/user'
import type { Prisma } from '@prisma/client'

const DOMAINES = ['Agriculture', 'Numerique', 'Entrepreneuriat', 'Citoyennete', 'Environnement', 'Sante', 'Education', 'Culture', 'Autre'] as const
const REGIONS = ['Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou'] as const

async function assertRecruteur(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) throw new Error('FORBIDDEN')
  return session
}

const schema = z.object({
  description: z.string().trim().max(5000).nullish(),
  secteur: z.enum(DOMAINES).nullish(),
  region: z.enum(REGIONS).nullish(),
  adresse: z.string().trim().max(300).nullish(),
  telephone: z.string().trim().max(20).nullish(),
  email: z.string().trim().max(255).email('Email invalide').or(z.literal('')).nullish(),
  siteWeb: z.string().trim().max(500).url('URL invalide').or(z.literal('')).nullish(),
  logoUrl: z.string().trim().max(500).url('URL invalide').or(z.literal('')).nullish(),
})
export type ProfilEntrepriseInput = z.input<typeof schema>

/** '' → null, absent → non modifié. */
function norm(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  const t = v.trim()
  return t === '' ? null : t
}

export async function modifierProfilEntreprise(input: ProfilEntrepriseInput): Promise<{ ok: true }> {
  const session = await assertRecruteur()
  const org = await prisma.organisation.findFirst({ where: { cjsUid: session.cjsUid }, select: { id: true } })
  if (!org) throw new Error('NO_ORGANISATION')

  const parsed = schema.parse(input)
  const data: Prisma.OrganisationUpdateInput = {}
  if (parsed.description !== undefined) {
    // GUIC-506 — corps riche saisi par un tiers (recruteur) : sanitisation serveur ;
    // un corps sans texte (ex. "<p></p>") est normalisé en null.
    const clean = parsed.description == null ? null : sanitizeRichHtml(parsed.description)
    data.description = clean && htmlToPlainText(clean).trim() ? clean : null
  }
  if (parsed.secteur !== undefined) data.secteur = parsed.secteur
  if (parsed.region !== undefined) data.region = parsed.region
  if (parsed.adresse !== undefined) data.adresse = norm(parsed.adresse)
  if (parsed.telephone !== undefined) data.telephone = norm(parsed.telephone)
  if (parsed.email !== undefined) data.email = norm(parsed.email)
  if (parsed.siteWeb !== undefined) data.siteWeb = norm(parsed.siteWeb)
  if (parsed.logoUrl !== undefined) data.logoUrl = norm(parsed.logoUrl)

  await prisma.organisation.update({ where: { id: org.id }, data })
  await recordAudit(session.cjsUid, 'partenaire.update', { targetType: 'organisation', targetId: org.id, meta: { via: 'recruteur' } })
  revalidatePath('/recruteur/profil-entreprise')
  return { ok: true }
}

/** Déconnecte Google Meet : supprime les tokens du recruteur. */
export async function deconnecterGoogleMeet(): Promise<{ ok: true }> {
  const session = await assertRecruteur()
  await prisma.recruteurGoogleAuth.deleteMany({ where: { cjsUid: session.cjsUid } })
  await recordAudit(session.cjsUid, 'meet.deconnexion', { targetType: 'recruteur_google_auth', targetId: session.cjsUid })
  revalidatePath('/recruteur/profil-entreprise')
  return { ok: true }
}
