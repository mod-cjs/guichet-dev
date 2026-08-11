# Cloudflare — accès aux dashboards + protection de la plateforme (GUIC-575)

> Deux usages **indépendants**, un seul compte Cloudflare. Ne pas les confondre : le premier
> touche des services qui ne sont **jamais** publics ; le second touche le domaine **déjà**
> public. Les mélanger reviendrait à rouvrir par accident ce qu'on vient de fermer.

## 1. Accès aux dashboards (Grafana, Netdata) — remplace le tunnel SSH

**Le problème que ça résout** : Grafana et Netdata sont volontairement en boucle locale
(`127.0.0.1`, jamais `0.0.0.0`) — aujourd'hui, les consulter exige une clé SSH sur un serveur
qui héberge aussi la SSO et le BRM. Ce n'est praticable ni pour plusieurs personnes
d'astreinte, ni comme usage prévu de l'accès SSH.

**Le mécanisme** : `cloudflared` (voir `docker-compose.cloudflared.yml`) établit une connexion
**sortante uniquement** vers le réseau Cloudflare — aucun port entrant ouvert, la frontière de
sécurité ne bouge pas. Cloudflare Access garde ensuite l'accès par **identité** (e-mail nommé,
révocable individuellement) plutôt que par possession d'une clé SSH partagée.

### Étapes côté Cloudflare (manuelles — dashboard Zero Trust, pas scriptables depuis ce dépôt)

1. **Créer le tunnel** : Zero Trust → *Networks* → *Tunnels* → *Create a tunnel* → connecteur
   *Cloudflared* → nommer (ex. `guichet-ops`) → le tableau de bord affiche un **token** à copier.
2. **Configurer les Public Hostnames** du tunnel — cloudflared tournant en `network_mode: host`,
   ces services sont vus comme `localhost` de son point de vue :
   | Hostname public | Service |
   |---|---|
   | `grafana.ops.<domaine>` | `http://localhost:3000` |
   | `netdata.ops.<domaine>` | `http://localhost:19999` |
3. **Créer une politique d'accès** : Zero Trust → *Access* → *Applications* → *Add an
   application* → *Self-hosted*, une par hostname ci-dessus. Politique : *Allow* → e-mails
   autorisés. Point de départ recommandé : les mêmes destinataires que les alertes Grafana
   (`odiallo@consortiumjeunessesenegal.org`, `adiop@consortiumjeunessesenegal.org`) — à élargir
   nommément à mesure que d'autres personnes prennent l'astreinte, jamais par un domaine entier.

### Étapes côté serveur

```bash
sudo sh -c 'echo "CLOUDFLARE_TUNNEL_TOKEN=<token copié à l'"'"'étape 1>" >> /etc/guichet/cloudflared.env'
sudo chmod 600 /etc/guichet/cloudflared.env
docker compose -f docker-compose.cloudflared.yml --env-file /etc/guichet/cloudflared.env up -d
```

### Vérifier

```bash
docker compose -f docker-compose.cloudflared.yml logs -f
# → "Registered tunnel connection" plusieurs fois (une par connexion à l'edge Cloudflare)
```

Puis ouvrir `https://grafana.ops.<domaine>` depuis un poste **hors** du serveur : Cloudflare
Access doit demander l'e-mail (code à usage unique), et seulement ensuite afficher Grafana.
**Non vérifié en réel à ce stade** — même discipline que le reste de cette pile (Netdata,
Grafana/SMTP) : à confirmer une fois déployé, pas supposé.

## 2. Protection du domaine public (WAF / anti-DDoS)

**Usage distinct** : `guichet.<domaine>` est déjà public — ici, Cloudflare se place **devant**
lui en périphérie (DNS proxifié, « nuage orange »), avant même que la requête n'atteigne Plesk.
Filtre les attaques (WAF, anti-DDoS, limitation de débit) en amont du serveur mutualisé.

⚠️ **Changement de nameservers — coordination requise, pas une action à lancer seule.**
Ajouter le domaine à Cloudflare implique de pointer les serveurs de noms du domaine vers
Cloudflare, ce qui affecte **tous** les enregistrements DNS existants — pas seulement le A/CNAME
du Guichet. En particulier : **vérifier et répliquer tout enregistrement MX avant la
bascule** si le domaine reçoit des e-mails, sous peine de coupure du courrier entrant pendant la
propagation. À planifier avec le titulaire du domaine, pas à exécuter en autonomie.

Étapes (une fois la coordination faite) :

1. Ajouter le domaine dans Cloudflare → il scanne les enregistrements DNS existants (vérifier
   qu'il n'en a manqué aucun avant de continuer).
2. Changer les nameservers chez le registrar vers ceux fournis par Cloudflare.
3. Activer le proxy (nuage orange) sur l'enregistrement A/CNAME pointant vers le serveur OVH.
4. **Mode TLS = « Full (strict) »** — pas « Flexible » : le serveur origine a déjà un certificat
   Let's Encrypt valide (Plesk) ; « Flexible » romprait le chiffrement de bout en bout.
5. Activer les règles WAF managées (jeu OWASP) + une règle de limitation de débit sur les routes
   sensibles (`/api/auth/*`, les endpoints de connexion).

## Fichier de secrets

Ajoute une ligne à la carte de `docs/ops-index.md` : `/etc/guichet/cloudflared.env` —
`CLOUDFLARE_TUNNEL_TOKEN`, consommé par `docker-compose.cloudflared.yml`. Gabarit :
`.env.cloudflared.example`.
