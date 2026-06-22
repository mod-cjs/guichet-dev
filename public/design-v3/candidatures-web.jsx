/* eslint-disable */
// Lot 9 — Mes candidatures · WEB. Réutilise BenefSidebar/BenefTopBar + candidatures-data.jsx.
// Vues : list · detail (timeline de suivi).

const candPill = (status, big) => {
  const s = CAND_STATUS[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: big ? 12.5 : 11, fontWeight: 800, color: s.ink, background: s.soft, border: `1px solid ${s.dot}`, padding: big ? "5px 12px" : "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      <svg className="gj-icon" style={{ width: big ? 14 : 12, height: big ? 14 : 12 }}><use href={"#" + s.icon} /></svg>{s.label}
    </span>
  );
};

// mini stepper (5 dots) reflecting pipeline progress
const CandStepper = ({ status }) => {
  const s = CAND_STATUS[status];
  const failed = status === "refusee";
  const cur = s.step;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1 }}>
      {[1, 2, 3, 4, 5].map((n, i) => {
        const reached = n <= cur;
        const col = failed && n === 5 ? "var(--gj-red)" : reached ? "var(--gj-teal)" : "var(--gj-line)";
        return (
          <React.Fragment key={n}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: col, flexShrink: 0 }} />
            {i < 4 && <span style={{ flex: 1, height: 2.5, background: n < cur ? "var(--gj-teal)" : "var(--gj-line)" }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const CandCard = ({ c, onOpen }) => {
  const t = OPP_TONE[c.kind];
  return (
    <div onClick={onOpen} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + t.icon} /></svg></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.3 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2 }}>{c.org}</div>
            </div>
            {candPill(c.status)}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 9, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href="#i-pin" /></svg>{c.region}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href="#i-funding" /></svg>{c.salary}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href="#i-clock" /></svg>Postulé le {c.applied}</span>
          </div>
        </div>
      </div>
      <CandStepper status={c.status} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--gj-line)", paddingTop: 12 }}>
        <svg className="gj-icon" style={{ width: 15, height: 15, color: c.status === "acceptee" ? "var(--gj-green-ink)" : c.status === "refusee" ? "var(--gj-grey)" : "var(--gj-teal-deep)" }}><use href={"#" + c.nextIcon} /></svg>
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: c.status === "acceptee" ? "var(--gj-green-ink)" : "var(--gj-ink)" }}>{c.next}</span>
        <span style={{ fontSize: 11, color: "var(--gj-grey-2)" }}>maj {c.updated}</span>
        <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)" }}><use href="#i-chevron-right" /></svg>
      </div>
    </div>
  );
};

