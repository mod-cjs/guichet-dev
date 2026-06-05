'use client'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui'
import { OpportuniteDetail } from './OpportuniteDetail'
import type { ViewerInfo } from './CandidatureModal'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

/** Détail en slide-over / bottom-sheet — rendu par la route interceptée (@modal). */
export function DetailSheet({ detail, viewer }: { detail: Detail; viewer: ViewerInfo | null }) {
  const router = useRouter()
  return (
    <Sheet isOpen onClose={() => router.back()} variant="side">
      <Suspense fallback={null}>
        <OpportuniteDetail detail={detail} viewer={viewer} onClose={() => router.back()} />
      </Suspense>
    </Sheet>
  )
}
