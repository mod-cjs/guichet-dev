/* eslint-disable */
// Centres CJS — données + carte du Sénégal (partagés web + mobile).

const CENTRES = [
  { id: "tamba", name: "CJS Tambacounda", region: "Tambacounda", addr: "Av. Léopold Sédar Senghor · Médina", km: "2,4 km", open: true, hours: "08h – 18h", counsellors: 3, mine: true,
    services: ["Conseil 1-à-1", "Ateliers", "Wifi", "Imprimante", "Salle de réunion", "Véhicule", "Postes info"], x: 180, y: 120 },
  { id: "dakar", name: "CJS Dakar Plateau", region: "Dakar", addr: "Rue Carnot · Plateau", km: "467 km", open: true, hours: "08h – 19h", counsellors: 6,
    services: ["Coworking", "Studio", "Salle de réunion", "Wifi", "Postes info"], x: 24, y: 84 },
  { id: "thies", name: "CJS Thiès", region: "Thiès", addr: "Quartier Randoulène", km: "402 km", open: true, hours: "08h – 18h", counsellors: 4,
    services: ["Conseil 1-à-1", "Salle de réunion", "Wifi"], x: 50, y: 82 },
  { id: "kaolack", name: "CJS Kaolack", region: "Kaolack", addr: "Médina Baye", km: "220 km", open: true, hours: "08h – 18h", counsellors: 3,
    services: ["Conseil 1-à-1", "Salle de réunion", "Wifi", "Postes info"], x: 75, y: 118 },
  { id: "stlouis", name: "CJS Saint-Louis", region: "Saint-Louis", addr: "Quartier Sud · Île", km: "631 km", open: false, hours: "Ouvre à 08h", counsellors: 3,
    services: ["Conseil 1-à-1", "Salle de réunion", "Wifi"], x: 52, y: 34 },
  { id: "ziguinchor", name: "CJS Ziguinchor", region: "Ziguinchor", addr: "Centre-ville · Escale", km: "388 km", open: true, hours: "08h – 18h", counsellors: 4,
    services: ["Conseil 1-à-1", "Salle de réunion", "Imprimante", "Postes info"], x: 60, y: 176 },
  { id: "kolda", name: "CJS Kolda", region: "Kolda", addr: "Bouna Kane", km: "262 km", open: true, hours: "08h – 18h", counsellors: 2,
    services: ["Conseil 1-à-1", "Wifi"], x: 120, y: 165 },
  { id: "kedougou", name: "CJS Kédougou", region: "Kédougou", addr: "Quartier Lawol", km: "189 km", open: true, hours: "08h – 17h", counsellors: 2,
    services: ["Conseil 1-à-1", "Wifi", "Postes info"], x: 228, y: 176 },
];

// Ressources réservables (gratuites). kind = salle | vehicule | poste
const RES_KIND = {
  salle:    { icon: "i-users",   soft: "var(--gj-teal-soft)",   ink: "var(--gj-teal-deep)", label: "Salle" },
  vehicule: { icon: "i-car",     soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)",label: "Véhicule" },
  poste:    { icon: "i-desktop", soft: "var(--gj-blue-soft)",   ink: "var(--gj-blue-ink)",  label: "Poste info" },
};

const RESOURCES_C = [
  { id: "salleA", kind: "salle", name: "Salle de réunion A", centre: "CJS Tambacounda", cap: "12 personnes", spec: "Vidéoprojecteur · tableau · climatisée", avail: "Disponible aujourd'hui", free: true },
  { id: "salleAtelier", kind: "salle", name: "Salle d'atelier", centre: "CJS Tambacounda", cap: "20 personnes", spec: "Tables modulables · paperboard", avail: "Disponible dès demain", free: true },
  { id: "vehicule", kind: "vehicule", name: "Véhicule de service (pick-up)", centre: "CJS Tambacounda", cap: "5 places", spec: "Déplacement projet · chauffeur inclus", avail: "Validation requise · pièce justificative", justif: true, free: true },
  { id: "poste", kind: "poste", name: "Poste informatique", centre: "CJS Tambacounda", cap: "Par session 1h", spec: "Internet haut débit · suite bureautique", avail: "4 / 6 postes libres", free: true },
];

// Mes réservations + statuts
const RESA_STATUS = {
  attente:  { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)", dot: "var(--gj-yellow-deep)", label: "En attente", icon: "i-clock" },
  acceptee: { soft: "var(--gj-green-soft)",  ink: "var(--gj-green-ink)",  dot: "var(--gj-green)",       label: "Acceptée",  icon: "i-check-circle" },
  refusee:  { soft: "var(--gj-red-soft)",    ink: "var(--gj-red-ink)",    dot: "var(--gj-red)",         label: "Refusée",   icon: "i-block" },
  passee:   { soft: "var(--gj-bg)",          ink: "var(--gj-grey)",       dot: "var(--gj-grey-2)",      label: "Passée",    icon: "i-check" },
};

