import { Fragment, type ReactNode } from 'react'

/**
 * Rendu « markdown-lite » des réponses texte de Yaye (Option C — structure légère).
 * Volontairement minimal et sûr (aucun HTML injecté) : seules deux marques sont
 * interprétées, en accord avec le prompt de l'agent —
 *  - **gras** : `**mot**`
 *  - puces   : lignes commençant par `- ` → liste à puces
 * Tout le reste est rendu tel quel. Pas de tableaux, titres, liens : non supportés
 * (le prompt les interdit ; un éventuel `#` ou `|` s'affiche littéralement).
 */

/** Découpe une ligne en segments gras/non-gras (`**…**`). */
function renderInline(line: string, keyBase: string): ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part)
    return m ? <strong key={`${keyBase}-${i}`}>{m[1]}</strong> : <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>
  })
}

export function YayeText({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = () => {
    if (bullets.length === 0) return
    const items = bullets
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-space-4 flex flex-col gap-space-1">
        {items.map((b, i) => (
          <li key={i}>{renderInline(b, `li-${out.length}-${i}`)}</li>
        ))}
      </ul>,
    )
    bullets = []
  }

  lines.forEach((raw, idx) => {
    const bullet = /^\s*[-•]\s+(.*)$/.exec(raw)
    if (bullet) {
      bullets.push(bullet[1])
      return
    }
    flushBullets()
    if (raw.trim()) out.push(<p key={`p-${idx}`}>{renderInline(raw, `p-${idx}`)}</p>)
  })
  flushBullets()

  return <div className="flex flex-col gap-space-1">{out}</div>
}
