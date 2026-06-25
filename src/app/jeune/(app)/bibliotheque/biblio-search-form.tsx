'use client'

import { Input, Select, Button } from '@/components/ui'

interface Props {
  defaultQ: string
  defaultTheme: string
  themes: string[]
}

export function BiblioSearchForm({ defaultQ, defaultTheme, themes }: Props) {
  return (
    <form
      method="GET"
      action="/jeune/bibliotheque"
      className="flex flex-col sm:flex-row gap-space-3 bg-white border-[1.5px] border-gj-line rounded-gj-lg p-space-4"
    >
      <div className="flex-1">
        <Input
          id="biblio-q"
          name="q"
          defaultValue={defaultQ}
          placeholder="Titre, auteur, ISBN…"
          prefixIcon="search"
          aria-label="Rechercher un livre"
        />
      </div>
      <div className="sm:w-48">
        <Select
          id="biblio-theme"
          name="theme"
          defaultValue={defaultTheme}
          placeholder="Tous les thèmes"
          aria-label="Filtrer par thème"
          options={themes.map((t) => ({ value: t, label: t }))}
        />
      </div>
      <Button type="submit" variant="primary" size="md">
        Rechercher
      </Button>
      {(defaultQ || defaultTheme) && (
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => {
            window.location.href = '/jeune/bibliotheque'
          }}
        >
          Effacer
        </Button>
      )}
    </form>
  )
}
