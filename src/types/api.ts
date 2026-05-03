export interface ApiMeta {
  total?: number
  page?: number
  limit?: number
  generated_at?: string
}

export interface ApiResponse<T = unknown> {
  data?: T
  meta?: ApiMeta
  error?: { code: string; message: string }
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
