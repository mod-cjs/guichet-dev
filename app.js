// Point d'entrée Phusion Passenger (Plesk)
// Avec output: 'standalone', Next.js génère .next/standalone/server.js
// qui est auto-suffisant (node_modules bundlés, static/ et public/ copiés)
require('./.next/standalone/server.js')
