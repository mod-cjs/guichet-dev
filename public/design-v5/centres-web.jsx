/* eslint-disable */
// Centres CJS — version WEB. Réutilise BenefSidebar/BenefTopBar (web-dashboard.jsx),
// MyCJSCard (cjs-card.jsx) + centres-data.jsx.
// Vues : all · detail · resources · reserve · myresa · card.

const cMeta = (icon, label, color) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: color || "var(--gj-grey)", fontWeight: 600 }}>
    <svg className="gj-icon" style={{ width: 14, height: 14, color: color || "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
  </span>
);

const SERVICE_ICONS = {
  "Conseil 1-à-1": "i-chat", "Ateliers": "i-learning", "Wifi": "i-globe", "Imprimante": "i-document",
  "Salle de réunion": "i-users", "Véhicule": "i-car", "Postes info": "i-desktop", "Coworking": "i-home", "Studio": "i-video",
};
const serviceChip = (s) => (
  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--gj-teal-deep)", background: "var(--gj-teal-soft)", padding: "6px 11px", borderRadius: 9 }}>
    <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href={"#" + (SERVICE_ICONS[s] || "i-check")} /></svg>{s}
  </span>
);

const OpenDot = ({ open }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: open ? "var(--gj-green-ink)" : "var(--gj-grey)" }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: open ? "var(--gj-green)" : "var(--gj-grey-2)" }} />{open ? "Ouvert" : "Fermé"}
  </span>
);

// ---------------------------------------------------------------------
// Annuaire centre row
// ---------------------------------------------------------------------
const CentreRow = ({ c, onOpen }) => (
  <div onClick={onOpen} style={{ background: "#fff", border: c.mine ? "1.5px solid var(--gj-teal)" : "1.5px solid var(--gj-line)", borderRadius: 12, padding: 15, display: "flex", gap: 14, cursor: "pointer", alignItems: "flex-start" }}>
    <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: c.mine ? "var(--gj-teal-soft)" : "var(--gj-bg)", color: c.mine ? "var(--gj-teal-deep)" : "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-pin" /></svg>
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: "var(--gj-ink)" }}>{c.name}</span>
        {c.mine && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)", background: "var(--gj-teal-soft)", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px" }}>Mon centre</span>}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-teal-deep)", whiteSpace: "nowrap" }}>{c.km}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 3 }}>{c.addr} · {c.region}</div>
      <div style={{ display: "flex", gap: 14, marginTop: 7, flexWrap: "wrap" }}>
        <OpenDot open={c.open} />
        {cMeta("i-clock", c.hours)}
        {cMeta("i-users", `${c.counsellors} conseillers`)}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
        {c.services.slice(0, 5).map(serviceChip)}
        {c.services.length > 5 && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gj-grey-2)", padding: "4px 4px" }}>+{c.services.length - 5}</span>}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// ALL CENTRES — carte + annuaire
// ---------------------------------------------------------------------
const RegionFilter = () => {
  const regions = ["Toutes", "Tambacounda", "Dakar", "Thiès", "Kaolack", "Casamance"];
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
      {regions.map((r, i) => (
        <button key={r} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{r}</button>
      ))}
    </div>
  );
};

