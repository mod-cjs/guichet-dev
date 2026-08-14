# GUIC-605 — Conformité CDP & Legal · Lot 1 : contenus légaux

Épic **GUIC-605** (Highest, prérequis Go-Live) · Module **m1-socle** · Source : échange projet du 2026-07-15.

**Périmètre de ce lot** : GUIC-606 (politique de confidentialité) + GUIC-607 (notice de collecte) + page « Vos droits » + CGU & mentions légales (hors épic, liens morts du footer).

**Hors périmètre** : GUIC-608 (consentement opt-in tracé, modèle Prisma) · GUIC-609 (registre admin) · bandeau cookies · page « Mes données » outillée (export/suppression self-service).

---

## 1. Constat

Les 3 pages `/legal/cgu`, `/legal/confidentialite` et `/legal/mentions-legales` **existaient déjà** — livrées par **GUIC-233** le 4 juin 2026 en JSX statique (4 sections chacune, ~80 lignes), avec leur test [tests/unit/legal-pages.test.tsx](../../tests/unit/legal-pages.test.tsx).

Elles apparaissaient absentes parce que ce worktree est incomplet (630 fichiers du dépôt manquants sur disque, tous intacts dans l'index git) — pas parce qu'elles manquaient au dépôt. **Il n'y a jamais eu de 404 en production.**

Ce lot les **remplace** conformément à GUIC-606, qui qualifie explicitement GUIC-233 de « coquille existante » : la politique GUIC-233 comptait 4 sections là où le document officiel en compte 11. Les CGU et mentions légales de GUIC-233, elles, portaient du contenu réel — il est **porté sans perte** dans le modèle typé, pas écrasé.

Sources validées (Drive, dernière MàJ Mars 2026) :
- `POLITIQUE DE CONFIDENTIALITÉ ET DE PROTECTION DES DONNÉES PERSONNELLES.docx` — 11 articles
- `INFORMATIONS SUR LA COLLECTE DE VOS DONNÉES PERSONNELLES.docx` — 6 sections + mentions par formulaire
- `TEXTES DE CONSENTEMENT POUR LA COLLECTE DE DONNÉES PERSONNELLES.docx` — 4 sections, dont **§4 « Page Vos droits » entièrement rédigée**
- Aucun document CGU ni mentions légales n'existe sur le Drive.

Le §4 du document de consentement est le seul de ce fichier livrable sans schéma : c'est le document que l'utilisateur doit avoir à disposition pour exercer ses droits. Les §1 (bandeau cookies) et §2 (cases à cocher) supposent un stockage horodaté → GUIC-608.

Aucune maquette `legal` dans `design-guichet-v3/` ni `v4/` → mise en page dérivée des primitives existantes.

---

## 2. Architecture

**Contenu typé, pas de JSX littéral.** Les textes vivent dans `src/content/legal/` sous forme de données versionnées, rendues par un composant de mise en page unique.

Motif : GUIC-608 exigera d'horodater « la **version du texte** » consentie. Un contenu déjà porteur d'un champ `version` évite une reprise complète au lot suivant.

```
src/content/legal/
  types.ts                   # BlocLegal | SectionLegale | DocumentLegal
  contact.ts                 # ⭐ coordonnées CDP — SOURCE UNIQUE (voir §4)
  droits.ts                  # les 4 droits loi 2008-12, définition partagée
  confidentialite.ts         # GUIC-606
  informations-collecte.ts   # GUIC-607
  vos-droits.ts              # doc consentement §4
  mentions-legales.ts        # dérivé de l'Article 1 — coquille partielle
  cgu.ts                     # coquille
  index.ts                   # registre + LIENS_FOOTER_LEGAUX

src/components/legal/
  LegalDocument.tsx          # rendu générique (Breadcrumbs + PageHeader + sections)
  MentionFormulaire.tsx      # GUIC-607 — mention au point de collecte
```

Rendu via les primitives existantes (`PageHeader`, `Breadcrumbs`, `Alert`) — pas de HTML Tailwind brut en page. Les blocs sont du texte structuré : **aucun `dangerouslySetInnerHTML`**, donc aucune surface XSS sur des pages pourtant statiques.

Le **Footer dérive ses liens du registre** (`LIENS_FOOTER_LEGAUX`) : un document retiré disparaît du pied de page au lieu d'y laisser un lien mort. C'est la garde contre la régression d'origine.

### Routes

| Route | Ticket | Contenu | Indexation |
|---|---|---|---|
| `/legal/confidentialite` | GUIC-606 | 11 articles | indexée |
| `/legal/informations-collecte` | GUIC-607 | 7 sections — **route nouvelle** | indexée |
| `/legal/vos-droits` | GUIC-605 | doc consentement §4 — **route nouvelle** | indexée |
| `/legal/mentions-legales` | hors épic | Article 1 + 2 champs manquants | `noindex` |
| `/legal/cgu` | hors épic | coquille datée | `noindex` |

`noindex` sur les coquilles : un document non rédigé n'a pas à remonter en recherche comme s'il faisait foi. `estCoquille` déclenche aussi un `<Alert type="warning">` en tête de page.

### Affichage au point de collecte (GUIC-607)

`<MentionFormulaire finalite="…">` est posé sur [le layout d'onboarding](../../src/app/jeune/onboarding/layout.tsx), pas sur un écran donné : le funnel entier est le point de collecte, et le porter au layout garantit qu'aucune étape ajoutée plus tard ne collecte sans mention.

La prop `finalite` est **obligatoire** — elle remplace le placeholder `[finalité spécifique du formulaire]` jamais résolu dans la source.

Le composant est **informatif** : il ne coche rien, ne stocke rien. Afficher une case de consentement sans traçabilité donnerait l'apparence d'un consentement impossible à prouver en contrôle — pire que de ne rien afficher.

---

## 3. Tests — `tests/unit/legal-documents.test.tsx`

Registre (slugs résolus, aucun orphelin, aucun doublon, version/date présentes, contenu incomplet réservé aux coquilles, aucun placeholder résiduel) · cohérence CDP (délai 15 j jamais 30, téléphone et adresse écartés absents, typo `.ss` corrigée) · contenu (11 articles rendus, sections de la notice, ordre des 4 droits, coquilles signalées) · Footer (garde anti-404) · `MentionFormulaire` (finalité injectée, liens permanents).

---

## 4. ⚠️ Arbitrages PO du 2026-08-14 — figés dans `contact.ts`

Les 3 documents sont mutualisés sur **5 sites CJS** et divergeaient entre eux. `src/content/legal/contact.ts` est la source unique qui empêche les 5 pages de repartir en contradiction — c'est exactement ce que relève un contrôle CDP.

| Point | Sources en conflit | Retenu |
|---|---|---|
| Délai de réponse | 30 j (politique Art. 9) / 15 j (Vos droits) | **15 jours** |
| Adresse | CDEPS Guédiawaye (Art. 1) / SICAP Point E (Vos droits) | **CDEPS de Guédiawaye** |
| Téléphone droits | `33 877 78 05` (×2) / `33 824 83 83` (notice §5) | **`+221 33 877 78 05`** |

Corrections de forme appliquées sans arbitrage : typo `guichetjeunesse.ss` → `.sn` (Art. 1) · droit d'opposition rétabli en item distinct (il était avalé dans la puce du droit de rectification) · URL `guichetjeunesse.sn` dédupliquée dans la liste des sites couverts · « formulaire de connexion » non repris (le Guichet est en SSO, il n'y en a pas).

---

## 5. ⚠️ Écarts NON corrigés — mise à jour documentaire à demander

Ces points exigent une révision des .docx par le responsable données. Les pages sont publiées fidèlement en attendant.

**Fausse déclaration :**

1. **« Données de connexion : identifiant, mot de passe (chiffré) »** (politique Art. 2, notice §2). Le Guichet **ne collecte aucun mot de passe** — SSO CJS OAuth2/OIDC, aucun login local. L'Art. 8 promet en outre un « hachage des mots de passe » qui n'a pas d'objet ici. **Les CGU de GUIC-233 disent l'inverse et disent vrai** : « Aucun mot de passe local n'est stocké par la plateforme » (§2). Deux pages du même site se contredisent donc déjà sur ce point.

2. **Notice sous-déclarante.** Catégories réellement traitées mais absentes des documents : CV et pièces jointes, lettres de motivation, conversations Yaye (transcripts verbatim, PII brutes — cf. [cdp-purge.ts](../../src/lib/ia/cdp-purge.ts)), numéro et échanges WhatsApp, présence/badge en centre (GUIC-474), et **situation de handicap** (GUIC-660) — donnée sensible au sens de la loi 2008-12.

3. **Transferts hors Sénégal — déclarés à la CDP, mais tus à l'utilisateur.** Information PO du 2026-08-14 : les transferts **ont bien été déclarés à la CDP**. La formalité légale est donc remplie — c'est l'obligation d'*information de la personne concernée* qui ne l'est pas. La politique Art. 6 ne mentionne que « nos prestataires techniques », sans nommer personne ni signaler de sortie du territoire.

   L'hébergement est désormais **corrigé côté code** (voir §4bis) : Belgique, pas États-Unis. Mais cela **déplace** le sujet sans le clore — [llm-client.ts:58](../../src/lib/ia/llm-client.ts#L58) fixe `DEFAULT_LOCATION = 'us-central1'` et la production ne surcharge pas `GOOGLE_CLOUD_LOCATION` : **les conversations Yaye sont traitées en Iowa**. Ces transcripts contiennent des PII *brutes* — [cdp-purge.ts](../../src/lib/ia/cdp-purge.ts) le documente (motifs de réservation, lettres de motivation, recherches libres). S'y ajoute Meta Cloud API pour WhatsApp.

   Les mentions légales déclarent désormais ces transferts **et** le fait qu'ils sont déclarés à la CDP. Reste à répercuter dans la politique. Question ouverte, hors de ce lot : basculer `GOOGLE_CLOUD_LOCATION` sur `europe-west1` (Belgique) alignerait l'IA sur l'hébergement et supprimerait le transfert — à arbitrer sur coût, latence et disponibilité du modèle.

**Engagement non tenu :**

4. Politique Art. 7 : promet « un bandeau de consentement affiché lors de votre première visite ». **Aucun bandeau cookies n'existe** dans le code. L'article est publié tel quel → à livrer en GUIC-608, sinon la promesse reste en l'air.

**Défaut de conception à corriger en GUIC-608 :** le panneau cookies du document présente « Cookies essentiels » comme une case à cocher. Des cookies essentiels ne peuvent pas être refusés — état verrouillé, pas case décochable.

---

## 4bis. Hébergement — correction du 2026-08-14

GUIC-233 déclarait « Vercel Inc., 340 S Lemon Ave, Walnut, CA 91789, États-Unis ». **Faux sur deux points** : la production a migré sur **OVH** (GUIC-568 — `scripts/deploy/deploy.sh`, OVH/Plesk, Nginx + Let's Encrypt ; GUIC-683 signale que les crons Vercel ne s'exécutent plus), et les serveurs sont **en Belgique**.

Corrigé dans `mentions-legales.ts`, avec deux gardes de non-régression dans `legal-documents.test.tsx` : « Vercel » ne doit jamais réapparaître, « OVH » et « Belgique » doivent être présents.

Ajout d'une section **« Localisation de vos données et transferts »** : application, base et fichiers en Belgique ; traitements hors UE nommés (Yaye → Google Cloud aux États-Unis, WhatsApp → Meta). C'est aujourd'hui le **seul endroit** où l'utilisateur l'apprend, l'Article 6 de la politique ne le dit pas.

**Hébergeur déclaré** — recherche du 2026-08-14 :

| Champ | Valeur | Source |
|---|---|---|
| Entité | OVH SAS | [Annuaire des Entreprises](https://annuaire-entreprises.data.gouv.fr/entreprise/ovh-ovhcloud-424761419) |
| Adresse | 2 rue Kellermann, 59100 Roubaix, France | idem |
| Immatriculation | RCS Lille Métropole 424 761 419 | idem |
| Serveurs | datacenter de Bruxelles, Belgique | [OVHcloud Brussels](https://www.ovhcloud.com/en/datacenter/europe/belgium/brussels/) |

**Confirmé par le PO le 2026-08-14** : le contrat est avec **OVH France**, le datacenter est **en Belgique**. La filiale belge OVHcloud DC Belgium SRL (BCE BE 1010.368.925) n'est pas le cocontractant — ne pas la substituer.

Entité contractante et localisation des serveurs sont dissociées à dessein : les confondre serait inexact dans les deux sens. « OVH Belgique » seul ne remplit pas l'obligation d'identifier l'hébergeur ; « Roubaix, France » seul laisserait croire que les données sont en France.

⚠️ **`vercel.json` est une configuration morte** : il déclare encore `"regions": ["cdg1"]` (Paris) et 11 crons Vercel alors que la prod est sur OVH. Troisième affirmation contradictoire sur l'hébergement, à nettoyer dans son propre ticket.

---

## 6. État

- [x] Contenus typés + registre + composants + 5 routes
- [x] Footer dérivé du registre (garde anti-404) + 2 nouveaux liens
- [x] `MentionFormulaire` posé sur le layout d'onboarding
- [x] Contenu GUIC-233 des CGU et mentions légales porté sans perte
- [x] Conventions du `dev` courant adoptées : `withCanonical()` + `export const dynamic = 'force-static'`
- [x] Branche `feature/GUIC-605-conformite-cdp-legal` créée depuis `origin/dev` (`6933cb3f`), 0 commit d'écart
- [x] `npm run lint` → 0 erreur (7 warnings préexistants, aucun dans ce lot)
- [x] `npx tsc --noEmit` → **0 erreur**
- [x] `legal-documents.test.tsx` (22) + `legal-pages.test.tsx` hérité de GUIC-233 (3) → **25 verts**
- [x] Suite complète : **5178 tests verts / 5201**
- [ ] 6 suites rouges **préexistantes**, hors périmètre : 5 tests d'intégration « DB réelle » (pas de MariaDB joignable) + `dev-login-uid-longueur` qui cible des routes `/api/dev/login-*` supprimées de `dev`. Aucune n'importe un fichier de ce lot.
- [ ] PR → `dev`

### Environnement remis d'aplomb au passage

Le dépôt avait été copié de façon incomplète : branche orpheline sans commit, 630 fichiers absents du disque, `node_modules` aux paquets amputés de leurs `package.json`, cache `.next` périmé référençant 8 routes disparues. Travail GUIC-660 récupéré depuis l'index et commité (`a128695c`, 29 fichiers) avant tout déplacement. `dev` remis à jour (+459 commits). Perdus sans recours : `feature/GUIC-566-outils-yaye-validation`, `feature/GUIC-641-reconciliation-migrations-poc`, `integration/admin-review`, `refs/stash`.

## 7. DoD

`npm run validate` vert · 5 routes servies (plus aucun 404 depuis le Footer) · mention affichée sur le funnel d'onboarding · PR → `dev` · GUIC-606 et GUIC-607 en Revue.
