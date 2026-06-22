/* eslint-disable */
// Centres CJS — version MOBILE (390×844). Réutilise PhoneFrame, AppHeader,
// BottomNav, FooterCTA (phone.jsx), MyCJSCard (cjs-card.jsx) + centres-data.jsx.

const mcMeta = (icon, label, color) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: color || "var(--gj-grey)", fontWeight: 600 }}>
    <svg className="gj-icon" style={{ width: 13, height: 13, color: color || "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
  </span>
);
const mServiceChip = (s) => (
  <span key={s} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--gj-grey)", background: "var(--gj-bg)", padding: "3px 9px", borderRadius: 999, border: "1px solid var(--gj-line)" }}>{s}</span>
);

// ---------------------------------------------------------------------
// ALL
// ---------------------------------------------------------------------
const MobileCentresAll = ({ nav = () => {} }) => {
  const chips = ["Toutes", "Tambacounda", "Dakar", "Kaolack", "Casamance"];
  return (
    <PhoneFrame>
      <AppHeader title="Centres CJS" onBack={() => {}} trailing={(
        <button onClick={() => nav("card")} style={{ width: 38, height: 38, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-teal-deep)", flexShrink: 0 }} aria-label="Ma carte CJS">
          <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-pin" /></svg>
        </button>
      )} />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)" }}>
        <div style={{ padding: "12px 12px 0" }}>
          <SenegalMap pins={centrePins("tamba")} height={230} />
        </div>
        {/* Accès rapide carte CJS */}
        <div onClick={() => nav("card")} style={{ margin: "12px 12px 0", cursor: "pointer", position: "relative" }}>
          <MyCJSCard />
          <span style={{ position: "absolute", right: 12, bottom: 12, display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.92)", color: "var(--gj-teal-deep)", padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, boxShadow: "0 2px 8px rgba(0,0,0,.18)" }}>Ouvrir <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-arrow-right" /></svg></span>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 12px 0" }}>
          <button onClick={() => nav("myresa")} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-calendar" /></svg>Mes réservations</button>
          <button onClick={() => nav("resources")} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-desktop" /></svg>Ressources</button>
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "12px 12px 4px" }}>
          {chips.map((c, i) => (
            <span key={c} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", padding: "12px 14px 6px" }}>{CENTRES.length} centres</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 12px 14px" }}>
          {CENTRES.map((c) => (
            <div key={c.id} onClick={() => nav("detail")} style={{ background: "#fff", border: c.mine ? "1.5px solid var(--gj-teal)" : "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", gap: 12, cursor: "pointer" }}>
              <span style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: c.mine ? "var(--gj-teal-soft)" : "var(--gj-bg)", color: c.mine ? "var(--gj-teal-deep)" : "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-pin" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{c.name}</span>
                  {c.mine && <span style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-teal-deep)", background: "var(--gj-teal-soft)", padding: "1px 7px", borderRadius: 999, textTransform: "uppercase" }}>Mien</span>}
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)" }}>{c.km}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{c.addr}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: c.open ? "var(--gj-green-ink)" : "var(--gj-grey)" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c.open ? "var(--gj-green)" : "var(--gj-grey-2)" }} />{c.open ? "Ouvert" : "Fermé"} · {c.hours}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="centres" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// DETAIL
// ---------------------------------------------------------------------
const mResourceCard = (r, nav = () => {}) => {
  const k = RES_KIND[r.kind];
  return (
    <div key={r.id} onClick={() => nav("reserve")} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
      <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + k.icon} /></svg></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{r.name}</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "1px 7px", borderRadius: 999, textTransform: "uppercase" }}>Gratuit</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>{r.cap}</div>
        <div style={{ marginTop: 5 }}>{mcMeta(r.justif ? "i-alert" : "i-check-circle", r.avail, r.justif ? "var(--gj-yellow-ink)" : "var(--gj-green-ink)")}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); nav("reserve"); }} style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Réserver</button>
    </div>
  );
};

