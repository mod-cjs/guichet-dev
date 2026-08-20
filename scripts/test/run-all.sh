#!/bin/sh
# GUIC-707 — tests/integration/ touche une vraie base MariaDB PARTAGÉE entre tous les
# workers Jest (tests/setup.ts pointe tout le monde vers le même DATABASE_URL). En
# parallèle (maxWorkers 50%, GUIC-538), plusieurs suites créent/suppriment des lignes dans
# les mêmes tables en même temps → deadlocks MariaDB, violations FK, assertions count()
# polluées par une autre suite. Vérifié : les 132 suites d'intégration passent à 100% en
# série (21s, coût négligeable) — la course, pas le code testé, causait les échecs.
#
# Le reste (unitaires, composants) n'a pas cette dépendance partagée : ça reste parallèle.
set -e

npx jest --passWithNoTests --testPathIgnorePatterns='/tests/integration/' "$@"
npx jest --passWithNoTests --runInBand --testPathPattern='tests/integration/' "$@"
