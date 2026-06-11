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
 * @returns L'URL proxy stable si `cjsUid` est fourni, sinon `undefined` →
 *   l'`<Avatar>` consommateur retombe sur les initiales.
 */
export function getProfilePhotoUrl(cjsUid?: string | null): string | undefined {
  if (!cjsUid) return undefined
  return `/api/profil/photo/file?cb=${encodeURIComponent(cjsUid)}`
}
