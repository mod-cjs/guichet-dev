# Spec — Architecture Layout & Navigation

**Décision validée :** 2026-05-05  
**Auteur :** mod-cjs  
**Statut :** VALIDÉE — à respecter dans tous les modules

---

## Règle fondamentale

> **Deux contextes, deux patterns distincts. Ne jamais mélanger.**

```
Pages publiques   → Header marketing  (top uniquement)
App authentifiée  → Top bar + Bottom nav (jeune) ou Sidebar (admin/recruteur)
```

---

## 1 · Pages publiques — Header marketing

**Routes concernées :** `/` · `/opportunites` · `/evenements` · `/ressources` · `/centres` · `/auth/connexion`

### Desktop (≥ 768px)
```
[ Logo ]  [ Accueil · Opportunités · Agenda · Ressources · Centres ]  [ e-learning ↗ ] [ YEAH ↗ ] [ Se connecter ]
```
- Header sticky, fond blanc, `border-bottom: 1.5px solid var(--gj-line)`
- Bouton "Se connecter" : `bg-gj-teal text-white`, toujours visible
- Si session active : avatar initiales à la place du bouton

### Mobile (< 768px)
```
[ Logo + nom ]                                    [ Se connecter ]
```
- Nav links **masqués** (`hidden md:flex`) — pas de hamburger en MVP
- Bouton "Se connecter" toujours visible, `flex-shrink-0`
- **Pas de bottom-nav sur pages publiques**

### Composant : `src/components/layout/Header/index.tsx`
- Server component (lit la session SSO)
- `sticky top-0 z-[var(--gj-z-nav)]`
- Jamais de `overflow-x-auto`

---

## 2 · App jeune — Double barre mobile

**Routes concernées :** `/jeune/*`

### Mobile (< 768px)
```
┌─────────────────────────────────┐  ← app-topbar (sticky top, 48px)
│ [●] GuichetJeunesse  🔔  [av]   │     Logo + Notifs + Avatar
├─────────────────────────────────┤
│                                 │
│        CONTENU                  │  ← scroll area
│   pb-[calc(56px+safe-bottom)]   │     padding-bottom obligatoire
│                                 │
├─────────────────────────────────┤
│ 🏠  🔍  📅  📚  👤              │  ← bottom-nav (fixed bottom, 56px+safe-area)
└─────────────────────────────────┘
```

### Desktop (≥ 768px)
```
Header marketing standard (même que pages publiques)
Pas de bottom-nav — navigation dans le header
```

### Bottom nav — 5 items fixes
| Item | Label | Route | Icône |
|------|-------|-------|-------|
| 1 | Accueil | `/jeune/mon-profil` | SVG home |
| 2 | Opportunités | `/opportunites` | SVG search |
| 3 | Agenda | `/evenements` | SVG calendar |
| 4 | Ressources | `/ressources` | SVG book |
| 5 | Profil | `/jeune/mon-profil` | SVG user |

**Règles bottom-nav :**
- `position: fixed; bottom: 0; left: 0; right: 0`
- `z-index: var(--gj-z-bottom-nav)` (300)
- `padding-bottom: var(--safe-bottom)` (safe area iOS)
- Item actif : `color: var(--gj-teal-deep)` + barre 3px teal en haut
- Icônes : **SVG inline** (pas d'emojis — incohérence cross-platform)
- Labels : `font-size: var(--fs-100)` (11px), `font-weight: 600`
- Hauteur min par item : `var(--tap-min)` (44px)
- Badge rouge pour les notifications

**Padding contenu obligatoire :**
```tsx
// src/app/jeune/layout.tsx
<main className="pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0">
```

### Composants :
- `src/components/layout/AppTopbar/index.tsx` — top bar app (Server component)
- `src/components/layout/BottomNav/index.tsx` — nav fixe mobile (Client component, détecte route active)

---

## 3 · App admin — Sidebar

**Routes concernées :** `/admin/*`

### Desktop (≥ 768px)
```
[ AdminSidebar (fixed left, 240px) ] [ Contenu (ml-60) ]
```

### Mobile (< 768px)
- Sidebar masquée par défaut
- Bouton hamburger dans un mini top bar
- Drawer en overlay (translate-x-0 / -translate-x-full)
- **Pas de bottom-nav** — admin = usage bureautique prioritaire

### Composant : `src/components/layout/AdminSidebar/index.tsx` (existant)

---

## 4 · App recruteur — Sidebar

**Routes concernées :** `/recruteur/*`

Même pattern que admin.

### Composant : `src/components/layout/RecruteurSidebar/index.tsx` (existant)

---

## 5 · Toast — offset bottom-nav

Le composant Toast doit recevoir `bottomOffset={72}` dans les layouts avec bottom-nav :

```tsx
// Dans jeune/layout.tsx
<Toast bottomOffset={72} />
```

Sur pages publiques et admin/recruteur : `bottomOffset={0}` (défaut).

---

## 6 · Checklist implémentation (GUIC-15)

- [ ] `Header` : responsive, nav masquée mobile, Se connecter toujours visible
- [ ] `AppTopbar` : nouveau composant pour /jeune/* mobile
- [ ] `BottomNav` : nouveau composant SVG icons + route active detection
- [ ] `jeune/layout.tsx` : AppTopbar + BottomNav + padding-bottom contenu
- [ ] `admin/layout.tsx` : AdminSidebar (existant) + mini topbar mobile
- [ ] `recruteur/layout.tsx` : RecruteurSidebar (existant) + mini topbar mobile
- [ ] Toast bottomOffset={72} dans jeune/layout.tsx
- [ ] Aucune page ne doit avoir `overflow-x-auto` sur un container de navigation

---

## 7 · Règles de non-régression

1. **Jamais** de `overflow-x-auto` sur un élément de navigation
2. **Jamais** d'emojis comme icônes dans la navigation — SVG uniquement
3. **Jamais** de bottom-nav sur pages publiques ou admin/recruteur
4. **Toujours** `pb-[calc(56px+env(safe-area-inset-bottom,0px))]` sur le contenu sous une bottom-nav
5. **Toujours** `z-index: var(--gj-z-bottom-nav)` sur la bottom-nav (300)
6. Le bouton "Se connecter" doit être **visible sur mobile** sans scroll horizontal
