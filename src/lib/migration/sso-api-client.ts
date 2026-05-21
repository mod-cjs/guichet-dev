import { createHash, createHmac, randomUUID } from 'node:crypto'

export interface SSOApiConfig {
  baseUrl:         string
  apiKey:          string
  apiSecret:       string
  adminToken:      string  // Bearer token Passport avec scope admin
  retryDelayMs?:   number  // défaut 1000 — backoff entre tentatives 5xx
  pollIntervalMs?: number  // défaut 2000 — intervalle de polling du statut bulk
  bulkTimeoutMs?:  number  // défaut 30 min — délai max d'attente d'un lot bulk
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

/** Réponse 202 du POST bulk asynchrone (GUIC-17). */
export interface BulkSubmitResponse {
  batch_id: string
  status:   string
  total:    number
}

/** Réponse du polling GET /users/provision/bulk/{batch}. */
export interface BulkStatusResponse {
  batch_id:  string
  status:    'queued' | 'processing' | 'completed' | 'failed'
  total:     number
  processed: number
  results:   BulkResult[]
  error?:    string
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

// Lots de 500 par défaut. Configurable via SSO_BULK_BATCH_SIZE : le hachage
// bcrypt côté SSO est coûteux et un trop gros lot peut dépasser le
// max_execution_time PHP — réduire la taille du lot dans ce cas.
const BULK_BATCH_SIZE       = Number(process.env.SSO_BULK_BATCH_SIZE) || 500
const MAX_RETRIES           = 3
const MAX_RATE_LIMIT_WAITS  = 20

export class SSOApiClient {
  private readonly cfg: Required<SSOApiConfig>

  constructor(cfg: SSOApiConfig) {
    if (!cfg.apiKey)     throw new Error('SSOApiClient: apiKey requis')
    if (!cfg.apiSecret)  throw new Error('SSOApiClient: apiSecret requis')
    if (!cfg.adminToken) throw new Error('SSOApiClient: adminToken requis')
    if (!cfg.baseUrl)    throw new Error('SSOApiClient: baseUrl requis')

    this.cfg = {
      baseUrl:        cfg.baseUrl.replace(/\/$/, ''),
      apiKey:         cfg.apiKey,
      apiSecret:      cfg.apiSecret,
      adminToken:     cfg.adminToken,
      retryDelayMs:   cfg.retryDelayMs   ?? 1000,
      pollIntervalMs: cfg.pollIntervalMs ?? 5000,
      bulkTimeoutMs:  cfg.bulkTimeoutMs  ?? 30 * 60 * 1000,
    }
  }

  /**
   * Provisioning bulk asynchrone (GUIC-17) : le POST renvoie 202 + batch_id,
   * le traitement tourne dans un job côté SSO. On poll le statut jusqu'à
   * complétion, par lots de BULK_BATCH_SIZE.
   */
  async provisionBulk(users: BulkUser[]): Promise<BulkResponse> {
    if (users.length === 0) return { results: [] }

    const aggregated: BulkResult[] = []
    for (let i = 0; i < users.length; i += BULK_BATCH_SIZE) {
      const chunk  = users.slice(i, i + BULK_BATCH_SIZE)
      const submit = await this.request<BulkSubmitResponse>('POST', '/users/provision/bulk', { users: chunk })
      const final  = await this.pollBulkStatus(submit.batch_id)
      aggregated.push(...final.results)
    }
    return { results: aggregated }
  }

  /** Poll le statut d'un lot bulk jusqu'à `completed` ; throw sur `failed` ou timeout. */
  private async pollBulkStatus(batchId: string): Promise<BulkStatusResponse> {
    const deadline = Date.now() + this.cfg.bulkTimeoutMs
    for (;;) {
      const status = await this.request<BulkStatusResponse>('GET', `/users/provision/bulk/${batchId}`)

      if (status.status === 'completed') return status
      if (status.status === 'failed') {
        throw new Error(`Provisioning bulk échoué (lot ${batchId}) : ${status.error ?? 'erreur inconnue'}`)
      }
      if (Date.now() >= deadline) {
        throw new Error(`Provisioning bulk : délai dépassé (lot ${batchId}, statut « ${status.status} »)`)
      }
      await sleep(this.cfg.pollIntervalMs)
    }
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

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url     = `${this.cfg.baseUrl}${path}`
    // Corps absent (GET) → hash de chaîne vide, conforme à VerifyApiSignature.
    const hasBody = body !== undefined
    const bodyStr = hasBody ? JSON.stringify(body) : ''
    let serverErrors   = 0  // tentatives consommées sur 5xx
    let rateLimitWaits = 0  // attentes sur 429 (n'entament pas le budget 5xx)

    for (;;) {
      const headers = this.buildHeaders(bodyStr)
      const init: RequestInit = { method, headers }
      if (hasBody) init.body = bodyStr
      const resp    = await fetch(url, init)

      if (resp.ok) return (await resp.json()) as T

      // 429 : respecter retry_after et réessayer — le throttle est transitoire.
      if (resp.status === 429 && rateLimitWaits < MAX_RATE_LIMIT_WAITS) {
        rateLimitWaits++
        await sleep(await this.parseRetryAfterMs(resp))
        continue
      }

      // Retry uniquement sur 5xx
      if (resp.status >= 500 && serverErrors < MAX_RETRIES - 1) {
        serverErrors++
        await sleep(this.cfg.retryDelayMs * serverErrors)
        continue
      }

      throw new SSOApiError(resp.status, await safeText(resp))
    }
  }

  /** Délai d'attente sur 429 : header Retry-After ou champ retry_after du corps. */
  private async parseRetryAfterMs(resp: Response): Promise<number> {
    const header = Number(resp.headers.get('Retry-After'))
    if (Number.isFinite(header) && header > 0) return header * 1000
    try {
      const body = await resp.clone().json() as { retry_after?: number }
      if (typeof body.retry_after === 'number' && body.retry_after > 0) {
        return body.retry_after * 1000
      }
    } catch { /* corps non-JSON — défaut ci-dessous */ }
    return 60_000
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
      // Nonce unique : deux GET de statut (corps vide) dans la même seconde
      // produiraient sinon la même signature → faux positif anti-rejeu.
      'X-CJS-Nonce':     randomUUID(),
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
