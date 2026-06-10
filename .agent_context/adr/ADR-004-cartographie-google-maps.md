# ADR-004 — Cartographie : Google Maps JavaScript API

**Date** : 2026-06-09
**Statut** : Accepté (verrouille spec M4-centres-lot7.md §3.3)
**Décideurs** : PO 2026-06-09

## Contexte

Le Lot 7 affiche les centres CJS sur 2 types de cartes :
1. **Carte large desktop** (vue `all`) — vue d'ensemble Sénégal avec annuaire à droite
2. **Mini-map detail** (vue `detail`) — position d'un centre spécifique
3. **Map mock landing mobile** (`mobile-centres.jsx`) — vue Google-style avec recentrage

Options évaluées :
- **(a)** Google Maps JS API (clé fournie par PO)
- **(b)** Leaflet + tuiles OSM (gratuit, open-source)
- **(c)** Mapbox GL (payant, plus joli)
- **(d)** SenegalMap SVG statique (déjà existant dans le design)

## Décision

**Stratégie hybride** :

| Contexte | Solution |
|---|---|
| Vue `all` desktop | `<CentresMapGoogle>` — Google Maps JS API |
| Vue `all` mobile | `<CentresMapGoogle>` — Google Maps JS API |
| Mini-map vue `detail` (desktop + mobile) | `<SenegalMap>` SVG statique (léger) |
| Landing mobile (`mobile-centres.jsx`) | `<CentresMapGoogle>` — Google Maps JS API |

### Configuration

- Variable env **côté client** : `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
- Clé fournie 2026-06-09 par PO (à restreindre côté GCP Console)
- **Restrictions GCP obligatoires** :
  - HTTP referrers : `*.guichetjeunesse.sn/*`, `*.vercel.app/*`, `localhost:3000/*`
  - APIs : Maps JavaScript API uniquement (+ Geocoding API si futur)
  - Quota : 28 000 chargements/mois gratuit (Google Cloud free tier)

### Loading strategy

- Lazy load via `next/dynamic` avec `ssr: false`
- Pas d'init au mount initial — `IntersectionObserver` pour init si visible
- Fallback skeleton + alternative liste a11y obligatoire (cf ADR-005 / a11y)

### Fallback a11y

Toute carte interactive **doit** avoir une **alternative liste textuelle** :
- Annuaire à droite (déjà présent dans design vue `all`)
- Liste des centres ordonnée par région (mobile)
- Liens `tel:` + `geo:` deeplink sur chaque centre (skip carte)

### Markers

- Pin teal `gj-teal-deep` pour centres normaux
- Pin rouge avec halo pulsé pour le `centrePrincipal` du user connecté
- Click pin → callback `onPinClick(centreId)` → navigation `/centres/[slug]`
- `aria-label` sur chaque marker : "Centre CJS Tambacounda, cliquer pour détails"

## Conséquences

### Positives
- ✅ UX cohérente (Google Maps reconnu universellement, même pattern que Uber/Yango)
- ✅ Itinéraire deeplink natif vers app Google Maps (mobile)
- ✅ Tuiles haute qualité + zoom fluide
- ✅ Clé fournie par PO → pas de friction approvisionnement

### Négatives
- ❌ Dépendance externe Google → si quota dépassé, fallback dégradé requis
  - **Mitigation** : monitoring quota + alerting + fallback `<SenegalMap>` SVG si erreur 403
- ❌ Bundle size +~50 KB gz (Google Maps loader)
  - **Mitigation** : lazy load + code-splitting par route
- ❌ Privacy : Google reçoit IP user + coordonnées affichées
  - **Mitigation** : documenté dans CGU + politique cookies + opt-in CDP

## Implémentation Wave 1

Composant `<CentresMapGoogle>` :
```tsx
interface Props {
  centres: Array<{ id: string; nom: string; latitude: number; longitude: number }>
  activeId?: string                   // pin halo pulsé
  onPinClick?: (centreId: string) => void
  height?: number                     // default 460 desktop / 230 mobile
  zoom?: number                       // default 6 (Sénégal entier)
  className?: string
  /** Alternative texte obligatoire pour a11y — list of CenterId × label */
  centresForList: Array<{ id: string; nom: string; region: string }>
}
```

- `'use client'` strict (hooks Google Maps incompatible SSR)
- `next/dynamic({ ssr: false })` au callsite
- Loader Google Maps via `@googlemaps/js-api-loader` (officiel, léger)
- `useEffect` init + cleanup map instance
- Skeleton tant que carte non chargée
- Liste a11y `aria-label="Liste alternative à la carte"` rendue en parallèle (visible si `prefers-reduced-motion` ou erreur carte)

## Alternatives rejetées

- **Leaflet + OSM** : moins reconnu côté Sénégal, deeplink itinéraire pas natif iOS
- **Mapbox** : payant, pas de justification pour MVP
- **SVG SenegalMap partout** : insuffisant pour vue `all` desktop (besoin pan/zoom)

## Liens

- Spec §3.3
- Tickets : GUIC-352 (W1 composants), GUIC-353 (W2 intégration vue `all`)
- ADR-005 (KPI événementiel pour `centre_map_pin_clicked`)
- Documentation env vars : `docs/lot7-env-vars.md` (W1)
