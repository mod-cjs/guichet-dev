/**
 * Préchauffage des vecteurs du catalogue (GUIC-683) — outil d'ops.
 *
 * La recherche sémantique ne vectorise JAMAIS le catalogue à chaud : elle lit le cache
 * Redis. Ce cache est rempli chaque nuit par le cron `yaye-graph-sync`, à raison de
 * `YAYE_SEARCH_WARMUP_MAX` titres. Ce script permet de le remplir MAINTENANT — à la mise
 * en service, ou après un changement de modèle d'embedding (qui invalide les clés).
 *
 * Usage :
 *   npx tsx scripts/yaye-warm-search.ts                # un lot (plafond par défaut)
 *   npx tsx scripts/yaye-warm-search.ts --tout         # boucle jusqu'à saturation
 *   YAYE_SEARCH_WARMUP_MAX=2000 npx tsx scripts/yaye-warm-search.ts
 *
 * Sans embeddings (`YAYE_EMBEDDING_MODEL="off"`), le script ne fait rien et le dit :
 * la recherche reste lexicale, ce qui est un mode de fonctionnement valide.
 *
 * ⚠️ `gemini-embedding-001` n'accepte qu'UNE instance par requête : le préchauffage
 * complet d'un gros catalogue prend du temps. `text-multilingual-embedding-002` accepte
 * de vrais lots et va nettement plus vite.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

async function main(): Promise<void> {
  const { warmOpportuniteVectors } = await import('../src/lib/ia/search-warmup')
  const { embeddingModel } = await import('../src/lib/ia/embeddings')

  const modele = embeddingModel()
  if (!modele) {
    console.log('⏸  Embeddings désactivés (YAYE_EMBEDDING_MODEL="off") — rien à préchauffer.')
    console.log('   La recherche fonctionne en mode lexical seul.')
    return
  }
  console.log(`🔥 Préchauffage du catalogue · modèle ${modele}`)

  const tout = process.argv.includes('--tout')
  let tour = 0
  let precedent = -1

  for (;;) {
    tour += 1
    const r = await warmOpportuniteVectors()
    const couverture = r.candidats > 0 ? Math.round((r.vecteurs / r.candidats) * 100) : 100
    console.log(
      `   tour ${tour} · ${r.vecteurs}/${r.candidats} titres vectorisés (${couverture} %) · ${Math.round(r.dureeMs / 1000)} s`,
    )

    if (!tout) break
    if (r.vecteurs >= r.candidats) {
      console.log('✅ Catalogue entièrement vectorisé.')
      break
    }
    // Plus aucune progression : plafond atteint, endpoint HS ou textes non vectorisables.
    if (r.vecteurs === precedent) {
      console.log('⚠️  Plus de progression — arrêt. Vérifier les logs [vertex-emb] / [emb].')
      break
    }
    precedent = r.vecteurs
  }
}

main()
  .catch(err => {
    console.error('❌ Préchauffage échoué :', err)
    process.exitCode = 1
  })
  .finally(() => process.exit())
