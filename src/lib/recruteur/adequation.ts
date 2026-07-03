/**
 * GUIC-487 (US-5) — Score d'adéquation candidat / offre via IA (Groq).
 *
 * Le score (0–100) + une raison courte sont calculés par le LLM à partir des signaux
 * structurés (offre : titre/description/skills/niveau ; candidat : niveau/compétences/
 * lettre). Calcul en tâche de fond après soumission, stocké sur `Candidature`.
 * Fail-soft : toute erreur laisse le score à `null` (l'UI affiche « — »).
 */
import { z } from 'zod'
import { getGroq } from '@/lib/ia/groq-client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { htmlToPlainText } from '@/lib/rich-html'

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'

export interface AdequationInput {
  offre: { titre: string; description: string; niveauEtudeMin: string | null; skills: string[] }
  candidat: { niveauEtude: string | null; competences: string[]; lettreMotivation: string | null }
}

const ScoreSchema = z.object({ score: z.number(), raison: z.string().min(1) })

/** Construit les messages system/user pour le scoring (fonction pure, testable). */
export function buildAdequationMessages(input: AdequationInput): { system: string; user: string } {
  const system =
    "Tu es un assistant RH pour une plateforme jeunesse au Sénégal. Évalue l'adéquation " +
    "d'un candidat à une offre à partir UNIQUEMENT des informations fournies (ne rien inventer). " +
    'Réponds STRICTEMENT en JSON : {"score": <entier 0-100>, "raison": "<une phrase courte en français>"}. ' +
    'Le score reflète la correspondance compétences/niveau/motivation. Sois mesuré et factuel.'
  const user = [
    'OFFRE',
    `Titre: ${input.offre.titre}`,
    `Niveau d'étude minimum: ${input.offre.niveauEtudeMin ?? '—'}`,
    `Compétences requises: ${input.offre.skills.join(', ') || '—'}`,
    `Description: ${htmlToPlainText(input.offre.description).slice(0, 1500) || '—'}`,
    '',
    'CANDIDAT',
    `Niveau d'étude: ${input.candidat.niveauEtude ?? '—'}`,
    `Compétences: ${input.candidat.competences.join(', ') || '—'}`,
    `Lettre de motivation: ${(input.candidat.lettreMotivation ?? '').slice(0, 1500) || '—'}`,
  ].join('\n')
  return { system, user }
}

/** Parse la réponse LLM → { score clampé 0-100, raison }. `null` si invalide (fonction pure). */
export function parseScore(raw: string): { score: number; raison: string } | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = ScoreSchema.safeParse(json)
  if (!parsed.success) return null
  const score = Math.max(0, Math.min(100, Math.round(parsed.data.score)))
  return { score, raison: parsed.data.raison.slice(0, 300) }
}

/** Charge les signaux d'une candidature (offre + profil candidat). */
async function loadInput(candidatureId: string): Promise<AdequationInput | null> {
  const c = await prisma.candidature.findUnique({
    where: { id: candidatureId },
    select: {
      cjsUid: true,
      lettreMotivation: true,
      opportunite: {
        select: {
          titre: true, description: true, niveauEtudeMin: true,
          skills: { select: { skill: { select: { libelle: true } } } },
        },
      },
    },
  })
  if (!c) return null

  const profil = await prisma.profilJeune.findUnique({
    where: { cjsUid: c.cjsUid },
    select: { competences: true, niveauEtude: true },
  })
  const competences = Array.isArray(profil?.competences)
    ? (profil!.competences as unknown[]).map((x) => String(x)).filter(Boolean)
    : []

  return {
    offre: {
      titre: c.opportunite.titre,
      description: c.opportunite.description,
      niveauEtudeMin: c.opportunite.niveauEtudeMin,
      skills: c.opportunite.skills.map((s) => s.skill.libelle),
    },
    candidat: {
      niveauEtude: profil?.niveauEtude ?? null,
      competences,
      lettreMotivation: c.lettreMotivation,
    },
  }
}

/**
 * Calcule et stocke le score d'adéquation d'une candidature (tâche de fond, fail-soft).
 */
export async function computeScoreAdequation(candidatureId: string): Promise<void> {
  const input = await loadInput(candidatureId)
  if (!input) return

  const { system, user } = buildAdequationMessages(input)
  try {
    const completion = await getGroq().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    })
    const parsed = parseScore(completion.choices[0]?.message?.content ?? '')
    if (!parsed) {
      logger.warn('[adequation] réponse LLM invalide', { candidatureId })
      return
    }
    await prisma.candidature.update({
      where: { id: candidatureId },
      data: { scoreAdequation: parsed.score, scoreRaison: parsed.raison, scoreCalculeLe: new Date() },
    })
  } catch (err) {
    logger.warn('[adequation] scoring échoué', { candidatureId, err: String(err) })
  }
}
