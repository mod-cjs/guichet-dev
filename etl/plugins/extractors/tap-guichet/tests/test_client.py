"""GUIC-700 — non-régression : la découverte des flux ne doit jamais planter.

Contexte : `GuichetStream.__init__` faisait `manifest["replication_key"]` (accès direct).
Absente pour un flux FULL_TABLE (jonctions programmes, sans watermark — introduites au
lot 7 du durcissement), cette ligne levait `KeyError` et tuait `discover_streams()` pour
LES 18 FLUX D'UN COUP, la liste étant construite en une seule compréhension.

AUCUN test TypeScript/Jest ne peut attraper ce défaut : ils vérifient la génération du
manifeste, jamais sa consommation par le tap Python. C'est exactement le trou de
couverture identifié par le rapport d'épreuve GUIC-693 (§6) — invisible à `tsc` et à Jest,
visible seulement quand un vrai chargeur Singer lit un vrai manifeste.

⚠ CE TEST N'EST PAS DANS LA CI (aucun pipeline Python n'existe dans ce dépôt). À lancer
manuellement après toute modification de `client.py`, `tap.py` ou du générateur de
manifeste TypeScript :

    python3 -m venv /tmp/venv && /tmp/venv/bin/pip install singer-sdk pytest
    cd etl/plugins/extractors/tap-guichet
    /tmp/venv/bin/pytest tests/ -v
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from tap_guichet.tap import TapGuichet  # noqa: E402

MANIFESTE = Path(__file__).parent.parent / "tap_guichet" / "streams.json"


def _tap() -> TapGuichet:
    return TapGuichet(
        config={"api_url": "http://test.invalid", "auth_token": "test"},
        validate_config=False,
    )


def test_discover_streams_ne_plante_pas():
    """Le défaut réel : un flux manquait, TOUS disparaissaient — silencieusement en prod."""
    streams = _tap().discover_streams()
    manifeste = json.loads(MANIFESTE.read_text(encoding="utf-8"))
    assert len(streams) == len(manifeste["streams"])


def test_flux_full_table_sans_watermark():
    streams = {s.name: s for s in _tap().discover_streams()}
    manifeste = json.loads(MANIFESTE.read_text(encoding="utf-8"))
    noms_full_table = [
        s["name"] for s in manifeste["streams"] if s["replication_method"] == "FULL_TABLE"
    ]
    assert noms_full_table, "aucun flux FULL_TABLE dans le manifeste — le test ne prouve rien"

    for nom in noms_full_table:
        flux = streams[nom]
        assert flux.replication_key is None
        # Dérivé par le SDK depuis replication_key=None (singer_sdk.Stream.replication_method) —
        # pas déclaré en dur ici, pour que ce test suive le comportement réel, pas une
        # attente figée.
        assert flux.replication_method == "FULL_TABLE"


def test_flux_full_table_n_envoie_jamais_since():
    """`since` n'a pas de sens sans watermark : ne doit jamais apparaître dans la requête."""
    streams = {s.name: s for s in _tap().discover_streams()}
    manifeste = json.loads(MANIFESTE.read_text(encoding="utf-8"))
    nom = next(s["name"] for s in manifeste["streams"] if s["replication_method"] == "FULL_TABLE")

    params = streams[nom].get_url_params(context=None, next_page_token=None)
    assert "since" not in params


def test_flux_incremental_garde_son_watermark():
    """Non-régression inverse : le fix ne doit pas dégrader les flux incrémentaux existants."""
    streams = {s.name: s for s in _tap().discover_streams()}
    utilisateurs = streams["utilisateurs"]
    assert utilisateurs.replication_key == "updated_at"
    assert utilisateurs.replication_method == "INCREMENTAL"
