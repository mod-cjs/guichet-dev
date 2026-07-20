/**
 * Parseur d'appels d'outils émis EN TEXTE (récupération Llama 4 Scout).
 * Cas réels observés au probe Vertex + garde anti faux-positif sur de la prose.
 */
import { parseTextToolCall, parseTextToolCalls, nearestToolName } from '@/lib/ia/parse-tool-call'

const TOOLS = ['search_opportunities', 'get_badge', 'reserve_resource', 'escalate_to_advisor']

describe('parseTextToolCall', () => {
  test('cas réel Llama : kwargs Python avec accents → appel structuré', () => {
    const c = parseTextToolCall('search_opportunities(type="Emploi", region="Thiès", domaine="Agriculture")', TOOLS)
    expect(c).toEqual({ name: 'search_opportunities', args: { type: 'Emploi', region: 'Thiès', domaine: 'Agriculture' } })
  })

  test('appel sans argument', () => {
    expect(parseTextToolCall('get_badge()', TOOLS)).toEqual({ name: 'get_badge', args: {} })
  })

  test('arguments JSON', () => {
    expect(parseTextToolCall('reserve_resource({"date":"2026-08-01","nb":3,"confirm":false})', TOOLS))
      .toEqual({ name: 'reserve_resource', args: { date: '2026-08-01', nb: 3, confirm: false } })
  })

  test('coercition booléen/nombre + quotes simples', () => {
    expect(parseTextToolCall("reserve_resource(nb=2, confirm=true, motif='réviser mon code')", TOOLS))
      .toEqual({ name: 'reserve_resource', args: { nb: 2, confirm: true, motif: 'réviser mon code' } })
  })

  test('bloc de code markdown toléré', () => {
    expect(parseTextToolCall('```python\nget_badge()\n```', TOOLS)).toEqual({ name: 'get_badge', args: {} })
  })

  // ── Anti faux-positif : ne PAS confondre de la prose avec un appel ──
  test('prose contenant un nom d’outil → null (pas un appel)', () => {
    expect(parseTextToolCall('Je vais utiliser search_opportunities pour toi, un instant.', TOOLS)).toBeNull()
  })
  test('outil inconnu → null', () => {
    expect(parseTextToolCall('do_something(x=1)', TOOLS)).toBeNull()
  })
  test('contenu vide / null → null', () => {
    expect(parseTextToolCall('', TOOLS)).toBeNull()
    expect(parseTextToolCall(null, TOOLS)).toBeNull()
  })
  test('réponse conversationnelle normale → null', () => {
    expect(parseTextToolCall('Bonjour ! Dis-moi ce que tu cherches.', TOOLS)).toBeNull()
  })

  // ── Formats élargis (petits modèles ouverts) ──────────────────────────────
  test('balise Llama <|python_tag|>', () => {
    expect(parseTextToolCall('<|python_tag|>get_badge()', TOOLS)).toEqual({ name: 'get_badge', args: {} })
  })
  test('forme JSON {"name","arguments"}', () => {
    expect(parseTextToolCall('{"name":"search_opportunities","arguments":{"region":"Dakar"}}', TOOLS))
      .toEqual({ name: 'search_opportunities', args: { region: 'Dakar' } })
  })
  test('forme JSON alternative {"tool","parameters"}', () => {
    expect(parseTextToolCall('{"tool":"get_badge","parameters":{}}', TOOLS)).toEqual({ name: 'get_badge', args: {} })
  })
  test('balise <function=nom>{...}</function>', () => {
    expect(parseTextToolCall('<function=reserve_resource>{"nb":2}</function>', TOOLS))
      .toEqual({ name: 'reserve_resource', args: { nb: 2 } })
  })
  test('préfixe [TOOL_CALLS]', () => {
    expect(parseTextToolCall('[TOOL_CALLS] escalate_to_advisor(motif="sujet_sensible")', TOOLS))
      .toEqual({ name: 'escalate_to_advisor', args: { motif: 'sujet_sensible' } })
  })
  test('JSON avec outil INCONNU → null', () => {
    expect(parseTextToolCall('{"name":"do_evil","arguments":{}}', TOOLS)).toBeNull()
  })

  // ── Métamorphique : le MÊME appel exprimé de N façons → résultat IDENTIQUE ──
  test('invariance de format : 5 encodages du même appel donnent le même résultat', () => {
    const expected = { name: 'search_opportunities', args: { region: 'Dakar' } }
    const variants = [
      'search_opportunities(region="Dakar")',
      "search_opportunities(region='Dakar')",
      '{"name":"search_opportunities","arguments":{"region":"Dakar"}}',
      '{"tool":"search_opportunities","parameters":{"region":"Dakar"}}',
      '<|python_tag|>search_opportunities(region="Dakar")',
    ]
    for (const v of variants) expect(parseTextToolCall(v, TOOLS)).toEqual(expected)
  })
})

const TOOLS2 = ['search_opportunities', 'get_badge', 'query_knowledge_graph', 'search_library', 'borrow_book']

describe('parseTextToolCalls — multi-appels (Fix 3)', () => {
  test('DEUX appels fonctionnels dans le même message → deux calls', () => {
    const r = parseTextToolCalls('search_opportunities(region="Dakar")\nquery_knowledge_graph(intent="ecart")', TOOLS2)
    expect(r.calls).toEqual([
      { name: 'search_opportunities', args: { region: 'Dakar' } },
      { name: 'query_knowledge_graph', args: { intent: 'ecart' } },
    ])
    expect(r.unknown).toEqual([])
  })

  test('tableau JSON de deux appels → deux calls', () => {
    const r = parseTextToolCalls('[{"name":"get_badge","arguments":{}},{"name":"search_opportunities","arguments":{"type":"Stage"}}]', TOOLS2)
    expect(r.calls.map(c => c.name)).toEqual(['get_badge', 'search_opportunities'])
  })

  test('args JSON imbriqués (parenthèses équilibrées) → un call correct', () => {
    const r = parseTextToolCalls('search_opportunities({"region":"Thiès","filtres":{"remunere":true}})', TOOLS2)
    expect(r.calls).toEqual([{ name: 'search_opportunities', args: { region: 'Thiès', filtres: { remunere: true } } }])
  })

  test('appel noyé dans un peu de prose → récupéré (non ancré)', () => {
    const r = parseTextToolCalls('Ok je lance ça : get_badge()', TOOLS2)
    expect(r.calls).toEqual([{ name: 'get_badge', args: {} }])
  })

  test('doublon exact dédupliqué', () => {
    const r = parseTextToolCalls('get_badge()\nget_badge()', TOOLS2)
    expect(r.calls).toEqual([{ name: 'get_badge', args: {} }])
  })

  test('nom d’outil INCONNU mais tool-like → rangé dans unknown, pas dans calls (Fix 3b)', () => {
    const r = parseTextToolCalls('get_library(q="entrepreneuriat")', TOOLS2)
    expect(r.calls).toEqual([])
    expect(r.unknown).toEqual(['get_library'])
  })

  test('prose citant un outil sans parenthèses → aucun call, aucun unknown', () => {
    const r = parseTextToolCalls('Je vais utiliser search_opportunities pour toi.', TOOLS2)
    expect(r.calls).toEqual([])
    expect(r.unknown).toEqual([])
  })
})

describe('nearestToolName (Fix 3b)', () => {
  test('get_library → search_library (segment « library » partagé)', () => {
    expect(nearestToolName('get_library', TOOLS2)).toBe('search_library')
  })
  test('emprunte_livre sans segment commun → null', () => {
    expect(nearestToolName('emprunte_livre', TOOLS2)).toBeNull()
  })
})
