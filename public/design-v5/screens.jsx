/* eslint-disable */
// Key screens lot 1 :
//   #5  CandidaturesScreen   — Liste / pipeline des dossiers
//   #10 YayeFullScreen       — Conversation Yaye plein écran (avec actions)
//   #13 NotificationsScreen  — Centre de notifications groupé par type

// =====================================================================
// #5 — Liste candidatures (pipeline)
// =====================================================================
const CandidaturesPipeline = () => {
  const body = { flex: 1, overflowY: "auto", background: "var(--gj-bg)" };

  // Tabs (filtres pipeline)
  const tabs = {
    display: "flex", gap: 6, padding: "12px 12px 8px",
    overflowX: "auto", background: "transparent",
  };
  const tab = (on) => ({
    padding: "8px 12px", fontSize: 12, fontWeight: 700,
    color: on ? "#fff" : "var(--gj-grey)",
    background: on ? "var(--gj-teal-deep)" : "#fff",
    border: `1.5px solid ${on ? "var(--gj-teal-deep)" : "var(--gj-line)"}`,
    borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap", minHeight: 36,
    display: "inline-flex", alignItems: "center", gap: 5,
  });

  // === AppCard v1.5 — white + 1.5px stroke + top pill, PAS de left-rail ===
  const list = { display: "flex", flexDirection: "column", gap: 10, padding: "4px 12px 16px" };
  const card = {
    background: "#fff",
    border: "1.5px solid var(--gj-line)",
    borderRadius: 12, padding: 14,
    display: "flex", flexDirection: "column", gap: 10,
  };
  const cardTop = { display: "flex", gap: 12, alignItems: "flex-start" };
  const tile = (bg, fg) => ({
    width: 40, height: 40, borderRadius: 9,
    background: bg, color: fg,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  });
  const topPill = (bg, fg) => ({
    alignSelf: "flex-start",
    fontSize: 11, fontWeight: 800,
    padding: "3px 8px", borderRadius: 999,
    background: bg, color: fg,
    textTransform: "uppercase", letterSpacing: ".4px",
  });
  const sidePill = (bg, fg) => ({
    fontSize: 11, fontWeight: 900,
    padding: "3px 8px", borderRadius: 999,
    background: bg, color: fg,
    textTransform: "uppercase", letterSpacing: ".4px",
    whiteSpace: "nowrap",
  });
  const meta = { fontSize: 11, color: "var(--gj-grey)", display: "flex", flexWrap: "wrap", gap: 8 };

  // Stepper
  const stepper = (states) => (
    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
      {states.map((s, i) => (
        <div key={i} style={{
          flex: 1, height: 5, borderRadius: 3,
          background: s === "done" ? "var(--gj-teal)" : s === "cur" ? "var(--gj-yellow)" : "var(--gj-line)",
        }} />
      ))}
    </div>
  );
  const stepLabels = (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--gj-grey)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>
      <span>Brouillon</span><span>Envoyée</span><span>En revue</span><span>Entretien</span><span>Décision</span>
    </div>
  );

  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Mes candidatures" user="AD" />
      <div style={{ padding: "10px 14px 4px", background: "transparent" }}>
        <div style={{ fontSize: 11, color: "var(--gj-grey)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>5 dossiers · 1 urgent</div>
      </div>
      <div style={body}>
        <div style={tabs}>
          <button style={tab(true)}>Toutes <span style={{ background: "rgba(255,255,255,.2)", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>5</span></button>
          <button style={tab(false)}>À compléter <span style={{ background: "var(--gj-yellow-soft)", color: "var(--gj-yellow-ink)", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>1</span></button>
          <button style={tab(false)}>En cours <span style={{ background: "var(--gj-blue-soft)", color: "var(--gj-blue)", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>2</span></button>
          <button style={tab(false)}>Décidées <span style={{ background: "var(--gj-green-soft)", color: "var(--gj-green)", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>1</span></button>
          <button style={tab(false)}>Archivées</button>
        </div>

        <div style={list}>

          {/* À compléter — urgent */}
          <div style={card}>
            <span style={topPill("var(--gj-red-soft)", "var(--gj-red-ink)")}>URGENT · J-3</span>
            <div style={cardTop}>
              <div style={tile("var(--gj-yellow-soft)", "var(--gj-yellow-ink)")}>
                <svg className="gj-icon gj-icon--md"><use href="#i-agriculture" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>Bourse agricole — maraîchage</div>
                <div style={{ ...meta, marginTop: 3 }}>
                  <span>600 000 F</span><span>·</span><span>Tambacounda</span>
                </div>
              </div>
              <span style={sidePill("var(--gj-yellow-soft)", "var(--gj-yellow-ink)")}>60 %</span>
            </div>
            <div>
              {stepper(["cur", "todo", "todo", "todo", "todo"])}
              {stepLabels}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--gj-yellow-soft)", borderRadius: 8 }}>
              <svg className="gj-icon gj-icon--sm" style={{ color: "var(--gj-yellow-ink)" }}><use href="#i-document" /></svg>
              <div style={{ flex: 1, fontSize: 11.5, color: "var(--gj-yellow-ink)", fontWeight: 700, lineHeight: 1.4 }}>
                Il manque <b>2 documents</b> · plan de culture, CNI verso
              </div>
            </div>
            <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, borderRadius: 10, fontWeight: 800, fontSize: 13, padding: "0 14px", minHeight: 44, cursor: "pointer", fontFamily: "inherit" }}>
              Reprendre le dossier →
            </button>
          </div>

          {/* Envoyée */}
          <div style={card}>
            <span style={topPill("var(--gj-teal-soft)", "var(--gj-teal-deep)")}>ENVOYÉE</span>
            <div style={cardTop}>
              <div style={tile("var(--gj-teal-soft)", "var(--gj-teal-deep)")}>
                <svg className="gj-icon gj-icon--md"><use href="#i-employment" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>Stage Data — Sonatel</div>
                <div style={{ ...meta, marginTop: 3 }}>
                  <span>350 000 F/mois</span><span>·</span><span>Dakar</span><span>·</span><span>Envoyé J-2</span>
                </div>
              </div>
            </div>
            <div>{stepper(["done", "cur", "todo", "todo", "todo"])}{stepLabels}</div>
          </div>

          {/* En revue */}
          <div style={card}>
            <span style={topPill("var(--gj-blue-soft)", "var(--gj-blue)")}>EN REVUE · JURY</span>
            <div style={cardTop}>
              <div style={tile("var(--gj-blue-soft)", "var(--gj-blue)")}>
                <svg className="gj-icon gj-icon--md"><use href="#i-trending" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>Concours Jeunes Entrepreneurs</div>
                <div style={{ ...meta, marginTop: 3 }}>
                  <span>2 500 000 F</span><span>·</span><span>National</span>
                </div>
              </div>
            </div>
            <div>{stepper(["done", "done", "cur", "todo", "todo"])}{stepLabels}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--gj-grey)" }}>
              <svg className="gj-icon gj-icon--xs"><use href="#i-clock" /></svg>
              <span>Revue par le jury · réponse sous 14 jours</span>
            </div>
          </div>

          {/* Entretien */}
          <div style={card}>
            <span style={topPill("var(--gj-blue-soft)", "var(--gj-blue)")}>ENTRETIEN · J-5</span>
            <div style={cardTop}>
              <div style={tile("var(--gj-blue-soft)", "var(--gj-blue)")}>
                <svg className="gj-icon gj-icon--md"><use href="#i-employment" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>Assistante RH — Cabinet Karim&Co</div>
                <div style={{ ...meta, marginTop: 3 }}>
                  <span>Emploi · CDI</span><span>·</span><span>Dakar</span>
                </div>
              </div>
            </div>
            <div>{stepper(["done", "done", "done", "cur", "todo"])}{stepLabels}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--gj-blue-soft)", border: "1.5px solid var(--cat-emploi-soft)", borderRadius: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", color: "var(--gj-blue)", border: "1.5px solid var(--cat-emploi-soft)", display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 800 }}>MAI</span>
                <span style={{ fontSize: 14, fontWeight: 900 }}>28</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-blue-deep)" }}>Jeudi · 14h00</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>Visio Zoom · 30 min · prep par Yaye</div>
              </div>
            </div>
          </div>

          {/* Décidée — acceptée */}
          <div style={card}>
            <span style={topPill("var(--gj-green-soft)", "var(--gj-green-ink)")}>ACCEPTÉE</span>
            <div style={cardTop}>
              <div style={tile("var(--gj-green-soft)", "var(--gj-green)")}>
                <svg className="gj-icon gj-icon--md"><use href="#i-check-circle" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>Bourse mobilité — UCAD</div>
                <div style={{ ...meta, marginTop: 3 }}>
                  <span>Frais + 80 000 F/mois</span><span>·</span><span>Décidée hier</span>
                </div>
              </div>
            </div>
            <div>{stepper(["done", "done", "done", "done", "done"])}{stepLabels}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--gj-green-soft)", borderRadius: 8, color: "var(--gj-green-ink)" }}>
              <svg className="gj-icon gj-icon--sm"><use href="#i-sparkle" /></svg>
              <div style={{ fontSize: 12, fontWeight: 800 }}>Bravo Awa — confirme avant le 1er juin</div>
            </div>
          </div>

        </div>
      </div>
      <BottomNav active="cand" />
    </PhoneFrame>
  );
};

