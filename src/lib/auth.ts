import { cookies } from 'next/headers'

export interface CJSSession {
  cjsUid: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  region: string | null
  roles: string[]
  accessToken: string
  expiresAt: number
}

// Récupère la session depuis le cookie Next.js
// À remplacer par next-auth v5 une fois le SSO branché
export async function getSession(): Promise<CJSSession | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('cjs_session')
    if (!sessionCookie?.value) return null
    const session = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    ) as CJSSession
    if (Date.now() / 1000 > session.expiresAt) return null
    return session
  } catch {
    return null
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null
}

export async function hasRole(role: string): Promise<boolean> {
  const session = await getSession()
  return session?.roles.includes(role) ?? false
}
