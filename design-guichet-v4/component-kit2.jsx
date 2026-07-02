/* eslint-disable */
// Lot 14 (suite) — composants spécifiques issus de toutes les pages.
// Dépend de component-kit.jsx (Block, Demo, av, pill, btn, swInk) + PhoneFrame.

// ===== NAVIGATION : identités par rôle =====
const NavIdentities = () => {
  const roles = [
    { label: "Bénéficiaire", sub: "Barre claire · accent teal", bg: "#fff", bd: "var(--gj-line)", dot: "var(--gj-teal-deep)", txt: "var(--gj-ink)" },
    { label: "Conseiller CJS", sub: "Barre teal foncé", bg: "var(--gj-ink-teal)", bd: "transparent", dot: "var(--gj-yellow)", txt: "#fff" },
    { label: "Recruteur", sub: "Barre claire · accent bleu", bg: "#fff", bd: "var(--gj-line)", dot: "var(--gj-blue)", txt: "var(--gj-ink)" },
    { label: "Admin national", sub: "Barre sombre · accent doré", bg: "#11201C", bd: "transparent", dot: "var(--gj-yellow)", txt: "#fff" },
  ];
  return (
    <Block title="Navigation — identités par rôle" sub="Chaque espace a une barre latérale signature. Aperçu réduit.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {roles.map((r, i) => (
          <div key={i} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: r.bg, border: r.bd !== "transparent" ? `1px solid ${r.bd}` : 0, padding: 11, display: "flex", flexDirection: "column", gap: 7, minHeight: 116 }}>
              {[0, 1, 2].map((k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 7, background: k === 0 ? (r.label === "Admin national" ? "linear-gradient(135deg,var(--gj-yellow),#E0A93B)" : r.label === "Conseiller CJS" ? "var(--gj-teal)" : r.label === "Recruteur" ? "var(--gj-blue-soft)" : "var(--gj-teal-soft)") : "transparent" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.dot }} />
                  <span style={{ flex: 1, height: 6, borderRadius: 3, background: k === 0 && (r.label === "Conseiller CJS" || r.label === "Admin national") ? (r.label === "Admin national" ? "#11201C" : "#fff") : "currentColor", color: r.txt, opacity: k === 0 ? .9 : .3 }} />
                </div>
              ))}
            </div>
            <div style={{ padding: "9px 11px", borderTop: "1px solid var(--gj-line)" }}><div style={{ fontSize: 12.5, fontWeight: 800, color: swInk }}>{r.label}</div><div style={{ fontSize: 10.5, color: "var(--gj-grey)", marginTop: 1 }}>{r.sub}</div></div>
          </div>
        ))}
      </div>
    </Block>
  );
};

// ===== DATA-VIZ =====
const KSpark = ({ data, color }) => {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1, w = 90, h = 30;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / rng) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  return <svg width={w} height={h} style={{ display: "block" }}><path d={d + ` L${w},${h} L0,${h} Z`} fill={color} opacity=".12" /><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
};
const KDonut = ({ segs, size = 96 }) => {
  const total = segs.reduce((s, x) => s + x[0], 0), r = (size - 22) / 2, c = 2 * Math.PI * r; let acc = 0;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><g transform={`rotate(-90 ${size/2} ${size/2})`}>{segs.map((s, i) => { const frac = s[0] / total, el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s[1]} strokeWidth="22" strokeDasharray={`${frac*c} ${c-frac*c}`} strokeDashoffset={-acc*c} />; acc += frac; return el; })}</g></svg>;
};
const DataViz = () => (
  <Block title="Data-viz (SVG, sans dépendance)" sub="Sparkline · courbe · barres · donut — utilisés dans l'espace admin">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
      <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Sparkline (KPI)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}><span style={{ fontSize: 24, fontWeight: 900, color: swInk }}>48 720</span><KSpark data={[30,34,38,41,44,46,48]} color="var(--gj-teal-deep)" /></div>
      </div>
      <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Barres</div>
        <svg viewBox="0 0 240 80" style={{ width: "100%" }}>{[40,55,48,68,72,86].map((v, i) => <rect key={i} x={i*40+10} y={80-v*0.8} width="22" height={v*0.8} rx="4" fill={i===5?"var(--gj-teal-deep)":"var(--gj-teal)"} opacity={i===5?1:.5} />)}</svg>
      </div>
      <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Courbe</div>
        <svg viewBox="0 0 240 80" style={{ width: "100%" }} preserveAspectRatio="none"><path d="M0,64 L48,52 L96,56 L144,34 L192,28 L240,12" fill="none" stroke="var(--gj-blue-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M0,64 L48,52 L96,56 L144,34 L192,28 L240,12 L240,80 L0,80 Z" fill="var(--gj-blue-ink)" opacity=".1" /></svg>
      </div>
      <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
        <KDonut segs={[[70, "var(--gj-teal)"], [18, "var(--gj-blue)"], [12, "var(--gj-yellow-deep)"]]} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[["Bénéf.", "var(--gj-teal)"], ["Recruteurs", "var(--gj-blue)"], ["Conseillers", "var(--gj-yellow-deep)"]].map(([l, c]) => <div key={l} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--gj-grey)", fontWeight: 600 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</div>)}</div>
      </div>
    </div>
  </Block>
);

