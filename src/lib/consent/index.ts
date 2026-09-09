// GUIC-712 — Consentement aux cookies.
//
// `client.ts` et `server.ts` ne sont PAS ré-exportés ici : un barrel qui les réunirait
// ferait entrer `next/headers` dans le bundle navigateur dès qu'un composant client
// importerait le domaine. Les importer par leur chemin est le prix de cette séparation.

export * from './cookies'
export * from './traceurs'
