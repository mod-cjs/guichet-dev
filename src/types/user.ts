// Types liés à la session SSO — indépendants du modèle de données
export interface CJSSession {
  cjsUid: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  region: string | null
  roles: string[]
  accessToken: string
  refreshToken: string
  expiresAt: number
  onboardingComplete: boolean
}

export type UserRole = 'beneficiaire' | 'recruteur' | 'admin' | 'data_steward'