// =====================================================================
// #10 — Yaye conversation plein écran
// =====================================================================
const YayeFullScreen = () => {
  const body = { flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: "12px 14px 8px", display: "flex", flexDirection: "column", gap: 8 };

  // Header
  const head = {
    background: "var(--gj-teal-deep)", color: "#fff",
    padding: "10px 14px 12px", display: "flex", alignItems: "center", gap: 10,
    position: "relative", flexShrink: 0,
  };
  const headRail = {
    position: "absolute", left: 0, right: 0, bottom: 0, height: 3,
    background: "linear-gradient(90deg, var(--gj-yellow) 0%, var(--gj-yellow) 25%, transparent 25%, transparent 100%)",
  };

  const av = {
    width: 38, height: 38, borderRadius: "50%",
    background: "linear-gradient(135deg, #19a657 0%, #027f7e 100%)",
    color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: 19,
    boxShadow: "0 0 0 2px rgba(255,255,255,.25)",
    flexShrink: 0,
  };
  const wordmark = {
    fontWeight: 900, fontSize: 18,
    fontFamily: "var(--gj-font-sans)",
    background: "linear-gradient(135deg, #fff 0%, var(--gj-yellow) 100%)",
    WebkitBackgroundClip: "text", color: "transparent",
  };
  const tBadge = {
    background: "var(--gj-yellow)", color: "var(--gj-ink)",
    fontSize: 11, fontWeight: 900, padding: "2px 6px", borderRadius: 999,
    marginLeft: 6, letterSpacing: ".4px",
  };

  // Bubbles
  const dayChip = {
    alignSelf: "center", fontSize: 11, fontWeight: 800,
    color: "var(--gj-grey)", letterSpacing: ".5px", textTransform: "uppercase",
    background: "#fff", border: "1px solid var(--gj-line)",
    borderRadius: 999, padding: "3px 10px", marginBottom: 4,
  };
  const botGroup = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, marginTop: 4 };
  const userGroup = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, marginTop: 4 };
  const bot = {
    maxWidth: "84%", padding: "10px 14px", borderRadius: 16, borderBottomLeftRadius: 4,
    background: "#fff", border: "1px solid var(--gj-line)",
    fontSize: 14, lineHeight: 1.5, color: "var(--gj-ink)",
  };
  const user = {
    maxWidth: "84%", padding: "10px 14px", borderRadius: 16, borderBottomRightRadius: 4,
    background: "var(--gj-teal-deep)", color: "#fff",
    fontSize: 14, lineHeight: 1.5,
    boxShadow: "0 2px 6px rgba(0,122,92,.18)",
  };
  const srcChip = {
    fontSize: 11, color: "var(--gj-grey)", fontWeight: 600,
    padding: "0 4px", marginTop: 2,
    display: "inline-flex", alignItems: "center", gap: 4,
  };

  // Action card (Yaye "j'ai préparé X pour toi")
  const actionCard = {
    maxWidth: "92%", marginTop: 6,
    background: "#fff", border: "1.5px solid var(--gj-teal)",
    borderRadius: 14, padding: 0, overflow: "hidden",
  };
  const actionHead = {
    background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)",
    padding: "10px 12px",
    display: "flex", alignItems: "center", gap: 8,
    borderBottom: "1px solid var(--gj-line)",
  };
  const actionBody = { padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 10 };
  const actionRow = {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 12.5, color: "var(--gj-ink)",
  };
  const dot = {
    width: 18, height: 18, borderRadius: "50%",
    background: "var(--gj-green-soft)", color: "var(--gj-green)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  // Quick replies
  const optsWrap = { display: "flex", flexDirection: "column", gap: 6, marginTop: 8, alignSelf: "flex-start", maxWidth: "84%" };
  const opt = {
    background: "#fff",
    border: "1.5px solid var(--gj-teal-deep)",
    color: "var(--gj-teal-deep)",
    borderRadius: 999, padding: "10px 14px",
    fontSize: 13, fontWeight: 700,
    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", gap: 6,
    minHeight: 40,
  };

  // Input row
  const inputRow = {
    display: "flex", alignItems: "center", gap: 8,
    padding: 12, background: "#fff",
    borderTop: "1px solid var(--gj-line)",
    flexShrink: 0,
  };
  const inp = {
    flex: 1, border: "1.5px solid var(--gj-line)",
    padding: "10px 14px", fontSize: 14, outline: "none",
    background: "var(--gj-bg)", borderRadius: 999, fontFamily: "inherit",
    minHeight: 44, color: "var(--gj-grey-2)",
  };
  const sendBtn = {
    background: "var(--gj-teal-deep)", color: "#fff",
    border: 0, borderRadius: "50%",
    width: 44, height: 44, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <PhoneFrame bg="var(--gj-bg)">
      <div style={head}>
        <button style={{ width: 36, height: 36, border: 0, background: "transparent", cursor: "pointer", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Retour">
          <svg className="gj-icon"><use href="#i-chevron-left" /></svg>
        </button>
        <div style={av}>Y</div>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
          <div>
            <span style={wordmark}>Yaye</span>
            <span style={tBadge}>IA</span>
          </div>
          <div style={{ fontSize: 11, opacity: .9, display: "inline-flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#19a657", boxShadow: "0 0 0 0 rgba(123,229,181,.7)", animation: "gj-pulse-live 1.8s ease-out infinite" }} />
            en ligne · agit sur ton compte
          </div>
        </div>
        <button style={{ width: 36, height: 36, border: 0, background: "transparent", cursor: "pointer", color: "rgba(255,255,255,.85)" }} aria-label="Options">
          <svg className="gj-icon"><use href="#i-more-vertical" /></svg>
        </button>
        <div style={headRail} />
      </div>

      <div style={body}>
        <div style={dayChip}>Aujourd'hui · 9:41</div>

        <div style={botGroup}>
          <div style={bot}>Salama Awa. J'ai 3 opportunités à 90%+ match pour toi à Tambacounda — toutes en agri / projet.</div>
          <div style={srcChip}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gj-teal-deep)" }} />
            Source · Catalogue Guichet · maj 2 min
          </div>
        </div>

        <div style={userGroup}>
          <div style={user}>Trouve-moi un stage en agro, près de chez moi, payé.</div>
        </div>

        <div style={botGroup}>
          <div style={bot}>Reçu. J'ai filtré 247 offres → 2 collent vraiment. Je te montre&nbsp;?</div>
        </div>

        {/* Action card — Yaye a fait l'action */}
        <div style={botGroup}>
          <div style={actionCard}>
            <div style={actionHead}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--gj-teal)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg className="gj-icon gj-icon--sm"><use href="#i-check" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--gj-teal-deep)", textTransform: "uppercase", letterSpacing: ".3px" }}>Yaye a agi pour toi</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>3 actions · à valider</div>
              </div>
            </div>
            <div style={actionBody}>
              <div style={actionRow}>
                <span style={dot}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg></span>
                Préselection · <b>Stage agronomie / Coopérative régionale</b> · 180 000 F
              </div>
              <div style={actionRow}>
                <span style={dot}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg></span>
                Préselection · <b>Assistant maraîcher / GIE Diaobé</b> · 150 000 F
              </div>
              <div style={actionRow}>
                <span style={dot}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-document" /></svg></span>
                CV adapté en brouillon — relu en 30 s
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, borderRadius: 10, fontWeight: 800, fontSize: 12, padding: "10px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                  Voir les 2 offres
                </button>
                <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", borderRadius: 10, fontWeight: 700, fontSize: 12, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                  Postule les 2
                </button>
              </div>
            </div>
          </div>
          <div style={srcChip}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gj-teal-deep)" }} />
            2 sources · vérifié il y a 1 min
          </div>
        </div>

        {/* Quick replies */}
        <div style={optsWrap}>
          <button style={opt}>Voir les 2 offres en détail <span style={{ marginLeft: "auto", opacity: .55 }}>→</span></button>
          <button style={opt}>Élargis à Kédougou aussi <span style={{ marginLeft: "auto", opacity: .55 }}>→</span></button>
          <button style={opt}>Tu peux postuler pour moi&nbsp;? <span style={{ marginLeft: "auto", opacity: .55 }}>→</span></button>
        </div>
      </div>

      <div style={inputRow}>
        <button style={{ width: 40, height: 40, border: 0, background: "transparent", cursor: "pointer", color: "var(--gj-grey)" }} aria-label="Joindre">
          <svg className="gj-icon"><use href="#i-attach" /></svg>
        </button>
        <div style={inp}>Tape un message à Yaye…</div>
        {/* Saisie vocale retirée pour l'instant : la barre n'accepte que l'écrit. */}
        <button style={sendBtn} aria-label="Envoyer">
          <svg className="gj-icon" style={{ width: 18, height: 18, color: "#fff" }}><use href="#i-arrow-up" /></svg>
        </button>
      </div>
    </PhoneFrame>
  );
};

