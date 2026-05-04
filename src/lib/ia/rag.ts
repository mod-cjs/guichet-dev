// Pipeline RAG pour l'agent Aïssatou (Guichet Jeunesse)
// Architecture similaire à EduPop IA mais périmètre différent :
// Aïssatou répond sur les opportunités, événements et candidatures.
// EduPop/Fatou répond sur les contenus pédagogiques.

import Groq from 'groq-sdk'

// Instantiation différée — GROQ_API_KEY absent en build statique
let _groqClient: Groq | null = null
function getGroq(): Groq {
  if (!_groqClient) _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groqClient
}

export async function generateAgentResponse(
  userMessage: string,
  context: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const systemPrompt = `Tu es Aïssatou, l'assistante virtuelle du Guichet Jeunesse du Consortium Jeunesse Sénégal (CJS).
Tu aides les jeunes sénégalais à trouver des opportunités (emploi, stage, bourse, formation, volontariat),
à s'inscrire à des événements et à gérer leurs candidatures.
Réponds toujours en français, de manière concise et bienveillante.
Contexte disponible : ${context}`

  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ],
    max_tokens: 800,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content ?? "Je n'ai pas pu générer une réponse."
}
