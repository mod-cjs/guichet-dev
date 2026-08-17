-- GUIC-689 — Taxonomie des domaines : neuf valeurs deviennent six (demande PO).
--
-- Bien-être · Citoyenneté · Culture · Écologie · Économie · Employabilité,
-- plus `Autre` conservé comme repli TECHNIQUE (jamais proposé à l'utilisateur) :
-- `domaineOuAutre()` s'en sert quand la curation extrait un domaine non reconnu.
-- Le retirer ferait échouer la publication d'un item mal étiqueté — un test le
-- vérifie explicitement.
--
-- DEUX colonnes portent cet enum : `opportunites.domaine` (NOT NULL) et
-- `organisations.secteur` (NULL autorisé). Oublier la seconde laisserait des
-- valeurs devenues illégales dans une colonne typée.
--
-- Déroulé en TROIS temps. Passer directement à l'enum final tronquerait en
-- chaîne vide toute ligne portant une ancienne valeur — MariaDB ne refuse pas,
-- il vide. On élargit d'abord, on convertit, on resserre ensuite.
--
-- Écrite à la main : `prisma migrate dev` réinitialiserait la base partagée.

-- ── 1. Élargir : les neuf anciennes ET les six nouvelles cohabitent ──────────
ALTER TABLE `opportunites`
  MODIFY `domaine` ENUM(
    'Agriculture','Numerique','Entrepreneuriat','Citoyennete','Environnement',
    'Sante','Education','Culture','Autre',
    'BienEtre','Ecologie','Economie','Employabilite'
  ) NOT NULL;

ALTER TABLE `organisations`
  MODIFY `secteur` ENUM(
    'Agriculture','Numerique','Entrepreneuriat','Citoyennete','Environnement',
    'Sante','Education','Culture','Autre',
    'BienEtre','Ecologie','Economie','Employabilite'
  ) NULL;

-- ── 2. Convertir ────────────────────────────────────────────────────────────
-- Correspondance identique à `MIGRATION_DOMAINES` dans src/lib/domaines.ts.
--
-- `Agriculture`, `Numerique` et `Entrepreneuriat` rejoignent `Economie` : ce
-- sont des emplois et des financements dans ces filières, pas des sujets
-- écologiques ou pédagogiques. `Education` rejoint `Employabilite` — sur cette
-- plateforme, les formations servent l'insertion.
--
-- `Autre` reste `Autre` : une offre non classée ne devient pas classée parce
-- qu'on change de vocabulaire. Elle est à reclasser depuis le back-office.
UPDATE `opportunites` SET `domaine` = CASE `domaine`
  WHEN 'Agriculture'     THEN 'Economie'
  WHEN 'Numerique'       THEN 'Economie'
  WHEN 'Entrepreneuriat' THEN 'Economie'
  WHEN 'Environnement'   THEN 'Ecologie'
  WHEN 'Sante'           THEN 'BienEtre'
  WHEN 'Education'       THEN 'Employabilite'
  ELSE `domaine`            -- Citoyennete, Culture, Autre : inchangés
END;

UPDATE `organisations` SET `secteur` = CASE `secteur`
  WHEN 'Agriculture'     THEN 'Economie'
  WHEN 'Numerique'       THEN 'Economie'
  WHEN 'Entrepreneuriat' THEN 'Economie'
  WHEN 'Environnement'   THEN 'Ecologie'
  WHEN 'Sante'           THEN 'BienEtre'
  WHEN 'Education'       THEN 'Employabilite'
  ELSE `secteur`
END
WHERE `secteur` IS NOT NULL;

-- ── 3. Resserrer sur le vocabulaire final ───────────────────────────────────
-- Si une ligne portait encore une ancienne valeur à ce stade, MariaDB la
-- viderait silencieusement : l'étape 2 doit être exhaustive, et elle l'est
-- (les neuf anciennes valeurs y figurent toutes, explicitement ou via ELSE).
ALTER TABLE `opportunites`
  MODIFY `domaine` ENUM(
    'BienEtre','Citoyennete','Culture','Ecologie','Economie','Employabilite','Autre'
  ) NOT NULL;

ALTER TABLE `organisations`
  MODIFY `secteur` ENUM(
    'BienEtre','Citoyennete','Culture','Ecologie','Economie','Employabilite','Autre'
  ) NULL;
