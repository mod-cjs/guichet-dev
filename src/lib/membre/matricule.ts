/** GUIC-689 — contrat posé, comportement non implémenté (voir le test associé). */
export function lettreControle(_base: string): string {
  return 'A'
}

export function genererMatricule(_inscritLe: Date): string {
  return 'GJ-0000-00000A'
}

export function matriculeValide(_m: string): boolean {
  return false
}