const MobileCentreDetail = ({ nav = () => {} }) => {
  const c = CENTRES[0];
  return (
    <PhoneFrame>
      <AppHeader title={c.name} subtitle={c.region} onBack={() => nav("all")} trailing={(
        <button style={{ width: 38, height: 38, borderRadius: 8, border: 0, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)", flexShrink: 0 }} aria-label="Partager">
          <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-share" /></svg>
        </button>
      )} />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)" }}>
        {/* hero */}
        <div style={{ background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)", color: "#fff", padding: "16px", position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", right: -40, top: -50, width: 160, height: 160, background: "radial-gradient(circle, rgba(249,196,0,.16), transparent 60%)" }} />
          <div style={{ position: "relative", fontSize: 19, fontWeight: 900 }}>{c.name}</div>
          <div style={{ position: "relative", fontSize: 12.5, opacity: .9, marginTop: 4 }}>{c.addr}</div>
          <div style={{ position: "relative", display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7BE5B5" }} />Ouvert · {c.hours}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-yellow)" }}><use href="#i-users" /></svg>{c.counsellors} conseillers</span>
          </div>
        </div>

        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* services */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Services sur place</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{c.services.map(mServiceChip)}</div>
          </div>
          {/* ressources */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
              <h2 style={{ fontSize: 15, fontWeight: 900 }}>Ressources réservables</h2>
              <span onClick={() => nav("resources")} style={{ fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Tout voir →</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RESOURCES_C.map((r) => mResourceCard(r, nav))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: 14, background: "#fff", borderTop: "1px solid var(--gj-line)", display: "flex", gap: 9, flexShrink: 0 }}>
        <button style={{ flex: "0 0 auto", width: 52, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Itinéraire">
          <svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-pin" /></svg>
        </button>
        <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-calendar" /></svg>Prendre RDV
        </button>
      </div>
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// RESOURCES LIST
// ---------------------------------------------------------------------
const MobileResourcesList = ({ nav = () => {} }) => {
  const chips = ["Toutes", "Salles", "Véhicule", "Postes info"];
  return (
    <PhoneFrame>
      <AppHeader title="Ressources" subtitle="CJS Tambacounda" onBack={() => nav("detail")} />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 0 10px" }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 14px" }}>
          {chips.map((c, i) => (
            <span key={c} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--gj-bg)" }}>
        {RESOURCES_C.map((r) => mResourceCard(r, nav))}
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "var(--gj-teal-soft)", borderRadius: 12, padding: "12px 13px", marginTop: 4 }}>
          <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-teal-deep)", flexShrink: 0, marginTop: 1 }}><use href="#i-info" /></svg>
          <div style={{ fontSize: 11.5, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>Gratuit · demande validée par le centre (24–48 h). Retrait avec ton <b>QR carte CJS</b>.</div>
        </div>
      </div>
      <BottomNav active="centres" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// RESERVE
// ---------------------------------------------------------------------
const MobileReserve = ({ nav = () => {} }) => {
  const r = RESOURCES_C[0];
  const k = RES_KIND[r.kind];
  const slots = ["08h–10h", "10h–12h", "14h–16h", "16h–18h"];
  const lbl = (t) => <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 7, display: "block" }}>{t}</span>;
  return (
    <PhoneFrame>
      <AppHeader title="Réserver" onBack={() => nav("resources")} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 16, background: "var(--gj-bg)" }}>
        {/* recap */}
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 13, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 48, height: 48, borderRadius: 11, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 24, height: 24 }}><use href={"#" + k.icon} /></svg></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--gj-ink)" }}>{r.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{r.centre} · {r.cap}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "2px 9px", borderRadius: 999 }}>Gratuit</span>
        </div>

        <div>
          {lbl("Date")}
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", minHeight: 48, background: "#fff" }}>
            <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-teal-deep)" }}><use href="#i-calendar" /></svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gj-ink)" }}>Ven 23 mai 2026</span>
          </div>
        </div>

        <div>
          {lbl("Créneau horaire")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {slots.map((s, i) => (
              <button key={s} style={{ minHeight: 46, borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 2 ? "var(--gj-teal-soft)" : "#fff", border: i === 2 ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: i === 2 ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{s}</button>
            ))}
          </div>
        </div>

        <div>
          {lbl("Nombre de personnes")}
          <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--gj-line)", borderRadius: 10, minHeight: 48, background: "#fff", overflow: "hidden" }}>
            <button style={{ width: 52, alignSelf: "stretch", border: 0, borderRight: "1.5px solid var(--gj-line)", background: "var(--gj-bg)", cursor: "pointer", fontSize: 20, fontWeight: 800, color: "var(--gj-grey)" }}>–</button>
            <span style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 800, color: "var(--gj-ink)" }}>8</span>
            <button style={{ width: 52, alignSelf: "stretch", border: 0, borderLeft: "1.5px solid var(--gj-line)", background: "var(--gj-bg)", cursor: "pointer", fontSize: 20, fontWeight: 800, color: "var(--gj-grey)" }}>+</button>
          </div>
        </div>

        <div>
          {lbl("Motif / objet")}
          <textarea defaultValue="Réunion d'équipe — projet maraîchage" rows={2} style={{ width: "100%", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontFamily: "inherit", color: "var(--gj-ink)", background: "#fff", outline: "none", resize: "none", lineHeight: 1.5 }} />
        </div>

        <div>
          {lbl("Pièce justificative (facultatif)")}
          <div style={{ border: "2px dashed var(--gj-line-strong)", borderRadius: 11, padding: 14, display: "flex", alignItems: "center", gap: 11, background: "#fff" }}>
            <span style={{ width: 38, height: 38, borderRadius: 9, background: "var(--gj-bg)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-upload" /></svg></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>Ajouter un document</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>Requis pour le véhicule · PDF, JPG</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "var(--gj-yellow-soft)", borderRadius: 11, padding: "12px 13px", fontSize: 11.5, color: "var(--gj-yellow-ink)", fontWeight: 600, lineHeight: 1.45 }}>
          <svg className="gj-icon" style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }}><use href="#i-clock" /></svg>
          Ta demande sera <b>en attente</b> de validation par le centre (réponse sous 24–48 h).
        </div>
      </div>
      <FooterCTA primary="Envoyer la demande" onPrimary={() => nav("myresa")} />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// MY RESERVATIONS
