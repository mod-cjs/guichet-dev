import { prisma } from '@/lib/prisma'

/**
 * Indique si le jeune a une photo de profil enregistrée (GUIC-447).
 *
 * Source de vérité : `ProfilJeune.photoUrl`. Utilisé par les layouts serveur
 * (topbar mobile, sidebar desktop) pour ne threader l'URL proxy
 * `/api/profil/photo/file` que lorsqu'une photo existe — évite le 404 console.
 */
export async function getHasProfilePhoto(cjsUid: string): Promise<boolean> {
  const profil = await prisma.profilJeune.findUnique({
    where:  { cjsUid },
    select: { photoUrl: true },
  })
  return Boolean(profil?.photoUrl)
}
