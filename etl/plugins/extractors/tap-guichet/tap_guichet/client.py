"""Classe de flux du tap Guichet — toute la logique d'extraction tient ici.

Les flux ne sont pas écrits à la main : ils sont construits depuis `streams.json`, lui-même
généré depuis le contrat d'export TypeScript. Ajouter un flux au Data Hub ne demande donc
de toucher ni à ce fichier, ni à `meltano.yml`.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from singer_sdk import RESTStream
from singer_sdk.authenticators import BearerTokenAuthenticator
from singer_sdk.pagination import JSONPathPaginator


class GuichetStream(RESTStream):
    """Flux d'export du Guichet, paginé par curseur.

    `is_sorted = True` n'est pas un détail de performance : il indique au SDK que les
    lignes arrivent triées sur la clé de réplication, ce qui lui permet de committer le
    bookmark au fil de l'eau. Une extraction interrompue au bout de quarante minutes sur
    `consultations` reprend alors où elle s'est arrêtée au lieu de tout relire.
    """

    records_jsonpath = "$.data[*]"
    is_sorted = True
    # Le recouvrement `lookback_minutes` fait REGRESSER la cle de replication au debut de
    # chaque run incremental : c'est sa raison d'etre. Le controle de tri du SDK y voit une
    # anomalie et leve InvalidStreamSortException — le premier run passe (etat vide), tous
    # les suivants echouent. On conserve `is_sorted` pour le commit du bookmark au fil de
    # l'eau, et on desactive la seule verification, incompatible avec le recouvrement.
    check_sorted = False

    def __init__(self, tap: Any, manifest: dict[str, Any]) -> None:
        super().__init__(tap=tap, name=manifest["name"], schema=manifest["schema"])
        self.path = manifest["path"]
        self.primary_keys = manifest["primary_keys"]
        self.replication_key = manifest["replication_key"]

    @property
    def url_base(self) -> str:
        return str(self.config["api_url"]).rstrip("/")

    @property
    def authenticator(self) -> BearerTokenAuthenticator:
        return BearerTokenAuthenticator.create_for_stream(
            self, token=str(self.config["auth_token"])
        )

    def get_new_paginator(self) -> JSONPathPaginator:
        # Le curseur est opaque : on le relit dans la réponse et on le renvoie tel quel,
        # sans jamais tenter de l'interpréter.
        return JSONPathPaginator("$.meta.next_cursor")

    def get_url_params(
        self, context: dict[str, Any] | None, next_page_token: str | None
    ) -> dict[str, Any]:
        page_size = self.config.get("page_size", 1000)
        if next_page_token:
            # En cours de pagination, la position prime : `since` n'a plus de sens.
            return {"cursor": next_page_token, "limit": page_size}

        params: dict[str, Any] = {"limit": page_size}
        start = self.get_starting_timestamp(context)
        if start:
            # RECOUVREMENT — sans lui, le pipeline perd des lignes en silence. La colonne
            # de réplication est posée à l'écriture applicative, pas au commit : une
            # transaction ouverte avant le point d'arrêt et committée après porte un
            # horodatage antérieur et ne serait jamais extraite. Les doublons que le
            # recouvrement produit sont absorbés par l'upsert du loader.
            lookback = timedelta(minutes=int(self.config.get("lookback_minutes", 5)))
            params["since"] = (start - lookback).isoformat()
        return params

    def backoff_max_tries(self) -> int:
        # Une fonction serverless peut rendre un 502 ponctuel sans que l'extraction soit
        # compromise : on retente plutôt que de perdre le run.
        return 5
