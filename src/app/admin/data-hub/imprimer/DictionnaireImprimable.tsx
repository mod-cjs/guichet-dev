'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { FluxDictionnaire } from '@/lib/datahub/dictionnaire'

interface DictionnaireImprimableProps {
  flux: FluxDictionnaire[]
  /** Filtre appliqué, énoncé en toutes lettres ; `null` quand le document est complet. */
  filtre: string | null
}

/**
 * Règles d'impression.
 *
 * La page vit dans le layout admin (sidebar, topbar, `overflow-hidden`, `h-screen`) : sans
 * ces règles, l'imprimante reçoit une capture d'écran d'une seule page avec le menu au
 * milieu. On masque tout par `visibility` plutôt qu'en ciblant les classes du layout — un
 * remaniement de la sidebar ne doit pas casser silencieusement l'impression.
 */
const CSS_IMPRESSION = `
@media print {
  @page { size: A4 landscape; margin: 12mm; }

  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  /* Les conteneurs du layout admin sont à hauteur fixe : sur papier, ils tronqueraient à
     la première page. */
  body * { overflow: visible !important; max-height: none !important; }

  body * { visibility: hidden; }
  #doc-impression, #doc-impression * { visibility: visible; }
  #doc-impression { position: absolute; top: 0; left: 0; width: 100%; }

  .sans-impression { display: none !important; }

  /* Un tableau de 163 lignes tient sur plusieurs pages : l'en-tête doit se répéter, et une
     ligne ne doit pas être coupée en deux. */
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  .bloc-flux { break-inside: avoid-page; }

  a { text-decoration: none; color: inherit; }
}
`

/**
 * Vue document du dictionnaire, destinée à « Enregistrer au format PDF ».
 *
 * Le projet n'embarque aucune bibliothèque PDF, et en ajouter une pour ce tableau serait un
 * mauvais échange : les descriptions sont pleines de « », — et d'accents que les polices
 * standard d'un PDF n'encodent pas (il faudrait embarquer une police Unicode complète), et
 * il faudrait réimplémenter pagination, coupe de texte et répétition d'en-têtes. Le moteur
 * d'impression du navigateur fait tout cela, avec la typographie réelle de la plateforme.
 */
export function DictionnaireImprimable({ flux, filtre }: DictionnaireImprimableProps) {
  const totalColonnes = flux.reduce((somme, f) => somme + f.colonnes.length, 0)

  // Ouverture automatique : le bouton « PDF » du dictionnaire doit aboutir en un clic, pas
  // en « nouvel onglet, puis chercher où imprimer ».
  useEffect(() => {
    window.print()
  }, [])

  return (
    <>
      <style>{CSS_IMPRESSION}</style>

      <div className="sans-impression flex items-center gap-[10px] flex-wrap mb-5">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-[6px] text-[12.5px] font-bold rounded-[9px] px-[12px] py-[9px]"
          style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 'none' }}
        >
          <Icon name="download" size={15} />
          Imprimer / Enregistrer en PDF
        </button>
        <Link
          href="/admin/data-hub"
          className="inline-flex items-center gap-[6px] text-[12.5px] font-bold rounded-[9px] px-[12px] py-[9px]"
          style={{
            background: 'var(--gj-surface)',
            color: 'var(--gj-ink)',
            border: '1.5px solid var(--gj-line)',
          }}
        >
          Retour au dictionnaire
        </Link>
      </div>

      <div id="doc-impression" style={{ color: 'var(--gj-ink)' }}>
        <h1 className="text-[22px] font-black">Dictionnaire du Data Hub</h1>
        <p className="text-[12.5px] mt-[4px]" style={{ color: 'var(--gj-grey)' }}>
          Contrat d’export du Guichet Jeunesse CJS · {flux.length} flux · {totalColonnes}{' '}
          colonne{totalColonnes > 1 ? 's' : ''} · édité le{' '}
          {new Date().toLocaleDateString('fr-FR')}
        </p>
        {filtre ? (
          <p className="text-[12.5px] mt-[2px] font-bold">Extrait filtré : {filtre}</p>
        ) : null}

        {flux.map((f) => (
          <section key={f.id} className="bloc-flux mt-[18px]">
            <h2 className="text-[14px] font-black">{f.nom}</h2>
            <p className="text-[11.5px]" style={{ color: 'var(--gj-grey)' }}>
              {f.chemin} · {f.replication} · clé primaire {f.clesPrimaires.join(' + ')}
              {f.cleReplication ? ` · clé de réplication ${f.cleReplication}` : ''}
            </p>
            <table className="w-full mt-[6px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gj-line-strong)' }}>
                  <th className="text-left text-[11.5px] py-[4px] pr-[8px]">Colonne</th>
                  <th className="text-left text-[11.5px] py-[4px] pr-[8px]">Type</th>
                  <th className="text-left text-[11.5px] py-[4px] pr-[8px]">Description</th>
                  <th className="text-left text-[11.5px] py-[4px]">Gouvernance</th>
                </tr>
              </thead>
              <tbody>
                {f.colonnes.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--gj-line)' }}>
                    <td className="text-[11.5px] py-[3px] pr-[8px] font-bold align-top">
                      {c.nom}
                    </td>
                    <td className="text-[11.5px] py-[3px] pr-[8px] align-top">
                      {c.type}
                      {c.nullable ? ' (nullable)' : ''}
                    </td>
                    <td className="text-[11.5px] py-[3px] pr-[8px] align-top">{c.description}</td>
                    <td className="text-[11.5px] py-[3px] align-top">{c.tier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  )
}
