/* eslint-disable */
// Lot 11 — Administration · WEB (partie 1) : dashboard, centres, users, modération, partenaires.

const adCard = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 };
const adAvatar = (init, size = 38, tone) => {
  const g = { teal: ["var(--gj-teal)", "var(--gj-teal-deep)"], blue: ["var(--gj-blue)", "var(--gj-blue-ink)"], yellow: ["var(--gj-yellow)", "#E0A93B"], red: ["var(--gj-red)", "var(--gj-red-ink)"], grey: ["var(--gj-grey)", "var(--gj-grey-2)"] }[tone] || ["var(--gj-teal)", "var(--gj-teal-deep)"];
  return <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, color: tone === "yellow" ? "#11201C" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.36 }}>{init}</span>;
};

// =====================================================================
// DASHBOARD national
// =====================================================================
const AdminDashboard = ({ nav }) => {
  const bubbles = ADM_CENTRES.map((c) => ({ x: c.x, y: c.y, r: 4 + Math.sqrt(c.jeunes) / 12 }));
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Tableau de bord national</h1>
        <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Vue d'ensemble du réseau Guichet Jeunesse · 14 centres · mis à jour à l'instant.</div>
      </div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {ADM_KPIS.map((k, i) => {
          const tone = { teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"], blue: ["var(--gj-blue-soft)", "var(--gj-blue-ink)"], green: ["var(--gj-green-soft)", "var(--gj-green-ink)"], yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"] }[k.tone];
          return (
            <div key={i} onClick={() => k.urgent && nav("moderation")} style={{ ...adCard, padding: 16, cursor: k.urgent ? "pointer" : "default", borderColor: k.urgent ? "var(--gj-yellow)" : "var(--gj-line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: tone[0], color: tone[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + k.icon} /></svg></span>
                <Spark data={k.spark} color={tone[1]} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)", marginTop: 10, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gj-ink)", marginTop: 5 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: k.urgent ? "var(--gj-yellow-ink)" : "var(--gj-green-ink)", marginTop: 2, fontWeight: 700 }}>{k.delta}</div>
            </div>
          );
        })}
      </div>

      {/* indicateurs secondaires */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        {ADM_KPIS2.map((k, i) => (
          <div key={i} style={{ ...adCard, padding: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-teal-deep)" }}><use href={"#" + k.icon} /></svg>
              <svg className="gj-icon" style={{ width: 12, height: 12, color: k.up ? "var(--gj-green-ink)" : "var(--gj-red)", marginLeft: "auto" }}><use href={"#" + (k.up ? "i-trending" : "i-clock")} /></svg>
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "var(--gj-ink)", marginTop: 8, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 10.5, color: "var(--gj-grey)", marginTop: 4, fontWeight: 600, lineHeight: 1.25 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={adCard}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900 }}>Croissance des inscriptions</h2>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-green-ink)" }}>+62% sur 7 mois</span>
          </div>
          <LineChart data={ADM_GROWTH} labels={["Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai"]} />
        </div>
        {/* users donut */}
        <div style={adCard}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>Répartition des comptes</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut data={ADM_USERS_SPLIT} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
              {ADM_USERS_SPLIT.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}>{d.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>{d.value.toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20, alignItems: "start" }}>
        {/* map */}
        <div style={adCard}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Présence nationale</h2>
          <div style={{ fontSize: 12, color: "var(--gj-grey)", marginBottom: 12 }}>Taille = nombre de jeunes inscrits par centre.</div>
          <SenegalBubbleMap points={bubbles} height={300} />
        </div>
        {/* monthly insertions */}
        <div style={adCard}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900 }}>Insertions par mois</h2>
            <button onClick={() => nav("stats")} style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Détails →</button>
          </div>
          <BarChart data={ADM_MONTHLY} />
          <div style={{ display: "flex", gap: 9, alignItems: "center", marginTop: 14, padding: "11px 13px", background: "var(--gj-yellow-soft)", borderRadius: 10 }}>
            <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-yellow-ink)", flexShrink: 0 }}><use href="#i-shield" /></svg>
            <div style={{ flex: 1, fontSize: 12.5, color: "var(--gj-yellow-ink)", fontWeight: 600 }}><b>23 publications</b> en attente de modération.</div>
            <button onClick={() => nav("moderation")} style={{ background: "var(--gj-yellow)", color: "#11201C", border: 0, padding: "7px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Modérer</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// CENTRES (performance)
// =====================================================================
const AdminCentres = () => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Centres CJS</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Performance des 14 centres du réseau.</div>
        </div>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Ajouter un centre</button>
      </div>
      <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.4fr 0.6fr 0.7fr", gap: 14, padding: "12px 18px", borderBottom: "1.5px solid var(--gj-line)", background: "var(--gj-bg)", fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>
          <span>Centre</span><span>Jeunes</span><span>Insertions/mois</span><span>Taux d'insertion</span><span>Agents</span><span>Actions</span>
        </div>
        {ADM_CENTRES.map((c) => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.4fr 0.6fr 0.7fr", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--gj-line)", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-pin" /></svg></span>
              <div><div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{c.region}</div></div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gj-ink)" }}>{c.jeunes.toLocaleString("fr-FR")}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gj-ink)" }}>{c.insertions}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ flex: 1, maxWidth: 110, height: 7, background: "var(--gj-bg)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${c.taux}%`, background: c.taux >= 65 ? "var(--gj-green)" : c.taux >= 55 ? "var(--gj-yellow-deep)" : "var(--gj-red)", borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>{c.taux}%</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gj-grey)" }}>{c.agents}</span>
            <div style={{ display: "flex", gap: 6, justifySelf: "end" }}>
              <button style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-teal-deep)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Modifier"><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-settings" /></svg></button>
              <button style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-red)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Supprimer"><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-block" /></svg></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// =====================================================================
