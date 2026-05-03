// Types liés à la session SSO — indépendants du modèle de données
export interface CJSSession {
  cjsUid: string       // UUID v4 — identifiant universel CJS (= claim "sub" du SSO)
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  region: string | null
  roles: string[]
  accessToken: string
  expiresAt: number    // timestamp Unix
}

export type UserRole = 'beneficiaire' | 'recruteur' | 'admin' | 'data_steward'