const AllCentresContent = ({ onOpen, onCard, onResa }) => (
  <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Centres CJS</h1>
        <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>{CENTRES.length} centres dans tout le Sénégal · trouve le plus proche de toi.</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onResa} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
          <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-calendar" /></svg>Mes réservations
        </button>
        <button onClick={onCard} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-teal-deep)", border: 0, color: "#fff", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
          <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-pin" /></svg>Ma carte CJS
        </button>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 480px", gap: 22, alignItems: "start" }}>
      <div style={{ position: "sticky", top: 0 }}>
        <SenegalMap pins={centrePins("tamba")} height={460} />
        <div style={{ display: "flex", gap: 16, marginTop: 12, padding: "0 4px", fontSize: 12, color: "var(--gj-grey)", fontWeight: 700 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--gj-red)", border: "2px solid #fff", boxShadow: "0 0 0 1px var(--gj-line)" }} />Mon centre</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--gj-teal-deep)", border: "2px solid #fff", boxShadow: "0 0 0 1px var(--gj-line)" }} />Autres centres</span>
        </div>
      </div>
      <div>
        {/* Carte CJS — accès rapide depuis la page Centres */}
        <div onClick={onCard} style={{ marginBottom: 16, cursor: "pointer", position: "relative" }}>
          <MyCJSCard maxWidth={480} />
          <span style={{ position: "absolute", right: 14, bottom: 14, display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.92)", color: "var(--gj-teal-deep)", padding: "6px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, boxShadow: "0 2px 8px rgba(0,0,0,.18)" }}>
            Ouvrir ma carte <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-arrow-right" /></svg>
          </span>
        </div>
        <RegionFilter />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CENTRES.map((c) => <CentreRow key={c.id} c={c} onOpen={() => onOpen && onOpen(c.id)} />)}
        </div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// Bookable resource card
// ---------------------------------------------------------------------
const ResourceC = ({ r, onReserve, compact }) => {
  const k = RES_KIND[r.kind];
  return (
    <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 15, display: "flex", gap: 14, alignItems: "center" }}>
      <span style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg className="gj-icon" style={{ width: 26, height: 26 }}><use href={"#" + k.icon} /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{r.name}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px" }}>Gratuit</span>
        </div>
        {!compact && <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>{r.spec}</div>}
        <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
          {cMeta(r.kind === "salle" ? "i-users" : r.kind === "vehicule" ? "i-users" : "i-clock", r.cap)}
          {cMeta(r.justif ? "i-alert" : "i-check-circle", r.avail, r.justif ? "var(--gj-yellow-ink)" : "var(--gj-green-ink)")}
        </div>
      </div>
      <button onClick={() => onReserve && onReserve(r)} style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "10px 16px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Réserver</button>
    </div>
  );
};

