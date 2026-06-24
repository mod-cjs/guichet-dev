// Variété conversationnelle de Yaye (greetings + amorces de conversation).
// But : Yaye ne démarre pas toujours pareil — la salutation ET les suggestions
// varient d'une ouverture à l'autre. Utilisé par le drawer (YayeConversation) et
// la page mobile (YayeChat). Pur (testable) : `rng` injectable pour le déterminisme.
//
// ⚠️ Pas d'emoji (cf. system prompt agent.ts). La variété 0 reste canonique
// (« Salama … » + « Une offre pour moi ») pour des tests stables avec rng=()=>0.

/** Suggestion = quick reply { label affiché, value envoyée à l'agent }. */
export interface YayeSuggestion {
  label: string
  value: string
}

type GreetingFn = (prenom?: string) => string

/** Suffixe prénom (avec espace) ou chaîne vide si absent. */
const n = (p?: string) => (p?.trim() ? ` ${p.trim()}` : '')

/** Pool de salutations — la salutation ET la formulation varient. */
const GREETINGS: GreetingFn[] = [
  p => `Salama${n(p)}. Je suis Yaye. Dis-moi ce que tu cherches — une opportunité, une formation, ou bien où en sont tes candidatures.`,
  p => `Salam${n(p)} ! Moi c'est Yaye. Tu cherches une opportunité, une formation, ou tu veux suivre tes candidatures ?`,
  p => `Asalaa malekum${n(p)}. Yaye, à ton écoute. On commence par quoi — une offre, une formation, ou tes candidatures ?`,
  p => `Na nga def${n(p)} ? C'est Yaye. Dis-moi ton besoin : une opportunité, une formation, ou l'état de tes candidatures.`,
  p => `Bonjour${n(p)} ! Je suis Yaye, ta conseillère. On regarde une opportunité, une formation, ou tes candidatures ?`,
  p => `Salama${n(p)}, contente de te retrouver. Yaye est là pour t'aider — une offre, une formation, ou tes candidatures ?`,
]

/** Pool d'amorces de conversation — les boutons proposés varient aussi. */
const SUGGESTION_SETS: YayeSuggestion[][] = [
  [
    { label: 'Une offre pour moi', value: 'Trouve-moi une opportunité adaptée à mon profil' },
    { label: 'Une formation', value: 'Je cherche une formation près de chez moi' },
    { label: 'Mes candidatures', value: 'Où en sont mes candidatures ?' },
  ],
  [
    { label: 'Un stage près de chez moi', value: 'Trouve-moi un stage près de chez moi' },
    { label: 'Des bourses', value: 'Quelles bourses sont disponibles pour moi ?' },
    { label: 'Mon badge CJS', value: 'Montre-moi mon badge CJS' },
  ],
  [
    { label: 'Suis-je prêt pour une offre ?', value: 'Pour une offre qui m’intéresse, qu’est-ce qui me manque ?' },
    { label: 'Réserver une salle', value: 'Je veux réserver une salle dans un centre' },
    { label: 'Une opportunité pour moi', value: 'Que me conseilles-tu comme opportunité ?' },
  ],
  [
    { label: 'Une opportunité adaptée', value: 'Trouve-moi une opportunité adaptée à mon profil' },
    { label: 'Une formation utile', value: 'Quelle formation m’aiderait à progresser ?' },
    { label: 'Parler à un conseiller', value: 'Je veux parler à un conseiller du CJS' },
  ],
]

const at = (len: number, rng: () => number) => Math.min(len - 1, Math.max(0, Math.floor(rng() * len)))

/** Greeting varié (rng injectable ; rng=()=>0 → variante canonique « Salama … »). */
export function pickGreeting(prenom?: string, rng: () => number = Math.random): string {
  return GREETINGS[at(GREETINGS.length, rng)](prenom)
}

/** Amorces de conversation variées (rng=()=>0 → set canonique « Une offre pour moi … »). */
export function pickSuggestions(rng: () => number = Math.random): YayeSuggestion[] {
  return SUGGESTION_SETS[at(SUGGESTION_SETS.length, rng)]
}
