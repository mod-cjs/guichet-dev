#!/bin/sh
# GUIC-576 — Retire le récepteur webhook (WhatsApp) du provisioning d'alerting AVANT que
# Grafana ne le lise, si ALERTE_WEBHOOK_URL est absente.
#
# POURQUOI CE SCRIPT EXISTE
# Grafana valide TOUS les points de contact déclarés au démarrage, même ceux qu'aucune
# politique n'utilise. Trouvé au premier déploiement réel : ALERTE_WEBHOOK_URL vide (relais
# WhatsApp pas encore créé, GUIC-575) faisait planter Grafana ENTIER —
# « required field 'url' is not specified » — au lieu du dégradé "e-mail seul" que le
# commentaire du compose promettait. Une URL vide dans le YAML n'est pas un champ absent
# pour Grafana : c'est un champ invalide.
#
# `docker-compose.observabilite.yml` monte le provisioning source en lecture seule
# (`PROVISIONING_SRC`) et ce script le copie vers un emplacement inscriptible
# (`PROVISIONING_DST`, lu par Grafana), en retirant le bloc webhook si nécessaire — jamais
# de modification du fichier source monté en RO.
set -eu

SRC="${PROVISIONING_SRC:-/etc/grafana/provisioning-src}"
DST="${PROVISIONING_DST:-/etc/grafana/provisioning}"
RUN_SH="${RUN_SH:-/run.sh}"

rm -rf "$DST"
mkdir -p "$DST"
cp -r "$SRC"/. "$DST"/

if [ -z "${ALERTE_WEBHOOK_URL:-}" ]; then
  # `-i.bak` (portable BSD/GNU/busybox) plutôt que `-i` seul : BSD sed interprète
  # l'expression suivante comme suffixe de sauvegarde sans l'extension.
  sed -i.bak '/# BEGIN-WEBHOOK-RECEIVER/,/# END-WEBHOOK-RECEIVER/d' "$DST/alerting/contact-points.yml"
  rm -f "$DST/alerting/contact-points.yml.bak"
fi

exec "$RUN_SH" "$@"
