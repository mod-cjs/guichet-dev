"""
Helpers de connexion et de chargement MariaDB → Neo4j pour le POC Yaye.

- read_table()   : lit une table MariaDB en DataFrame pandas.
- merge_nodes()  : UNWIND + MERGE idempotent d'un lot de nœuds.
- merge_rels()   : UNWIND + MERGE idempotent d'un lot de relations.
- ensure_constraints() : contraintes d'unicité par label (à exécuter en premier).

Toutes les écritures Neo4j sont des MERGE → rejouables sans doublon (invariant POC).
"""
from __future__ import annotations

import os
import math
import pandas as pd
from sqlalchemy import create_engine, text
from neo4j import GraphDatabase


# ── Connexions ───────────────────────────────────────────────────────────────
def mariadb_engine():
    """Engine SQLAlchemy vers la MariaDB locale (Docker) qui rejoue le dump."""
    user = os.environ["MARIADB_USER"]
    pwd = os.environ["MARIADB_PASSWORD"]
    host = os.environ.get("MARIADB_HOST", "127.0.0.1")
    port = os.environ.get("MARIADB_PORT", "3307")
    db = os.environ["MARIADB_DATABASE"]
    return create_engine(f"mysql+pymysql://{user}:{pwd}@{host}:{port}/{db}?charset=utf8mb4")


def neo4j_driver():
    """Driver Neo4j piloté par NEO4J_URI — LOCAL d'abord (bolt://localhost:7687,
    service guichet_neo4j), puis Aura (neo4j+s://) en décommentant le bloc cloud du .env."""
    return GraphDatabase.driver(
        os.environ["NEO4J_URI"],
        auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]),
    )


# ── Lecture SQL ──────────────────────────────────────────────────────────────
def read_table(engine, table: str, columns: list[str] | None = None,
               where: str | None = None) -> pd.DataFrame:
    cols = ", ".join(f"`{c}`" for c in columns) if columns else "*"
    sql = f"SELECT {cols} FROM `{table}`"
    if where:
        sql += f" WHERE {where}"
    return pd.read_sql(text(sql), engine)


def list_tables(engine) -> list[str]:
    with engine.connect() as c:
        return [r[0] for r in c.execute(text("SHOW TABLES"))]


def count_rows(engine, table: str, where: str | None = None) -> int:
    sql = f"SELECT COUNT(*) FROM `{table}`"
    if where:
        sql += f" WHERE {where}"
    with engine.connect() as c:
        return int(c.execute(text(sql)).scalar())


# ── Écriture Neo4j (idempotente) ─────────────────────────────────────────────
def ensure_constraints(driver, labels_keys: dict[str, str], database: str | None = None):
    """Crée une contrainte d'unicité (id/clé naturelle) par label — exécuter en 1er."""
    db = database or os.environ.get("NEO4J_DATABASE", "neo4j")
    with driver.session(database=db) as s:
        for label, key in labels_keys.items():
            s.run(f"CREATE CONSTRAINT IF NOT EXISTS "
                  f"FOR (n:`{label}`) REQUIRE n.`{key}` IS UNIQUE")


def _clean(records: list[dict]) -> list[dict]:
    """NaN/NaT pandas → None (Neo4j n'accepte pas NaN)."""
    out = []
    for rec in records:
        out.append({k: (None if (isinstance(v, float) and math.isnan(v)) else v)
                    for k, v in rec.items()})
    return out


def merge_nodes(driver, label: str, key: str, records: list[dict],
                extra_labels: list[str] | None = None, batch: int = 1000,
                database: str | None = None):
    """MERGE un lot de nœuds sur `key`, SET le reste des propriétés.

    extra_labels : labels additionnels (ex. sous-type d'opportunité) posés via SET n:Label.
    """
    db = database or os.environ.get("NEO4J_DATABASE", "neo4j")
    records = _clean(records)
    set_labels = "".join(f" SET n:`{l}`" for l in (extra_labels or []))
    cypher = (
        f"UNWIND $rows AS row "
        f"MERGE (n:`{label}` {{`{key}`: row.`{key}`}}) "
        f"SET n += row{set_labels}"
    )
    with driver.session(database=db) as s:
        for i in range(0, len(records), batch):
            s.run(cypher, rows=records[i:i + batch])


def merge_rels(driver, rel: str, from_label: str, from_key: str,
               to_label: str, to_key: str, pairs: list[dict],
               batch: int = 1000, database: str | None = None):
    """MERGE un lot de relations. `pairs` = [{from, to, **edge_props}, ...]."""
    db = database or os.environ.get("NEO4J_DATABASE", "neo4j")
    pairs = _clean(pairs)
    edge_keys = [k for k in (pairs[0].keys() if pairs else []) if k not in ("from", "to")]
    set_edge = (" SET " + ", ".join(f"r.`{k}` = row.`{k}`" for k in edge_keys)) if edge_keys else ""
    cypher = (
        f"UNWIND $rows AS row "
        f"MATCH (a:`{from_label}` {{`{from_key}`: row.from}}) "
        f"MATCH (b:`{to_label}` {{`{to_key}`: row.to}}) "
        f"MERGE (a)-[r:`{rel}`]->(b){set_edge}"
    )
    with driver.session(database=db) as s:
        for i in range(0, len(pairs), batch):
            s.run(cypher, rows=pairs[i:i + batch])