// ===== CARTE CJS + CARTE SÉNÉGAL =====
const MapsAndCard = () => (
  <Block title="Carte CJS & carte du Sénégal" sub="Carte de membre officielle recto/verso (QR) et carte choroplèthe — éléments signature">
    <Demo label="Carte de membre — recto & verso" col>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <MyCJSCard maxWidth={400} />
        <MyCJSCardBack maxWidth={400} />
      </div>
    </Demo>
    <Demo label="Carte du Sénégal (présence des centres)" col>
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1.5px solid var(--gj-line)", background: "linear-gradient(135deg,#EAF3F0,#DCEAE5)", aspectRatio: "1.5/1", maxWidth: 420 }}>
        <svg viewBox="0 0 270 210" style={{ width: "100%", height: "100%", padding: 12 }} preserveAspectRatio="xMidYMid meet">
          <path d="M44,28 L78,18 L120,16 L150,24 L175,40 L188,62 L200,82 L224,92 L236,120 L242,150 L240,176 L252,182 L250,192 L210,190 L170,184 L150,190 L120,192 L90,190 L60,186 L44,190 L40,168 L42,150 L42,140 L150,142 L166,138 L150,126 L44,124 L40,112 L36,96 L10,84 L34,72 L36,52 Z" fill="var(--gj-teal-soft)" stroke="var(--gj-teal-deep)" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="42" y="125" width="124" height="15" rx="5" fill="#EAF3F0" stroke="var(--gj-teal-deep)" strokeWidth="1" />
          {[[180,120,9,1],[24,84,7,0],[52,82,5,0],[60,176,5,0],[52,34,5,0]].map(([x,y,r,a],i)=>(<g key={i}>{a?<circle cx={x} cy={y} r="5" fill="none" stroke="var(--gj-red)" strokeWidth="1.4" opacity=".6" />:null}<circle cx={x} cy={y} r={r*0.55} fill={a?"var(--gj-red)":"var(--gj-teal-deep)"} stroke="#fff" strokeWidth="1.4" /></g>))}
        </svg>
      </div>
    </Demo>
  </Block>
);

// ===== KANBAN + TIMELINE =====
const KanbanTimeline = () => (
  <Block title="Pipeline kanban & timeline" sub="Suivi de candidatures (recruteur) et chronologie (bénéficiaire)">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, alignItems: "start" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Colonne kanban</div>
        <div style={{ background: "rgba(0,0,0,.015)", border: "1px solid var(--gj-line)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", borderBottom: "1px solid var(--gj-line)", background: "var(--gj-blue-soft)" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gj-blue)" }} /><span style={{ fontSize: 12.5, fontWeight: 900, color: swInk }}>Présélection</span><span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", background: "#fff", padding: "1px 8px", borderRadius: 999 }}>2</span></div>
          <div style={{ padding: 10 }}>
            <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: 11, boxShadow: "var(--gj-shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>{av("AD", 34, "linear-gradient(135deg,var(--gj-teal),var(--gj-teal-deep))")}<div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: swInk }}>Awa Diop</div><div style={{ fontSize: 10.5, color: "var(--gj-grey)" }}>Bac+2 · Stats</div></div><span style={{ fontSize: 10, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "2px 8px", borderRadius: 999 }}>94%</span></div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Timeline de suivi</div>
        {[["Envoyée", "12 mai", true], ["Vue", "13 mai", true], ["Entretien", "11 juin", false]].map(([l, d, done], i, arr) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: done ? "var(--gj-teal)" : "#fff", border: done ? 0 : "2px solid var(--gj-line-strong)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{done && <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg>}</span>
              {i < arr.length - 1 && <span style={{ flex: 1, width: 2.5, background: done ? "var(--gj-teal)" : "var(--gj-line)", margin: "3px 0", minHeight: 16 }} />}
            </div>
            <div style={{ paddingBottom: 14 }}><div style={{ fontSize: 13.5, fontWeight: 800, color: done ? swInk : "var(--gj-grey-2)" }}>{l}</div><div style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>{d}</div></div>
          </div>
        ))}
      </div>
    </div>
  </Block>
);

