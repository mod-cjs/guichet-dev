import { createHash, createHmac } from 'node:crypto'

export interface SSOApiConfig {
  baseUrl:       string
  apiKey:        string
  apiSecret:     string
  adminToken:    string  // Bearer token Passport avec scope admin
  retryDelayMs?: number  // défaut 1000 — backoff entre tentatives 5xx
}

export interface BulkUser {
  drupal_uid?:     number
  phone?:          string | null
  email?:          string | null
  first_name:      string
  last_name:       string
  gender?:         'M' | 'F' | null
  date_of_birth?:  string | null  // YYYY-MM-DD
  region?:         string | null
  commune?:        string | null
  source_platform: string
  import_batch?:   string | null
  centre_id?:      number | null
}

export interface BulkResult {
  uuid?:       string
  cjs_uid?:    string
  drupal_uid?: number | null
  phone?:      string | null
  created?:    boolean
  error?:      string
}

export interface BulkResponse {
  results: BulkResult[]
}

export interface UpdateUserPayload {
  phone?:         string | null
  first_name?:    string
  last_name?:     string
  gender?:        'M' | 'F' | null
  date_of_birth?: string | null
  region?:        string | null
  commune?:       string | null
}

export interface UpdateOptions {
  onlyIfNull?: boolean
  silent?:     boolean
}

const BULK_BATCH_SIZE = 500
const MAX_RETRIES     = 3

export class SSOApiClient {
  private readonly cfg: Required<SSOApiConfig>

  constructor(cfg: SSOApiConfig) {
    if (!cfg.apiKey)     throw new Error('SSOApiClient: apiKey requis')
    if (!cfg.apiSecret)  throw new Error('SSOApiClient: apiSecret requis')
    if (!cfg.adminToken) throw new Error('SSOApiClient: adminToken requis')
    if (!cfg.baseUrl)    throw new Error('SSOApiClient: baseUrl requis')

    this.cfg = {
      baseUrl:      cfg.baseUrl.replace(/\/$/, ''),
      apiKey:       cfg.apiKey,
      apiSecret:    cfg.apiSecret,
      adminToken:   cfg.adminToken,
      retryDelayMs: cfg.retryDelayMs ?? 1000,
    }
  }

  async provisionBulk(users: BulkUser[]): Promise<BulkResponse> {
    if (users.length === 0) return { results: [] }

    const aggregated: BulkResult[] = []
    for (let i = 0; i < users.length; i += BULK_BATCH_SIZE) {
      const chunk = users.slice(i, i + BULK_BATCH_SIZE)
      const res   = await this.request<BulkResponse>('POST', '/users/provision/bulk', { users: chunk })
      aggregated.push(...res.results)
    }
    return { results: aggregated }
  }

  /**
   * Retourne null si l'utilisateur est introuvable (404), pour ne pas casser
   * une itération de masse. Toute autre erreur (422, 5xx après retries) est propagée.
   */
  async updateUser(
    uuid: string,
    payload: UpdateUserPayload,
    opts: UpdateOptions = {},
  ): Promise<unknown | null> {
    const body: Record<string, unknown> = { ...payload }
    if (opts.onlyIfNull) body.only_if_null = true
    if (opts.silent)     body.silent       = true

    try {
      return await this.request('PATCH', `/users/${encodeURIComponent(uuid)}`, body)
    } catch (e) {
      if (e instanceof SSOApiError && e.status === 404) return null
      throw e
    }
  }

  private async request<T>(method: string, path: string, body: unknown): Promise<T> {
    const url    = `${this.cfg.baseUrl}${path}`
    const bodyStr = JSON.stringify(body)
    let lastErr: unknown

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const headers = this.buildHeaders(bodyStr)
      const resp    = await fetch(url, { method, headers, body: bodyStr })

      if (resp.ok) return (await resp.json()) as T

      // Retry uniquement sur 5xx
      if (resp.status >= 500 && attempt < MAX_RETRIES) {
        lastErr = new SSOApiError(resp.status, await safeText(resp))
        await sleep(this.cfg.retryDelayMs * attempt)
        continue
      }

      throw new SSOApiError(resp.status, await safeText(resp))
    }
    throw lastErr ?? new Error('SSOApiClient: échec sans erreur capturée')
  }

  private buildHeaders(body: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const bodyHash  = createHash('sha256').update(body).digest('hex')
    const message   = `${this.cfg.apiKey}\n${timestamp}\n${bodyHash}`
    const signature = createHmac('sha256', this.cfg.apiSecret).update(message).digest('hex')

    return {
      'X-CJS-Api-Key':   this.cfg.apiKey,
      'X-CJS-Timestamp': timestamp,
      'X-CJS-Signature': signature,
      'Authorization':   `Bearer ${this.cfg.adminToken}`,
      'Content-Type':    'application/json',
      'Accept':          'application/json',
    }
  }
}

export class SSOApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`SSO API error ${status}: ${body.slice(0, 200)}`)
    this.name = 'SSOApiError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function safeText(r: Response): Promise<string> {
  try { return await r.text() } catch { return '' }
}
