/* eslint-disable */
// Lot 9 — Mes candidatures · MOBILE (390×844). Réutilise PhoneFrame, AppHeader,
// BottomNav + candidatures-data.jsx.

const mCandPill = (status, big) => {
  const s = CAND_STATUS[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: big ? 12 : 10, fontWeight: 800, color: s.ink, background: s.soft, border: `1px solid ${s.dot}`, padding: big ? "4px 11px" : "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
      <svg className="gj-icon" style={{ width: big ? 13 : 11, height: big ? 13 : 11 }}><use href={"#" + s.icon} /></svg>{s.label}
    </span>
  );
};

const mStepper = (status) => {
  const cur = CAND_STATUS[status].step;
  const failed = status === "refusee";
  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
      {[1, 2, 3, 4, 5].map((n, i) => (
        <React.Fragment key={n}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: failed && n === 5 ? "var(--gj-red)" : n <= cur ? "var(--gj-teal)" : "var(--gj-line)" }} />
          {i < 4 && <span style={{ flex: 1, height: 2.5, background: n < cur ? "var(--gj-teal)" : "var(--gj-line)" }} />}
        </React.Fragment>
      ))}
    </div>
  );
};

const MobCandCard = ({ c, onOpen }) => {
  const t = OPP_TONE[c.kind];
  return (
    <div onClick={onOpen} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
        <span style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href={"#" + t.icon} /></svg></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.25 }}>{c.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{c.org}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {mStepper(c.status)}
        {mCandPill(c.status)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, borderTop: "1px solid var(--gj-line)", paddingTop: 10 }}>
        <svg className="gj-icon" style={{ width: 14, height: 14, color: c.status === "acceptee" ? "var(--gj-green-ink)" : "var(--gj-teal-deep)", flexShrink: 0 }}><use href={"#" + c.nextIcon} /></svg>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: c.status === "acceptee" ? "var(--gj-green-ink)" : "var(--gj-ink)", lineHeight: 1.35 }}>{c.next}</span>
        <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-grey-2)", flexShrink: 0 }}><use href="#i-chevron-right" /></svg>
      </div>
    </div>
  );
};

