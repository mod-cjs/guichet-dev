// M13 / Data Hub — stub RED (GUIC-696) : signatures posées, comportement pas encore correct.
export class BadSinceError extends Error {}

export function parseSince(raw: string | null): Date | null {
  return raw === null ? null : new Date(raw)
}
