# M6 — Séparer le format de la nature d'une ressource

> Spec préparée depuis la session design v5 (worktree `design-v5`), **à exécuter
> sur le stack de refonte admin** : le choix se fait au formulaire, dans
> `src/app/admin/ressources/**`, hors du périmètre de cette session.
>
> Ticket à créer. Rattaché à M6 (ressources), touche M8 (admin) et M13 (Data Hub).
>
> Ce document fige le *pourquoi* de chaque choix, pour que personne n'ait à le
> redécouvrir — en particulier le refus d'inventer de la donnée.

---

## Le défaut

`Ressource.type` mélange **trois axes** sous un seul champ :

| Valeur | Ce qu'elle dit réellement |
|---|---|
| `PDF` | un **format** — comment on consomme |
| `Video` | un **format** |
| `Lien` | un **mode d'accès** — ni format ni nature |
| `Guide` | une **nature éditoriale** — ce que c'est |
| `Outil` | une **nature éditoriale** |

Conséquences visibles aujourd'hui :

- Un guide qui est un PDF doit être classé `Guide` **ou** `PDF`. Le jeune qui
  filtre « PDF » ne le trouve pas, alors que c'en est un.
- Le CTA et le badge découlent du même champ : un `Guide` affiche « Lire », un
  `PDF` affiche « Télécharger », pour un fichier identique.
- L'admin doit trancher entre deux bonnes réponses à chaque création. Une
  taxonomie qui force un arbitrage arbitraire produit des données arbitraires.

---

## Les trois contraintes qui dictent tout

Elles ne se négocient pas ; toute solution qui les ignore est à rejeter.

### 1. `type` est publié au Data Hub, valeurs énumérées

`src/lib/datahub/streams.ts` — flux `ressources`, champ `type`, tier **public**.
`docs/openapi/datahub-v1.yaml` **énumère** `PDF | Video | Lien | Guide | Outil`.

Changer le domaine de `type` est une **rupture de contrat publié**, pas un
refactor interne. Un consommateur externe qui reçoit une valeur hors énumération
n'a aucun moyen de le deviner.

### 2. `?type=` est une URL publique, indexable

`src/components/ressources/RessourcesClient.tsx` écrit `?type=PDF` dans l'URL.
Ces liens sont partageables et référencés (M7 SEO). Les renommer casse des liens
existants sans redirection.

### 3. Le choix se fait côté admin

`src/app/admin/ressources/{RessourceFormModal,actions,AdminRessourcesTable,page}.tsx`.
C'est le stack de refonte admin. Aucune partie de ce lot ne peut être livrée
depuis une branche qui s'interdit d'y toucher — d'où cette spec plutôt qu'un
correctif partiel.

---

## Ce que dit la donnée réelle

Fonds local complet, 20 ressources :

| `type` actuel | Lignes | URL observée |
|---|---|---|
| `Video` | 8 | `https://video.cjs.sn/...` |
| `PDF` | 7 | `https://ressources.cjs.sn/....pdf` |
| `Lien` | 4 | `learn.cjs.sn`, `blog.cjs.sn`, `ressources.cjs.sn` |
| `Outil` | 1 | `https://outils.cjs.sn/calculatrice-salaire-net` |
| `Guide` | **0** | — |

**Deux enseignements, tous deux structurants.**

**Le format n'est PAS déductible de l'URL.** Toutes les URL sont des domaines CJS
auto-hébergés : aucun YouTube, aucun Vimeo. Une dérivation par hôte marcherait
sur ce jeu et sur lui seul — c'est calquer le modèle sur la fixture. Le format
doit être un **champ**, pas une heuristique.

**La nature éditoriale n'existe presque pas en base.** Une seule ligne sur vingt
la porte (`Outil`). Pour les 19 autres, le champ `type` ne dit rien de ce que la
ressource *est* : « Modèle de lettre de motivation » et « Guide pour rédiger un
CV » sont tous deux `PDF`. **Cette information n'est pas dans la base — elle ne
doit donc pas être inventée par la migration.**

C'est le même piège que la table de correspondance des domaines d'opportunités
(GUIC-595) : une migration qui devine produit une donnée fausse que plus personne
ne saura distinguer d'une donnée saisie.

---

## D-1 · Deux champs, pas un champ élargi

```prisma
model Ressource {
  /// Comment la ressource se consomme. Obligatoire : toujours connaissable.
  format FormatRessource
  /// Ce que la ressource est, éditorialement. NULL tant que personne ne l'a dit.
  nature NatureRessource?
  /// Conservé — voir D-4. Ne plus lire pour l'affichage.
  type   TypeRessource
}

enum FormatRessource { Pdf  Video  Page }
enum NatureRessource { Guide  Modele  Outil  Cours  Temoignage  FichePratique }
```

