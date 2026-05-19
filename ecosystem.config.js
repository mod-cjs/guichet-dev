// PM2 — Guichet Jeunesse CJS
// Usage : pm2 start ecosystem.config.js --env production
'use strict'

module.exports = {
  apps: [
    {
      name:         'guichet-jeunesse',
      script:       '.next/standalone/server.js',
      instances:    'max',
      exec_mode:    'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT:     3000,
      },
      max_memory_restart: '512M',
      error_file:  'logs/pm2-error.log',
      out_file:    'logs/pm2-out.log',
      merge_logs:  true,
      time:        true,
    },
  ],
}