// ===== MESSAGERIE + MODALE + ÉTATS =====
const ChatModalStates = () => (
  <Block title="Messagerie · modale · états système" sub="Bulles de discussion, fenêtre modale, squelette de chargement, état vide">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, alignItems: "start" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Bulles de messagerie</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ alignSelf: "flex-start", maxWidth: "80%", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "14px 14px 14px 4px", padding: "9px 13px", fontSize: 13 }}>Bonjour, votre profil nous intéresse.</div>
          <div style={{ alignSelf: "flex-end", maxWidth: "80%", background: "var(--gj-teal-deep)", color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "9px 13px", fontSize: 13 }}>Merci ! Je suis disponible.</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Squelette & état vide</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(90deg,var(--gj-bg) 25%,#eef3f1 37%,var(--gj-bg) 63%)", backgroundSize: "400% 100%", animation: "gjsk 1.4s ease infinite" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}><div style={{ height: 11, width: "62%", borderRadius: 5, background: "linear-gradient(90deg,var(--gj-bg) 25%,#eef3f1 37%,var(--gj-bg) 63%)", backgroundSize: "400% 100%", animation: "gjsk 1.4s ease infinite" }} /><div style={{ height: 9, width: "40%", borderRadius: 5, background: "var(--gj-bg)" }} /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "14px", border: "1.5px dashed var(--gj-line-strong)", borderRadius: 12, color: "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-bookmark" /></svg><span style={{ fontSize: 12.5, fontWeight: 700 }}>Aucun élément pour l'instant</span></div>
      </div>
    </div>
    <Demo label="Bandeau hors-ligne">
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gj-ink)", color: "#fff", padding: "10px 15px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, width: "100%" }}><svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-yellow)" }}><use href="#i-globe" /></svg><span style={{ flex: 1 }}>Tu es hors-ligne</span><span style={{ color: "var(--gj-yellow)", fontWeight: 800 }}>Réessayer</span></div>
    </Demo>
  </Block>
);

// ===== CHECK-IN QR + CALENDRIER + YAYE + RESSOURCE =====
const MiscComponents = () => (
  <Block title="Scan QR · calendrier · assistant Yaye · vignette ressource" sub="Composants spécialisés des espaces conseiller, événements, médiathèque">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
      {/* QR scanner */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Scan QR</div>
        <div style={{ position: "relative", aspectRatio: "1/1", borderRadius: 12, background: "#0E1513", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "18%", border: "3px solid rgba(255,255,255,.85)", borderRadius: 14 }} />
          {["tl","tr","bl","br"].map((c) => <span key={c} style={{ position: "absolute", width: 20, height: 20, border: "3px solid var(--gj-yellow)", borderTop: c[0]==="t"?undefined:"none", borderBottom: c[0]==="b"?undefined:"none", borderLeft: c[1]==="l"?undefined:"none", borderRight: c[1]==="r"?undefined:"none", borderRadius: c==="tl"?"8px 0 0 0":c==="tr"?"0 8px 0 0":c==="bl"?"0 0 0 8px":"0 0 8px 0", top: c[0]==="t"?"17%":undefined, bottom: c[0]==="b"?"17%":undefined, left: c[1]==="l"?"17%":undefined, right: c[1]==="r"?"17%":undefined }} />)}
          <span style={{ position: "absolute", left: "18%", right: "18%", top: "50%", height: 2.5, background: "var(--gj-yellow)" }} />
        </div>
      </div>
      {/* calendrier */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Calendrier</div>
        <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {["L","M","M","J","V","S","D"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 8.5, fontWeight: 800, color: "var(--gj-grey)" }}>{d}</div>)}
            {Array.from({ length: 21 }).map((_, i) => { const d = i + 1, has = [5, 10, 14].includes(d); return <div key={i} style={{ aspectRatio: "1/1", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: has ? 900 : 600, background: has ? "var(--gj-teal-soft)" : "transparent", color: has ? "var(--gj-teal-deep)" : "var(--gj-ink)" }}>{d}</div>; })}
          </div>
        </div>
      </div>
      {/* Yaye */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Assistant Yaye</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,var(--gj-teal),var(--gj-teal-deep))", color: "#fff", padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, alignSelf: "flex-start" }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-yellow)" }}><use href="#i-bolt" /></svg>Yaye</div>
          <div style={{ background: "var(--gj-teal-soft)", borderRadius: "4px 12px 12px 12px", padding: "10px 12px", fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>J'ai 8 offres pour ton profil !</div>
        </div>
      </div>
      {/* vignette ressource */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Vignette ressource</div>
        <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ height: 74, background: "linear-gradient(135deg,var(--gj-teal-soft),#fff)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ width: 38, height: 50, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 3, transform: "rotate(-5deg)", boxShadow: "0 3px 10px rgba(0,0,0,.12)" }} />
            <span style={{ position: "absolute", top: 8, right: 8, fontSize: 8.5, fontWeight: 800, color: "var(--gj-teal-deep)", background: "#fff", padding: "2px 7px", borderRadius: 999 }}>PDF</span>
          </div>
          <div style={{ padding: 10 }}><div style={{ fontSize: 12, fontWeight: 800, color: swInk, lineHeight: 1.25 }}>Guide du CV</div><div style={{ fontSize: 10, color: "var(--gj-grey)", marginTop: 2 }}>24 p. · audio WO</div></div>
        </div>
      </div>
    </div>
  </Block>
);

// ===== SIDEBAR (slide) + BARRE DE RECHERCHE =====
const NavbarSearch = () => {
  const link = (icon, label, on, badge) => (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: on ? 800 : 600, color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)", background: on ? "var(--gj-teal-soft)" : "transparent" }}>
      <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + icon} /></svg>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ background: "var(--gj-teal-deep)", color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 10 }}>{badge}</span>}
    </div>
  );
  return (
    <Block title="Barre de navigation (slide) & recherche" sub="Sidebar coulissante avec overlay, et barre de recherche web/mobile">
      <Demo label="Barre latérale (panneau coulissant)" col>
        <div style={{ position: "relative", height: 280, border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden", background: "var(--gj-bg)" }}>
          {/* contenu sous l'overlay */}
          <div style={{ position: "absolute", inset: 0, padding: 16 }}><div style={{ height: 12, width: "50%", background: "var(--gj-line)", borderRadius: 4, opacity: .5 }} /></div>
          <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)" }} />
          {/* drawer */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 230, background: "#fff", borderRight: "1px solid var(--gj-line)", boxShadow: "8px 0 30px rgba(0,0,0,.16)", padding: 14, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "2px 6px 12px", borderBottom: "1px solid var(--gj-line)", marginBottom: 8 }}>
              <img src="assets/logo-guichet.png" alt="CJS" style={{ height: 24 }} />
              <span style={{ marginLeft: "auto", width: 30, height: 30, borderRadius: 8, background: "var(--gj-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-close" /></svg></span>
            </div>
            {link("i-home", "Accueil", true)}
            {link("i-search", "Explorer")}
            {link("i-document", "Mes candidatures", false, "3")}
            {link("i-bookmark", "Mes sauvegardes", false, "12")}
            {link("i-chat", "Messagerie", false, "2")}
            {link("i-profile", "Profil")}
          </div>
        </div>
      </Demo>
      <Demo label="Barre de recherche" col>
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: "0 14px", minHeight: 46, maxWidth: 420 }}>
          <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
          <input defaultValue="Data analyst" aria-label="Recherche" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 14, fontFamily: "inherit", color: swInk }} />
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--gj-line)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-close" /></svg></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: "0 14px", minHeight: 46, maxWidth: 420 }}>
          <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
          <span style={{ flex: 1, fontSize: 14, color: "var(--gj-grey-2)" }}>Rechercher une opportunité…</span>
          <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-teal-deep)" }}><use href="#i-filter" /></svg>
        </div>
      </Demo>
    </Block>
  );
};