const MobCandList = ({ onOpen }) => {
  const chips = ["Toutes (6)", "En cours (4)", "Entretiens (1)", "Clôturées (2)"];
  return (
    <PhoneFrame>
      <AppHeader title="Mes candidatures" onBack={() => {}} />
      {/* stats strip */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "12px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {CAND_STATS.map((s, i) => {
            const tone = { teal: "var(--gj-teal-deep)", blue: "var(--gj-blue-ink)", yellow: "var(--gj-yellow-ink)", green: "var(--gj-green-ink)" }[s.tone];
            return (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: tone, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9.5, color: "var(--gj-grey)", marginTop: 3, fontWeight: 700, lineHeight: 1.2 }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 0 10px" }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 14px" }}>
          {chips.map((c, i) => (
            <span key={c} style={{ flexShrink: 0, padding: "8px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)" }}>
        {CANDIDATURES.map((c) => <MobCandCard key={c.id} c={c} onOpen={() => onOpen(c)} />)}
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

const MobCandDetail = ({ c, onBack }) => {
  const t = OPP_TONE[c.kind];
  return (
    <PhoneFrame>
      <AppHeader title="Candidature" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)" }}>
        {/* header */}
        <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: 16, display: "flex", gap: 13, alignItems: "flex-start" }}>
          <span style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 24, height: 24 }}><use href={"#" + t.icon} /></svg></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-ink)", lineHeight: 1.25 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>{c.org}</div>
            <div style={{ marginTop: 8 }}>{mCandPill(c.status, true)}</div>
          </div>
        </div>

        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* next step */}
          <div style={{ background: c.status === "acceptee" ? "var(--gj-green-soft)" : "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: `1.5px solid ${c.status === "acceptee" ? "var(--gj-green)" : "var(--gj-teal)"}`, borderRadius: 13, padding: 14, display: "flex", gap: 11, alignItems: "flex-start" }}>
            <svg className="gj-icon" style={{ width: 20, height: 20, color: c.status === "acceptee" ? "var(--gj-green-ink)" : "var(--gj-teal-deep)", flexShrink: 0 }}><use href={"#" + c.nextIcon} /></svg>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>Prochaine étape</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)", marginTop: 3, lineHeight: 1.45 }}>{c.next}</div>
            </div>
          </div>

          {/* timeline */}
          <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>Suivi</h2>
            {c.timeline.map((ev, i, arr) => {
              const s = CAND_STATUS[ev.st] || { icon: "i-clock" };
              const dotColor = !ev.done ? "#fff" : ev.st === "refusee" ? "var(--gj-red)" : "var(--gj-teal)";
              return (
                <div key={i} style={{ display: "flex", gap: 13 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: ev.done ? dotColor : "#fff", border: ev.done ? 0 : "2px solid var(--gj-line-strong)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: ev.current ? `0 0 0 4px ${ev.st === "refusee" ? "var(--gj-red-soft)" : "var(--gj-teal-soft)"}` : "none" }}>
                      {ev.done && <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href={"#" + (s.icon || "i-check")} /></svg>}
                    </span>
                    {i < arr.length - 1 && <span style={{ flex: 1, width: 2.5, background: ev.done && arr[i + 1].done ? "var(--gj-teal)" : "var(--gj-line)", margin: "4px 0", minHeight: 16 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: ev.done ? "var(--gj-ink)" : "var(--gj-grey-2)" }}>{ev.label}</span>
                      {ev.current && <span style={{ fontSize: 9, fontWeight: 800, color: ev.st === "refusee" ? "var(--gj-red-ink)" : "var(--gj-teal-deep)", background: ev.st === "refusee" ? "var(--gj-red-soft)" : "var(--gj-teal-soft)", padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" }}>Actuel</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2, fontWeight: 600 }}>{ev.date}</div>
                    {ev.note && <div style={{ fontSize: 12, color: "var(--gj-ink)", marginTop: 6, background: "var(--gj-bg)", borderRadius: 9, padding: "9px 11px", lineHeight: 1.5 }}>{ev.note}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* dossier */}
          <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15 }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 11 }}>Dossier envoyé</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 30, height: 36, borderRadius: 4, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 8.5, flexShrink: 0 }}>PDF</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--gj-ink)" }}>CV_Awa_Diop_2026.pdf</span>
              <span style={{ fontSize: 11, color: "var(--gj-grey)" }}>238 Ko</span>
            </div>
          </div>
        </div>
      </div>
      {/* footer CTA */}
      <div style={{ padding: 14, background: "#fff", borderTop: "1px solid var(--gj-line)", display: "flex", gap: 9, flexShrink: 0 }}>
        <button style={{ flex: "0 0 auto", width: 52, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Contacter"><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-chat" /></svg></button>
        {c.status === "entretien" ? (
          <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-calendar" /></svg>Ajouter au calendrier</button>
        ) : c.status === "acceptee" ? (
          <button style={{ flex: 1, background: "var(--gj-green)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-check" /></svg>Accepter l'offre</button>
        ) : c.status === "refusee" ? (
          <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>Voir des offres similaires</button>
        ) : (
          <button style={{ flex: 1, background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Retirer ma candidature</button>
        )}
      </div>
    </PhoneFrame>
  );
};

const MobCandApp = ({ start = "list" }) => {
  const [cur, setCur] = React.useState(null);
  if (cur) return <MobCandDetail c={cur} onBack={() => setCur(null)} />;
  if (start !== "list") return <MobCandDetail c={CANDIDATURES[0]} onBack={() => setCur(null)} />;
  return <MobCandList onOpen={setCur} />;
};

Object.assign(window, { MobCandList, MobCandDetail, MobCandApp });