const CandListContent = ({ onOpen }) => {
  const tabs = [["all", "Toutes", 6], ["cours", "En cours", 4], ["entretien", "Entretiens", 1], ["clos", "Clôturées", 2]];
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", width: "100%" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Mes candidatures</h1>
      <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Suis l'avancement de chaque candidature en temps réel.</div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "18px 0" }}>
        {CAND_STATS.map((s, i) => {
          const tone = { teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"], blue: ["var(--gj-blue-soft)", "var(--gj-blue-ink)"], yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"], green: ["var(--gj-green-soft)", "var(--gj-green-ink)"] }[s.tone];
          return (
            <div key={i} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 15 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: tone[0], color: tone[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + s.icon} /></svg></span>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)", marginTop: 10, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 4, fontWeight: 700 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 5, width: "fit-content" }}>
        {tabs.map(([id, label, n], i) => (
          <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", background: i === 0 ? "var(--gj-teal-deep)" : "transparent", color: i === 0 ? "#fff" : "var(--gj-grey)" }}>
            {label}<span style={{ fontSize: 11, fontWeight: 800, background: i === 0 ? "rgba(255,255,255,.22)" : "var(--gj-bg)", color: i === 0 ? "#fff" : "var(--gj-grey)", padding: "1px 7px", borderRadius: 999 }}>{n}</span>
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CANDIDATURES.map((c) => <CandCard key={c.id} c={c} onOpen={() => onOpen(c)} />)}
      </div>
    </div>
  );
};

// detail with vertical timeline
const CandDetailContent = ({ c, onBack }) => {
  const t = OPP_TONE[c.kind];
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 14, padding: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Mes candidatures</button>

      {/* header */}
      <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}>
        <span style={{ width: 54, height: 54, borderRadius: 13, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 27, height: 27 }}><use href={"#" + t.icon} /></svg></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--gj-ink)", lineHeight: 1.2 }}>{c.title}</h1>
              <div style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 3 }}>{c.org}</div>
            </div>
            {candPill(c.status, true)}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-pin" /></svg>{c.region}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-funding" /></svg>{c.salary}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-clock" /></svg>Postulé le {c.applied}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginTop: 20, alignItems: "start" }}>
        {/* timeline */}
        <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 18 }}>Suivi de la candidature</h2>
          <div>
            {c.timeline.map((ev, i, arr) => {
              const s = CAND_STATUS[ev.st] || { dot: "var(--gj-line)", ink: "var(--gj-grey)", icon: "i-clock" };
              const dotColor = !ev.done ? "#fff" : ev.st === "refusee" ? "var(--gj-red)" : "var(--gj-teal)";
              return (
                <div key={i} style={{ display: "flex", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: ev.done ? dotColor : "#fff", border: ev.done ? 0 : "2px solid var(--gj-line-strong)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: ev.current ? `0 0 0 4px ${ev.st === "refusee" ? "var(--gj-red-soft)" : "var(--gj-teal-soft)"}` : "none" }}>
                      {ev.done && <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href={"#" + (s.icon || "i-check")} /></svg>}
                    </span>
                    {i < arr.length - 1 && <span style={{ flex: 1, width: 2.5, background: ev.done && arr[i + 1].done ? "var(--gj-teal)" : "var(--gj-line)", margin: "4px 0", minHeight: 18 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < arr.length - 1 ? 18 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: ev.done ? "var(--gj-ink)" : "var(--gj-grey-2)" }}>{ev.label}</span>
                      {ev.current && <span style={{ fontSize: 9.5, fontWeight: 800, color: ev.st === "refusee" ? "var(--gj-red-ink)" : "var(--gj-teal-deep)", background: ev.st === "refusee" ? "var(--gj-red-soft)" : "var(--gj-teal-soft)", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px" }}>Actuel</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2, fontWeight: 600 }}>{ev.date}</div>
                    {ev.note && <div style={{ fontSize: 12.5, color: "var(--gj-ink)", marginTop: 7, background: "var(--gj-bg)", borderRadius: 9, padding: "10px 12px", lineHeight: 1.5 }}>{ev.note}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* aside */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* next action */}
          <div style={{ background: c.status === "acceptee" ? "var(--gj-green-soft)" : c.status === "refusee" ? "var(--gj-bg)" : "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: `1.5px solid ${c.status === "acceptee" ? "var(--gj-green)" : "var(--gj-line)"}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>Prochaine étape</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 8 }}>
              <svg className="gj-icon" style={{ width: 18, height: 18, color: c.status === "acceptee" ? "var(--gj-green-ink)" : "var(--gj-teal-deep)", flexShrink: 0, marginTop: 1 }}><use href={"#" + c.nextIcon} /></svg>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)", lineHeight: 1.45 }}>{c.next}</div>
            </div>
            {c.status === "entretien" && <button style={{ width: "100%", marginTop: 13, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 46, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-calendar" /></svg>Ajouter à mon calendrier</button>}
            {c.status === "acceptee" && <button style={{ width: "100%", marginTop: 13, background: "var(--gj-green)", color: "#fff", border: 0, minHeight: 46, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg>Accepter l'offre</button>}
          </div>

          {/* recruiter contact */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Recruteur</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15 }}>{c.org[0]}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{c.org}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>via Guichet Jeunesse</div>
              </div>
            </div>
            <button style={{ width: "100%", marginTop: 12, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-chat" /></svg>Contacter</button>
          </div>

          {/* docs sent */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Dossier envoyé</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <span style={{ width: 30, height: 36, borderRadius: 4, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 8.5, flexShrink: 0 }}>PDF</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "var(--gj-ink)" }}>CV_Awa_Diop_2026.pdf</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--gj-line)" }}>
              <span style={{ width: 30, height: 36, borderRadius: 4, background: "var(--gj-bg)", color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-mail" /></svg></span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "var(--gj-ink)" }}>Lettre de motivation</span>
            </div>
          </div>

          {c.status !== "acceptee" && c.status !== "refusee" && (
            <button style={{ background: "transparent", color: "var(--gj-red)", border: 0, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 6 }}>Retirer ma candidature</button>
          )}
        </aside>
      </div>
    </div>
  );
};

const WebCandidatures = ({ view = "list" }) => {
  const [v, setV] = React.useState(view);
  const [cur, setCur] = React.useState(CANDIDATURES[0]);
  const open = (c) => { setCur(c || CANDIDATURES[0]); setV("detail"); };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden" }}>
      <BenefSidebar active="cand" onNavChange={(id) => { if (id === "cand") setV("list"); }} />
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <BenefTopBar />
        <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
          {v === "detail" ? <CandDetailContent c={cur} onBack={() => setV("list")} /> : <CandListContent onOpen={open} />}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { WebCandidatures, CandCard, CandStepper, candPill });