// =====================================================================
// #13 — Centre de notifications
// =====================================================================
const NotificationsScreen = () => {
  const body = { flex: 1, overflowY: "auto", background: "var(--gj-bg)" };

  // tabs
  const tabRow = {
    display: "flex", gap: 6, padding: "10px 12px 8px",
    overflowX: "auto", background: "transparent",
  };
  const tab = (on, label, num, color) => ({
    padding: "8px 12px", fontSize: 12, fontWeight: 700,
    color: on ? "#fff" : "var(--gj-grey)",
    background: on ? "var(--gj-teal-deep)" : "#fff",
    border: `1.5px solid ${on ? "var(--gj-teal-deep)" : "var(--gj-line)"}`,
    borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap", minHeight: 36,
    display: "inline-flex", alignItems: "center", gap: 5,
  });

  // group header
  const groupHead = {
    fontSize: 11, fontWeight: 800,
    color: "var(--gj-grey)", textTransform: "uppercase",
    letterSpacing: ".5px",
    padding: "12px 14px 6px",
  };

  // notification row
  const list = { display: "flex", flexDirection: "column", background: "#fff", borderTop: "1px solid var(--gj-line)", borderBottom: "1px solid var(--gj-line)" };
  const item = (unread) => ({
    display: "flex", gap: 12, alignItems: "flex-start",
    padding: "14px 14px",
    background: unread ? "rgba(0,159,118,.04)" : "#fff",
    borderBottom: "1px solid var(--gj-line)",
    position: "relative",
  });
  const tile = (bg, fg) => ({
    width: 40, height: 40, borderRadius: 10,
    background: bg, color: fg,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  });
  const dot = {
    position: "absolute", left: 6, top: 24,
    width: 6, height: 6, borderRadius: "50%",
    background: "var(--gj-teal-deep)",
  };
  const tStrong = { fontSize: 13.5, fontWeight: 800, lineHeight: 1.3 };
  const tBody = { fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.45, marginTop: 2 };
  const tMeta = { fontSize: 11, color: "var(--gj-grey-2)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 6 };

  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Notifications" user="AD" />
      <div style={{ padding: "10px 14px 0", background: "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "var(--gj-grey)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>3 non lues</div>
        <button style={{ border: 0, background: "transparent", color: "var(--gj-teal-deep)", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 11, padding: 4 }}>
          Tout marquer lu
        </button>
      </div>
      <div style={body}>

        <div style={tabRow}>
          <button style={tab(true)}>Toutes <span style={{ background: "rgba(255,255,255,.2)", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>12</span></button>
          <button style={tab(false)}>Deadlines <span style={{ background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>2</span></button>
          <button style={tab(false)}>Candidatures <span style={{ background: "var(--gj-blue-soft)", color: "var(--gj-blue)", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>4</span></button>
          <button style={tab(false)}>Messages <span style={{ background: "var(--gj-bg)", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>3</span></button>
          <button style={tab(false)}>Yaye</button>
        </div>

        {/* TODAY */}
        <div style={groupHead}>Aujourd'hui</div>
        <div style={list}>
          {/* Urgent J-3 */}
          <div style={item(true)}>
            <span style={dot} />
            <div style={tile("var(--gj-red-soft)", "var(--gj-red-ink)")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-flame" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tStrong}>Plus que 3 jours · Bourse agricole</div>
              <div style={tBody}>Ton dossier est à 60 %. Il manque 2 documents avant clôture.</div>
              <div style={tMeta}>
                <span style={{ background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", padding: "1px 6px", borderRadius: 999, fontWeight: 800 }}>J-3</span>
                <span>il y a 12 min</span>
              </div>
            </div>
          </div>

          {/* Entretien */}
          <div style={item(true)}>
            <span style={dot} />
            <div style={tile("var(--gj-blue-soft)", "var(--gj-blue)")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-calendar" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tStrong}>Entretien confirmé · Cabinet Karim&Co</div>
              <div style={tBody}>Jeudi 28 mai · 14h00 · Visio Zoom. Yaye t'a préparé un brief.</div>
              <div style={tMeta}>
                <span style={{ background: "var(--gj-blue-soft)", color: "var(--gj-blue)", padding: "1px 6px", borderRadius: 999, fontWeight: 800 }}>RDV</span>
                <span>il y a 1 h</span>
              </div>
            </div>
          </div>

          {/* Yaye action */}
          <div style={item(true)}>
            <span style={dot} />
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #19a657 0%, #027f7e 100%)",
              color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: 19,
              flexShrink: 0,
            }}>Y</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tStrong}>Yaye a trouvé 2 nouvelles offres pour toi</div>
              <div style={tBody}>Stage agronomie · 180 000 F · Tambacounda. À valider avant de postuler.</div>
              <div style={tMeta}>
                <span style={{ background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", padding: "1px 6px", borderRadius: 999, fontWeight: 800 }}>YAYE</span>
                <span>il y a 2 h</span>
              </div>
            </div>
          </div>
        </div>

        {/* HIER */}
        <div style={groupHead}>Hier</div>
        <div style={list}>
          <div style={item(false)}>
            <div style={tile("var(--gj-green-soft)", "var(--gj-green)")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-check-circle" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tStrong}><svg className="gj-icon gj-icon--xs" style={{ color: "var(--gj-green)", marginRight: 4 }}><use href="#i-sparkle" /></svg>Bourse mobilité UCAD — Acceptée</div>
              <div style={tBody}>Réponse positive du jury. Confirme avant le 1er juin.</div>
              <div style={tMeta}>
                <span style={{ background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", padding: "1px 6px", borderRadius: 999, fontWeight: 800 }}>DÉCISION</span>
                <span>hier · 18:24</span>
              </div>
            </div>
          </div>

          <div style={item(false)}>
            <div style={tile("var(--gj-blue-soft)", "var(--gj-blue)")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-chat" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tStrong}>Mariama, conseillère CJS Tamba</div>
              <div style={tBody}>« Awa, je peux te recevoir vendredi 10h pour ton dossier… »</div>
              <div style={tMeta}>
                <span style={{ background: "var(--gj-blue-soft)", color: "var(--gj-blue)", padding: "1px 6px", borderRadius: 999, fontWeight: 800 }}>MESSAGE</span>
                <span>hier · 16:02</span>
              </div>
            </div>
          </div>

          <div style={item(false)}>
            <div style={tile("var(--gj-yellow-soft)", "var(--gj-yellow-ink)")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-target" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tStrong}>Atelier CV à Tambacounda · samedi 10h</div>
              <div style={tBody}>5 places restantes. Le centre CJS Tamba t'invite.</div>
              <div style={tMeta}>
                <span style={{ background: "var(--gj-yellow-soft)", color: "var(--gj-yellow-ink)", padding: "1px 6px", borderRadius: 999, fontWeight: 800 }}>ATELIER</span>
                <span>hier · 09:18</span>
              </div>
            </div>
          </div>
        </div>

        {/* CETTE SEMAINE */}
        <div style={groupHead}>Cette semaine</div>
        <div style={list}>
          <div style={item(false)}>
            <div style={tile("var(--gj-teal-soft)", "var(--gj-teal-deep)")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-document" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tStrong}>Stage Data Sonatel · candidature reçue</div>
              <div style={tBody}>Sonatel a bien reçu ton dossier. Réponse sous 14 jours ouvrés.</div>
              <div style={tMeta}>
                <span style={{ background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", padding: "1px 6px", borderRadius: 999, fontWeight: 800 }}>CANDIDATURE</span>
                <span>lun. 14:11</span>
              </div>
            </div>
          </div>
          <div style={item(false)}>
            <div style={tile("var(--gj-bg)", "var(--gj-grey)")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-info" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tStrong}>Profil complet à 72 %</div>
              <div style={tBody}>Ajoute ton CV pour débloquer 3× plus d'opportunités.</div>
              <div style={tMeta}>
                <span style={{ background: "var(--gj-bg)", color: "var(--gj-grey)", padding: "1px 6px", borderRadius: 999, fontWeight: 800 }}>PROFIL</span>
                <span>lun. 09:05</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 24 }} />
      </div>
      <BottomNav active={null} />
    </PhoneFrame>
  );
};

Object.assign(window, { CandidaturesPipeline, YayeFullScreen, NotificationsScreen });
