'use client'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui'
import { OpportuniteDetail } from './OpportuniteDetail'
import type { ViewerInfo } from './CandidatureModal'
import type { YayeMatch } from './YayeMatchCard'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

/** Détail en slide-over / bottom-sheet — rendu par la route interceptée (@modal). */
export function DetailSheet({
  detail,
  viewer,
  matchScore,
}: {
  detail: Detail
  viewer: ViewerInfo | null
  /** Score Yaye réel, lu côté serveur par la route interceptée (GUIC-689 P2). */
  matchScore?: YayeMatch | null
}) {
  const router = useRouter()
  return (
    <Sheet isOpen onClose={() => router.back()} variant="side">
      <Suspense fallback={null}>
        <OpportuniteDetail
          detail={detail}
          viewer={viewer}
          matchScore={matchScore}
          onClose={() => router.back()}
        />
      </Suspense>
    </Sheet>
  )
}
