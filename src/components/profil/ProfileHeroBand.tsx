/**
 * <ProfileHeroBand /> — bandeau d'identité du profil jeune (GUIC-689, É-17).
 *
 * Squelette posé avec les tests RED : la barrière `tsc` du hook pre-commit
 * refuse un test qui importe un module inexistant. Le comportement arrive
 * au commit GREEN — ce rendu vide fait bien échouer les tests.
 */
export interface ProfileHeroBandProps {
  prenom: string | null
  nom: string | null
  cjsUid: string
  photoUrl: string | null
  completionScore: number
  region: string | null
  dateNaissance: string | null
  genre: string | null
  niveauEtude: string | null
  membreDepuis: string | null
}

export function ProfileHeroBand(_props: ProfileHeroBandProps) {
  return null
}
