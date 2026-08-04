export interface DocumentsCardProps {
  cvUrl: string | null
  cvUploadedAt: string | null
  diplomes: { id: string; intitule: string; fichierUrl: string | null }[]
  certificats: { id: string; formation: string; fichierUrl: string | null; urlCertificat: string | null }[]
}

/** GUIC-689 — contrat posé, rendu non implémenté (voir le test associé). */
export function DocumentsCard(_props: DocumentsCardProps) {
  return null
}
