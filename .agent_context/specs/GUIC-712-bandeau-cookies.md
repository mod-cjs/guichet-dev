# GUIC-712 — Bandeau cookies : consentement utilisateur (CDP)

**Module** : m1-socle · **Branche** : `feature/GUIC-712-bandeau-cookies` · **Depuis** : `dev`

---

## 1. Pourquoi

La politique de confidentialité, publiée en production, promet à l'Article 7 :

> « Vous pouvez accepter ou refuser les cookies non essentiels via le bandeau de consentement
> affiché lors de votre première visite »

Ce bandeau n'existe pas. C'est un **engagement non tenu**, relevé en
[GUIC-605 §5 point 4](./GUIC-605-conformite-cdp-legal.md) — l'écart le plus visible pour un
contrôle CDP, parce qu'il se vérifie en ouvrant le site.

Ce lot livre le mécanisme de consentement et le rend vrai.

## 2. État des lieux (audit du 2026-08-20)

**Cookies réellement posés** — deux, tous deux strictement nécessaires :

| Nom | Rôle | Portée | Source |
|---|---|---|---|
| `cjs_session` | session SSO | httpOnly, session | [auth.ts:9](../../src/lib/auth.ts#L9) |
| `centre_staff_session` | session opérateur de centre | httpOnly, session | [staff-session.ts:15](../../src/lib/auth/staff-session.ts#L15) |

**Traceurs tiers** : aucun. Pas de `gtag`, GTM, Matomo, Plausible, PostHog, `@vercel/analytics`,
Hotjar, pixel Meta. Vérifié par balayage de `src/`.

**`localStorage`** : 18 fichiers, tous fonctionnels — préférences d'accessibilité, thème admin,
brouillons de candidature, état de barre latérale. Aucun usage de mesure ou de profilage.

**Conséquence de conception.** Aujourd'hui le bandeau n'a rien à faire refuser. Il serait
malhonnête de présenter une catégorie « mesure d'audience » active alors qu'aucun outil n'est
branché. Le lot livre donc le **mécanisme complet et la garde technique**, avec la catégorie
déclarée mais inerte tant qu'aucun outil n'est configuré. Le jour où la mesure d'audience arrive,
elle est déjà sous consentement — elle ne peut pas être branchée en la contournant.

## 3. Périmètre

**Dans le lot**
- Domaine du consentement : catalogue des catégories, encodage, versionnement, expiration
- Bandeau première visite + panneau de personnalisation
- Montage unique dans le layout racine → couvre public, bénéficiaire, conseiller, recruteur, admin
- Page permanente `/legal/cookies` : document légal + panneau de préférences, pour revenir sur son choix
- Garde technique : aucun traceur non essentiel ne peut se charger sans consentement
- Mise en cohérence de l'Article 7 avec ce qui est réellement livré

**Hors lot**
- L'outil de mesure d'audience lui-même — aucun n'est installé, en installer un relève d'un
  arbitrage PO distinct
- Registre admin des consentements → GUIC-609
- Opt-in aux points de collecte (inscription, canaux de notification) → GUIC-608
- Persistance serveur du consentement par `cjs_uid` — le cookie porte la trace (version +
  horodatage) ; l'adosser à la base est le sujet de GUIC-609

## 4. Décisions de conception

### 4.1 Un cookie, pas `localStorage`

Le consentement est stocké dans un cookie `cjs_consent`, **lisible côté serveur**. C'est ce qui
permet au serveur de décider s'il émet ou non un script de mesure, plutôt que de l'émettre puis de
le neutraliser côté client — ce qui serait un dépôt sans consentement, exactement ce que la règle
interdit.

Non httpOnly, à dessein : le panneau de préférences doit pouvoir le relire et le réécrire. Ce n'est
pas un secret. La règle httpOnly de `CLAUDE.md` vise le **token SSO**, qui reste inchangé.

`SameSite=Lax`, `path=/`, `Secure` hors développement.

### 4.2 Les cookies essentiels ne sont pas une case à cocher

Le panneau du .docx source les présente en case décochable. C'est un défaut de conception : on ne
peut pas refuser ce qui conditionne le fonctionnement du site — proposer le choix, c'est mentir sur
sa portée. Ils sont rendus en **état verrouillé** (« Toujours actif »), pas en interrupteur.
Le décodeur force `essentiels: true` quelle que soit la valeur stockée : un cookie forgé à la main
ne peut pas désactiver la session.

### 4.3 Refuser coûte exactement un clic, comme accepter

« Tout refuser » et « Tout accepter » sont deux boutons de même niveau, même taille, même position
dans la hiérarchie visuelle. Un refus qui demande trois clics de plus qu'une acceptation n'est pas
un consentement libre.

Aucune case n'est pré-cochée. Fermer le bandeau sans choisir **ne vaut pas acceptation** — le
bandeau ne propose donc pas de croix de fermeture : il faut trancher.

### 4.4 Versionnement

Le consentement porte la version du texte (`VERSION_CONSENTEMENT`) et l'horodatage de la décision.
Si la version publiée change, le consentement stocké devient caduc et le bandeau réapparaît — on ne
peut pas faire dire à un ancien accord qu'il couvre un nouveau traitement.

Durée : **6 mois**, en deçà du plafond de 13 mois déclaré à l'Article 7.

### 4.5 Point de montage

Une seule fois dans [layout.tsx](../../src/app/layout.tsx), à côté d'`OfflineBanner`. Monter espace
par espace multiplierait les points d'oubli — et c'est précisément un oubli par espace qui a produit
l'écart d'origine. `z-index` = `--gj-z-chat` (400) : au-dessus de la bottom-nav (300), en dessous de
la modale qu'il ouvre (600).

### 4.6 Revenir sur son choix, depuis n'importe quel espace

Le pied de page n'existe que sur les pages publiques. Un lien de pied de page ne serait donc pas
atteignable depuis `/jeune/*`, `/conseiller/*`, `/recruteur/*`. La porte d'entrée universelle est
une **page** : `/legal/cookies`, publique, liée depuis le pied de page et depuis l'Article 7, et
atteignable par URL directe depuis tous les espaces.

Elle est un `DocumentLegal` à part entière — donc référencée dans le registre, donc couverte par la
garde existante « aucun lien de pied de page sans document ».

## 5. Architecture

```
src/lib/consent/
  cookies.ts      module PUR — catalogue, types, encodage/décodage, validité
  client.ts       lecture/écriture document.cookie (client)
  server.ts       lecture via next/headers (serveur)
  index.ts        barrel

src/components/consent/
  CookieConsent.tsx        bandeau + orchestration (client), monté en racine
  PreferencesCookies.tsx   panneau par catégorie, réutilisé en modale ET en page
  MesureAudience.tsx       garde : ne rend un traceur que si consenti ET configuré

src/app/(public)/legal/cookies/page.tsx    document + panneau permanent
src/content/legal/cookies.ts               texte du document légal
```

La séparation `cookies.ts` (pur) / `client.ts` / `server.ts` reprend celle de `src/lib/flags/`
(`ui.ts` vs `ui-server.ts`) : un import serveur dans un module client fait entrer Prisma et ioredis
dans le bundle navigateur, et le build casse sur `Can't resolve 'dns'`.

## 6. Découpage TDD

| Lot | RED | GREEN |
|---|---|---|
| 1 | `consent-domaine.test.ts` — catalogue, encodage, version périmée, essentiels forcés | `src/lib/consent/*` |
| 2 | `consent-bandeau.test.tsx` — première visite, accepter/refuser, pas de croix, a11y | `CookieConsent`, `PreferencesCookies` |
| 3 | `consent-garde-traceurs.test.ts` — aucun traceur sans consentement | `MesureAudience` + garde de non-régression |
| 4 | `consent-page-cookies.test.tsx` — page, lien pied de page, Article 7 cohérent | page + contenu légal + Article 7 |

## 7. Critères de recette

- [ ] Première visite : le bandeau s'affiche, sur les 4 espaces
- [ ] « Tout accepter » et « Tout refuser » : un clic chacun, même poids visuel
- [ ] Cookies essentiels : état verrouillé, jamais décochable
- [ ] Aucune case pré-cochée dans le panneau
- [ ] Décision persistée avec version + horodatage ; version changée → bandeau de nouveau
- [ ] `/legal/cookies` permet de revenir sur son choix
- [ ] Aucun traceur ne peut se charger sans consentement (garde testée)
- [ ] Clavier : bandeau et panneau entièrement navigables ; focus piégé dans la modale
- [ ] Article 7 décrit exactement ce qui est livré
- [ ] `npm run validate` vert

## 8. Question ouverte pour le PO

L'Article 7 déclare des « cookies de mesure d'audience — durée 13 mois ». Aucun outil n'est
installé. Deux lectures possibles, à trancher :

1. **Une mesure d'audience est prévue** → l'article anticipe, le bandeau la met sous consentement
   dès maintenant, rien à corriger au texte.
2. **Aucune n'est prévue** → l'article sur-déclare et doit être ramené aux cookies techniques, comme
   l'a été la mention « mot de passe (chiffré) » le 2026-08-14.

Le lot est écrit pour que les deux restent possibles : le mécanisme existe, la catégorie est
déclarée mais inerte. Seul le texte de l'Article 7 dépend de la réponse.
