/**
 * Helper centralisé pour résoudre l'URL d'affichage de la photo de profil.
 *
 * GUIC-369 — Le storage Vercel Blob est privé (`access: 'private'`), donc on
 * passe systématiquement par le proxy `/api/profil/photo/file` qui injecte
 * `BLOB_READ_WRITE_TOKEN` côté serveur et vérifie l'authentification.
 *
 * Limite actuelle : ce proxy ne sert QUE la photo du user connecté (lookup
 * `prisma.profilJeune.findUnique({ where: { cjsUid: session.cjsUid } })`).
 * Pour afficher la photo d'un autre utilisateur (ex: conseiller → jeune), il
 * faudra étendre le proxy avec un paramètre `cjsUid` + ACL — hors scope.
 *
 * Le paramètre `cb` (cache-buster) prend le `cjsUid` du user : il change si
 * un autre user se connecte (forçage du refresh navigateur côté `<Image>`),
 * mais reste stable au sein d'une session, ce qui permet à Next.js de
 * mémoriser l'image.
 *
 * GUIC-447 — On ne construit l'URL que si une photo existe réellement
 * (`hasPhoto`). Auparavant l'URL était toujours produite dès qu'un `cjsUid`
 * était présent, et le proxy renvoyait un 404 (bruyant en console) quand le
 * jeune n'avait pas de photo. Le `hasPhoto` provient de `ProfilJeune.photoUrl`
 * (cf `getHasProfilePhoto`), threadé par les layouts serveur.
 *
 * @returns L'URL proxy stable si `cjsUid` ET `hasPhoto`, sinon `undefined` →
 *   l'`<Avatar>` consommateur retombe sur les initiales (sans requête réseau).
 */
export function getProfilePhotoUrl(cjsUid?: string | null, hasPhoto = false): string | undefined {
  if (!cjsUid || !hasPhoto) return undefined
  return `/api/profil/photo/file?cb=${encodeURIComponent(cjsUid)}`
}
