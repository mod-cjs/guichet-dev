/**
 * @jest-environment node
 *
 * GUIC-576 — Grafana n'écoute qu'en boucle locale (choix de sécurité assumé, voir
 * docker-compose.observabilite.yml) : le lien `{{ .GeneratorURL }}` inséré dans l'e-mail
 * d'alerte pointe donc littéralement vers `localhost` — juste, mais uniquement après avoir
 * ouvert un tunnel SSH. Constaté en recevant un VRAI e-mail d'alerte : le destinataire ne
 * savait pas si ce lien était accessible. Le message doit expliquer la condition d'usage,
 * pas se contenter d'afficher une URL qui semble cassée sans contexte.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const contenu = readFileSync(
  join(process.cwd(), 'infra/observabilite/grafana/provisioning/alerting/contact-points.yml'),
  'utf8'
)

describe('GUIC-576 — contact-points.yml : le lien Grafana explique le tunnel SSH requis', () => {
  it('le message e-mail mentionne le tunnel SSH avant le lien GeneratorURL', () => {
    const blocEmail = contenu.split('type: email')[1]?.split('type: webhook')[0] ?? ''
    expect(blocEmail).toMatch(/tunnel SSH/i)
    expect(blocEmail).toMatch(/GeneratorURL/)
    // Le rappel du tunnel doit précéder le lien, pas le suivre — sinon on clique avant de lire.
    const posTunnel = blocEmail.search(/tunnel SSH/i)
    const posLien = blocEmail.search(/GeneratorURL/)
    expect(posTunnel).toBeGreaterThan(-1)
    expect(posTunnel).toBeLessThan(posLien)
  })
})