// ---------------------------------------------------------------------
// DETAIL
// ---------------------------------------------------------------------
const CentreDetailContent = ({ c, onBack, onReserve, onResources }) => {
  const centreRes = RESOURCES_C;
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 14, padding: 0 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Tous les centres
      </button>

      {/* hero */}
      <div style={{ background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)", color: "#fff", borderRadius: 16, padding: "22px 26px", position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <span style={{ position: "absolute", right: -50, top: -60, width: 240, height: 240, background: "radial-gradient(circle, rgba(248,163,9,.16), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-yellow)", textTransform: "uppercase", letterSpacing: ".5px" }}>Mon centre · {c.region}</span>
          <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, marginTop: 6 }}>{c.name}</h1>
          <div style={{ fontSize: 14, opacity: .9, marginTop: 6 }}>{c.addr}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#19a657" }} />Ouvert · {c.hours}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-yellow)" }}><use href="#i-users" /></svg>{c.counsellors} conseillers</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-yellow)" }}><use href="#i-pin" /></svg>{c.km}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", border: 0, padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-calendar" /></svg>Prendre RDV</button>
            <button style={{ background: "rgba(255,255,255,.12)", color: "#fff", border: "1.5px solid rgba(255,255,255,.25)", padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-pin" /></svg>Itinéraire</button>
          </div>
        </div>
        <div style={{ position: "relative", width: 150, flexShrink: 0 }}>
          <SenegalMap pins={centrePins(c.id)} height={150} bg="#014B4A" showLabels={false} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, marginTop: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Ressources réservables */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>Ressources réservables</h2>
              <span onClick={onResources} style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Tout voir →</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {centreRes.map((r) => <ResourceC key={r.id} r={r} onReserve={onReserve} />)}
            </div>
          </div>
        </div>
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Photos du centre */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Photos du centre</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["Façade", "Salle d'atelier", "Espace coworking", "Accueil"].map((p, i) => (
                <div key={p} style={{ aspectRatio: "4/3", borderRadius: 10, overflow: "hidden", position: "relative" }}>
                  <image-slot id={"centre-tamba-" + i} shape="rounded" radius="10" fit="cover" placeholder={p + " — photo réelle"}></image-slot>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 8, lineHeight: 1.4 }}>Déposez ici les photos réelles du centre — façade, atelier, jeunes en activité.</div>
          </div>
          {/* Horaires */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Horaires</h3>
            {[["Lun – Ven", "08h – 18h"], ["Samedi", "09h – 13h"], ["Dimanche", "Fermé"]].map(([d, h], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 2 ? "1px solid var(--gj-line)" : 0, fontSize: 13 }}>
                <span style={{ color: "var(--gj-grey)", fontWeight: 600 }}>{d}</span>
                <span style={{ fontWeight: 800, color: h === "Fermé" ? "var(--gj-grey-2)" : "var(--gj-ink)" }}>{h}</span>
              </div>
            ))}
          </div>
          {/* Services */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Services sur place</h3>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{c.services.map(serviceChip)}</div>
          </div>
          {/* Contact */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900 }}>Contact</h3>
            {cMeta("i-phone", "33 981 20 20")}
            {cMeta("i-mail", "tambacounda@cjs.sn")}
          </div>
        </aside>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// RESOURCES LIST (d'un / des centres)
// ---------------------------------------------------------------------
const ResourcesListContent = ({ onReserve, onBack }) => {
  const kinds = [["all", "Toutes"], ["salle", "Salles"], ["vehicule", "Véhicules"], ["poste", "Postes info"]];
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", width: "100%" }}>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span onClick={onBack} style={{ color: "var(--gj-teal-deep)", fontWeight: 700, cursor: "pointer" }}>CJS Tambacounda</span>
        <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-chevron-right" /></svg>
        <span style={{ fontWeight: 700, color: "var(--gj-ink)" }}>Ressources</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Ressources réservables</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Salles, véhicule et postes informatiques · gratuits sur réservation</div>
        </div>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
          <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-pin" /></svg>CJS Tambacounda
        </button>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {kinds.map(([id, label], i) => (
          <button key={id} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {RESOURCES_C.map((r) => <ResourceC key={r.id} r={r} onReserve={onReserve} />)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gj-teal-soft)", borderRadius: 12, padding: "13px 16px", marginTop: 18 }}>
        <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-teal-deep)" }}><use href="#i-info" /></svg>
        <div style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>Toutes les ressources sont <b>gratuites</b>. Ta demande est validée par le centre (réponse sous 24–48 h). Le retrait se fait avec ton <b>QR carte CJS</b>.</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// RESERVE — formulaire
// ---------------------------------------------------------------------
const ReserveContent = ({ r, onBack }) => {
  const k = RES_KIND[r.kind];
  const slots = ["08h – 10h", "10h – 12h", "14h – 16h", "16h – 18h"];
  const fieldLabel = (t) => <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 7, display: "block" }}>{t}</span>;
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 14, padding: 0 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Retour
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)", marginBottom: 16 }}>Réserver une ressource</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* resource recap */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 26, height: 26 }}><use href={"#" + k.icon} /></svg></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "var(--gj-ink)" }}>{r.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2 }}>{r.centre} · {r.cap}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "3px 10px", borderRadius: 999 }}>Gratuit</span>
          </div>

          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                {fieldLabel("Date")}
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "0 13px", minHeight: 46, background: "var(--gj-bg)" }}>
                  <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-teal-deep)" }}><use href="#i-calendar" /></svg>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gj-ink)" }}>Ven 23 mai 2026</span>
                </div>
              </div>
              <div>
                {fieldLabel("Nombre de personnes")}
                <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--gj-line)", borderRadius: 9, minHeight: 46, background: "var(--gj-bg)", overflow: "hidden" }}>
                  <button style={{ width: 44, alignSelf: "stretch", border: 0, borderRight: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 800, color: "var(--gj-grey)" }}>–</button>
                  <span style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 800, color: "var(--gj-ink)" }}>8</span>
                  <button style={{ width: 44, alignSelf: "stretch", border: 0, borderLeft: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 800, color: "var(--gj-grey)" }}>+</button>
                </div>
              </div>
            </div>
            <div>
              {fieldLabel("Créneau horaire")}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {slots.map((s, i) => (
                  <button key={s} style={{ padding: "10px 16px", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 2 ? "var(--gj-teal-soft)" : "#fff", border: i === 2 ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: i === 2 ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              {fieldLabel("Motif / objet de la réservation")}
              <textarea defaultValue="Réunion d'équipe — projet maraîchage" rows={2} style={{ width: "100%", border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "11px 13px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none", resize: "none", lineHeight: 1.5 }} />
            </div>
            <div>
              {fieldLabel(r.kind === "vehicule" ? "Pièce justificative (requise)" : "Pièce justificative (facultatif)")}
              <div style={{ border: "2px dashed var(--gj-line-strong)", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 12, background: "var(--gj-bg)" }}>
                <span style={{ width: 38, height: 38, borderRadius: 9, background: "#fff", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-upload" /></svg></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>Ajouter un document</div>
                  <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{r.kind === "vehicule" ? "Ordre de mission / justificatif projet · PDF, JPG" : "Ex. convocation, ordre de mission · PDF, JPG"}</div>
                </div>
                <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "8px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Parcourir</button>
              </div>
            </div>
          </div>
        </div>

        {/* récap */}
        <aside style={{ position: "sticky", top: 0, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 8 }}>Récapitulatif</h3>
          {[["Ressource", r.name], ["Centre", r.centre], ["Date", "Ven 23 mai 2026"], ["Créneau", "14h – 16h"], ["Personnes", "8"]].map(([l, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--gj-line)" }}>
              <span style={{ fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}>{l}</span>
              <span style={{ fontSize: 12.5, color: "var(--gj-ink)", fontWeight: 800, textAlign: "right" }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 6px" }}>
            <span style={{ fontSize: 13, color: "var(--gj-grey)", fontWeight: 700 }}>Coût</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-green-ink)" }}>Gratuit</span>
          </div>
          <button style={{ marginTop: 6, background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-check" /></svg>Envoyer la demande
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, fontSize: 11.5, color: "var(--gj-yellow-ink)", background: "var(--gj-yellow-soft)", padding: "10px 12px", borderRadius: 9, fontWeight: 600, lineHeight: 1.45 }}>
            <svg className="gj-icon" style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }}><use href="#i-clock" /></svg>
            Ta demande sera <b>en attente</b> de validation par le centre (réponse sous 24–48 h).
          </div>
        </aside>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// MY RESERVATIONS
// ---------------------------------------------------------------------
const ResaCard = ({ r }) => {
  const k = RES_KIND[r.kind];
  const s = RESA_STATUS[r.status];
  return (
    <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + k.icon} /></svg></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
            <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{r.res}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: s.ink, background: s.soft, border: `1px solid ${s.dot}`, padding: "3px 10px", borderRadius: 999, flexShrink: 0 }}>
              <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + s.icon} /></svg>{s.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 3 }}>{r.centre}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 7, flexWrap: "wrap" }}>
            {cMeta("i-calendar", r.date)}
            {cMeta("i-clock", r.slot)}
            {r.people && cMeta("i-users", `${r.people} pers.`)}
          </div>
          <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 7, fontStyle: "italic" }}>« {r.motif} »</div>
        </div>
      </div>
      {r.note && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: s.soft, borderRadius: 9, padding: "10px 12px", fontSize: 12, color: s.ink, fontWeight: 600, lineHeight: 1.45 }}>
          <svg className="gj-icon" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}><use href={"#" + s.icon} /></svg>{r.note}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid var(--gj-line)", paddingTop: 12 }}>
        {r.status === "attente" && <button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "8px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Annuler la demande</button>}
        {r.status === "acceptee" && <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "8px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-target" /></svg>Voir mon QR de retrait</button>}
        {r.status === "refusee" && <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "8px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Proposer un autre créneau</button>}
        {r.status === "passee" && <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "8px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Réserver à nouveau</button>}
      </div>
    </div>
  );
};

const MyResaContent = ({ onBack }) => {
  const tabs = [["all", "Toutes", RESA.length], ["attente", "En attente", 1], ["acceptee", "Acceptées", 1], ["passee", "Passées", 1]];
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 12, padding: 0 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Centres CJS
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Mes réservations</h1>
      <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Suis l'état de tes demandes de ressources.</div>
      <div style={{ display: "flex", gap: 6, margin: "18px 0", background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 5, width: "fit-content" }}>
        {tabs.map(([id, label, n], i) => (
          <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", background: i === 0 ? "var(--gj-teal-deep)" : "transparent", color: i === 0 ? "#fff" : "var(--gj-grey)" }}>
            {label}<span style={{ fontSize: 11, fontWeight: 800, background: i === 0 ? "rgba(255,255,255,.22)" : "var(--gj-bg)", color: i === 0 ? "#fff" : "var(--gj-grey)", padding: "1px 7px", borderRadius: 999 }}>{n}</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {RESA.map((r) => <ResaCard key={r.id} r={r} />)}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// CARTE CJS
// ---------------------------------------------------------------------
const CardContent = ({ onBack }) => (
  <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
    <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 12, padding: 0 }}>
      <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Centres CJS
    </button>
    <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Ma carte CJS</h1>
    <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3, marginBottom: 18 }}>Ton sésame pour accéder aux centres, pointer aux ateliers et retirer tes ressources.</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Recto</div>
        <MyCJSCard maxWidth={460} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Verso</div>
        <MyCJSCardBack maxWidth={460} />
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
      {[
        { icon: "i-pin", t: "Accès aux centres", s: "Présente le QR à l'accueil de n'importe quel centre CJS du Sénégal." },
        { icon: "i-calendar", t: "Check-in ateliers", s: "Scanne pour valider ta présence aux ateliers et événements." },
        { icon: "i-car", t: "Retrait de ressources", s: "Récupère salle, véhicule ou matériel réservé avec ton QR." },
        { icon: "i-download", t: "Hors-ligne", s: "Ajoute la carte à ton portefeuille — elle marche sans réseau." },
      ].map((b, i) => (
        <div key={i} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href={"#" + b.icon} /></svg></span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{b.t}</div>
            <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.45 }}>{b.s}</div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
      <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-download" /></svg>Ajouter au portefeuille</button>
      <button style={{ flex: 1, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-share" /></svg>Partager</button>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// SHELL
// ---------------------------------------------------------------------
const WebCentres = ({ view = "all" }) => {
  const [v, setV] = React.useState(view);
  const [active, setActive] = React.useState(CENTRES[0]);
  const [resR, setResR] = React.useState(RESOURCES_C[0]);
  const root = { display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden" };
  const main = { display: "flex", flexDirection: "column", overflow: "hidden" };
  const page = { padding: "22px 28px 40px", overflowY: "auto", flex: 1 };
  const openCentre = (id) => { setActive(CENTRES.find((c) => c.id === id) || CENTRES[0]); setV("detail"); };
  const openReserve = (r) => { setResR(r || RESOURCES_C[0]); setV("reserve"); };
  let content;
  if (v === "all") content = <AllCentresContent onOpen={openCentre} onCard={() => setV("card")} onResa={() => setV("myresa")} />;
  else if (v === "detail") content = <CentreDetailContent c={active} onBack={() => setV("all")} onReserve={openReserve} onResources={() => setV("resources")} />;
  else if (v === "resources") content = <ResourcesListContent onReserve={openReserve} onBack={() => setV("detail")} />;
  else if (v === "reserve") content = <ReserveContent r={resR} onBack={() => setV("resources")} />;
  else if (v === "myresa") content = <MyResaContent onBack={() => setV("all")} />;
  else if (v === "card") content = <CardContent onBack={() => setV("all")} />;
  return (
    <div style={root}>
      <BenefSidebar active="centres" onNavChange={(id) => { if (id === "centres") setV("all"); }} />
      <div style={main}>
        <BenefTopBar />
        <div style={page}>{content}</div>
      </div>
    </div>
  );
};

Object.assign(window, { WebCentres });