const RESA = [
  { id: "r1", kind: "salle", res: "Salle de réunion A", centre: "CJS Tambacounda", date: "Ven 23 mai", slot: "14h00 – 16h00", motif: "Réunion d'équipe projet maraîchage", people: 8, status: "attente", asked: "il y a 2 h" },
  { id: "r2", kind: "vehicule", res: "Véhicule de service (pick-up)", centre: "CJS Tambacounda", date: "Mar 27 mai", slot: "08h00 – 13h00", motif: "Visite terrain à Goudiry", status: "acceptee", asked: "hier", note: "Présente-toi 15 min avant · QR carte CJS" },
  { id: "r3", kind: "poste", res: "Poste informatique", centre: "CJS Tambacounda", date: "Lun 19 mai", slot: "10h00 – 11h00", motif: "Dépôt de dossier de bourse en ligne", status: "refusee", asked: "le 17 mai", note: "Créneau complet — un conseiller propose 11h–12h" },
  { id: "r4", kind: "salle", res: "Salle d'atelier", centre: "CJS Tambacounda", date: "Jeu 8 mai", slot: "09h00 – 12h00", motif: "Atelier pitch entre pairs", people: 14, status: "passee", asked: "" },
];

// ---------------------------------------------------------------------
// SenegalMap — carte stylisée du Sénégal avec pins des centres.
// Formes simples (polygone + cercles) ; Gambie = encoche, presqu'île de Dakar.
// pins : tableau {x,y (0-200 / 0-150), label, active}
// ---------------------------------------------------------------------
// Contour du Sénégal projeté depuis des coordonnées lon/lat réelles (simplifié).
// Inclut la presqu'île du Cap-Vert, l'entaille de la Gambie et la Casamance.
const SENEGAL_PATH = "M44,28 L78,18 L120,16 L150,24 L175,40 L188,62 L200,82 L224,92 L236,120 L242,150 L240,176 L252,182 L250,192 L210,190 L170,184 L150,190 L120,192 L90,190 L60,186 L44,190 L40,168 L42,150 L42,140 L150,142 L166,138 L150,126 L44,124 L40,112 L36,96 L10,84 L34,72 L36,52 Z";

const SenegalMap = ({ pins = [], height = 300, bg = "#fff", showLabels = true }) => {
  const active = pins.find((p) => p.active);
  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: 14, overflow: "hidden", background: "linear-gradient(135deg, #EAF3F0, #DCEAE5)", border: "1.5px solid var(--gj-line)" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,122,92,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,122,92,.06) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      <svg viewBox="0 0 270 205" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", padding: 12 }}>
        <path d={SENEGAL_PATH} fill="var(--gj-teal-soft)" stroke="var(--gj-teal-deep)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        <text x="96" y="136" textAnchor="middle" style={{ fontSize: 6.5, fontWeight: 700, fill: "var(--gj-grey-2)" }}>GAMBIE</text>
        <text x="16" y="56" style={{ fontSize: 7, fontWeight: 700, fill: "var(--gj-teal-deep)", opacity: .38 }} transform="rotate(-90 16 56)">ATLANTIQUE</text>

        {/* pins */}
        {pins.map((p, i) => (
          <g key={i}>
            {p.active && (
              <circle cx={p.x} cy={p.y} r="7" fill="none" stroke="var(--gj-red)" strokeWidth="1.8" opacity="0.6">
                <animate attributeName="r" values="7;16;7" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={p.x} cy={p.y} r={p.active ? 6.5 : 4.5} fill={p.active ? "var(--gj-red)" : "var(--gj-teal-deep)"} stroke="#fff" strokeWidth="1.8" />
          </g>
        ))}

        {/* label du centre actif */}
        {showLabels && active && (() => {
          const w = active.label.length * 4.0 + 13;
          return (
            <g>
              <rect x={active.x - w / 2} y={active.y + 9} width={w} height={13} rx="6.5" fill="#fff" stroke="var(--gj-line)" strokeWidth="0.7" />
              <text x={active.x} y={active.y + 18.2} textAnchor="middle" style={{ fontSize: 7.2, fontWeight: 800, fill: "var(--gj-red-ink)" }}>{active.label}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

const centrePins = (activeId) => CENTRES.map((c) => ({ x: c.x, y: c.y, label: c.name.replace("CJS ", ""), active: c.id === activeId, show: c.id === activeId }));

Object.assign(window, { CENTRES, RES_KIND, RESOURCES_C, RESA_STATUS, RESA, SenegalMap, centrePins });
