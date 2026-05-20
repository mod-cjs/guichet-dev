#!/usr/bin/env python3
"""
Extraction du mapping drupal_uid → cjs_uid depuis un dump SQL SSO
GUIC-17

Usage:
    python3 scripts/extract-sso-map.py /chemin/vers/auth_database.sql

Produit:
    data/drupal_uid_cjs_uid_map.json  — utilisé par scripts/migrate-drupal.ts
"""

from __future__ import annotations  # compat annotations PEP 585 sous Python 3.8

import re
import json
import os
import sys

# Colonnes de la table users SSO (dans l'ordre du CREATE TABLE)
COLS = [
    'id', 'uuid', 'google_id', 'facebook_id', 'apple_id', 'email', 'phone',
    'whatsapp_phone', 'whatsapp_verified_at', 'whatsapp_token_issued_at',
    'email_verified_at', 'phone_verified_at', 'password', 'first_name',
    'last_name', 'date_of_birth', 'gender', 'avatar_url', 'region',
    'departement', 'commune', 'address', 'cjs_member_id', 'drupal_uid',
    'username', 'roles', 'admin_role', 'status', 'source_platform',
    'import_batch', 'remember_token', 'last_login_at', 'last_login_ip',
    'failed_login_attempts', 'locked_until', 'created_at', 'updated_at',
    'deleted_at',
]
IDX = {c: i for i, c in enumerate(COLS)}


def parse_tuples(content: str) -> list[str]:
    """Extrait les tuples de valeur des blocs INSERT INTO `users`."""
    rows = []
    lines = content.split('\n')
    buf = ''
    in_insert = False
    for line in lines:
        if line.startswith('INSERT INTO `users`'):
            in_insert = True
            buf = line
            continue
        if in_insert:
            buf += line
            if line.rstrip().endswith(';'):
                in_insert = False
                inner = re.search(r'VALUES\s*(.*);$', buf, re.DOTALL)
                if inner:
                    raw = inner.group(1).strip()
                    depth = 0
                    cur = ''
                    for ch in raw:
                        if ch == '(' and depth == 0:
                            depth = 1
                            cur = ''
                        elif ch == '(' and depth > 0:
                            depth += 1
                            cur += ch
                        elif ch == ')' and depth > 1:
                            depth -= 1
                            cur += ch
                        elif ch == ')' and depth == 1:
                            depth = 0
                            rows.append(cur)
                        elif depth >= 1:
                            cur += ch
    return rows


def parse_row(raw: str) -> list[str]:
    """Parse un tuple SQL en liste de valeurs (gère les quotes échappées)."""
    vals = []
    cur = ''
    in_q = False
    i = 0
    while i < len(raw):
        c = raw[i]
        if c == "'" and not in_q:
            in_q = True
        elif c == "'" and in_q:
            if i + 1 < len(raw) and raw[i + 1] == "'":
                cur += "'"
                i += 1
            else:
                in_q = False
        elif c == ',' and not in_q:
            vals.append(cur)
            cur = ''
        else:
            cur += c
        i += 1
    vals.append(cur)
    return vals


def main() -> None:
    if len(sys.argv) < 2:
        print(f'Usage: python3 {sys.argv[0]} /chemin/vers/auth_database.sql')
        sys.exit(1)

    sql_path = sys.argv[1]
    if not os.path.exists(sql_path):
        print(f'Fichier introuvable : {sql_path}')
        sys.exit(1)

    print(f'Lecture : {sql_path}')
    with open(sql_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    rows = parse_tuples(content)
    print(f'Tuples extraits : {len(rows)}')

    mapping: dict[str, str] = {}
    skipped = 0

    for raw in rows:
        vals = parse_row(raw)
        if len(vals) < len(COLS):
            skipped += 1
            continue
        drupal = vals[IDX['drupal_uid']].strip()
        uuid   = vals[IDX['uuid']].strip()
        if drupal and drupal != 'NULL':
            try:
                mapping[str(int(drupal))] = uuid
            except ValueError:
                pass

    print(f'Entrées drupal_uid → cjs_uid : {len(mapping)}')
    if skipped:
        print(f'Lignes ignorées (colonnes insuffisantes) : {skipped}')

    os.makedirs('data', exist_ok=True)
    out_path = os.path.join('data', 'drupal_uid_cjs_uid_map.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(mapping, f)

    print(f'\nFichier écrit : {out_path}')
    print('Prochaine étape : npm run migrate:drupal:dry-run')


if __name__ == '__main__':
    main()
