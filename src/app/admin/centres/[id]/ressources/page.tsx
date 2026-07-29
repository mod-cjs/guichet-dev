import { permanentRedirect } from 'next/navigation'

/**
 * GUIC-687 — l'écran Ressources d'un centre est désormais un onglet de la fiche
 * Centre. Cette route historique redirige (308) vers l'onglet pour préserver les
 * liens entrants existants.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  permanentRedirect(`/admin/centres/${id}?tab=ressources`)
}
