/* eslint-disable */
// F1 — Inscription & Onboarding · version WEB (desktop).
// Each screen targets ~1280×800 artboard.

// ===========================================================
// Shared web chrome
// ===========================================================
const WebOnboardingNav = ({ step, total, hideStepper }) => {
  const wrap = {
    background: "#fff",
    borderBottom: "1px solid var(--gj-line)",
    padding: "12px 32px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    minHeight: 64, flexShrink: 0,
  };
  const dots = { display: "flex", gap: 6, alignItems: "center", flex: 1, justifyContent: "center" };
  const dot = (on, done) => ({
    width: on ? 28 : 8, height: 8, borderRadius: 999,
    background: done ? "var(--gj-teal-deep)" : on ? "var(--gj-teal)" : "var(--gj-line)",
    transition: "all .25s ease",
  });
  return (
    <div style={wrap}>
      <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 30, flexShrink: 0 }} />
      {!hideStepper && (
        <div style={dots}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={dot(i === step, i < step)} />
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: "var(--gj-grey)" }}>Déjà inscrit&nbsp;?</span>
        <button style={{
          background: "#fff", border: "1.5px solid var(--gj-line)",
          color: "var(--gj-teal-deep)", padding: "8px 16px",
          borderRadius: 8, fontWeight: 800, fontSize: 13,
          fontFamily: "inherit", cursor: "pointer",
        }}>Se connecter</button>
      </div>
    </div>
  );
};

const FieldLabelW = ({ children, required }) => (
  <label style={{
    fontSize: 11, fontWeight: 800,
    color: "var(--gj-ink)",
    display: "flex", alignItems: "center", gap: 4,
    textTransform: "uppercase", letterSpacing: ".5px",
    marginBottom: 6,
  }}>
    {children}
    {required && <span style={{ color: "var(--gj-red)" }}>*</span>}
  </label>
);
const InputW = ({ value, placeholder, type = "text", prefix }) => (
  <div style={{
    display: "flex", alignItems: "center",
    border: "1.5px solid var(--gj-line)",
    borderRadius: 10, background: "#fff",
    minHeight: 50, overflow: "hidden",
  }}>
    {prefix && (
      <div style={{ padding: "0 14px", fontSize: 14, fontWeight: 700, color: "var(--gj-ink)", borderRight: "1.5px solid var(--gj-line)", height: "100%", display: "inline-flex", alignItems: "center", gap: 6 }}>
        {prefix}
      </div>
    )}
    <input
      defaultValue={value}
      placeholder={placeholder}
      type={type}
      style={{
        flex: 1, border: 0, outline: "none",
        fontSize: 15, padding: "0 14px",
        fontFamily: "inherit", color: "var(--gj-ink)",
        background: "transparent", height: 48,
      }}
    />
  </div>
);

