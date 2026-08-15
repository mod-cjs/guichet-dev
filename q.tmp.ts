import { getFlags } from '@/lib/flags'
import { outilMasque } from '@/lib/flags/yaye'
;(async () => {
  const f = await getFlags()
  console.log('m5.agenda =', f['m5.agenda'], '· total', Object.keys(f).length)
  console.log('search_events masqué ?', await outilMasque('search_events', ['beneficiaire']))
})()
