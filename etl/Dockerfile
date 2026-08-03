# Image d'exécution du pipeline ETL Data Hub (GUIC-694).
#
# Python 3.12 et non une version plus récente : dbt-core 1.8, déclaré dans meltano.yml,
# n'est pas supporté au-delà de 3.12. Une image plus récente fait échouer `meltano install`
# avant même le premier run.
#
# Meltano est épinglé : sans borne, chaque reconstruction résout « la dernière version »
# et peut changer la sémantique du chargeur — notamment celle de `load_method: upsert`,
# dont dépend l'absorption des doublons produits volontairement par le recouvrement.
FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends git gcc libpq-dev python3-dev \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir "meltano==3.7.9"

WORKDIR /project
ENTRYPOINT ["meltano"]