// UTILISATEURS
// =====================================================================
const AdminUsers = () => {
  const chips = ["Tous", "Bénéficiaires", "Conseillers", "Recruteurs", "Admins"];
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Utilisateurs</h1>
            <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>49 199 comptes · bénéficiaires, conseillers, recruteurs et admins.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 13px", minHeight: 42, width: 240 }}>
            <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
            <input placeholder="Rechercher…" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 13.5, fontFamily: "inherit", color: "var(--gj-ink)" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {chips.map((c, i) => <button key={c} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</button>)}
        </div>
        <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 0.6fr", gap: 14, padding: "12px 18px", borderBottom: "1.5px solid var(--gj-line)", background: "var(--gj-bg)", fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>
            <span>Utilisateur</span><span>Rôle</span><span>Centre / Org</span><span>Statut</span><span></span>
          </div>
          {ADM_USERS.map((u) => {
            const rt = ROLE_TONE[u.role] || ROLE_TONE["Admin"];
            return (
              <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 0.6fr", gap: 14, padding: "12px 18px", borderBottom: "1px solid var(--gj-line)", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  {adAvatar(u.init, 36, u.role.startsWith("Conseil") ? "blue" : u.role === "Recruteur" ? "yellow" : "teal")}
                  <div><div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{u.name}</div><div style={{ fontSize: 11, color: "var(--gj-grey)" }}>Actif · {u.last}</div></div>
                </div>
                <span><span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: rt.soft, color: rt.ink }}>{u.role}</span></span>
                <span style={{ fontSize: 12.5, color: "var(--gj-ink)" }}>{u.centre}</span>
                <span><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: u.statut === "Actif" ? "var(--gj-green-ink)" : "var(--gj-yellow-ink)" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: u.statut === "Actif" ? "var(--gj-green)" : "var(--gj-yellow-deep)" }} />{u.statut}</span></span>
                <button style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", justifySelf: "end" }} aria-label="Gérer"><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-settings" /></svg></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// MODÉRATION
// =====================================================================
const AiVerdictBlock = ({ ai }) => {
  const vd = AI_VERDICT[ai.verdict];
  return (
    <div style={{ background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #19A757, #0A807F)", color: "#fff", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 15, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>Y</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>Analyse de Yaye <span style={{ background: "var(--gj-yellow)", color: "var(--gj-teal-deep)", fontSize: 8.5, fontWeight: 900, padding: "1px 6px", borderRadius: 999, marginLeft: 3 }}>IA</span></div>
          <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{ai.summary}</div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: vd.dot, lineHeight: 1 }}>{ai.score}</div>
          <div style={{ fontSize: 8.5, color: "var(--gj-grey-2)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".3px" }}>score</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: ai.reason ? 9 : 0 }}>
        {ai.checks.map(([label, ok], i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: ok ? "var(--gj-green-soft)" : "var(--gj-red-soft)", color: ok ? "var(--gj-green-ink)" : "var(--gj-red-ink)" }}>
            <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + (ok ? "i-check" : "i-close")} /></svg>{label}
          </span>
        ))}
      </div>
      {ai.reason && <div style={{ fontSize: 11.5, color: "var(--gj-red-ink)", background: "var(--gj-red-soft)", borderRadius: 8, padding: "8px 11px", lineHeight: 1.45 }}>⚠ {ai.reason}</div>}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 9, fontSize: 11, fontWeight: 800, color: vd.ink, background: vd.soft, padding: "4px 11px", borderRadius: 999 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: vd.dot }} />Recommandation IA : {vd.label}
      </div>
    </div>
  );
};

