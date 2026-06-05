import { createHash } from 'crypto'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

/**
 * Hash court (8 hex chars) d'un identifiant pour logs sans PII.
 * Utilisé pour tracer un `cjsUid` sans l'exposer en clair dans les logs.
 * Cf CLAUDE.md / GUIC-218 (audit CDP).
 */
export function hashId(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 8)
}


function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  }
  const line = JSON.stringify(entry)

  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(line)
  } else {
    // info + debug → stdout structuré en prod pour collecte par OVH log agent
    process.stdout.write(line + '\n')
  }
}

export const logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
}
