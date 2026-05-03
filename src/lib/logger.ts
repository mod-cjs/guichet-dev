// Logger structuré — remplace console.log en production
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (process.env.NODE_ENV !== 'production' || level === 'warn') {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
}
