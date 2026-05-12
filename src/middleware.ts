// Next.js 16 + experimental.nodeMiddleware: true
// Exporte sous les deux noms pour couvrir l'API stable et expérimentale.
export { proxy as default, proxy as unstable_nodeMiddleware, config } from './proxy'
