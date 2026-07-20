/** GUIC-596 — libellés FR des enums de veille (partagés liste + formulaire). */

export const LIBELLES_METHODE: Record<string, string> = {
  auto: 'Auto (cascade)',
  jsonld: 'JSON-LD',
  rss: 'RSS / Atom',
  api: 'API',
  html_selecteurs: 'Sélecteurs HTML',
  article_regex: 'Article + regex',
}

export const LIBELLES_FREQUENCE: Record<string, string> = {
  horaire: 'Toutes les heures',
  six_heures: 'Toutes les 6 h',
  quotidienne: 'Quotidienne',
  hebdomadaire: 'Hebdomadaire',
}