// ===========================================================
// SCREEN W1 — Landing
// ===========================================================
const WebOnboard1Landing = () => {
  const root = { display: "flex", flexDirection: "column", height: "100%", background: "#fff" };

  const top = {
    background: "#fff", borderBottom: "1px solid var(--gj-line)",
    padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between",
    minHeight: 70, flexShrink: 0,
  };
  const navLinks = { display: "flex", gap: 24, flex: 1, justifyContent: "center" };
  const navLink = { fontSize: 13.5, color: "var(--gj-grey)", fontWeight: 600, cursor: "pointer" };

  const hero = {
    flex: 1, position: "relative", overflow: "hidden",
    background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)",
    color: "#fff",
    display: "grid", gridTemplateColumns: "1.1fr 1fr",
    gap: 40, padding: "60px 64px",
  };
  const glow = {
    position: "absolute", right: -100, top: -120,
    width: 540, height: 540,
    background: "radial-gradient(circle, rgba(248,163,9,.22) 0%, transparent 60%)",
    pointerEvents: "none",
  };

  const eyebrow = {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontSize: 11, fontWeight: 800,
    background: "rgba(248,163,9,.22)", color: "var(--gj-yellow)",
    padding: "6px 12px", borderRadius: 999,
    letterSpacing: ".5px", textTransform: "uppercase",
    alignSelf: "flex-start", position: "relative",
  };
  const h1 = {
    fontSize: 56, fontWeight: 900, lineHeight: 1.05,
    marginTop: 22, position: "relative", letterSpacing: "-1.2px",
  };
  const lead = {
    fontSize: 17, lineHeight: 1.55, marginTop: 18,
    opacity: .9, maxWidth: 540, position: "relative",
  };
  const ctaRow = { display: "flex", gap: 12, marginTop: 32, position: "relative" };
  const ctaPri = {
    background: "var(--gj-yellow)", color: "var(--gj-ink)",
    border: 0, fontWeight: 900, fontSize: 15,
    padding: "0 24px", minHeight: 56, borderRadius: 12,
    cursor: "pointer", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", gap: 8,
  };
  const ctaGhost = {
    background: "rgba(255,255,255,.08)", color: "#fff",
    border: "1.5px solid rgba(255,255,255,.3)",
    fontWeight: 700, fontSize: 14,
    padding: "0 24px", minHeight: 56, borderRadius: 12,
    cursor: "pointer", fontFamily: "inherit",
  };
  const stats = {
    display: "flex", gap: 32, marginTop: 40,
    position: "relative",
    borderTop: "1px solid rgba(255,255,255,.18)", paddingTop: 24,
  };
  const stat = { display: "flex", flexDirection: "column", gap: 2 };
  const statN = { fontSize: 28, fontWeight: 900, color: "var(--gj-yellow)" };
  const statL = { fontSize: 11, opacity: .8, textTransform: "uppercase", letterSpacing: ".4px" };

  // Right side — hero card stack (mock photo + testimonial + opp preview)
  const heroSide = { display: "flex", flexDirection: "column", gap: 14, position: "relative" };
  const photoCard = {
    height: 220, borderRadius: 18,
    background: "linear-gradient(135deg, #C49A5A 0%, #7A5C3A 100%)",
    position: "relative", overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,.35)",
  };
  const photoOverlay = {
    position: "absolute", inset: 0,
    background: "linear-gradient(180deg, transparent 30%, rgba(10,40,32,.7) 100%)",
  };
  const photoTitle = {
    position: "absolute", left: 22, bottom: 18, right: 22,
    color: "#fff", fontSize: 13, fontWeight: 700,
  };
  const oppCard = {
    background: "#fff", borderRadius: 14, padding: 18,
    color: "var(--gj-ink)",
    boxShadow: "0 20px 50px rgba(0,0,0,.25)",
    transform: "translateY(-40px) translateX(-30px)",
    display: "flex", flexDirection: "column", gap: 8,
    width: 320,
  };
  const oppTag = {
    alignSelf: "flex-start", fontSize: 11, fontWeight: 800,
    background: "var(--gj-red-soft)", color: "var(--gj-red-ink)",
    padding: "3px 8px", borderRadius: 999, letterSpacing: ".4px",
  };
  const testCard = {
    background: "rgba(255,255,255,.08)",
    border: "1.5px solid rgba(255,255,255,.18)",
    borderRadius: 14, padding: 16,
    display: "flex", gap: 12, alignItems: "center",
    backdropFilter: "blur(4px)",
    transform: "translateY(-30px)",
  };

  return (
    <div style={root}>
      <div style={top}>
        <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 32 }} />
        <div style={navLinks}>
          <span style={navLink}>Opportunités</span>
          <span style={navLink}>Comment ça marche</span>
          <span style={navLink}>Centres CJS</span>
          <span style={navLink}>FAQ</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={{ background: "transparent", border: 0, fontSize: 13.5, fontWeight: 700, color: "var(--gj-grey)", cursor: "pointer", fontFamily: "inherit" }}>Se connecter</button>
          <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line-strong)", padding: "10px 18px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Créer mon compte →</button>
        </div>
      </div>

      <div style={hero}>
        <span style={glow} />
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={eyebrow}>
            <svg className="gj-icon gj-icon--xs" aria-hidden="true"><use href="#i-sparkle" /></svg>
            Le guichet unique du CJS
          </div>
          <h1 style={h1}>Accédez aux opportunités d'<b style={{ color: "var(--gj-yellow)" }}>emploi</b>, de <b style={{ color: "var(--gj-yellow)" }}>formation</b> et de <b style={{ color: "var(--gj-yellow)" }}>financement</b>.</h1>
          <p style={lead}>
            Pour les <b>16–35 ans, partout au Sénégal</b>. Gratuit. Yaye vous accompagne en français ou en Wolof.
          </p>
          <div style={ctaRow}>
            <button style={ctaPri}>
              Explorer les opportunités
              <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-arrow-right" /></svg>
            </button>
            <button style={{ ...ctaGhost, background: "transparent", border: 0, textDecoration: "underline", textUnderlineOffset: 3, padding: "0 4px" }}>Créer mon compte · ou continuer avec WhatsApp</button>
          </div>
          <div style={stats}>
            <div style={stat}><span style={statN}>22 695</span><span style={statL}>Jeunes inscrits</span></div>
            <div style={stat}><span style={statN}>1 240</span><span style={statL}>Opps actives</span></div>
            <div style={stat}><span style={statN}>14</span><span style={statL}>Régions</span></div>
            <div style={stat}><span style={statN}>9</span><span style={statL}>Centres CJS</span></div>
          </div>
        </div>

        <div style={heroSide}>
          <div style={photoCard}>
            <image-slot id="l2-hero-aissatou" shape="rect" fit="cover" placeholder="Photo réelle — Aïssatou, 23 ans, maraîchage à Thiès"></image-slot>
            <div style={{ ...photoOverlay, pointerEvents: "none" }} />
            <div style={{ ...photoTitle, pointerEvents: "none" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-yellow)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>Aïssatou · 23 ans · Thiès</div>
              « Grâce au Guichet, j'ai trouvé mon stage en agronomie en 3 semaines. »
            </div>
          </div>

          <div style={oppCard}>
            <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
              <span style={{ ...oppTag, background: "var(--cat-financement-soft)", color: "var(--cat-financement-ink)", textTransform: "uppercase" }}>Financement</span>
              <span style={{ ...oppTag, background: "var(--gj-red)", color: "#fff" }}>J-3</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--gj-yellow-soft)", color: "var(--gj-yellow-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg className="gj-icon gj-icon--md"><use href="#i-agriculture" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>Bourse agricole — maraîchage</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>600 000 FCFA · Tambacounda</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--gj-green)" }}>
              <svg className="gj-icon gj-icon--xs"><use href="#i-sparkle" /></svg>
              94% match avec ton profil
            </div>
          </div>

          <div style={testCard}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #19a657, #027f7e)",
              color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: 18, flexShrink: 0,
            }}>Y</div>
            <div style={{ flex: 1, color: "#fff" }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>
                <span style={{ background: "linear-gradient(135deg,#fff,var(--gj-yellow))", WebkitBackgroundClip: "text", color: "transparent", fontFamily: "var(--gj-font-sans)" }}>Yaye</span>
                <span style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "1px 6px", borderRadius: 999, marginLeft: 6 }}>IA</span>
              </div>
              <div style={{ fontSize: 12, opacity: .9, marginTop: 2, lineHeight: 1.45 }}>« Dis-moi ce que tu cherches — je m'occupe du reste. »</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================================
