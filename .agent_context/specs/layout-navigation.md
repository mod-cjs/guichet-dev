# Spec — Architecture Layout & Navigation

**Décision initiale :** 2026-05-05 (GUIC-15)
**Révision majeure :** 2026-05-19 (GUIC-166) — shell mobile global pour user connecté
**Statut :** VALIDÉE — à respecter dans tous les modules

---

## Règle fondamentale

> **Le shell mobile (AppTopbar + BottomNav) appartient à l'app, pas à une section.**
> Quand un user est connecté, il garde son shell partout — sauf admin/recruteur (sidebar dédiée) et /jeune/onboarding (funnel verrouillé).

```
Anonyme         → Header marketing + Footer (toutes routes publiques)
Authentifié     → AppTopbar + BottomNav mobile  /  Header marketing desktop
Admin/Recruteur → Sidebar dédiée (mobile drawer + desktop fixe)
Onboarding      → Mini-topbar verrouillé (logo + déconnexion uniquement)
```

---

## 1 · Implémentation — où est rendu quoi

| Composant | Fichier | Rendu où ? | Visible quand ? |
|---|---|---|---|
| `MobileTopShell` | `src/components/layout/MobileAppShell/index.tsx` | root `src/app/layout.tsx` AVANT `{children}` | session active + route non exclue (mobile uniquement via `md:hidden`) |
| `MobileBottomShell` | idem | root layout APRÈS `{children}` | idem |
| `MobileShellGate` | `MobileAppShell/MobileShellGate.tsx` | Wrapper client interne | Filtre selon `usePathname()` — exclut `/admin`, `/recruteur`, `/jeune/onboarding`, `/auth` |
| `Header` (marketing) | `src/components/layout/Header/index.tsx` | `(public)/layout.tsx` et `jeune/(app)/layout.tsx` | Anonyme : toutes tailles. Connecté : desktop uniquement (`md:block hidden`) |
| `HeaderNav` (client) | `Header/HeaderNav.tsx` | Dans `<Header>` | Desktop. Affiche route active via `usePathname()`. Si session : 2 liens supplémentaires "Mon dashboard / Mon profil" |
| `Footer` | `Footer/index.tsx` | `(public)/layout.tsx` et `jeune/(app)/layout.tsx` | Anonyme : toutes tailles. Connecté : desktop uniquement |
| `AdminSidebar` / `RecruteurSidebar` | … | `admin/layout.tsx` et `recruteur/layout.tsx` | Toutes tailles (drawer mobile + fixe desktop) |
| `OnboardingLayout` | `app/jeune/onboarding/layout.tsx` | Auto pour `/jeune/onboarding/*` | Toujours actif. Mini-topbar logo + déconnexion |

---

## 2 · Routes exclues du shell mobile (cf `MobileShellGate.EXCLUDED_PREFIXES`)

```ts
['/admin', '/recruteur', '/jeune/onboarding', '/auth']
```

Match strict via `path === prefix || path.startsWith(prefix + '/')` — `/authxyz` n'est PAS exclu.

---

## 3 · BottomNav — items pour user connecté

| Slot | Label | Route | Match |
|---|---|---|---|
| 1 | **Dashboard** | `/jeune/tableau-de-bord` | `path === '/jeune/tableau-de-bord' \|\| startsWith('.../')` |
| 2 | Offres | `/opportunites` | `startsWith('/opportunites')` |
| 3 | Agenda | `/evenements` | `startsWith('/evenements')` |
| 4 | Ressources | `/ressources` | `startsWith('/ressources')` |
| 5 | Profil | `/jeune/mon-profil` | `startsWith('/jeune/mon-profil')` |

**Important** : "Dashboard" remplace "Accueil" (qui pointait vers la landing publique `/`, incohérent pour un user connecté).

---

## 4 · Padding-bottom global (CSS-only, anti-flash)

Dans `src/styles/globals.css` :
```css
@media (max-width: 767px) {
  body:has(.gj-bottom-nav) {
    padding-bottom: calc(var(--gj-bottom-nav-h) + env(safe-area-inset-bottom, 0px));
  }
}
```

`--gj-bottom-nav-h: 56px` défini dans `tokens.css`. Sélecteur `:has()` → aucun JS, pas de layout shift au premier paint.

**Conséquence** : les composants/pages individuels NE doivent PAS ajouter eux-mêmes un padding-bottom pour la BottomNav. C'est géré globalement.

---

## 5 · `/jeune/onboarding` — layout dédié

Funnel verrouillé : pas de BottomNav (exclusion), pas de Header marketing. Le user voit uniquement un mini-topbar avec :
- Logo Guichet Jeunesse (non cliquable — repère visuel)
- Lien "Se déconnecter" → `/api/auth/logout`

Tant que `onboardingComplete = false`, le proxy `src/proxy.ts` redirige toute autre route `/jeune/*` vers `/jeune/onboarding`.

---

## 6 · Règles de non-régression

1. **Jamais** de `overflow-x-auto` sur un élément de navigation.
2. **Jamais** d'emojis comme icônes dans la navigation — SVG inline `currentColor` uniquement.
3. **Jamais** de bottom-nav sur pages publiques pour un anonyme, ni sur admin/recruteur/onboarding pour un connecté.
4. **Jamais** de padding-bottom local pour la BottomNav — utiliser le CSS global `body:has(.gj-bottom-nav)`.
5. **Toujours** `z-index: var(--gj-z-bottom-nav)` (300) sur la BottomNav.
6. **Toujours** rendre `MobileTopShell` AVANT `{children}` dans le root layout (sticky top-0 nécessite cet ordre DOM).
7. **Toujours** masquer Header/Footer marketing en mobile pour user connecté (cf `(public)/layout.tsx` qui lit `getSession`).
8. Le bouton "Se connecter" doit rester visible sur mobile pour un anonyme (Header non masqué dans ce cas).

---

## 7 · Tests

- `tests/unit/mobile-shell-gate.test.tsx` — 19 cas, exclusions + frontières exactes
- Pas de test unitaire sur `MobileTopShell` / `MobileBottomShell` directement (composants Server triviaux qui délèguent à `MobileShellGate`).
- Tests visuels manuels recommandés : mobile authentifié sur `/`, `/opportunites`, `/jeune/tableau-de-bord`, `/jeune/onboarding`, vérifier la cohérence du shell sur chaque.

---

## 8 · Limitations connues (non bloquantes)

- Pages publiques `/`, `/centres` : l'utilisateur authentifié mobile n'a pas d'accès rapide depuis la BottomNav (qui ne couvre que 5 items). Acceptable pour MVP — un hamburger drawer pourrait être ajouté plus tard si besoin.
- `aria-current` pas encore propagé partout (présent sur BottomNav et HeaderNav, manque sur Footer).
- Pas de skip-link spécifique au shell mobile (uniquement sur layout public).
