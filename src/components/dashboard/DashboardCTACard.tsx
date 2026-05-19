import Link from 'next/link'
import { IconChevron } from './icons'
import type { ReactNode } from 'react'

interface Props {
  href:        string
  title:       string
  description: string
  icon:        ReactNode
}

export function DashboardCTACard({ href, title, description, icon }: Props) {
  return (
    <Link
      href={href}
      className="bg-white rounded-gj-md border border-gj-line p-space-4
        hover:border-gj-teal-deep hover:shadow-sm transition-all
        flex items-start gap-space-3"
    >
      <div className="text-gj-teal-deep flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-fs-300 text-color-text-primary">{title}</p>
        <p className="text-fs-200 text-color-text-secondary mt-space-1">{description}</p>
      </div>
      <div className="text-gj-grey flex-shrink-0 mt-[2px]"><IconChevron /></div>
    </Link>
  )
}
