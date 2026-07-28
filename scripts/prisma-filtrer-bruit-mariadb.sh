#!/usr/bin/env bash
#
# GUIC-684 — Retire le bruit structurel MariaDB d'un SQL produit par `prisma migrate diff`.
#
# POURQUOI CE FILTRE EXISTE
# MariaDB n'a PAS de type JSON natif : `JSON` y est un alias de
# `longtext … CHECK (json_valid(col))`. `prisma migrate diff` compare donc le
# `longtext` réellement présent en base au `Json` déclaré dans schema.prisma, et émet
# un `MODIFY … JSON` pour CHAQUE colonne JSON — à chaque génération, indéfiniment.
#
# Vérifié le 2026-07-28 sur MariaDB 10.11 : appliquer ce `MODIFY` ne change
# strictement rien à la table (`SHOW CREATE TABLE` identique avant/après). Ce n'est
# donc pas une dérive à réconcilier par une migration — ce serait un no-op qui
# reviendrait au diff suivant. C'est un bruit permanent, à filtrer à la génération.
#
# Un des statements produits est même INVALIDE en MariaDB :
#   ALTER TABLE `centres` MODIFY `services` JSON NOT NULL DEFAULT [];
# livré tel quel, il ferait échouer la migration au déploiement.
#
# CE QUE LE FILTRE NE FAIT PAS : il ne touche qu'aux `MODIFY … JSON`. Un vrai
# changement de type, un `DROP COLUMN` sur une colonne JSON, un `CREATE TABLE` —
# tout cela passe intact. Sentinelle : tests/unit/prisma-migration-bruit-mariadb.test.ts
#
# Usage :
#   npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script \
#     | bash scripts/prisma-filtrer-bruit-mariadb.sh > prisma/migrations/<horodatage>_<nom>/migration.sql
set -euo pipefail

awk '
  # Début d’un ALTER TABLE : on met en tampon jusqu’au `;` final pour décider en bloc.
  /^ALTER TABLE/ { tampon = $0; enCours = 1; if (/;[[:space:]]*$/) { vider(); } next }
  enCours == 1   { tampon = tampon "\n" $0; if (/;[[:space:]]*$/) { vider(); } next }

  # Les commentaires `-- AlterTable` isolés sont retenus : ils ne sont émis que si
  # le bloc qui suit survit au filtre.
  /^-- AlterTable$/ { commentaire = $0; next }
  { if (commentaire != "") { print commentaire; commentaire = "" } print }

  function vider(   estBruit) {
    # Bruit = un ALTER TABLE dont TOUTES les clauses sont des `MODIFY … JSON`.
    estBruit = 1
    n = split(tampon, lignes, "\n")
    for (i = 1; i <= n; i++) {
      ligne = lignes[i]
      if (ligne ~ /^ALTER TABLE/ && ligne !~ /MODIFY/) { estBruit = 0 }
      if (ligne ~ /MODIFY/ && ligne !~ /JSON/)         { estBruit = 0 }
      if (ligne ~ /(DROP|ADD|RENAME|CHANGE)/)          { estBruit = 0 }
    }
    if (!estBruit) { if (commentaire != "") { print commentaire } print tampon }
    commentaire = ""; tampon = ""; enCours = 0
  }

  END { if (commentaire != "") { print commentaire } }
'
