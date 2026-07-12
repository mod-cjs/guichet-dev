// Enrichissement POC de la taxonomie compétences (GUIC — raffinement hiérarchique).
//
// ⚠️ SYNTHÉTIQUE & RÉVERSIBLE. Le dump POC utilise un vocabulaire FERMÉ de 37 compétences
// (côté jeunes ET offres ; descriptions/profil_recherche vides) → aucun signal fin à ancrer.
// On RAFFINE donc chaque compétence coarse en sous-compétences réelles (parent→enfants) et on
// ajoute, pour chaque lien offre→compétence coarse, un lien vers UN enfant (déterministe) :
//  - les OFFRES requièrent / DÉVELOPPENT des compétences FINES ;
//  - les JEUNES gardent leur compétence coarse → l'écart devient plus fin
//    (« il te manque React » plutôt que « Programmation web »), et la formation qui développe
//    ce skill fin est proposée.
// Réversible : DELETE FROM skills WHERE categorie LIKE '%:fin'  (+ cascade opportunites_skills), puis reproject.
//
// Usage : tsx scripts/enrich-taxonomie.ts   (puis `npm run yaye:reproject`)

import { prisma } from '@/lib/prisma'

// Parent (slug existant) → sous-compétences fines [slug, libellé].
const REFINE: Record<string, [string, string][]> = {
  'prog-web': [['react', 'React'], ['angular-vue', 'Angular / Vue'], ['php-laravel', 'PHP / Laravel'], ['wordpress', 'WordPress']],
  'prog-mobile': [['android-kotlin', 'Android (Kotlin)'], ['flutter', 'Flutter'], ['ios-swift', 'iOS (Swift)']],
  'design-graphique': [['ui-ux', 'UI/UX Design'], ['illustrator', 'Illustrator'], ['photoshop', 'Photoshop']],
  video: [['montage-video', 'Montage vidéo'], ['motion-design', 'Motion design']],
  photographie: [['photo-studio', 'Photo studio'], ['retouche-photo', 'Retouche photo']],
  excel: [['excel-avance', 'Excel avancé'], ['tableaux-croises', 'Tableaux croisés'], ['macros-vba', 'Macros VBA']],
  word: [['redaction-doc', 'Rédaction de documents'], ['publipostage', 'Publipostage']],
  'saisie-informatique': [['saisie-rapide', 'Saisie rapide'], ['data-entry', 'Data entry']],
  comptabilite: [['compta-analytique', 'Comptabilité analytique'], ['fiscalite', 'Fiscalité'], ['paie', 'Gestion de la paie']],
  budgetisation: [['controle-gestion', 'Contrôle de gestion'], ['previsionnel', 'Prévisionnel budgétaire']],
  'gestion-projet': [['agile-scrum', 'Agile / Scrum'], ['planification', 'Planification'], ['gestion-risques', 'Gestion des risques']],
  leadership: [['management-equipe', "Management d'équipe"], ['prise-decision', 'Prise de décision']],
  'marketing-digital': [['seo-sea', 'SEO / SEA'], ['community-management', 'Community management'], ['emailing', 'Emailing']],
  'communication-ecrite': [['redaction-web', 'Rédaction web'], ['storytelling', 'Storytelling']],
  'communication-orale': [['prise-parole', 'Prise de parole'], ['animation-atelier', "Animation d'atelier"]],
  presentation: [['pitch', 'Pitch'], ['slides-pro', 'Slides professionnels']],
  vente: [['prospection', 'Prospection'], ['negociation', 'Négociation'], ['relation-client', 'Relation client']],
  'service-client': [['support-client', 'Support client'], ['gestion-reclamations', 'Gestion des réclamations']],
  restauration: [['cuisine', 'Cuisine'], ['patisserie', 'Pâtisserie'], ['service-salle', 'Service en salle']],
  tourisme: [['guide-touristique', 'Guide touristique'], ['reservation', 'Réservation / booking']],
  elevage: [['embouche', 'Embouche'], ['sante-animale', 'Santé animale']],
  aviculture: [['poulet-chair', 'Poulet de chair'], ['ponte', 'Poules pondeuses']],
  maraichage: [['irrigation-goutte', 'Irrigation goutte-à-goutte'], ['permaculture', 'Permaculture'], ['horticulture', 'Horticulture']],
  aquaculture: [['pisciculture', 'Pisciculture'], ['ostreiculture', 'Ostréiculture']],
  'transformation-agro': [['sechage', 'Séchage / conservation'], ['conditionnement', 'Conditionnement']],
  couture: [['stylisme', 'Stylisme'], ['coupe-couture', 'Coupe & couture'], ['broderie', 'Broderie']],
  electricite: [['electricite-batiment', 'Électricité bâtiment'], ['energie-solaire', 'Énergie solaire']],
  mecanique: [['mecanique-auto', 'Mécanique auto'], ['froid-clim', 'Froid & climatisation']],
  soudure: [['soudure-arc', 'Soudure à l’arc'], ['soudure-tig', 'Soudure TIG']],
  plomberie: [['plomberie-sanitaire', 'Plomberie sanitaire'], ['reseaux-eau', "Réseaux d'eau"]],
  maroquinerie: [['travail-cuir', 'Travail du cuir'], ['maroquinerie-fine', 'Maroquinerie fine']],
  anglais: [['anglais-pro', 'Anglais professionnel'], ['anglais-technique', 'Anglais technique']],
  francais: [['francais-redaction', 'Français rédactionnel']],
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

async function main() {
  const skills = await prisma.skill.findMany({ select: { id: true, slug: true, categorie: true } })
  const bySlug = new Map(skills.map(s => [s.slug, s]))

  // 1) Insère les sous-compétences (categorie parent + suffixe ":fin" pour la réversibilité).
  const childRows: { slug: string; libelle: string; categorie: string; parentSlug: string }[] = []
  for (const [parentSlug, children] of Object.entries(REFINE)) {
    const parent = bySlug.get(parentSlug)
    if (!parent) continue
    for (const [slug, libelle] of children) {
      if (bySlug.has(slug)) continue
      childRows.push({ slug, libelle, categorie: `${parent.categorie ?? 'autre'}:fin`, parentSlug })
    }
  }
  if (childRows.length) {
    await prisma.skill.createMany({
      data: childRows.map(c => ({ slug: c.slug, libelle: c.libelle, categorie: c.categorie })),
      skipDuplicates: true,
    })
  }
  const refreshed = await prisma.skill.findMany({ select: { id: true, slug: true } })
  const idBySlug = new Map(refreshed.map(s => [s.slug, s.id]))
  const childrenIds = new Map<string, string[]>() // parentSkillId → [childId]
  for (const [parentSlug, children] of Object.entries(REFINE)) {
    const parent = bySlug.get(parentSlug)
    if (!parent) continue
    childrenIds.set(parent.id, children.map(([slug]) => idBySlug.get(slug)!).filter(Boolean))
  }

  // 2) Pour chaque lien offre→compétence coarse, ajoute un lien vers UN enfant déterministe.
  const links = await prisma.opportuniteSkill.findMany({ select: { opportuniteId: true, skillId: true, requise: true } })
  const additions: { opportuniteId: string; skillId: string; requise: boolean }[] = []
  for (const l of links) {
    const kids = childrenIds.get(l.skillId)
    if (!kids || kids.length === 0) continue
    const childId = kids[hash(l.opportuniteId + l.skillId) % kids.length]
    additions.push({ opportuniteId: l.opportuniteId, skillId: childId, requise: l.requise })
  }
  // Dé-doublonne (un enfant peut être visé par plusieurs parents) et insère par lots.
  const seen = new Set<string>()
  const deduped = additions.filter(a => {
    const k = a.opportuniteId + '|' + a.skillId
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  let inserted = 0
  for (let i = 0; i < deduped.length; i += 2000) {
    const res = await prisma.opportuniteSkill.createMany({ data: deduped.slice(i, i + 2000), skipDuplicates: true })
    inserted += res.count
  }

  const total = await prisma.skill.count()
  console.log(`Sous-compétences ajoutées: ${childRows.length} → ${total} compétences au total`)
  console.log(`Liens offre→compétence fine ajoutés: ${inserted}`)
  process.exit(0)
}

main().catch(e => { console.error('ERREUR:', e); process.exit(1) })