const AdminModeration = () => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Modération</h1>
      <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3, marginBottom: 16 }}>Chaque publication est pré-analysée par l'IA Yaye, puis validée par un humain avant d'être visible par les jeunes.</div>
      {/* bandeau IA */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))", color: "#fff", borderRadius: 14, padding: "14px 18px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <span style={{ position: "absolute", right: -40, top: -50, width: 160, height: 160, background: "radial-gradient(circle, rgba(249,196,0,.18), transparent 60%)" }} />
        <span style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #19A757, #0A807F)", color: "#fff", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px rgba(255,255,255,.2)" }}>Y</span>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>Yaye a pré-trié 23 publications</div>
          <div style={{ fontSize: 11.5, opacity: .85, marginTop: 2 }}>18 conformes · 4 à vérifier · 1 à risque. Tu gardes la décision finale.</div>
        </div>
        <div style={{ display: "flex", gap: 14, position: "relative" }}>
          {[["18", "Conformes", "#7BE5B5"], ["4", "À vérifier", "var(--gj-yellow)"], ["1", "Risque", "#FF9B8A"]].map(([n, l, c]) => (
            <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 900, color: c, lineHeight: 1 }}>{n}</div><div style={{ fontSize: 9.5, opacity: .8, marginTop: 2 }}>{l}</div></div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ADM_MODERATION.map((m) => {
          const ai = AI_MOD[m.id] || m.ai;
          return (
            <div key={m.id} style={{ ...adCard, padding: 16, display: "flex", flexDirection: "column", gap: 12, borderColor: ai && ai.verdict === "reject" ? "var(--gj-red)" : "var(--gj-line)" }}>
              <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <span style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href="#i-document" /></svg></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--gj-grey)", background: "var(--gj-bg)", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px" }}>{m.kind}</span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gj-ink)", marginTop: 6 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>Par {m.by} · {m.centre} · {m.date}</div>
                </div>
              </div>
              {ai && <AiVerdictBlock ai={ai} />}
              <div style={{ display: "flex", gap: 9, borderTop: "1px solid var(--gj-line)", paddingTop: 12, alignItems: "center" }}>
                <button style={{ background: "var(--gj-green)", color: "#fff", border: 0, padding: "9px 17px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-check" /></svg>Approuver</button>
                <button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "9px 15px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Rejeter</button>
                <button style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "9px 15px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Aperçu</button>
                <span style={{ flex: 1 }} />
                {ai && ai.verdict === "approve" && <span style={{ fontSize: 11, color: "var(--gj-grey)", fontWeight: 600 }}>L'IA suggère d'approuver</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// =====================================================================
// PARTENAIRES
// =====================================================================
const AdminPartners = () => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Partenaires & recruteurs</h1>
      <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3, marginBottom: 18 }}>412 organisations · valide les nouvelles demandes et gère les accès.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ADM_PARTNERS.map((p) => {
          const st = PARTNER_STATUS[p.statut];
          return (
            <div key={p.id} style={{ ...adCard, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 19 }}>{p.init}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--gj-ink)" }}>{p.name}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: st.soft, color: st.ink }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + st.icon} /></svg>{p.statut}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 3 }}>{p.secteur} · {p.offres} offres · {p.date}{p.ninea ? ` · ${p.ninea}` : ""}</div>
              </div>
              {p.statut === "À vérifier" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ background: "var(--gj-green)", color: "#fff", border: 0, padding: "9px 15px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Vérifier</button>
                  <button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "9px 13px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Refuser</button>
                </div>
              ) : p.statut === "Suspendu" ? (
                <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "9px 15px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Réactiver</button>
              ) : (
                <button style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Gérer"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-settings" /></svg></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

Object.assign(window, { AdminDashboard, AdminCentres, AdminUsers, AdminModeration, AdminPartners, AiVerdictBlock, adCard, adAvatar });