`format` est **NOT NULL** : pour toute ressource existante ou future, la réponse
existe et est unique. `nature` est **nullable** parce que l'absence d'information
est un état légitime — et le seul honnête pour 19 lignes sur 20.

Une carte sans `nature` n'affiche pas de badge vide : elle affiche son format,
point. *(Règle « valeur vide » du barème design v5.)*

## D-2 · Reprise sans invention

| `type` actuel | → `format` | → `nature` |
|---|---|---|
| `PDF` | `Pdf` | **NULL** |
| `Video` | `Video` | **NULL** |
| `Lien` | `Page` | **NULL** |
| `Outil` | `Page` *(URL non-`.pdf`)* | `Outil` |
| `Guide` | `Pdf` si l'URL finit par `.pdf`, sinon `Page` | `Guide` |

Rien d'autre n'est déduit. Un `PDF` ne devient pas un `Guide` : on n'en sait rien.

Résultat attendu sur le fonds actuel : `format` = 7 `Pdf`, 8 `Video`, 5 `Page` ;
`nature` = 1 `Outil`, **19 NULL**. Ces 19 NULL sont le résultat *correct*, pas une
migration incomplète — et ils se remplissent à l'usage, à mesure que l'admin
qualifie.

## D-3 · L'affichage suit le format, la nature l'enrichit

- Icône, couleur d'accent, verbe du CTA (« Télécharger » / « Regarder » /
  « Ouvrir ») : dérivés de **`format`** seul. Un PDF dit toujours « Télécharger »,
  quelle que soit sa nature.
- Badge de nature affiché **en plus**, uniquement s'il existe.
- Filtres publics : `?format=` (5 valeurs → 3, plus lisible) et `?nature=`
  optionnel.

## D-4 · `type` survit un cycle, pour le contrat

`type` n'est **pas supprimé** dans ce lot. Il reste alimenté à l'écriture, dérivé
de `(format, nature)` par une fonction unique et testée :

```
nature ?? (format === 'Pdf' ? 'PDF' : format === 'Video' ? 'Video' : 'Lien')
```

Pourquoi : le contrat Data Hub énumère ses valeurs (contrainte 1). Le retirer
d'un coup casserait les consommateurs externes sans préavis.

Le flux gagne `format` et `nature` en `tier: public`, `type` est marqué
**déprécié** dans `docs/openapi/datahub-v1.yaml`. Sa suppression fera l'objet
d'un lot ultérieur, une fois les consommateurs prévenus — décision du lead, pas
de ce lot.

## D-5 · `?type=` continue de répondre

`?type=PDF` reste accepté et traduit en `?format=Pdf` (redirection 308 vers
l'URL canonique). Les liens partagés et indexés survivent. À retirer au même
moment que D-4.

---

## Migration — trois pas, pour la raison habituelle

MariaDB **tronque silencieusement** les lignes lors d'un `MODIFY` rétrécissant un
enum. La règle du projet reste : élargir → convertir → rétrécir. Ici on n'ajoute
que des colonnes, donc :

1. **Ajout** de `format` (`NULL` temporaire) et `nature` (`NULL`), collation
   `utf8mb4_unicode_ci` — obligatoire, cf. GUIC-562 (FK errno 150 en prod).
2. **Backfill** en SQL selon D-2, puis `format` passe `NOT NULL`.
3. **Index** `@@index([format, theme])` en miroir de `@@index([type, theme])`.

Migration **écrite à la main** — `migrate dev` réinitialiserait la base partagée,
et `migrate diff` a déjà proposé de supprimer le travail de branches parallèles.

---

## Définition de fini

- [ ] Un guide au format PDF est trouvable par le filtre « PDF » **et** par
      « Guide » — le défaut d'origine, vérifié au rendu.
- [ ] `format` non nul sur 100 % des lignes après backfill ; **aucune** `nature`
      inventée (test comptant les NULL attendus).
- [ ] Le CTA d'un PDF dit « Télécharger » quelle que soit sa nature.
- [ ] `?type=PDF` répond encore et redirige vers l'URL canonique.
- [ ] `type` reste cohérent avec `(format, nature)` après création **et** après
      modification côté admin — test d'intégration sur MariaDB réelle.
- [ ] Sentinelle : aucun composant d'affichage ne lit `item.type` (le nombre de
      fichiers autorisés est figé, comme la sentinelle du vocabulaire M3).
- [ ] `docs/openapi/datahub-v1.yaml` décrit `format`/`nature` et marque `type`
      déprécié.

---

## Hors périmètre, volontairement

- **Suppression de `type`** — dépend du préavis aux consommateurs Data Hub (D-4).
- **Qualification des 19 ressources sans nature** — travail éditorial, pas
  technique. L'admin les qualifie à l'usage ; aucune campagne de reprise n'est
  demandée, et surtout aucune devinette.
- **Séparation équivalente côté opportunités** — même famille de problème
  (`Employabilité` vs `Économie`), à traiter séparément.
