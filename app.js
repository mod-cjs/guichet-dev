// Point d'entrée Phusion Passenger (Plesk)
// Charge les variables d'environnement avant de démarrer le serveur standalone.
// Ordre : .env.local (dev) > .env.prod (Plesk) > .env (fallback)
const { config } = require('dotenv')
config({ path: '.env.local', override: false })
config({ path: '.env.prod',  override: false })
config({ path: '.env',       override: false })

require('./.next/standalone/server.js')
