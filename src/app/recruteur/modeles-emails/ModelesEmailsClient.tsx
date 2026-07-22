'use client'

import { TemplatesEditor } from '@/components/notifications/TemplatesEditor'
import type { ResolvedTemplate } from '@/lib/email/templates-defs'
import { enregistrerMonTemplate, reinitialiserMonTemplate } from './actions'

export function ModelesEmailsClient({ initial }: { initial: ResolvedTemplate[] }) {
  return (
    <TemplatesEditor
      initial={initial}
      save={enregistrerMonTemplate}
      reset={reinitialiserMonTemplate}
      resetHint={['recruteur']}
    />
  )
}