const WebKit2 = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <NavbarSearch /><NavIdentities /><DataViz /><MapsAndCard /><KanbanTimeline /><ChatModalStates /><MiscComponents />
  </div>
);

// ===== MOBILE : navigation =====
const MobNavScreen = () => (
  <PhoneFrame>
    <AppHeader title="Navigation mobile" onBack={() => {}} />
    <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 14, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>En-tête d'application</div>
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 12, display: "flex", alignItems: "center", gap: 11, padding: "12px 14px" }}>
          <button style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: swInk }} aria-label="Retour"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-chevron-left" /></svg></button>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 900, color: swInk }}>Titre de page</span>
          <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gj-teal-soft)" }} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Carte CJS (mobile)</div>
        <div style={{ aspectRatio: "1.585/1", background: "#fff", borderRadius: 14, border: "1px solid var(--gj-line)", boxShadow: "var(--gj-shadow-sm)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 14, paddingLeft: 18 }}>
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "linear-gradient(var(--gj-teal),var(--gj-teal-deep))" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="assets/logo-guichet.png" alt="CJS" style={{ height: 20 }} /></div>
          <div style={{ display: "flex", gap: 11, alignItems: "center" }}><span style={{ width: 46, height: 46, borderRadius: 7, background: "var(--gj-teal-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-teal-deep)" }}><svg className="gj-icon" style={{ width: 24, height: 24 }}><use href="#i-resources" /></svg></span><div><div style={{ fontSize: 15, fontWeight: 900, color: swInk }}>Awa Diop</div><div style={{ fontSize: 10, color: "var(--gj-grey)" }}>Tambacounda</div></div></div>
        </div>
      </div>
    </div>
    <BottomNav active="explore" />
  </PhoneFrame>
);

Object.assign(window, { WebKit2, MobNavScreen, NavbarSearch, NavIdentities, DataViz, MapsAndCard, KanbanTimeline, ChatModalStates, MiscComponents });
