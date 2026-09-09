/* eslint-disable */
// Lot 10 — Espace Recruteur · WEB (suite) : fiche candidat, modal entretien,
// messagerie + le shell WebRecruteur qui orchestre la navigation.

// =====================================================================
// FICHE CANDIDAT
// =====================================================================
const RecCandidate = ({ onBack, onInterview, nav }) => {
  const c = R_CAND_DETAIL;
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-blue-ink)", marginBottom: 14, padding: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Pipeline</button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* header */}
            <div style={{ ...rCard, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {rAvatar(c.init, 64)}
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--gj-ink)" }}>{c.name}</h1>
                  {matchBadge(c.match, true)}
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-pin" /></svg>{c.commune}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-users" /></svg>{c.age} ans · {c.sex}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-learning" /></svg>{c.niveau}</span>
                </div>
              </div>
            </div>

            {/* match criteria */}
            <div style={rCard}>
              <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 4 }}>Adéquation au poste</h2>
              <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginBottom: 14 }}>4 critères sur 5 remplis · score {c.match}%</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {c.criteria.map((cr, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: cr.ok ? "var(--gj-green)" : "var(--gj-bg)", border: cr.ok ? 0 : "1.5px solid var(--gj-line-strong)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {cr.ok ? <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg> : <svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-close" /></svg>}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: cr.ok ? 700 : 600, color: cr.ok ? "var(--gj-ink)" : "var(--gj-grey)" }}>{cr.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* motivation */}
            <div style={rCard}>
              <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>Lettre de motivation</h2>
              <p style={{ fontSize: 13.5, color: "var(--gj-ink)", lineHeight: 1.6 }}>{c.motivation}</p>
            </div>

            {/* skills + langues */}
            <div style={rCard}>
              <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 12 }}>Compétences & langues</h2>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                {c.skills.map((s) => <span key={s} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gj-blue-ink)", background: "var(--gj-blue-soft)", padding: "6px 12px", borderRadius: 999 }}>{s}</span>)}
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {c.langues.map(([l, n]) => <div key={l} style={{ fontSize: 12.5 }}><b style={{ color: "var(--gj-ink)" }}>{l}</b> <span style={{ color: "var(--gj-grey)" }}>· {n}</span></div>)}
              </div>
            </div>
          </div>

          {/* action rail */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0 }}>
            <div style={rCard}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>Décision</div>
              <button onClick={onInterview} style={{ width: "100%", background: "var(--gj-blue)", color: "#fff", border: 0, minHeight: 48, borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-calendar" /></svg>Planifier un entretien</button>
              <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
                <button style={{ flex: 1, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", border: 0, minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Présélectionner</button>
                <button style={{ flex: 1, background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Écarter</button>
              </div>
              <button onClick={() => nav("messages")} style={{ width: "100%", marginTop: 9, background: "#fff", color: "var(--gj-blue-ink)", border: "1.5px solid var(--gj-line)", minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-chat" /></svg>Envoyer un message</button>
            </div>
            <div style={rCard}>
              <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Dossier</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <span style={{ width: 30, height: 36, borderRadius: 4, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, flexShrink: 0 }}>PDF</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "var(--gj-ink)" }}>CV_Awa_Diop_2026.pdf</span>
                <button style={{ background: "transparent", border: 0, color: "var(--gj-blue-ink)", cursor: "pointer" }} aria-label="Télécharger"><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-download" /></svg></button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-teal-deep)" }}><use href="#i-check-circle" /></svg>Profil CJS vérifié · candidaté le {c.applied}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// MODAL — Planifier un entretien
// =====================================================================
const InterviewModal = ({ onClose }) => {
  const days = [["Lun", "9"], ["Mar", "10"], ["Mer", "11"], ["Jeu", "12"], ["Ven", "13"]];
  const slots = ["09:00", "10:00", "11:30", "14:00", "15:30", "16:30"];
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 28 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(560px, 100%)", maxHeight: "90%", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.4)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 10, background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href="#i-calendar" /></svg></span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16.5, fontWeight: 900 }}>Planifier un entretien</h2>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>Awa Diop · Stage Data Science</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, border: 0, background: "transparent", cursor: "pointer", color: "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-close" /></svg></button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Format</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["Visio", "i-video"], ["Téléphone", "i-phone"], ["Présentiel", "i-pin"]].map(([t, ic], i) => (
                <button key={t} style={{ flex: 1, minHeight: 46, borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: i === 0 ? "var(--gj-blue-soft)" : "#fff", border: i === 0 ? "1.5px solid var(--gj-blue)" : "1.5px solid var(--gj-line)", color: i === 0 ? "var(--gj-blue-ink)" : "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href={"#" + ic} /></svg>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Date · juin 2026</div>
            <div style={{ display: "flex", gap: 8 }}>
              {days.map(([d, n], i) => (
                <button key={n} style={{ flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "center", background: i === 2 ? "var(--gj-blue)" : "#fff", border: i === 2 ? 0 : "1.5px solid var(--gj-line)", color: i === 2 ? "#fff" : "var(--gj-ink)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: .8 }}>{d}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, marginTop: 1 }}>{n}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Créneau</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {slots.map((s, i) => <button key={s} style={{ minHeight: 42, borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 1 ? "var(--gj-blue-soft)" : "#fff", border: i === 1 ? "1.5px solid var(--gj-blue)" : "1.5px solid var(--gj-line)", color: i === 1 ? "var(--gj-blue-ink)" : "var(--gj-grey)" }}>{s}</button>)}
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1.5px solid var(--gj-line)", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 12, color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-blue-ink)" }}><use href="#i-chat" /></svg>Invitation envoyée par SMS + app</span>
          <button onClick={onClose} style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={onClose} style={{ background: "var(--gj-blue)", color: "#fff", border: 0, padding: "11px 20px", borderRadius: 9, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg>Confirmer · mer. 11, 10:00</button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// MESSAGERIE
// =====================================================================
const RecMessages = () => {
  const [active, setActive] = React.useState(R_THREADS[0].id);
  const t = R_THREADS.find((x) => x.id === active);
  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr", overflow: "hidden" }}>
      <div style={{ borderRight: "1px solid var(--gj-line)", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--gj-line)" }}><h2 style={{ fontSize: 16, fontWeight: 900 }}>Messagerie</h2><div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>candidats · 1 non lu</div></div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {R_THREADS.map((th) => {
            const on = th.id === active;
            return (
              <div key={th.id} onClick={() => setActive(th.id)} style={{ display: "flex", gap: 11, padding: "13px 18px", borderBottom: "1px solid var(--gj-line)", cursor: "pointer", background: on ? "var(--gj-blue-soft)" : "transparent" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>{rAvatar(th.init, 42)}{th.online && <span style={{ position: "absolute", right: 0, bottom: 0, width: 11, height: 11, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{th.who}</span><span style={{ fontSize: 11, color: "var(--gj-grey-2)", flexShrink: 0 }}>{th.time}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: th.unread ? "var(--gj-ink)" : "var(--gj-grey)", fontWeight: th.unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.last}</span>
                    {th.unread > 0 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 999, background: "var(--gj-blue)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{th.unread}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--gj-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 20px", borderBottom: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
          {rAvatar(t.init, 40)}
          <div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{t.who}</div><div style={{ fontSize: 11.5, color: t.online ? "var(--gj-green-ink)" : "var(--gj-grey)" }}>{t.online ? "● en ligne" : "hors ligne"}</div></div>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", border: 0, padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-user" /></svg>Voir le profil</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>Aujourd'hui</div>
          {t.msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "68%", background: m.me ? "var(--gj-blue)" : "#fff", color: m.me ? "#fff" : "var(--gj-ink)", border: m.me ? 0 : "1px solid var(--gj-line)", borderRadius: m.me ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.45 }}>{m.t}<div style={{ fontSize: 11, opacity: .6, marginTop: 4, textAlign: "right" }}>{m.time}</div></div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderTop: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
          <input placeholder="Écris un message…" style={{ flex: 1, minHeight: 44, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 16px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" }} />
          <button style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--gj-blue)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-arrow-right" /></svg></button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// SHELL
// =====================================================================
const WebRecruteur = ({ view = "home" }) => {
  const [v, setV] = React.useState(view);
  const [modal, setModal] = React.useState(false);
  const nav = (x) => setV(x);
  const titles = {
    home: ["Tableau de bord", "Sonatel · recrutement"], offers: ["Mes offres", ""], offerForm: ["Mes offres", "Nouvelle offre"],
    pipeline: ["Candidatures", "Pipeline"], candidate: ["Candidat", "Fiche détaillée"], messages: ["Messagerie", ""],
    interviews: ["Entretiens", "À venir"], company: ["Profil entreprise", "Sonatel"], settings: ["Paramètres", ""],
  };
  let content;
  if (v === "home") content = <RecDashboard nav={nav} />;
  else if (v === "offers") content = <RecOffers nav={nav} />;
  else if (v === "offerForm") content = <RecOfferForm onBack={() => setV("offers")} />;
  else if (v === "pipeline") content = <RecPipeline onOpen={() => setV("candidate")} />;
  else if (v === "candidate") content = <RecCandidate onBack={() => setV("pipeline")} onInterview={() => setModal(true)} nav={nav} />;
  else if (v === "messages") content = <RecMessages />;
  else if (v === "interviews") content = <RecInterviews />;
  else if (v === "company") content = <RecCompany />;
  else if (v === "settings") content = <SettingsScreen who="Aïda Mbaye" role="Chargée de recrutement" org="Sonatel" initials="AM" accent="var(--gj-blue-ink)" />;
  else content = <RecDashboard nav={nav} />;
  const navKey = v === "offerForm" ? "offers" : v === "candidate" ? "pipeline" : v;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "256px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden", position: "relative" }}>
      <RecruteurSidebar active={navKey} onNavChange={nav} />
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <RecruteurTopBar title={titles[v] ? titles[v][0] : ""} sub={titles[v] ? titles[v][1] : ""} />
        {content}
      </div>
      {modal && <InterviewModal onClose={() => setModal(false)} />}
    </div>
  );
};

// =====================================================================
// ENTRETIENS planifiés
// =====================================================================
const R_INTERVIEWS = [
  { id: "i1", who: "Awa Diop", init: "AD", offer: "Stage Data Science", day: "Mer 11 juin", time: "10:00", mode: "Visio", modeIcon: "i-video", status: "confirmé" },
  { id: "i2", who: "Modou Sarr", init: "MS", offer: "Stage Data Science", day: "Mer 11 juin", time: "14:30", mode: "Visio", modeIcon: "i-video", status: "confirmé" },
  { id: "i3", who: "Ndèye Gueye", init: "NG", offer: "Dév. Web Junior", day: "Jeu 12 juin", time: "11:00", mode: "Présentiel", modeIcon: "i-pin", status: "à confirmer" },
];

const RecInterviews = () => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Entretiens</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>3 entretiens à venir · 2 confirmés, 1 à confirmer.</div>
        </div>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-blue)", color: "#fff", border: 0, padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Planifier</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {R_INTERVIEWS.map((it) => {
          const tone = it.status === "confirmé" ? ["var(--gj-green-soft)", "var(--gj-green-ink)"] : ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"];
          return (
            <div key={it.id} style={{ ...rCard, padding: 16, display: "flex", alignItems: "center", gap: 15 }}>
              <div style={{ width: 64, flexShrink: 0, textAlign: "center", background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", borderRadius: 11, padding: "9px 4px" }}>
                <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{it.time}</div>
                <div style={{ fontSize: 11, fontWeight: 800, marginTop: 3 }}>{it.day.split(" ").slice(0, 2).join(" ")}</div>
              </div>
              {rAvatar(it.init, 42)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{it.who}</div>
                <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1 }}>{it.offer}</div>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--gj-grey)", fontWeight: 700 }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-blue-ink)" }}><use href={"#" + it.modeIcon} /></svg>{it.mode}</span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 11px", borderRadius: 999, background: tone[0], color: tone[1], whiteSpace: "nowrap" }}>{it.status}</span>
              <button style={{ background: "var(--gj-blue)", color: "#fff", border: 0, padding: "9px 15px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-video" /></svg>Rejoindre</button>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// =====================================================================
// PROFIL ENTREPRISE
// =====================================================================
const RecCompany = () => {
  const field = (label, val) => (
    <div><div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</div><div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)", marginTop: 2 }}>{val}</div></div>
  );
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ ...rCard, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ width: 64, height: 64, borderRadius: 15, flexShrink: 0, background: "var(--gj-blue)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 28 }}>S</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--gj-ink)" }}>Sonatel</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "3px 10px", borderRadius: 999 }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-check-circle" /></svg>Partenaire vérifié</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 4 }}>Télécoms · Dakar · partenaire CJS depuis 2024</div>
          </div>
          <button style={{ background: "#fff", color: "var(--gj-blue-ink)", border: "1.5px solid var(--gj-line)", padding: "10px 16px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Modifier</button>
        </div>

        <div style={{ ...rCard }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>Informations</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 18px" }}>
            {field("Secteur", "Télécommunications")}
            {field("NINEA", "0012345 2A2")}
            {field("Effectif", "+ 1 500 salariés")}
            {field("Ville", "Dakar, Sénégal")}
            {field("Site web", "sonatel.sn")}
            {field("Contact RH", "recrutement@sonatel.sn")}
          </div>
        </div>

        <div style={{ ...rCard }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 8 }}>Présentation</h2>
          <p style={{ fontSize: 13.5, color: "var(--gj-ink)", lineHeight: 1.6, margin: 0 }}>Opérateur télécom de référence au Sénégal, Sonatel accompagne la jeunesse via des stages, des emplois et des programmes d'innovation. Notre cellule Innovation recrute régulièrement des profils Data et Développement issus du réseau CJS.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {[["12", "Offres publiées"], ["37", "Candidatures reçues"], ["8", "Recrutements via CJS"]].map(([n, l]) => (
            <div key={l} style={{ ...rCard, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-blue-ink)", lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 6, fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { R_INTERVIEWS, RecInterviews, RecCompany, RecCandidate, InterviewModal, RecMessages, WebRecruteur });
