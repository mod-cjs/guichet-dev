'use client'

interface CompletionBarProps {
  score: number
}

function couleur(score: number): string {
  if (score >= 80) return 'bg-gj-teal'
  if (score >= 50) return 'bg-gj-yellow'
  return 'bg-gj-red'
}

export function CompletionBar({ score }: CompletionBarProps) {
  return (
    <div className="flex flex-col gap-space-1">
      <div className="flex justify-between items-center">
        <span className="text-fs-200 text-color-text-secondary">Complétion du profil</span>
        <span className="text-fs-300 font-bold text-color-text-primary">{score}%</span>
      </div>
      <div className="w-full h-2 bg-gj-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${couleur(score)}`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
