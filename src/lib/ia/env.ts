// Lecture des variables de TUNING de Yaye (GUIC-676/677/678).
//
// Convention du repo (cf. `agent.ts`, `llm-client.ts`) : les variables OBLIGATOIRES sont
// lues en accès direct (`process.env.X`) et documentées non commentées dans `.env.example` ;
// les variables de TUNING, elles, sont optionnelles — lues par nom, avec une valeur par
// défaut dans le code, et documentées en commentaire. Ce module factorise cette lecture
// pour les modules du Knowledge Graph au lieu de re-dupliquer un `numEnv` local.

/** Nombre lu depuis l'environnement, avec repli si absent ou non numérique. */
export function numEnv(name: string, def: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return def
  const v = Number(raw)
  return Number.isFinite(v) ? v : def
}

/** Chaîne non vide lue depuis l'environnement, ou `null`. */
export function strEnv(name: string): string | null {
  const raw = process.env[name]?.trim()
  return raw ? raw : null
}
