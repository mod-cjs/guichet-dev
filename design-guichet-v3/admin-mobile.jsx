/* eslint-disable */
// Lot 11 — Administration · MOBILE (390×844). Réutilise PhoneFrame + admin-data/charts.
// Admin sur mobile : suivi des KPIs, modération rapide, centres, utilisateurs.

const AdmBottomNav = ({ active = "home", nav = () => {} }) => {
  const items = [
    { id: "home", icon: "i-home", label: "Bord" },
    { id: "moderation", icon: "i-shield", label: "Modérer", badge: 23 },
    { id: "users", icon: "i-users", label: "Comptes" },
    { id: "more", icon: "i-menu", label: "Plus" },
  ];
  return (
    <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.1)", background: "#11201C", flexShrink: 0, paddingBottom: 6 }}>
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button key={it.id} onClick={() => nav(it.id)} style={{ flex: 1, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "9px 0 5px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--gj-yellow)" : "rgba(255,255,255,.55)" }}>
            <span style={{ position: "relative" }}>
              <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + it.icon} /></svg>
              {it.badge && <span style={{ position: "absolute", top: -5, right: -9, minWidth: 16, height: 16, borderRadius: 999, background: "var(--gj-red)", color: "#fff", fontSize: 9.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #11201C", padding: "0 3px" }}>{it.badge}</span>}
            </span>
            <span style={{ fontSize: 10, fontWeight: on ? 800 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const AdmHeader = ({ title, sub, onBack }) => (
  <div style={{ background: "#11201C", color: "#fff", padding: "13px 15px", display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
    {onBack && <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 8, border: 0, background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-label="Retour"><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-chevron-left" /></svg></button>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 1 }}>{sub}</div>}
    </div>
    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--gj-yellow), #E0A93B)", color: "#11201C", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{ADMIN.initials}</span>
  </div>
);

const amAvatar = (init, size = 36, tone) => {
  const g = { teal: ["var(--gj-teal)", "var(--gj-teal-deep)"], blue: ["var(--gj-blue)", "var(--gj-blue-ink)"], yellow: ["var(--gj-yellow)", "#E0A93B"], red: ["var(--gj-red)", "var(--gj-red-ink)"], grey: ["var(--gj-grey)", "var(--gj-grey-2)"] }[tone] || ["var(--gj-teal)", "var(--gj-teal-deep)"];
  return <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, color: tone === "yellow" ? "#11201C" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.36 }}>{init}</span>;
};

// DASHBOARD
const AdmMobHome = ({ nav }) => {
  const bubbles = ADM_CENTRES.map((c) => ({ x: c.x, y: c.y, r: 4 + Math.sqrt(c.jeunes) / 12 }));
  return (
    <PhoneFrame>
      <AdmHeader title="Tableau de bord" sub="Réseau national · 14 centres" />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ADM_KPIS.map((k, i) => {
            const tone = { teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"], blue: ["var(--gj-blue-soft)", "var(--gj-blue-ink)"], green: ["var(--gj-green-soft)", "var(--gj-green-ink)"], yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"] }[k.tone];
            return (
              <div key={i} onClick={() => k.urgent && nav("moderation")} style={{ background: "#fff", border: k.urgent ? "1.5px solid var(--gj-yellow)" : "1px solid var(--gj-line)", borderRadius: 13, padding: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: tone[0], color: tone[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href={"#" + k.icon} /></svg></span>
                  <Spark data={k.spark} color={tone[1]} w={48} h={22} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--gj-ink)", marginTop: 8, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--gj-ink)", marginTop: 4 }}>{k.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Croissance des inscriptions</h2>
          <LineChart data={ADM_GROWTH} labels={["N", "D", "J", "F", "M", "A", "M"]} h={150} />
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Présence nationale</h2>
          <SenegalBubbleMap points={bubbles} height={230} />
        </div>
      </div>
      <AdmBottomNav active="home" nav={nav} />
    </PhoneFrame>
  );
};

// MODÉRATION
const AdmMobModeration = ({ nav }) => (
  <PhoneFrame>
    <AdmHeader title="Modération" sub="23 publications en attente" />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)" }}>
      {ADM_MODERATION.map((m) => (
        <div key={m.id} style={{ background: "#fff", border: m.flag ? "1.5px solid var(--gj-red)" : "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", gap: 11 }}>
            <span style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: m.flag ? "var(--gj-red-soft)" : "var(--gj-blue-soft)", color: m.flag ? "var(--gj-red-ink)" : "var(--gj-blue-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href={"#" + (m.flag ? "i-shield" : "i-document")} /></svg></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-grey)", background: "var(--gj-bg)", padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" }}>{m.kind}</span>
                {m.flag && <span style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-red-ink)", background: "var(--gj-red-soft)", padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" }}>Signalé</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)", marginTop: 5, lineHeight: 1.25 }}>{m.title}</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>{m.by} · {m.date}</div>
            </div>
          </div>
          {(() => { const ai = AI_MOD[m.id]; if (!ai) return null; const vd = AI_VERDICT[ai.verdict];
            return (
              <div style={{ background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: "1px solid var(--gj-line)", borderRadius: 10, padding: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #19A757, #0A807F)", color: "#fff", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>Y</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-ink)" }}>Analyse Yaye <span style={{ background: "var(--gj-yellow)", color: "var(--gj-teal-deep)", fontSize: 8, fontWeight: 900, padding: "1px 5px", borderRadius: 999 }}>IA</span></div></div>
                  <span style={{ fontSize: 15, fontWeight: 900, color: vd.dot }}>{ai.score}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 6, lineHeight: 1.4 }}>{ai.reason || ai.summary}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 10, fontWeight: 800, color: vd.ink, background: vd.soft, padding: "3px 9px", borderRadius: 999 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: vd.dot }} />{vd.label}</div>
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--gj-line)", paddingTop: 11 }}>
            <button style={{ flex: 1, background: "var(--gj-green)", color: "#fff", border: 0, minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-check" /></svg>Approuver</button>
            <button style={{ flex: 1, background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Rejeter</button>
          </div>
        </div>
      ))}
    </div>
    <AdmBottomNav active="moderation" nav={nav} />
  </PhoneFrame>
);

// CENTRES
const AdmMobCentres = ({ nav }) => (
  <PhoneFrame>
    <AdmHeader title="Centres CJS" sub="14 centres" />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--gj-bg)" }}>
      {ADM_CENTRES.map((c) => (
        <div key={c.id} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-pin" /></svg></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{c.jeunes.toLocaleString("fr-FR")} jeunes · {c.agents} agents</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: c.taux >= 65 ? "var(--gj-green-ink)" : c.taux >= 55 ? "var(--gj-yellow-ink)" : "var(--gj-red-ink)" }}>{c.taux}%</span>
          </div>
          <div style={{ height: 6, background: "var(--gj-bg)", borderRadius: 4, overflow: "hidden", marginTop: 10 }}>
            <div style={{ height: "100%", width: `${c.taux}%`, background: c.taux >= 65 ? "var(--gj-green)" : c.taux >= 55 ? "var(--gj-yellow-deep)" : "var(--gj-red)", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
    <AdmBottomNav active="centres" nav={nav} />
  </PhoneFrame>
);

// UTILISATEURS
const AdmMobUsers = ({ nav }) => {
  const chips = ["Tous", "Bénéf.", "Conseillers", "Recruteurs"];
  return (
    <PhoneFrame>
      <AdmHeader title="Utilisateurs" sub="49 199 comptes" />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 13px", minHeight: 42, marginBottom: 10 }}>
          <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
          <span style={{ flex: 1, fontSize: 13.5, color: "var(--gj-grey-2)" }}>Rechercher un compte…</span>
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto" }}>
          {chips.map((c, i) => <span key={c} style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>)}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--gj-bg)" }}>
        {ADM_USERS.map((u) => {
          const rt = ROLE_TONE[u.role] || ROLE_TONE["Admin"];
          return (
            <div key={u.id} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 11 }}>
              {amAvatar(u.init, 40, u.role.startsWith("Conseil") ? "blue" : u.role === "Recruteur" ? "yellow" : "teal")}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{u.name}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{u.centre} · {u.last}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: rt.soft, color: rt.ink, flexShrink: 0 }}>{u.role}</span>
            </div>
          );
        })}
      </div>
      <AdmBottomNav active="users" nav={nav} />
    </PhoneFrame>
  );
};

const MobAdminApp = ({ start = "home" }) => {
  const [s, setS] = React.useState(start);
  const nav = (x) => setS(x);
  if (s === "moderation") return <AdmMobModeration nav={nav} />;
  if (s === "centres") return <AdmMobCentres nav={nav} />;
  if (s === "users") return <AdmMobUsers nav={nav} />;
  if (s === "more") return <AdmMobMore nav={nav} />;
  if (s === "partners") return <AdmMobPartners nav={nav} />;
  if (s === "stats") return <AdmMobStats nav={nav} />;
  if (s === "content") return <AdmMobContent nav={nav} />;
  if (s === "roles") return <AdmMobRoles nav={nav} />;
  if (s === "audit") return <AdmMobAudit nav={nav} />;
  return <AdmMobHome nav={nav} />;
};

// ===== ÉCRAN « PLUS » (menu des sections secondaires) =====
const AdmMobMore = ({ nav }) => {
  const groups = [
    { t: "Pilotage", items: [["centres", "i-pin", "Centres CJS", "14 centres"], ["stats", "i-trending", "Statistiques & rapports", "Indicateurs nationaux"]] },
    { t: "Gouvernance", items: [["partners", "i-employment", "Partenaires & recruteurs", "412 · 1 à vérifier"], ["content", "i-resources", "Contenu · médiathèque", "Ressources publiées"], ["audit", "i-document", "Journal d'audit", "Traçabilité"]] },
    { t: "Système", items: [["roles", "i-settings", "Rôles & droits", "5 rôles"]] },
  ];
  return (
    <PhoneFrame>
      <AdmHeader title="Plus" sub="Toutes les sections" />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 18, background: "var(--gj-bg)" }}>
        {groups.map((g, gi) => (
          <div key={gi}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{g.t}</div>
            <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, overflow: "hidden" }}>
              {g.items.map(([id, ic, label, sub], i) => (
                <button key={id} onClick={() => nav(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", border: 0, borderBottom: i < g.items.length - 1 ? "1px solid var(--gj-line)" : 0, background: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + ic} /></svg></span>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{label}</span><span style={{ display: "block", fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{sub}</span></span>
                  <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)" }}><use href="#i-chevron-right" /></svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <AdmBottomNav active="more" nav={nav} />
    </PhoneFrame>
  );
};

// ===== STATISTIQUES =====
const AdmMobStats = ({ nav }) => (
  <PhoneFrame>
    <AdmHeader title="Statistiques & rapports" sub="Année 2026" onBack={() => nav("more")} />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Inscriptions cumulées</h2>
        <LineChart data={ADM_GROWTH} labels={["N", "D", "J", "F", "M", "A", "M"]} h={150} />
      </div>
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Insertions par mois</h2>
        <BarChart data={ADM_MONTHLY} h={150} />
      </div>
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
        <Donut data={ADM_USERS_SPLIT} size={120} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>{ADM_USERS_SPLIT.map((d, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} /><span style={{ flex: 1, fontSize: 12, color: "var(--gj-grey)", fontWeight: 600 }}>{d.label}</span><span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)" }}>{d.value.toLocaleString("fr-FR")}</span></div>)}</div>
      </div>
      <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 48, borderRadius: 11, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-download" /></svg>Exporter le rapport</button>
    </div>
    <AdmBottomNav active="more" nav={nav} />
  </PhoneFrame>
);

// ===== PARTENAIRES =====
const AdmMobPartners = ({ nav }) => (
  <PhoneFrame>
    <AdmHeader title="Partenaires" sub="412 organisations" onBack={() => nav("more")} />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11, background: "var(--gj-bg)" }}>
      {ADM_PARTNERS.map((p) => {
        const st = PARTNER_STATUS[p.statut];
        return (
          <div key={p.id} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17 }}>{p.init}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{p.secteur} · {p.offres} offres</div>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: st.soft, color: st.ink, flexShrink: 0 }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + st.icon} /></svg>{p.statut}</span>
            </div>
            {p.statut === "À vérifier" && (
              <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--gj-line)", paddingTop: 11 }}>
                <button style={{ flex: 1, background: "var(--gj-green)", color: "#fff", border: 0, minHeight: 40, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Vérifier</button>
                <button style={{ flex: 1, background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", minHeight: 40, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Refuser</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
    <AdmBottomNav active="more" nav={nav} />
  </PhoneFrame>
);

// ===== CONTENU =====
const AdmMobContent = ({ nav }) => (
  <PhoneFrame>
    <AdmHeader title="Contenu · médiathèque" onBack={() => nav("more")} />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--gj-bg)" }}>
      <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 46, borderRadius: 11, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 4 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Ajouter une ressource</button>
      {ADM_CONTENT.map((ct) => (
        <div key={ct.id} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ width: 32, height: 38, borderRadius: 5, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 8.5, flexShrink: 0 }}>PDF</span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{ct.title}</div><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{ct.cat} · {ct.dl} téléch.</div></div>
          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: ct.statut === "Publié" ? "var(--gj-green-soft)" : "var(--gj-bg)", color: ct.statut === "Publié" ? "var(--gj-green-ink)" : "var(--gj-grey)", flexShrink: 0 }}>{ct.statut}</span>
        </div>
      ))}
    </div>
    <AdmBottomNav active="more" nav={nav} />
  </PhoneFrame>
);

// ===== RÔLES =====
const AdmMobRoles = ({ nav }) => (
  <PhoneFrame>
    <AdmHeader title="Rôles & droits" onBack={() => nav("more")} />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--gj-bg)" }}>
      {ADM_ROLES.map((r, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: i === 4 ? "linear-gradient(135deg, var(--gj-yellow), #E0A93B)" : "var(--gj-teal-soft)", color: i === 4 ? "#11201C" : "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + (i === 4 ? "i-shield" : "i-users")} /></svg></span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{r.role}</div><div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{r.n} comptes</div></div>
            <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "7px 12px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Modifier</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{r.perms.map((p) => <span key={p} style={{ fontSize: 10.5, fontWeight: 700, color: "var(--gj-grey)", background: "var(--gj-bg)", border: "1px solid var(--gj-line)", padding: "3px 9px", borderRadius: 999 }}>{p}</span>)}</div>
        </div>
      ))}
    </div>
    <AdmBottomNav active="more" nav={nav} />
  </PhoneFrame>
);

// ===== AUDIT =====
const AdmMobAudit = ({ nav }) => (
  <PhoneFrame>
    <AdmHeader title="Journal d'audit" onBack={() => nav("more")} />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, background: "var(--gj-bg)" }}>
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: "4px 14px" }}>
        {ADM_AUDIT.map((a, i, arr) => (
          <div key={i} style={{ display: "flex", gap: 11, padding: "13px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--gj-line)" : 0, alignItems: "flex-start" }}>
            {amAvatar(a.init, 34, a.tone)}
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, color: "var(--gj-ink)", lineHeight: 1.45 }}><b>{a.who}</b> {a.action}</div><div style={{ fontSize: 11, color: "var(--gj-grey-2)", marginTop: 3 }}>{a.time}</div></div>
          </div>
        ))}
      </div>
    </div>
    <AdmBottomNav active="more" nav={nav} />
  </PhoneFrame>
);

Object.assign(window, { MobAdminApp, AdmMobHome, AdmMobModeration, AdmMobCentres, AdmMobUsers, AdmMobMore, AdmMobStats, AdmMobPartners, AdmMobContent, AdmMobRoles, AdmMobAudit });
