/* eslint-disable */
// Mobile dashboard flows — additional screens beyond Lot 1.
//   M1 — Opportunity detail (opened from dashboard)
//   M2 — Search + filter sheet (from dashboard search)
//   M3 — Notifications drawer (slide-up sheet over dashboard)

// =====================================================================
// M1 — Opportunity detail (mobile)
// =====================================================================
const MobileOppDetail = () => {
  const body = { flex: 1, overflowY: "auto", background: "var(--gj-bg)" };

  // hero band
  const heroBand = {
    background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))",
    color: "#fff", padding: "16px 16px 24px",
    position: "relative", overflow: "hidden",
  };
  const headerRow = {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 14, position: "relative",
  };
  const ghostIcon = {
    width: 38, height: 38, borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,.3)",
    background: "rgba(255,255,255,.08)",
    color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  };
  return (
    <PhoneFrame bg="var(--gj-bg)">
      <PhoneFrameStatusBar dark />
      <div style={body}>
        <div style={heroBand}>
          <div style={headerRow}>
            <button style={ghostIcon} aria-label="Retour"><svg className="gj-icon"><use href="#i-chevron-left" /></svg></button>
            <span style={{ flex: 1 }} />
            <button style={ghostIcon} aria-label="Partager"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-share" /></svg></button>
            <button style={ghostIcon} aria-label="Sauvegarder"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bookmark" /></svg></button>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, background: "var(--gj-red)", color: "#fff", padding: "4px 10px", borderRadius: 999, letterSpacing: ".4px", marginBottom: 12, position: "relative" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "gj-pulse-live 1.6s infinite" }} />
            URGENT · CLÔTURE J-3
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-.2px", position: "relative" }}>
            Bourse agricole — Micro-initiative maraîchère
          </h1>
          <div style={{ fontSize: 12.5, opacity: .9, marginTop: 6, lineHeight: 1.5, position: "relative" }}>
            jusqu'à <b style={{ color: "var(--gj-yellow)" }}>600 000 FCFA</b> + accompagnement technique · Région de Tambacounda
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, position: "relative" }}>
            {[
              { i: "i-pin", l: "Tambacounda" },
              { i: "i-users", l: "18-35 ans" },
              { i: "i-clock", l: "Décision sous 30j" },
              { i: "i-target", l: "Maraîchage" },
            ].map((m, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,.12)", padding: "5px 10px", borderRadius: 999 }}>
                <svg className="gj-icon gj-icon--xs"><use href={"#" + m.i} /></svg>
                {m.l}
              </span>
            ))}
          </div>
        </div>

        {/* Match card */}
        <div style={{
          margin: "-16px 14px 14px",
          background: "#fff", border: "1.5px solid var(--gj-line)",
          borderRadius: 14, padding: 14,
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "var(--gj-shadow-sm)",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #19a657, #027f7e)",
            color: "#fff", fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: 20,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 2px rgba(0,122,92,.1)", flexShrink: 0,
          }}>Y</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-teal-deep)" }}>
              <span style={{ fontFamily: "var(--gj-font-sans)", fontSize: 14 }}>Yaye dit&nbsp;:</span>
              <span style={{ background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", fontSize: 11, fontWeight: 900, padding: "2px 7px", borderRadius: 999, marginLeft: 6 }}>94% match</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 3, lineHeight: 1.45 }}>
              Ton profil colle sur la région, l'âge et l'objectif maraîchage.
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "0 14px 8px", borderBottom: "1px solid var(--gj-line)" }}>
          {["Description", "Critères", "Dossier", "FAQ"].map((t, i) => (
            <button key={t} style={{
              padding: "10px 12px", fontSize: 13,
              fontWeight: i === 0 ? 800 : 600,
              color: i === 0 ? "var(--gj-teal-deep)" : "var(--gj-grey)",
              borderBottom: `2px solid ${i === 0 ? "var(--gj-teal-deep)" : "transparent"}`,
              background: "transparent", border: 0, borderBottomWidth: 2,
              cursor: "pointer", fontFamily: "inherit",
            }}>{t}</button>
          ))}
        </div>

        <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Description */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>En quelques mots</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--gj-ink)" }}>
              Une bourse pour lancer ta micro-initiative maraîchère dans la région de Tambacounda. Tu déposes un plan simple, on t'accompagne sur 6 mois — terrain, intrants, formation.
            </p>
          </div>

          {/* Critères clés */}
          <div style={{
            background: "#fff", border: "1.5px solid var(--gj-line)",
            borderRadius: 12, padding: 14,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Critères clés</div>
            {[
              { ok: true, t: "Tu as 18–35 ans" },
              { ok: true, t: "Tu résides en région de Tambacounda" },
              { ok: false, t: "Tu fournis un plan de culture (1 page suffit)" },
              { ok: true, t: "Pas de financement reçu sur ce sujet en 2025" },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: c.ok ? "var(--gj-green-soft)" : "var(--gj-yellow-soft)",
                  color: c.ok ? "var(--gj-green)" : "var(--gj-yellow-ink)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg className="gj-icon" style={{ width: 13, height: 13 }}>
                    <use href={c.ok ? "#i-check" : "#i-info"} />
                  </svg>
                </div>
                <span style={{ flex: 1, color: c.ok ? "var(--gj-ink)" : "var(--gj-yellow-ink)", fontWeight: c.ok ? 600 : 800 }}>{c.t}</span>
              </div>
            ))}
          </div>

          {/* Pas à pas */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Ce qui se passe ensuite</div>
            {[
              { n: 1, t: "Tu remplis le dossier (15 min)", c: "var(--gj-teal)" },
              { n: 2, t: "Revue par un conseiller CJS Tamba", c: "var(--gj-line-strong)" },
              { n: 3, t: "Décision · sous 30 jours", c: "var(--gj-line-strong)" },
              { n: 4, t: "Lancement accompagné · 6 mois", c: "var(--gj-line-strong)" },
            ].map((s, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i === arr.length - 1 ? 0 : 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: s.c, color: "#fff",
                    fontSize: 11, fontWeight: 900,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>{s.n}</div>
                  {i < arr.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 18, background: "var(--gj-line)", marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, paddingTop: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gj-ink)" }}>{s.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky CTA footer */}
      <div style={{
        padding: "12px 14px 16px", background: "#fff",
        borderTop: "1px solid var(--gj-line)",
        display: "flex", gap: 10, alignItems: "center", flexShrink: 0,
      }}>
        <button style={{ width: 50, height: 50, borderRadius: 12, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-teal-deep)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-bookmark" /></svg>
        </button>
        <button style={{
          flex: 1, background: "var(--gj-teal-deep)", color: "#fff",
          border: 0, minHeight: 50, borderRadius: 12,
          fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          Candidater <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
        </button>
      </div>
    </PhoneFrame>
  );
};

// helper for dark status bar inside frames that start with hero
const PhoneFrameStatusBar = ({ dark }) => {
  // we render this inside PhoneFrame (which has its own sb) — but we want dark variant.
  // Approach: simply render nothing — PhoneFrame already has sb. (Kept for future use.)
  return null;
};

// =====================================================================
// M2 — Search + filter sheet
// =====================================================================
const MobileSearchFilter = () => {
  const body = { flex: 1, overflowY: "auto", background: "var(--gj-bg)" };

  // Search bar
  const searchWrap = {
    padding: "12px 14px 8px", background: "#fff",
    borderBottom: "1px solid var(--gj-line)",
    display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
  };
  const searchBox = {
    flex: 1, display: "flex", alignItems: "center", gap: 8,
    background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)",
    borderRadius: 10, padding: "0 12px", minHeight: 44,
  };

  // Filter chips row
  const chipRow = {
    display: "flex", gap: 6, padding: "10px 14px",
    overflowX: "auto", background: "#fff",
    borderBottom: "1px solid var(--gj-line)", flexShrink: 0,
  };
  const chip = (on, label, icon) => (
    <button key={label} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "7px 12px",
      background: on ? "var(--gj-teal-soft)" : "#fff",
      border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
      color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
      borderRadius: 999, fontSize: 12, fontWeight: on ? 800 : 600,
      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", minHeight: 34,
    }}>
      {icon && <svg className="gj-icon gj-icon--xs"><use href={"#" + icon} /></svg>}
      {label}
    </button>
  );

  // Result count strip
  const resultStrip = {
    padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 12, color: "var(--gj-grey)", flexShrink: 0,
  };

  // Bottom sheet
  const sheet = {
    position: "absolute", left: 0, right: 0, bottom: 0,
    background: "#fff", borderRadius: "20px 20px 0 0",
    boxShadow: "0 -8px 24px rgba(0,0,0,.18)",
    padding: "12px 16px 18px", zIndex: 50,
    display: "flex", flexDirection: "column", gap: 16,
    maxHeight: "70%",
  };
  const grab = { width: 40, height: 4, borderRadius: 999, background: "var(--gj-line-strong)", alignSelf: "center" };

  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Explorer" user="AD" />
      <div style={searchWrap}>
        <div style={searchBox}>
          <svg className="gj-icon gj-icon--sm" style={{ color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
          <span style={{ fontSize: 13.5, color: "var(--gj-ink)", flex: 1, fontWeight: 600 }}>maraîchage</span>
          <button style={{ width: 22, height: 22, border: 0, background: "var(--gj-line)", color: "var(--gj-grey)", borderRadius: "50%", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-close" /></svg>
          </button>
        </div>
      </div>
      <div style={chipRow}>
        {chip(true, "Tambacounda", "i-pin")}
        {chip(true, "Agriculture", "i-agriculture")}
        {chip(false, "Bourse", "i-funding")}
        {chip(false, "J-30", "i-clock")}
        {chip(false, "Autres filtres", null)}
      </div>
      <div style={resultStrip}>
        <span><b style={{ color: "var(--gj-ink)" }}>12 résultats</b> · maraîchage à Tamba</span>
        <span style={{ color: "var(--gj-teal-deep)", fontWeight: 800 }}>Pertinence ▾</span>
      </div>

      <div style={body}>
        <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { tag: "Financement", j: "J-3", urgent: true, cat: "financement", title: "Bourse agricole — maraîchage", sub: "600 000 F · Tambacounda", match: 94, icon: "i-agriculture" },
            { tag: "Stage", j: "J-12", cat: "stage", title: "Stage agronomie — Coopérative régionale", sub: "180 000 F/mois · 6 mois", match: 91, icon: "i-employment" },
            { tag: "Formation", j: "J-30", cat: "formation", title: "Module pratique · maraîchage agro-écologique", sub: "Centre Kédougou · gratuit · 4 sem.", match: 83, icon: "i-learning" },
          ].map((o, i) => (
            <div key={i} style={{
              background: "#fff", border: "1.5px solid var(--gj-line)",
              borderRadius: 12, padding: 14,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, textTransform: "uppercase",
                  background: `var(--cat-${o.cat}-soft)`, color: `var(--cat-${o.cat}-ink)`,
                  padding: "2px 8px", borderRadius: 999, letterSpacing: ".4px",
                }}>{o.tag}</span>
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
                  background: o.urgent ? "var(--gj-red)" : "var(--gj-bg)",
                  color: o.urgent ? "#fff" : "var(--gj-grey)",
                  border: o.urgent ? 0 : "1px solid var(--gj-line)",
                }}>{o.j}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `var(--cat-${o.cat}-soft)`,
                  color: `var(--cat-${o.cat}-ink)`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg className="gj-icon gj-icon--md"><use href={"#" + o.icon} /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{o.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{o.sub}</div>
                </div>
              </div>
              <span style={{
                alignSelf: "flex-start", fontSize: 11, fontWeight: 800,
                background: "var(--gj-green-soft)", color: "var(--gj-green-ink)",
                padding: "2px 7px", borderRadius: 999, letterSpacing: ".3px",
              }}>{o.match}% match</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom sheet — filters */}
      <div style={sheet}>
        <span style={grab} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 900 }}>Filtres</h3>
          <button style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Tout effacer</button>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              ["Emploi / Stage", false, "i-employment"],
              ["Bourse", false, "i-funding"],
              ["Formation", true, "i-learning"],
              ["Projet", false, "i-project"],
              ["Concours", false, "i-trending"],
              ["Volontariat", false, "i-engagement"],
            ].map(([l, on, ic]) => chip(on, l, ic))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Région</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[["Tambacounda", true], ["Kédougou", false], ["Kolda", false], ["Toutes", false]].map(([l, on]) => chip(on, l, null))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Deadline</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[["Moins de 7j", false], ["Moins de 30j", true], ["Toutes", false]].map(([l, on]) => chip(on, l, null))}
          </div>
        </div>
        <button style={{
          background: "var(--gj-teal-deep)", color: "#fff",
          border: 0, padding: "0 18px", minHeight: 52, borderRadius: 12,
          fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          Voir les 12 résultats <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
        </button>
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// =====================================================================
// M3 — Notifications drawer (slide-up sheet over dashboard)
// =====================================================================
const MobileDashWithNotifs = () => {
  // Re-uses dashboard content underneath with a drawer overlay on top.
  const sheet = {
    position: "absolute", left: 0, right: 0, bottom: 0,
    background: "#fff", borderRadius: "20px 20px 0 0",
    boxShadow: "0 -8px 24px rgba(0,0,0,.22)",
    zIndex: 50, display: "flex", flexDirection: "column",
    maxHeight: "82%", overflow: "hidden",
  };
  const overlay = {
    position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 45,
  };
  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Tambacounda" user="AD" />
      {/* dashboard preview underneath — simplified */}
      <div style={{ flex: 1, overflowY: "hidden", background: "var(--gj-bg)" }}>
        <div style={{
          margin: "12px 12px 0",
          background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))",
          color: "#fff", borderRadius: 14, padding: 16,
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, opacity: .85 }}>Bonjour Awa</div>
          <div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>3 opps à 90 %+ match…</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 12 }}>
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: 12, height: 80 }} />
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: 12, height: 80 }} />
        </div>
      </div>

      {/* Overlay */}
      <div style={overlay} />

      {/* Drawer */}
      <div style={sheet}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
          <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--gj-line-strong)" }} />
        </div>
        <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 17, fontWeight: 900 }}>Notifications <span style={{ fontSize: 11, fontWeight: 800, background: "var(--gj-red)", color: "#fff", padding: "2px 8px", borderRadius: 999, marginLeft: 6 }}>3</span></h3>
          <button style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Tout marquer lu</button>
        </div>
        <div style={{ display: "flex", padding: "0 8px", borderBottom: "1px solid var(--gj-line)", gap: 4, overflowX: "auto" }}>
          {[["Toutes", true], ["Deadlines", false], ["Candidatures", false], ["Yaye", false]].map(([l, on], i) => (
            <button key={l} style={{
              padding: "9px 12px", fontSize: 12,
              fontWeight: on ? 800 : 600,
              color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
              borderBottom: `2px solid ${on ? "var(--gj-teal-deep)" : "transparent"}`,
              background: "transparent", border: 0, borderBottomWidth: 2,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px 12px" }}>
          {[
            { unread: true, ic: "i-flame", iBg: "var(--gj-red-soft)", iFg: "var(--gj-red-ink)", t: "Plus que 3 jours · Bourse agricole", s: "Ton dossier est à 60 %. Il manque 2 documents.", when: "12 min" },
            { unread: true, ic: "i-calendar", iBg: "var(--gj-blue-soft)", iFg: "var(--gj-blue)", t: "Entretien confirmé · Cabinet Karim&Co", s: "Jeudi 28 mai · 14h00 · Visio Zoom.", when: "1 h" },
            { unread: true, yaye: true, t: "Yaye a trouvé 2 nouvelles offres", s: "Stage agronomie · 180 000 F · Tambacounda.", when: "2 h" },
            { unread: false, ic: "i-check-circle", iBg: "var(--gj-green-soft)", iFg: "var(--gj-green)", t: "Bourse mobilité UCAD — Acceptée", s: "Réponse du jury. Confirme avant le 1er juin.", when: "hier 18:24" },
            { unread: false, ic: "i-chat", iBg: "var(--gj-blue-soft)", iFg: "var(--gj-blue)", t: "Mariama, conseillère CJS Tamba", s: "« Awa, je peux te recevoir vendredi 10h… »", when: "hier 16:02" },
          ].map((n, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 10,
              padding: "10px 8px", borderRadius: 10,
              background: n.unread ? "var(--gj-teal-soft)" : "transparent",
              alignItems: "flex-start", marginBottom: 4,
            }}>
              {n.yaye ? (
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: "linear-gradient(135deg, #19a657, #027f7e)",
                  color: "#fff", fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: 17,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>Y</div>
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 9, background: n.iBg, color: n.iFg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href={"#" + n.ic} /></svg>
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.3 }}>{n.t}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.4 }}>{n.s}</div>
              </div>
              <div style={{ fontSize: 11, color: n.unread ? "var(--gj-teal-deep)" : "var(--gj-grey-2)", fontWeight: 700, whiteSpace: "nowrap", alignSelf: "flex-start" }}>{n.when}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--gj-line)", textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Voir tout le centre de notifications →</span>
        </div>
      </div>
    </PhoneFrame>
  );
};

Object.assign(window, { MobileOppDetail, MobileSearchFilter, MobileDashWithNotifs });
