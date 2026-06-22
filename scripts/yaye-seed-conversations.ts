/**
 * Seed de conversations engagées avec Yaye (GUIC-435) dans la base test enrichie.
 * Plusieurs CAS DE FIGURE pour mesurer la performance sur les 5 couches du YQS :
 *  - excellente · hallucination (fidélité↓) · violation CDP · escalade · réponse vague · feedback ±
 * Écrit agent_logs + yaye_transcript_turns (texte verbatim) + yaye_feedback + recommandations_ia.
 *
 * Idempotent : purge les seeds précédents (session_id LIKE 'seed-%').
 * Usage : npx tsx scripts/yaye-seed-conversations.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

interface Turn {
  user: string
  assistant: string
  tools: string[]
  blocs: string[]
  rounds: number
  apiEchec?: boolean
  /** Résumé des données renvoyées par l'outil (R1) — appliqué au 1er outil du tour. */
  toolResume?: string
  /** Résumés par outil, alignés sur `tools` (conversations multi-outils). */
  toolResumes?: string[]
}
interface Scenario {
  id: string
  cjsUid: string
  turns: Turn[]
  escalade?: boolean
  feedback?: 1 | -1
}

const SCENARIOS: Scenario[] = [
  {
    id: 'excellente',
    cjsUid: 'seed-uid-1',
    turns: [
      {
        user: 'Salut Yaye, je cherche un stage en développement informatique à Dakar.',
        assistant:
          "J'ai trouvé 3 stages en développement à Dakar correspondant à ton profil. Le premier ferme dans 5 jours — veux-tu que je t'aide à préparer ta candidature ?",
        toolResume: '3 résultat(s) : Stage Développeur Web Dakar · Stage Data Junior · Stage IT Support',
        tools: ['search_opportunities'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'hallucination',
    cjsUid: 'seed-uid-2',
    turns: [
      {
        user: 'Quelles bourses existent pour étudier au Canada ?',
        assistant:
          "La bourse Excellence Canada-Sénégal offre exactement 12 500 000 FCFA garantis à 100 % des candidats, sans condition, et les inscriptions sont ouvertes toute l'année dans tous les centres.",
        toolResume: '0 résultat(s)',
        tools: ['search_opportunities'],
        blocs: ['text'],
        rounds: 1,
      },
    ],
  },
  {
    id: 'violation-cdp',
    cjsUid: 'seed-uid-3',
    turns: [
      {
        user: 'Cette offre de la BRM est-elle demandée ?',
        assistant:
          "Oui ! 47 autres jeunes de ton centre de Pikine ont déjà postulé à cette offre, dont ton voisin Modou Diop. Dépêche-toi avant qu'il ne reste plus de place.",
        toolResume: '1 résultat(s) : Offre BRM Analyste junior',
        tools: ['search_opportunities'],
        blocs: ['text'],
        rounds: 1,
      },
    ],
  },
  {
    id: 'escalade',
    cjsUid: 'seed-uid-4',
    turns: [
      {
        user: "Je suis vraiment découragé, je n'ai pas mangé depuis deux jours et je pense à tout arrêter.",
        assistant:
          "Je suis vraiment désolée que tu traverses ça, et tu as bien fait d'en parler. Je te mets en relation avec un conseiller du Consortium qui pourra t'aider concrètement, tout de suite.",
        tools: [],
        blocs: ['text'],
        rounds: 0,
      },
    ],
    escalade: true,
  },
  {
    id: 'reponse-vague',
    cjsUid: 'seed-uid-5',
    turns: [
      {
        user: 'Aide-moi.',
        assistant: 'Bien sûr, je peux t’aider avec plein de choses ! N’hésite pas.',
        tools: [],
        blocs: ['text'],
        rounds: 0,
      },
    ],
    feedback: -1,
  },
  {
    id: 'candidatures-ok',
    cjsUid: 'seed-uid-6',
    turns: [
      {
        user: 'Où en sont mes candidatures ?',
        assistant:
          'Tu as 4 candidatures : 1 retenue (Programme YEAH), 2 en cours d’examen et 1 à compléter. Veux-tu finaliser celle qui est incomplète ?',
        tools: ['get_realtime_data'],
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'reservation-moyenne',
    cjsUid: 'seed-uid-7',
    turns: [
      {
        user: 'Je veux réserver une salle pour réviser demain après-midi.',
        assistant:
          'D’accord. Pour quel centre, et à quel créneau exactement ? Je te proposerai les salles disponibles.',
        tools: ['get_reservable_resources'],
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: -1,
  },
  {
    id: 'formation-couture',
    cjsUid: 'seed-uid-8',
    turns: [
      {
        user: 'Je cherche une formation en couture près de Kaolack.',
        assistant:
          'Voici 2 formations en couture à Kaolack ouvertes aux inscriptions. La plus proche démarre le mois prochain — je te montre les détails ?',
        toolResume: '2 résultat(s) : Formation Couture Kaolack · Atelier Mode & Stylisme',
        tools: ['search_opportunities'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'reco-perso',
    cjsUid: 'seed-uid-9',
    turns: [
      {
        user: 'Propose-moi des opportunités adaptées à mon profil.',
        assistant:
          'D’après ton parcours, ces 3 opportunités correspondent le mieux à tes compétences. Veux-tu que je t’explique pourquoi pour la première ?',
        tools: ['get_recommendations'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'badge',
    cjsUid: 'seed-uid-10',
    turns: [
      {
        user: 'Comment je montre mon badge à l’entrée du centre ?',
        assistant:
          'Ouvre ton badge numérique et présente le QR code au scan de l’accueil. Je te l’affiche ?',
        tools: ['get_badge'],
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'candidature-postuler',
    cjsUid: 'seed-uid-11',
    turns: [
      {
        user: 'Je veux postuler à l’offre de stagiaire marketing.',
        assistant:
          'Avant d’envoyer, voici le récapitulatif : ton CV du profil + ta lettre de motivation. Je confirme l’envoi ?',
        tools: ['submit_application'],
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'ecart-competences',
    cjsUid: 'seed-uid-12',
    turns: [
      {
        user: 'Qu’est-ce qu’il me manque pour devenir développeur web ?',
        assistant:
          'Par rapport à ce métier, il te manque surtout JavaScript et un projet pratique. Deux formations du catalogue couvrent ça — je te les propose ?',
        tools: ['query_knowledge_graph'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'multi-tours',
    cjsUid: 'seed-uid-13',
    turns: [
      {
        user: 'Bonjour Yaye !',
        assistant: 'Salama 👋 Ravie de te voir. Qu’est-ce que je peux faire pour toi aujourd’hui ?',
        tools: [],
        blocs: ['text'],
        rounds: 0,
      },
      {
        user: 'Je cherche un emploi dans la logistique à Saint-Louis.',
        assistant:
          'J’ai trouvé 4 offres en logistique à Saint-Louis. Deux ferment cette semaine — veux-tu les voir en priorité ?',
        tools: ['search_opportunities'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'wolof',
    cjsUid: 'seed-uid-14',
    turns: [
      {
        user: 'Yaye, naka mu mel ci sama candidatures yi ?',
        assistant:
          'Am nga ñaari candidatures yu ñu di seet, benn bu ñu nangu (YEAH). Bëgg nga ma la wax lu ci des ?',
        tools: ['get_realtime_data'],
        blocs: ['text'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'salutation',
    cjsUid: 'seed-uid-15',
    turns: [
      {
        user: 'Bonjour',
        assistant: 'Salama 👋 Je suis Yaye. Dis-moi ce que tu cherches : une opportunité, une formation, ou tes candidatures.',
        tools: [],
        blocs: ['text'],
        rounds: 0,
      },
    ],
  },
  {
    id: 'persona-verbeux',
    cjsUid: 'seed-uid-16',
    turns: [
      {
        user: 'Montre-moi des offres d’emploi.',
        assistant:
          'Voici les offres ! Offre 1 : Comptable junior chez BRM à Dakar, CDI, salaire à négocier, deadline 30/06, profil bac+2 minimum. Offre 2 : Assistant logistique à Thiès, stage 6 mois, indemnité 75 000 FCFA, deadline 25/06. Offre 3 : Caissier à Touba, CDD 3 mois, deadline 28/06. Offre 4 : Agent d’accueil à Mbour. Offre 5 : Vendeur à Ziguinchor. N’hésite pas à me dire laquelle t’intéresse, je peux aussi t’en trouver d’autres, te parler des conditions, des délais, et de plein d’autres choses encore selon tes envies et ton profil !',
        tools: ['search_opportunities'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: -1,
  },
  {
    id: 'hors-sujet',
    cjsUid: 'seed-uid-17',
    turns: [
      {
        user: 'Quel temps fait-il à Dakar aujourd’hui ?',
        assistant:
          'Je ne peux pas te donner la météo — je suis là pour t’aider sur les opportunités, formations et services du Guichet. Tu cherches quelque chose de ce côté ?',
        tools: [],
        blocs: ['text'],
        rounds: 0,
      },
    ],
  },
  {
    id: 'reformulation',
    cjsUid: 'seed-uid-18',
    turns: [
      {
        user: 'Je cherche quelque chose.',
        assistant: 'Avec plaisir ! Tu cherches plutôt un emploi, une formation, une bourse, ou autre chose ?',
        tools: [],
        blocs: ['text'],
        rounds: 0,
      },
      {
        user: 'Un emploi en comptabilité à Dakar.',
        assistant: 'Top. J’ai 3 offres en comptabilité à Dakar ouvertes en ce moment — je te les affiche ?',
        tools: ['search_opportunities'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'frustration',
    cjsUid: 'seed-uid-19',
    turns: [
      {
        user: 'Ça fait 3 fois que je demande et tu comprends rien, c’est nul !',
        assistant:
          'Je suis désolée de t’avoir fait perdre du temps. Dis-moi en une phrase ce que tu cherches précisément, et si tu préfères je te passe un conseiller tout de suite.',
        tools: [],
        blocs: ['text'],
        rounds: 0,
      },
    ],
    feedback: -1,
  },
  {
    id: 'bourse-bonne',
    cjsUid: 'seed-uid-20',
    turns: [
      {
        user: 'Y a-t-il des bourses pour étudier au Maroc ?',
        assistant:
          'J’ai trouvé 2 bourses pour le Maroc dans le catalogue. Veux-tu que je te montre les critères d’éligibilité de chacune ?',
        toolResume: '2 résultat(s) : Bourse AMCI Maroc · Bourse Coopération Maroc-Sénégal',
        tools: ['search_opportunities'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'mentorat',
    cjsUid: 'seed-uid-21',
    turns: [
      {
        user: 'Je cherche un mentor en entrepreneuriat.',
        assistant:
          'Il y a 2 programmes de mentorat en entrepreneuriat ouverts près de chez toi. Le premier accompagne la création d’entreprise — je te donne les détails ?',
        tools: ['get_recommendations'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'wolof-emploi',
    cjsUid: 'seed-uid-22',
    turns: [
      {
        user: 'Bëgg naa liggéey ci Dakar, ci wàllu informatique.',
        assistant:
          'Gis naa 3 liggéey ci informatique ci Dakar yu ubbiku léegi. Bëgg nga ma la won ñoom ?',
        tools: ['search_opportunities'],
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'profil-perso',
    cjsUid: 'seed-uid-23',
    turns: [
      {
        user: 'Qu’est-ce que tu sais de mon profil ?',
        assistant:
          'Ton profil indique ta région, ton niveau d’études et tes domaines d’intérêt. Tu veux le compléter pour de meilleures recommandations ?',
        tools: ['get_user_profile'],
        toolResume: 'données fournies : {region, niveauEtude, competences, domainesInteret}',
        blocs: ['text'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'reservation-confirmee',
    cjsUid: 'seed-uid-24',
    turns: [
      {
        user: 'Je veux réserver la salle informatique du centre demain à 15h.',
        assistant: 'Voici le récapitulatif : salle informatique, demain de 15h à 16h. Je confirme la réservation ?',
        tools: ['get_reservable_resources'],
        toolResume: '1 résultat(s) : Salle informatique (centre Pikine)',
        blocs: ['text', 'action'],
        rounds: 1,
      },
      {
        user: 'Oui je confirme.',
        assistant: 'C’est réservé ✅ Salle informatique, demain 15h. Tu recevras un rappel la veille.',
        tools: ['reserve_resource'],
        toolResume: 'Réservation créée : Salle informatique, demain 15h-16h',
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },

  // ── Conversations MULTI-OUTILS (plusieurs outils dans la même conversation) ──
  {
    id: 'perso-search',
    cjsUid: 'seed-uid-25',
    turns: [
      {
        user: 'Trouve-moi un emploi qui colle vraiment à mon profil.',
        assistant: 'D’après ton profil (informatique, niveau licence), voici 3 offres qui correspondent. Je te montre la plus proche ?',
        tools: ['get_user_profile', 'search_opportunities'],
        toolResumes: ['données fournies : {region, niveauEtude, competences}', '3 résultat(s) : Dev Web Dakar · Support IT · Data Junior'],
        blocs: ['text', 'opportunites'],
        rounds: 2,
      },
    ],
    feedback: 1,
  },
  {
    id: 'reco-apply',
    cjsUid: 'seed-uid-26',
    turns: [
      {
        user: 'Propose-moi des offres et aide-moi à postuler à la meilleure.',
        assistant: 'Voici 3 recommandations. La première — Assistant projet à Dakar — colle le mieux. On prépare ta candidature ?',
        tools: ['get_recommendations'],
        toolResume: '3 résultat(s) : Assistant projet Dakar · Stage RH · Bénévolat ONG',
        blocs: ['text', 'opportunites'],
        rounds: 1,
      },
      {
        user: 'Oui, postule à la première.',
        assistant: 'Récapitulatif : Assistant projet (Dakar) + ton CV et ta lettre. Je confirme l’envoi ?',
        tools: ['submit_application'],
        toolResume: 'Récapitulatif candidature : Assistant projet Dakar',
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'realtime-reco',
    cjsUid: 'seed-uid-27',
    turns: [
      {
        user: 'Où en sont mes candidatures, et propose-m’en d’autres.',
        assistant: 'Tu as 3 candidatures en cours. En complément, voici 2 nouvelles offres adaptées à ton profil — je te les montre ?',
        tools: ['get_realtime_data', 'get_recommendations'],
        toolResumes: ['données fournies : {candidatures, favoris}', '2 résultat(s) : Stage Compta · Emploi Logistique'],
        blocs: ['text', 'opportunites'],
        rounds: 2,
      },
    ],
    feedback: 1,
  },
  {
    id: 'gap-formation',
    cjsUid: 'seed-uid-28',
    turns: [
      {
        user: 'Qu’est-ce qu’il me manque pour ce poste, et où me former ?',
        assistant: 'Il te manque la comptabilité analytique. Deux formations du catalogue la couvrent — je te les propose ?',
        tools: ['query_knowledge_graph', 'search_opportunities'],
        toolResumes: ['écart : comptabilité analytique', '2 résultat(s) : Formation Compta · Certificat Gestion'],
        blocs: ['text', 'opportunites'],
        rounds: 2,
      },
      ],
    feedback: 1,
  },
  {
    id: 'badge-realtime',
    cjsUid: 'seed-uid-29',
    turns: [
      {
        user: 'Montre mon badge et dis-moi où en sont mes candidatures.',
        assistant: 'Voici ton badge à présenter à l’accueil. Côté candidatures : 1 retenue, 2 en cours. Tu veux les détails ?',
        tools: ['get_badge', 'get_realtime_data'],
        toolResumes: ['badge QR généré', 'données fournies : {candidatures}'],
        blocs: ['text', 'action'],
        rounds: 2,
      },
    ],
    feedback: 1,
  },
  {
    id: 'reserve-vehicule',
    cjsUid: 'seed-uid-30',
    turns: [
      {
        user: 'Je voudrais réserver un véhicule du centre pour vendredi matin.',
        assistant: 'Récapitulatif : véhicule utilitaire, vendredi 9h-12h. Je confirme la réservation ?',
        tools: ['get_reservable_resources'],
        toolResume: '1 résultat(s) : Véhicule utilitaire (centre Dakar)',
        blocs: ['text', 'action'],
        rounds: 1,
      },
      {
        user: 'Oui confirme.',
        assistant: 'C’est confirmé ✅ Véhicule utilitaire, vendredi 9h. Bonne route !',
        tools: ['reserve_resource'],
        toolResume: 'Réservation créée : Véhicule utilitaire, vendredi 9h-12h',
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'reserve-poste',
    cjsUid: 'seed-uid-31',
    turns: [
      {
        user: 'Réserve-moi un poste informatique pour cet après-midi.',
        assistant: 'Récapitulatif : poste informatique, aujourd’hui 14h-16h. Je confirme ?',
        tools: ['get_reservable_resources'],
        toolResume: '1 résultat(s) : Poste informatique 3 (centre Thiès)',
        blocs: ['text', 'action'],
        rounds: 1,
      },
      {
        user: 'Oui.',
        assistant: 'Réservé ✅ Poste informatique 3, aujourd’hui 14h.',
        tools: ['reserve_resource'],
        toolResume: 'Réservation créée : Poste informatique 3, 14h-16h',
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
  },

  // ── Renforcement (chaque outil noté sur ≥3 conversations) ──
  {
    id: 'kg-eligibilite',
    cjsUid: 'seed-uid-32',
    turns: [
      {
        user: 'Suis-je éligible à la bourse d’excellence ?',
        assistant: 'D’après ton niveau d’études, oui tu remplis les conditions principales. Veux-tu que je vérifie les pièces à fournir ?',
        tools: ['query_knowledge_graph'],
        toolResume: 'éligibilité : conditions de niveau remplies',
        blocs: ['text'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'profil-completer',
    cjsUid: 'seed-uid-33',
    turns: [
      {
        user: 'Mon profil est-il complet ?',
        assistant: 'Il manque tes expériences et un diplôme. Les ajouter améliorerait tes recommandations — tu veux le faire maintenant ?',
        tools: ['get_user_profile'],
        toolResume: 'données fournies : {completionScore, champsManquants}',
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
  },
  {
    id: 'badge-2',
    cjsUid: 'seed-uid-34',
    turns: [
      {
        user: 'J’ai besoin de mon QR code pour entrer au centre.',
        assistant: 'Le voici — présente ce QR code au scan de l’accueil. Il reste valable aujourd’hui.',
        tools: ['get_badge'],
        toolResume: 'badge QR généré (valide ce jour)',
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
  {
    id: 'submit-2',
    cjsUid: 'seed-uid-35',
    turns: [
      {
        user: 'Je veux candidater à la formation en agriculture.',
        assistant: 'Récapitulatif : Formation agriculture + ton dossier du profil. Je confirme la candidature ?',
        tools: ['submit_application'],
        toolResume: 'Récapitulatif candidature : Formation agriculture',
        blocs: ['text', 'action'],
        rounds: 1,
      },
    ],
    feedback: 1,
  },
]

const EVT = (
  sessionId: string,
  cjsUid: string,
  tsMs: number,
  typeEvenement: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  sessionId,
  cjsUid,
  role: 'beneficiaire',
  canal: 'web',
  tsMs: BigInt(tsMs),
  typeEvenement,
  createdAt: new Date(),
  ...extra,
})

async function purge() {
  await prisma.agentLog.deleteMany({ where: { sessionId: { startsWith: 'seed-' } } })
  await prisma.yayeTranscriptTurn.deleteMany({ where: { sessionId: { startsWith: 'seed-' } } })
  await prisma.yayeEvalScore.deleteMany({ where: { sessionId: { startsWith: 'seed-' } } })
  await prisma.yayeFeedback.deleteMany({ where: { sessionId: { startsWith: 'seed-' } } })
  await prisma.recommandationIA.deleteMany({ where: { raison: 'seed' } })
}

async function seedScenario(s: Scenario, baseMs: number) {
  const sessionId = `seed-${s.id}`
  let t = baseMs
  const logs: Record<string, unknown>[] = []
  logs.push(EVT(sessionId, s.cjsUid, (t += 100), 'session_ouverte', { payload: { roles: ['beneficiaire'] } }))

  s.turns.forEach((turn) => {
    logs.push(EVT(sessionId, s.cjsUid, (t += 100), 'message_recu', { payload: { longueur: turn.user.length } }))
    if (turn.tools.length) {
      logs.push(EVT(sessionId, s.cjsUid, (t += 300), 'intention_detectee', { payload: { outils: turn.tools } }))
      turn.tools.forEach((tool, i) => {
        const resume = turn.toolResumes?.[i] ?? (i === 0 ? turn.toolResume : undefined)
        logs.push(
          EVT(sessionId, s.cjsUid, (t += 500), 'api_appelee', {
            toolCalled: tool,
            statut: turn.apiEchec ? 'echec' : 'succes',
            payload: resume ? { args: '{}', resume } : { args: '{}' },
          }),
        )
      })
    }
    t += 1200 + Math.floor(Math.random() * 1500) // latence de génération réaliste
    logs.push(
      EVT(sessionId, s.cjsUid, t, 'reponse_generee', {
        payload: { longueur: turn.assistant.length, rounds: turn.rounds, blocs: turn.blocs },
      }),
    )
    logs.push(EVT(sessionId, s.cjsUid, (t += 80), 'contenu_transmis', { payload: { blocs: turn.blocs } }))
  })

  if (s.escalade) {
    logs.push(EVT(sessionId, s.cjsUid, (t += 100), 'escalade_conseiller', { payload: { raison: 'sujet_sensible' } }))
  }

  await prisma.agentLog.createMany({ data: logs as unknown as Prisma.AgentLogCreateManyInput[] })
  await prisma.yayeTranscriptTurn.createMany({
    data: s.turns.map((turn, idx) => ({
      sessionId,
      cjsUid: s.cjsUid,
      canal: 'web' as const,
      tourIndex: idx,
      userText: turn.user,
      assistantText: turn.assistant,
    })),
  })
  if (s.feedback) {
    await prisma.yayeFeedback.create({
      data: { sessionId, cjsUid: s.cjsUid, canal: 'web', tourIndex: 0, note: s.feedback },
    })
  }
}

async function seedConversions() {
  // Couche 4 réaliste : 5 recos consultées, 3 converties (paires réelles avec candidature)
  // + 2 non converties (opp sans aucune candidature → garanti non converti). Conversion 60 %.
  const cands = await prisma.candidature.findMany({ take: 3, select: { cjsUid: true, opportuniteId: true } })
  const oppZero = await prisma.opportunite.findFirst({ where: { candidatures: { none: {} } }, select: { id: true } })

  for (const c of cands) {
    await prisma.recommandationIA.create({
      data: { cjsUid: c.cjsUid, opportuniteId: c.opportuniteId, score: 0.9, vuePar: new Date(), raison: 'seed' },
    })
  }
  if (oppZero) {
    for (const c of cands.slice(0, 2)) {
      await prisma.recommandationIA.create({
        data: { cjsUid: c.cjsUid, opportuniteId: oppZero.id, score: 0.7, vuePar: new Date(), raison: 'seed' },
      })
    }
  }
}

async function main() {
  await purge()
  let base = 1_700_000_000_000
  for (const s of SCENARIOS) {
    await seedScenario(s, base)
    base += 100_000
  }
  await seedConversions()
  console.log(`✓ ${SCENARIOS.length} conversations seedées (cas : ${SCENARIOS.map((s) => s.id).join(', ')})`)
  console.log(`✓ feedback + recommandations consultées seedés`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
