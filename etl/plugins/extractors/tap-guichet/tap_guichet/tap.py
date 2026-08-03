"""Tap Singer du Guichet Jeunesse CJS — extraction incrémentale vers le Data Hub.

Les flux sont découverts depuis `streams.json`, généré depuis le contrat d'export
(`src/lib/datahub/streams.ts`). Ce fichier ne connaît aucun flux en dur : le catalogue
suit le contrat sans intervention.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from singer_sdk import Tap
from singer_sdk import typing as th

from tap_guichet.client import GuichetStream

MANIFESTE = Path(__file__).parent / "streams.json"


class TapGuichet(Tap):
    """Point d'entrée du tap."""

    name = "tap-guichet"

    config_jsonschema = th.PropertiesList(
        th.Property(
            "api_url",
            th.StringType,
            required=True,
            description="Racine du Guichet, sans le chemin d'export (ex. https://guichet.cjs.sn).",
        ),
        th.Property(
            "auth_token",
            th.StringType,
            required=True,
            secret=True,
            description="Secret de la clé Data Hub. Jamais dans meltano.yml — variable d'environnement.",
        ),
        th.Property(
            "start_date",
            th.DateTimeType,
            description="Profondeur d'historique du premier run. Sans valeur, tout est extrait.",
        ),
        th.Property(
            "page_size",
            th.IntegerType,
            default=1000,
            description="Lignes par requête. Plafonné à 5000 côté serveur.",
        ),
        th.Property(
            "lookback_minutes",
            th.IntegerType,
            default=5,
            description=(
                "Recouvrement appliqué au point d'arrêt. NE PAS mettre à zéro : la colonne "
                "de réplication est posée à l'écriture applicative et non au commit, donc "
                "une transaction committée en retard serait définitivement manquée."
            ),
        ),
    ).to_dict()

    def discover_streams(self) -> list[GuichetStream]:
        manifeste: dict[str, Any] = json.loads(MANIFESTE.read_text(encoding="utf-8"))
        return [GuichetStream(tap=self, manifest=flux) for flux in manifeste["streams"]]


if __name__ == "__main__":
    TapGuichet.cli()