// ---------------------------------------------------------------------
const MobileMyResa = ({ nav = () => {} }) => {
  const [tab, setTab] = React.useState("all");
  const tabs = [["all", "Toutes", RESA.length], ["attente", "En attente", 1], ["passee", "Passées", 1]];
  return (
    <PhoneFrame>
      <AppHeader title="Mes réservations" onBack={() => nav("all")} />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 14px 12px" }}>
        <div style={{ display: "flex", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 5 }}>
          {tabs.map(([id, label, n]) => {
            const on = id === tab;
            return (
              <span key={id} onClick={() => setTab(id)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer", background: on ? "var(--gj-teal-deep)" : "transparent", color: on ? "#fff" : "var(--gj-grey)" }}>
                {label}<span style={{ fontSize: 10.5, fontWeight: 800, background: on ? "rgba(255,255,255,.22)" : "var(--gj-bg)", color: on ? "#fff" : "var(--gj-grey)", padding: "1px 6px", borderRadius: 999 }}>{n}</span>
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)" }}>
        {RESA.map((r) => {
          const k = RES_KIND[r.kind];
          const s = RESA_STATUS[r.status];
          return (
            <div key={r.id} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href={"#" + k.icon} /></svg></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 7, justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.25 }}>{r.res}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color: s.ink, background: s.soft, border: `1px solid ${s.dot}`, padding: "2px 8px", borderRadius: 999, flexShrink: 0, whiteSpace: "nowrap" }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + s.icon} /></svg>{s.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                    {mcMeta("i-calendar", r.date)}
                    {mcMeta("i-clock", r.slot)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 5, fontStyle: "italic" }}>« {r.motif} »</div>
                </div>
              </div>
              {r.note && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: s.soft, borderRadius: 9, padding: "9px 11px", fontSize: 11.5, color: s.ink, fontWeight: 600, lineHeight: 1.4 }}>
                  <svg className="gj-icon" style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }}><use href={"#" + s.icon} /></svg>{r.note}
                </div>
              )}
              {r.status === "acceptee" && (
                <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-target" /></svg>Mon QR de retrait</button>
              )}
              {r.status === "attente" && (
                <button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Annuler la demande</button>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav active="centres" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// CARTE CJS
// ---------------------------------------------------------------------
const MobileCJSCard = ({ nav = () => {} }) => (
  <PhoneFrame>
    <AppHeader title="Ma carte CJS" onBack={() => nav("all")} />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px" }}>Recto</div>
      <MyCJSCard />
      <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px" }}>Verso</div>
      <MyCJSCardBack />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { icon: "i-pin", t: "Accès aux centres", s: "Présente le QR à l'accueil de tout centre CJS." },
          { icon: "i-calendar", t: "Check-in ateliers", s: "Valide ta présence aux ateliers & événements." },
          { icon: "i-car", t: "Retrait de ressources", s: "Récupère salle, véhicule ou matériel réservé." },
        ].map((b, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 12, padding: 13, display: "flex", gap: 11, alignItems: "center" }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + b.icon} /></svg></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{b.t}</div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1, lineHeight: 1.4 }}>{b.s}</div>
            </div>
          </div>
        ))}
      </div>
      <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-download" /></svg>Ajouter au portefeuille
      </button>
    </div>
    <BottomNav active="centres" />
  </PhoneFrame>
);

const MobileCentresApp = ({ start = "all" }) => {
  const [s, setS] = React.useState(start);
  const nav = (x) => setS(x);
  if (s === "detail") return <MobileCentreDetail nav={nav} />;
  if (s === "resources") return <MobileResourcesList nav={nav} />;
  if (s === "reserve") return <MobileReserve nav={nav} />;
  if (s === "myresa") return <MobileMyResa nav={nav} />;
  if (s === "card") return <MobileCJSCard nav={nav} />;
  return <MobileCentresAll nav={nav} />;
};

Object.assign(window, { MobileCentresAll, MobileCentreDetail, MobileResourcesList, MobileReserve, MobileMyResa, MobileCJSCard, MobileCentresApp });