// SCREEN W2 — Inscription téléphone + OTP
// ===========================================================
const WebOnboard2Phone = () => {
  const root = { display: "flex", flexDirection: "column", height: "100%", background: "var(--gj-bg)" };

  const split = {
    flex: 1,
    display: "grid", gridTemplateColumns: "1fr 1fr",
    overflow: "hidden",
  };
  const leftPane = {
    background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)",
    color: "#fff",
    padding: 60, position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column", justifyContent: "center",
  };
  const glow = {
    position: "absolute", left: -80, top: -100,
    width: 380, height: 380,
    background: "radial-gradient(circle, rgba(248,163,9,.18) 0%, transparent 60%)",
  };
  const rightPane = {
    background: "#fff", padding: "48px 80px",
    display: "flex", flexDirection: "column", justifyContent: "center", gap: 18,
    maxWidth: 640, margin: "0 auto", width: "100%",
  };

  const featureRow = { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, position: "relative" };
  const featureNum = {
    width: 32, height: 32, borderRadius: 8,
    background: "var(--gj-yellow)", color: "var(--gj-ink)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: 14, flexShrink: 0,
  };
  const featT = { fontSize: 14, fontWeight: 800, color: "#fff" };
  const featS = { fontSize: 12.5, color: "rgba(255,255,255,.75)", marginTop: 2, lineHeight: 1.5 };

  // OTP cells
  const otpRow = { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, maxWidth: 380 };
  const otpCell = (val, focus) => ({
    height: 60, borderRadius: 10,
    border: `1.5px solid ${focus ? "var(--gj-teal-deep)" : "var(--gj-line)"}`,
    boxShadow: focus ? "0 0 0 3px rgba(0,178,135,.18)" : "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 26, fontWeight: 900, background: "#fff",
    color: val ? "var(--gj-ink)" : "var(--gj-grey-2)",
  });

  return (
    <div style={root}>
      <WebOnboardingNav step={0} total={4} />
      <div style={split}>
        <div style={leftPane}>
          <span style={glow} />
          <div style={{ position: "relative" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11, fontWeight: 800, background: "rgba(248,163,9,.22)",
              color: "var(--gj-yellow)", padding: "5px 10px", borderRadius: 999,
              letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 18,
            }}>Inscription · 90 secondes</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-.5px", marginBottom: 16 }}>
              Crée ton compte en 4 étapes simples.
            </h2>
            <p style={{ fontSize: 14, opacity: .85, lineHeight: 1.55, marginBottom: 36 }}>
              Pas de paperasse, pas de carte de crédit. Juste ton numéro sénégalais.
            </p>

            <div style={featureRow}>
              <div style={featureNum}>1</div>
              <div>
                <div style={featT}>Vérifie ton numéro</div>
                <div style={featS}>Code par SMS ou WhatsApp · gratuit</div>
              </div>
            </div>
            <div style={featureRow}>
              <div style={featureNum}>2</div>
              <div>
                <div style={featT}>Dis-nous ce que tu cherches</div>
                <div style={featS}>Emploi, projet, formation, agri…</div>
              </div>
            </div>
            <div style={featureRow}>
              <div style={featureNum}>3</div>
              <div>
                <div style={featT}>Complète ton profil</div>
                <div style={featS}>Nom, âge, région. 3 questions, pas plus.</div>
              </div>
            </div>
            <div style={featureRow}>
              <div style={featureNum}>4</div>
              <div>
                <div style={featT}>Découvre tes opps</div>
                <div style={featS}>Yaye te montre les 3 meilleures pour toi.</div>
              </div>
            </div>
          </div>
        </div>

        <div style={rightPane}>
          <h2 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, color: "var(--gj-ink)" }}>
            Ton numéro sénégalais
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--gj-grey)", lineHeight: 1.5 }}>
            Un seul compte pour tout le Guichet. Code SMS gratuit, valable 10 min.
          </p>

          <div>
            <FieldLabelW required>Numéro de téléphone</FieldLabelW>
            <InputW value="77 654 32 10" type="tel" prefix={<><SnFlag size={16} /><span>+221</span></>} />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[
                { c: "var(--gj-yellow-deep)", n: "orange", r: "77 · 78", on: true },
                { c: "#CE0F69", n: "free", r: "76", on: false },
                { c: "#E60000", n: "expresso", r: "70", on: false },
              ].map((o, i) => (
                <button key={i} style={{
                  flex: 1, padding: "10px 8px",
                  border: `1.5px solid ${o.on ? o.c : "var(--gj-line)"}`,
                  background: o.on ? "rgba(0,159,118,.04)" : "#fff",
                  borderRadius: 10, fontFamily: "inherit", cursor: "pointer",
                  fontSize: 11, fontWeight: 800,
                  display: "flex", flexDirection: "column", gap: 2, alignItems: "center",
                }}>
                  <span style={{ color: o.c }}>{o.n}</span>
                  <span style={{ fontSize: 11, color: "var(--gj-grey)" }}>{o.r}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{
            background: "var(--gj-bg)", borderRadius: 12,
            border: "1.5px solid var(--gj-line)",
            padding: 18, marginTop: 4,
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--gj-green-soft)", color: "var(--gj-green)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg className="gj-icon gj-icon--sm"><use href="#i-check-circle" /></svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Code envoyé — saisis-le ici</div>
            </div>
            <div style={otpRow}>
              <div style={otpCell("3", false)}>3</div>
              <div style={otpCell("9", false)}>9</div>
              <div style={otpCell("2", false)}>2</div>
              <div style={otpCell("7", true)}>7</div>
              <div style={otpCell("", false)}></div>
              <div style={otpCell("", false)}></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--gj-grey)" }}>
              <span>Renvoyer dans <b>0:48</b></span>
              <span style={{ color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Modifier le numéro</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={{
              flex: 1, background: "var(--gj-teal-deep)", color: "#fff",
              border: 0, padding: "0 24px", minHeight: 54, borderRadius: 10,
              fontWeight: 900, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              Vérifier le code <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
            </button>
            <button style={{
              background: "var(--gj-whatsapp)", color: "#fff",
              border: 0, padding: "0 18px", minHeight: 54, borderRadius: 10,
              fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <svg className="gj-icon gj-icon--sm"><use href="#i-chat" /></svg>
              Via WhatsApp
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", lineHeight: 1.5, marginTop: 6 }}>
            En continuant, tu acceptes les <a style={{ color: "var(--gj-teal-deep)", fontWeight: 700, cursor: "pointer" }}>CGU</a> et la <a style={{ color: "var(--gj-teal-deep)", fontWeight: 700, cursor: "pointer" }}>charte de confidentialité</a>. Tes données restent au Sénégal.
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================================
// SCREEN W3 — Choix objectif (centered grid)
// ===========================================================
const WebOnboard3Goal = () => {
  const root = { display: "flex", flexDirection: "column", height: "100%", background: "var(--gj-bg)" };
  const main = {
    flex: 1, overflowY: "auto",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "48px 24px 40px",
  };
  const card = {
    background: "#fff", border: "1.5px solid var(--gj-line)",
    borderRadius: 18, padding: "40px 56px",
    width: "min(900px, 100%)",
    boxShadow: "0 4px 24px rgba(0,0,0,.04)",
    display: "flex", flexDirection: "column", gap: 24,
  };
  const yayeBar = {
    background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)",
    border: "1.5px solid var(--gj-line)",
    borderRadius: 14, padding: 18,
    display: "flex", gap: 14, alignItems: "center",
  };
  const opts = [
    { id: "emploi", icon: "i-employment", label: "Trouver un emploi / stage", sub: "850 opps actives · CDI, CDD, stages, alternances", accent: "teal", on: true },
    { id: "projet", icon: "i-project", label: "Lancer mon projet", sub: "Financements, accompagnement, incubation", accent: "yellow", on: true },
    { id: "format", icon: "i-learning", label: "Me former", sub: "Bourses d'études, cursus, certifications", accent: "blue", on: false },
    { id: "agri", icon: "i-agriculture", label: "Travailler dans l'agriculture", sub: "Maraîchage, élevage, transformation", accent: "green", on: false },
    { id: "engage", icon: "i-engagement", label: "M'engager dans une cause", sub: "Volontariat, civisme, solidarité", accent: "teal", on: false },
    { id: "bourse", icon: "i-funding", label: "Décrocher une bourse", sub: "Mobilité, étude, recherche", accent: "yellow", on: false },
  ];
  const optGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const optCard = (o) => ({
    background: o.on ? "rgba(0,159,118,.04)" : "#fff",
    border: `1.5px solid ${o.on ? "var(--gj-teal)" : "var(--gj-line)"}`,
    borderRadius: 12, padding: 18,
    display: "flex", alignItems: "center", gap: 14,
    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
    transition: "all .15s ease",
  });
  const tile = (accent) => ({
    width: 48, height: 48, borderRadius: 10,
    background: `var(--gj-${accent}-soft)`,
    color: accent === "yellow" ? "var(--gj-yellow-ink)" : `var(--gj-${accent})`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <div style={root}>
      <WebOnboardingNav step={1} total={4} />
      <div style={main}>
        <div style={card}>
          <div style={yayeBar}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "linear-gradient(135deg, #19a657, #027f7e)",
              color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: 22, flexShrink: 0,
            }}>Y</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-teal-deep)" }}>Salama Awa — c'est Yaye.</div>
              <div style={{ fontSize: 13, color: "var(--gj-grey)", lineHeight: 1.5, marginTop: 2 }}>
                Dis-moi ce qui t'intéresse pour que je te propose les bonnes opportunités.
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, color: "var(--gj-ink)", letterSpacing: "-.4px" }}>
              C'est quoi ton objectif ?
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 6 }}>
              Coche un ou plusieurs choix. Tu pourras tout changer plus tard.
            </p>
          </div>

          <div style={optGrid}>
            {opts.map(o => (
              <button key={o.id} style={optCard(o)}>
                <div style={tile(o.accent)}>
                  <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + o.icon} /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{o.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.4 }}>{o.sub}</div>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  border: `1.5px solid ${o.on ? "var(--gj-teal)" : "var(--gj-line)"}`,
                  background: o.on ? "var(--gj-teal)" : "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", flexShrink: 0,
                }}>
                  {o.on && <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-check" /></svg>}
                </div>
              </button>
            ))}
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 12, borderTop: "1px solid var(--gj-line)",
          }}>
            <span style={{ fontSize: 13, color: "var(--gj-grey)" }}>
              <b style={{ color: "var(--gj-teal-deep)" }}>2 sélectionnés</b> · tu peux en choisir plus
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{
                background: "#fff", color: "var(--gj-grey)",
                border: "1.5px solid var(--gj-line)", padding: "0 22px", minHeight: 50,
                borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}>Passer</button>
              <button style={{
                background: "var(--gj-teal-deep)", color: "#fff",
                border: 0, padding: "0 24px", minHeight: 50,
                borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                Continuer <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================================
// SCREEN W4 — Profil minimal
// ===========================================================
const WebOnboard4Profile = () => {
  const root = { display: "flex", flexDirection: "column", height: "100%", background: "var(--gj-bg)" };
  const main = {
    flex: 1, overflowY: "auto",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "48px 24px 40px",
  };
  const card = {
    background: "#fff", border: "1.5px solid var(--gj-line)",
    borderRadius: 18, padding: "40px 56px",
    width: "min(820px, 100%)",
    boxShadow: "0 4px 24px rgba(0,0,0,.04)",
    display: "flex", flexDirection: "column", gap: 22,
  };
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const regions = ["Dakar", "Thiès", "Diourbel", "Saint-Louis", "Tambacounda", "Kédougou", "Ziguinchor", "Kolda", "Fatick", "Kaolack", "Matam", "Louga", "Sédhiou", "Kaffrine"];
  const chip = (on, label) => (
    <button key={label} style={{
      background: on ? "var(--gj-teal-soft)" : "#fff",
      border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
      color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
      borderRadius: 999, padding: "8px 14px",
      fontSize: 13, fontWeight: on ? 800 : 600,
      cursor: "pointer", fontFamily: "inherit", minHeight: 38,
    }}>{label}</button>
  );

  return (
    <div style={root}>
      <WebOnboardingNav step={2} total={4} />
      <div style={main}>
        <div style={card}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, color: "var(--gj-ink)", letterSpacing: "-.4px" }}>Qui es-tu&nbsp;?</h2>
            <p style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 6, lineHeight: 1.5 }}>
              Tes infos restent privées. Tu choisis ce que les recruteurs voient.
            </p>
          </div>

          <div style={grid2}>
            <div>
              <FieldLabelW required>Prénom</FieldLabelW>
              <InputW value="Awa" />
            </div>
            <div>
              <FieldLabelW required>Nom</FieldLabelW>
              <InputW value="Diop" />
            </div>
          </div>

          <div style={grid2}>
            <div>
              <FieldLabelW required>Année de naissance</FieldLabelW>
              <InputW value="2003" type="number" />
            </div>
            <div>
              <FieldLabelW required>Je suis</FieldLabelW>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ k: "F", l: "Femme", on: true }, { k: "H", l: "Homme", on: false }, { k: "N", l: "Non précisé", on: false }].map(g => (
                  <button key={g.k} style={{
                    flex: 1, background: g.on ? "var(--gj-teal-soft)" : "#fff",
                    border: `1.5px solid ${g.on ? "var(--gj-teal)" : "var(--gj-line)"}`,
                    color: g.on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
                    borderRadius: 10, fontSize: 14, fontWeight: g.on ? 800 : 600,
                    cursor: "pointer", fontFamily: "inherit", minHeight: 50,
                  }}>{g.l}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--gj-line)" }} />

          <div>
            <FieldLabelW required>Région de résidence</FieldLabelW>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {regions.map(r => chip(r === "Tambacounda", r))}
            </div>
          </div>

          <div style={grid2}>
            <div>
              <FieldLabelW>Commune <span style={{ fontSize: 11, color: "var(--gj-grey-2)", marginLeft: 4 }}>FACULTATIF</span></FieldLabelW>
              <InputW value="" placeholder="ex. Bakel, Kidira, Goudiry…" />
            </div>
            <div>
              <FieldLabelW>Niveau d'études <span style={{ fontSize: 11, color: "var(--gj-grey-2)", marginLeft: 4 }}>FACULTATIF</span></FieldLabelW>
              <InputW value="Bac + 2 (BTS, DUT, Licence 2…)" />
            </div>
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 12, borderTop: "1px solid var(--gj-line)",
          }}>
            <button style={{
              background: "transparent", border: 0, color: "var(--gj-grey)",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <svg className="gj-icon gj-icon--sm"><use href="#i-chevron-left" /></svg> Retour
            </button>
            <button style={{
              background: "var(--gj-teal-deep)", color: "#fff",
              border: 0, padding: "0 28px", minHeight: 52,
              borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              Continuer <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================================
// SCREEN W5 — Recommandations Yaye
// ===========================================================
const WebOnboard5Preview = () => {
  const root = { display: "flex", flexDirection: "column", height: "100%", background: "var(--gj-bg)" };
  const main = {
    flex: 1, overflowY: "auto",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "40px 24px",
  };
  const card = {
    background: "#fff", border: "1.5px solid var(--gj-line)",
    borderRadius: 18, padding: "40px 48px",
    width: "min(1000px, 100%)",
    boxShadow: "0 4px 24px rgba(0,0,0,.04)",
    display: "flex", flexDirection: "column", gap: 22,
  };
  const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 };

  const opps = [
    { tag: "Financement", j: "J-3", urgent: true, tagBg: "var(--cat-financement-soft)", tagFg: "var(--cat-financement-ink)", icon: "i-agriculture", iconBg: "var(--cat-financement-soft)", iconFg: "var(--cat-financement-ink)", title: "Bourse agricole — maraîchage", sub: "600 000 FCFA · Tambacounda", match: 94, why: "Région · âge · objectif" },
    { tag: "Stage", j: "J-12", tagBg: "var(--cat-stage-soft)", tagFg: "var(--cat-stage-ink)", icon: "i-employment", iconBg: "var(--cat-stage-soft)", iconFg: "var(--cat-stage-ink)", title: "Stage agronomie — Coopérative régionale", sub: "180 000 F/mois · 6 mois", match: 91, why: "Région · objectif" },
    { tag: "Financement", j: "J-21", tagBg: "var(--cat-financement-soft)", tagFg: "var(--cat-financement-ink)", icon: "i-trending", iconBg: "var(--cat-financement-soft)", iconFg: "var(--cat-financement-ink)", title: "Concours Jeunes Entrepreneurs", sub: "2 500 000 FCFA + coaching", match: 90, why: "Objectif · âge" },
  ];

  return (
    <div style={root}>
      <WebOnboardingNav step={3} total={4} />
      <div style={main}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "linear-gradient(135deg, #19a657, #027f7e)",
              color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: 28, flexShrink: 0,
              boxShadow: "0 0 0 3px rgba(0,122,92,.08)",
            }}>Y</div>
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-.3px" }}>
                Voilà 3 opps faites pour toi, Awa.
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 4 }}>
                Filtré sur <b>247 offres</b> · tes objectifs · ta région <b>Tambacounda</b>
              </p>
            </div>
          </div>

          <div style={grid3}>
            {opps.map((o, i) => (
              <div key={i} style={{
                background: "#fff", border: "1.5px solid var(--gj-line)",
                borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10,
                transition: "all .15s ease",
              }}>
                <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800,
                    background: o.tagBg, color: o.tagFg,
                    padding: "3px 8px", borderRadius: 999,
                    letterSpacing: ".4px", textTransform: "uppercase",
                  }}>{o.tag}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999,
                    background: o.urgent ? "var(--gj-red)" : "var(--gj-bg)",
                    color: o.urgent ? "#fff" : "var(--gj-grey)",
                    border: o.urgent ? 0 : "1px solid var(--gj-line)",
                  }}>{o.j}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: o.iconBg, color: o.iconFg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg className="gj-icon gj-icon--md"><use href={"#" + o.icon} /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{o.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{o.sub}</div>
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
                    <span style={{ color: "var(--gj-green)" }}>{o.match}% match</span>
                    <span style={{ color: "var(--gj-grey)" }}>{o.why}</span>
                  </div>
                  <div style={{ height: 5, background: "var(--gj-bg)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${o.match}%`, background: "var(--gj-green)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 12, borderTop: "1px solid var(--gj-line)",
          }}>
            <span style={{ fontSize: 13, color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg className="gj-icon gj-icon--sm" style={{ color: "var(--gj-teal-deep)" }}><use href="#i-info" /></svg>
              Tu retrouveras ces 3 opps + 5 autres dans ton espace.
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{
                background: "#fff", color: "var(--gj-teal-deep)",
                border: "1.5px solid var(--gj-line)", padding: "0 22px", minHeight: 52,
                borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}>Voir toutes les opps</button>
              <button style={{
                background: "var(--gj-teal-deep)", color: "#fff",
                border: 0, padding: "0 28px", minHeight: 52,
                borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}>
                Aller à mon espace <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { WebOnboard1Landing, WebOnboard2Phone, WebOnboard3Goal, WebOnboard4Profile, WebOnboard5Preview });
