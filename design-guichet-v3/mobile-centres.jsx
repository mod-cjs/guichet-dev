/* eslint-disable */
// MobileCentresScreen — Onglet "Centres CJS" du bottom-nav mobile.
// Tout ce qu'il faut pour se rendre dans un centre + carte CJS QR.

const MobileCentresScreen = () => {
  const body = { flex: 1, overflowY: "auto", background: "var(--gj-bg)" };

  // ===== Carte CJS hero =====
  const heroWrap = { padding: "12px 12px 0" };

  // ===== Prochain RDV pinned =====
  const rdvCard = {
    background: "linear-gradient(135deg, var(--gj-yellow-soft), #fff)",
    border: "1.5px solid var(--gj-yellow)",
    borderRadius: 12, padding: 14,
    display: "flex", alignItems: "center", gap: 12,
    margin: "12px 12px 0",
  };
  const dateBox = {
    width: 56, textAlign: "center", flexShrink: 0,
    background: "#fff", borderRadius: 10, border: "1.5px solid var(--gj-yellow)",
    padding: "8px 4px",
  };

  // ===== Map mock =====
  const mapWrap = {
    margin: "16px 12px 0",
    height: 180, borderRadius: 12,
    background: "linear-gradient(135deg, #E5F0EC 0%, #D6E5E0 50%, #C5DDD8 100%)",
    position: "relative", overflow: "hidden",
    border: "1.5px solid var(--gj-line)",
  };
  const mapGrid = {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(0,122,92,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,122,92,.08) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
  };
  const route = {
    position: "absolute",
    height: 3, background: "var(--gj-yellow)",
    borderRadius: 999, boxShadow: "0 0 0 4px rgba(249,196,0,.25)",
  };
  const pin = (x, y, on) => ({
    position: "absolute", left: x, top: y,
    width: on ? 36 : 26, height: on ? 36 : 26,
    transform: "translate(-50%, -100%)",
  });

  // ===== Center list =====
  const sectH = { fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", padding: "16px 14px 6px" };

  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Centres CJS" user="AD" />

      <div style={body}>
        {/* CARTE CJS QR */}
        <div style={heroWrap}>
          <MyCJSCard />
        </div>

        {/* Prochain RDV */}
        <div style={rdvCard}>
          <div style={dateBox}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-yellow-ink)", textTransform: "uppercase", letterSpacing: ".4px" }}>VEN</div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: "var(--gj-ink)", marginTop: 1 }}>24</div>
            <div style={{ fontSize: 9, color: "var(--gj-grey)", fontWeight: 700, marginTop: 1 }}>MAI</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>RDV conseillère · 10h00</div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>Mariama Ndiaye · CJS Tambacounda</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={{
                background: "var(--gj-teal-deep)", color: "#fff",
                border: 0, padding: "7px 12px", borderRadius: 7,
                fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <svg className="gj-icon gj-icon--xs"><use href="#i-pin" /></svg> Itinéraire
              </button>
              <button style={{
                background: "#fff", color: "var(--gj-teal-deep)",
                border: "1.5px solid var(--gj-line)", padding: "7px 12px", borderRadius: 7,
                fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}>Reporter</button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={mapWrap}>
          <div style={mapGrid} />
          {/* Route shape */}
          <div style={{ ...route, left: 60, top: 130, width: 180, transform: "rotate(-18deg)" }} />
          <div style={{ ...route, left: 200, top: 90, width: 80, transform: "rotate(28deg)" }} />
          {/* User pin */}
          <div style={pin("28%", "85%", false)}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fff", border: "2.5px solid var(--gj-teal-deep)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,0,0,.2)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gj-teal-deep)" }} />
            </div>
          </div>
          {/* Center pin highlighted */}
          <div style={pin("70%", "50%", true)}>
            <svg viewBox="0 0 24 30" width="100%" height="100%">
              <path d="M12 0C5.4 0 0 5 0 11c0 8 12 19 12 19s12-11 12-19c0-6-5.4-11-12-11z" fill="var(--gj-red)" />
              <circle cx="12" cy="11" r="5" fill="#fff" />
              <circle cx="12" cy="11" r="2.4" fill="var(--gj-red)" />
            </svg>
          </div>
          <div style={pin("42%", "30%", false)}>
            <svg viewBox="0 0 24 30" width="100%" height="100%">
              <path d="M12 0C5.4 0 0 5 0 11c0 8 12 19 12 19s12-11 12-19c0-6-5.4-11-12-11z" fill="var(--gj-teal-deep)" />
              <circle cx="12" cy="11" r="4" fill="#fff" />
            </svg>
          </div>
          {/* Label bubble */}
          <div style={{
            position: "absolute", left: "70%", top: "30%",
            transform: "translate(-50%, -100%)",
            background: "#fff", border: "1.5px solid var(--gj-line)",
            borderRadius: 8, padding: "5px 10px",
            fontSize: 11, fontWeight: 800, color: "var(--gj-ink)",
            boxShadow: "0 4px 12px rgba(0,0,0,.1)", whiteSpace: "nowrap",
          }}>CJS Tamba · 2,4 km</div>
          {/* Recenter btn */}
          <button style={{
            position: "absolute", right: 10, bottom: 10,
            width: 38, height: 38, borderRadius: 10, border: "1.5px solid var(--gj-line)",
            background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,.08)",
          }}>
            <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-teal-deep)" }}><use href="#i-target" /></svg>
          </button>
        </div>

        {/* Centres list */}
        <div style={sectH}>Près de toi</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 12px" }}>
          {/* Centre principal */}
          <div style={{
            background: "#fff", border: "1.5px solid var(--gj-teal)",
            borderRadius: 12, padding: 14,
            display: "flex", flexDirection: "column", gap: 10,
            position: "relative",
          }}>
            <span style={{
              alignSelf: "flex-start", fontSize: 9.5, fontWeight: 800,
              background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)",
              padding: "2px 8px", borderRadius: 999, letterSpacing: ".4px", textTransform: "uppercase",
            }}>Mon centre · 2,4 km</span>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg className="gj-icon gj-icon--md"><use href="#i-pin" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>CJS Tambacounda</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.4 }}>
                  Avenue Léopold Sédar Senghor<br />Quartier Médina · Tambacounda
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 11, color: "var(--gj-grey)", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gj-green)" }} />
                    Ouvert · ferme à 18h
                  </span>
                  <span>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <svg className="gj-icon gj-icon--xs"><use href="#i-users" /></svg>3 conseillers
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Conseil 1-à-1", "Ateliers CV", "Wifi", "Imprimante", "Salle réunion"].map(s => (
                <span key={s} style={{
                  fontSize: 10.5, fontWeight: 600, color: "var(--gj-grey)",
                  background: "var(--gj-bg)", padding: "3px 8px", borderRadius: 999,
                  border: "1px solid var(--gj-line)",
                }}>{s}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button style={{
                flex: 1, background: "var(--gj-teal-deep)", color: "#fff",
                border: 0, padding: "10px 12px", borderRadius: 8,
                fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <svg className="gj-icon gj-icon--xs"><use href="#i-calendar" /></svg> Prendre RDV
              </button>
              <button style={{
                background: "#fff", color: "var(--gj-teal-deep)",
                border: "1.5px solid var(--gj-line)", padding: "10px 12px", borderRadius: 8,
                fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <svg className="gj-icon gj-icon--xs"><use href="#i-pin" /></svg> Itinéraire
              </button>
            </div>
          </div>

          {/* Autres centres */}
          {[
            { name: "CJS Kédougou", addr: "Quartier Lawol · Kédougou", km: "189 km", open: true, hours: "8h–17h", services: 4 },
            { name: "CJS Kolda", addr: "Bouna Kane · Kolda", km: "262 km", open: false, hours: "Ferme à 18h · ouvre 8h", services: 3 },
          ].map((c, i) => (
            <div key={i} style={{
              background: "#fff", border: "1.5px solid var(--gj-line)",
              borderRadius: 12, padding: 14,
              display: "flex", gap: 12, alignItems: "center",
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--gj-bg)", color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg className="gj-icon gj-icon--md"><use href="#i-pin" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>{c.name}</div>
                  <span style={{ fontSize: 10.5, color: "var(--gj-teal-deep)", fontWeight: 800 }}>{c.km}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>{c.addr}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10.5, color: "var(--gj-grey)", marginTop: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.open ? "var(--gj-green)" : "var(--gj-grey-2)" }} />
                  <span>{c.open ? "Ouvert" : "Fermé"} · {c.hours}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ateliers à venir au centre */}
        <div style={sectH}>Ateliers à mon centre</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 12px 16px" }}>
          {[
            { d: 25, m: "MAI", t: "Atelier CV & lettre de motivation", h: "14h–17h · 5 places restantes", tone: "yellow" },
            { d: 28, m: "MAI", t: "Pitch ton projet · coaching", h: "10h–12h · 8 places", tone: "blue" },
            { d: 2, m: "JUIN", t: "Initiation Excel & Google", h: "9h–13h · gratuit", tone: "teal" },
          ].map((e, i) => (
            <div key={i} style={{
              background: "#fff", border: "1.5px solid var(--gj-line)",
              borderRadius: 12, padding: 12,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 50, textAlign: "center",
                background: `var(--gj-${e.tone}-soft)`,
                color: e.tone === "yellow" ? "var(--gj-yellow-ink)" : `var(--gj-${e.tone}${e.tone === "blue" ? "" : "-deep"})`,
                borderRadius: 9, padding: "6px 4px", flexShrink: 0,
              }}>
                <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{e.d}</div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".4px", marginTop: 2 }}>{e.m}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>{e.t}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>{e.h}</div>
              </div>
              <button style={{
                background: "transparent", border: 0,
                color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 11.5,
                cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                S'inscrire <svg className="gj-icon gj-icon--xs"><use href="#i-arrow-right" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="centres" />
    </PhoneFrame>
  );
};

Object.assign(window, { MobileCentresScreen });
