export interface ApiMeta {
  total?: number
  page?: number
  limit?: number
  generated_at?: string
}

export interface ApiResponse<T = unknown> {
  data?: T
  meta?: ApiMeta
  /**
   * Erreur normalisée. `code` et `message` sont obligatoires ; les
   * propriétés additionnelles (ex. `missing` pour `PROFILE_INCOMPLETE`,
   * `retryAfter`, etc.) sont autorisées pour des cas spécifiques.
   */
  error?: { code: string; message: string; [k: string]: unknown }
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
