/* eslint-disable */
// F1 — Inscription & Onboarding flow (6 screens).
// Each screen returns a complete PhoneFrame ready to drop in a DCArtboard.

// ---------- Shared field primitives ----------
const FieldLabel = ({ children, required }) => (
  <label style={{
    fontSize: 12, fontWeight: 800,
    color: "var(--color-text-primary)",
    display: "flex", alignItems: "center", gap: 4,
    textTransform: "uppercase", letterSpacing: ".4px",
  }}>
    {children}
    {required && <span style={{ color: "var(--gj-red)", fontSize: 11 }}>*</span>}
  </label>
);

const Input = ({ value, placeholder, type = "text" }) => (
  <input
    defaultValue={value}
    placeholder={placeholder}
    type={type}
    style={{
      fontFamily: "inherit", fontSize: 16,
      border: "1.5px solid var(--gj-line)",
      borderRadius: 10, padding: "0 14px",
      minHeight: 50, background: "#fff",
      outline: "none", color: "var(--gj-ink)", width: "100%",
    }}
  />
);

const Chip = ({ icon, label, on }) => (
  <button style={{
    background: on ? "var(--gj-teal-soft)" : "#fff",
    border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
    padding: "10px 14px", borderRadius: 999,
    fontSize: 13, fontWeight: on ? 800 : 600,
    color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
    cursor: "pointer", minHeight: 42,
    display: "inline-flex", alignItems: "center", gap: 6,
    fontFamily: "inherit",
  }}>
    {icon && <svg className="gj-icon gj-icon--sm"><use href={"#" + icon} /></svg>}
    {label}
  </button>
);

// =====================================================================
// SCREEN 1 — Welcome / Landing
// =====================================================================
const Onboard1Welcome = () => {
  const hero = {
    flex: 1,
    background: "linear-gradient(180deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)",
    position: "relative",
    display: "flex", flexDirection: "column",
    padding: "20px 22px 0",
    overflow: "hidden",
    color: "#fff",
  };
  const glow = {
    position: "absolute", top: -120, right: -100,
    width: 340, height: 340,
    background: "radial-gradient(circle, rgba(248,163,9,.28) 0%, transparent 60%)",
    pointerEvents: "none",
  };
  const logoImg = {
    height: 36, width: "auto",
    alignSelf: "flex-start",
    position: "relative",
    filter: "brightness(0) invert(1)", /* monochrome blanc sur teal-deep */
  };
  const headline = {
    fontSize: 32, fontWeight: 900, lineHeight: 1.1,
    marginTop: 48, position: "relative",
  };
  const lead = {
    fontSize: 15, lineHeight: 1.5, marginTop: 14,
    opacity: .85, position: "relative",
  };
  const eyebrow = {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 11, fontWeight: 800,
    background: "rgba(248,163,9,.22)",
    color: "var(--gj-yellow)",
    padding: "5px 10px", borderRadius: 999,
    letterSpacing: ".5px", textTransform: "uppercase",
    marginTop: 24, alignSelf: "flex-start", position: "relative",
  };
  const photoCard = {
    margin: "32px -22px 0",
    height: 220,
    background: "linear-gradient(135deg, #C49A5A, #7A5C3A)",
    position: "relative", overflow: "hidden",
  };
  const photoOverlay = {
    position: "absolute", inset: 0,
    background: "linear-gradient(180deg, rgba(0,40,32,0) 0%, rgba(10,40,32,.7) 100%)",
  };
  const photoText = {
    position: "absolute", left: 22, right: 22, bottom: 18,
    color: "#fff", fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", gap: 6,
  };
  const stats = {
    display: "flex", justifyContent: "space-around",
    padding: "16px 0", color: "#fff",
    borderTop: "1px solid rgba(255,255,255,.12)",
    position: "relative",
  };
  const stat = {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
  };
  const statN = { fontSize: 22, fontWeight: 900, color: "var(--gj-yellow)" };
  const statL = { fontSize: 11, opacity: .8, textTransform: "uppercase", letterSpacing: ".4px" };
  const cta = {
    background: "var(--gj-yellow)", color: "var(--gj-ink)",
    border: 0, fontWeight: 900, fontSize: 16,
    padding: "0 18px", minHeight: 54, borderRadius: 12,
    cursor: "pointer", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%",
  };
  const ghost = {
    background: "transparent", color: "#fff",
    border: "1.5px solid rgba(255,255,255,.4)",
    fontWeight: 700, fontSize: 14,
    padding: "0 18px", minHeight: 48, borderRadius: 12,
    cursor: "pointer", fontFamily: "inherit",
    width: "100%", marginTop: 10,
  };
  const ctaWrap = {
    padding: "18px 22px 22px",
    background: "var(--gj-ink-teal)",
    flexShrink: 0,
  };
  return (
    <PhoneFrame bg="var(--gj-ink-teal)" bottomSafe={false} sb={false}>
      <StatusBar dark />
      <div style={hero}>
        <span style={glow} />
        <img src="assets/logo-guichet.png" alt="Guichet Jeunesse" style={logoImg} />
        <div style={eyebrow}>Le guichet unique du CJS</div>
        <h1 style={headline}>Emploi, formation, financement — au même endroit.</h1>
        <p style={lead}>Toutes les opportunités pour les 16–35 ans, partout au Sénégal. Gratuit.</p>
        <div style={photoCard}>
          <image-slot id="l1-hero-jeune" shape="rect" fit="cover" placeholder="Photo réelle — jeune sénégalaise en formation (Thiès)"></image-slot>
          <div style={{ ...photoOverlay, pointerEvents: "none" }} />
          <div style={{ ...photoText, pointerEvents: "none" }}>
            <svg className="gj-icon gj-icon--sm" style={{ color: "var(--gj-yellow)" }}><use href="#i-quote" /></svg>
            « Grâce au Guichet, j'ai trouvé mon stage en 3 semaines. » — Aïssatou, 23 ans, Thiès
          </div>
        </div>
        <div style={stats}>
          <div style={stat}><span style={statN}>22 695</span><span style={statL}>Jeunes inscrits</span></div>
          <div style={stat}><span style={statN}>1 240</span><span style={statL}>Opps actives</span></div>
          <div style={stat}><span style={statN}>14</span><span style={statL}>Régions</span></div>
        </div>
      </div>
      <div style={ctaWrap}>
        <button style={cta}>
          Explorer les opportunités <svg className="gj-icon gj-icon--sm" aria-hidden="true"><use href="#i-arrow-right" /></svg>
        </button>
        <button style={{ ...ghost, border: 0, background: "transparent", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, marginTop: 6 }}>Créer mon compte · j'ai déjà un compte</button>
      </div>
    </PhoneFrame>
  );
};

// =====================================================================
// SCREEN 2 — Phone number + OTP
// =====================================================================
const Onboard2Phone = () => {
  const body = { padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16, flex: 1, background: "#fff" };
  const otpRow = { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 };
  const otpCell = (val, focus) => ({
    height: 56, borderRadius: 10,
    border: `1.5px solid ${focus ? "var(--gj-teal-deep)" : "var(--gj-line)"}`,
    boxShadow: focus ? "0 0 0 3px rgba(0,178,135,.18)" : "none",
    background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, fontWeight: 900,
    color: val ? "var(--gj-ink)" : "var(--gj-grey-2)",
  });
  const operatorBtn = (on, label, color) => ({
    flex: 1, padding: "10px 8px",
    border: `1.5px solid ${on ? color : "var(--gj-line)"}`,
    background: on ? "rgba(0,159,118,.06)" : "#fff",
    borderRadius: 10, fontSize: 11, fontWeight: 800,
    color: on ? "var(--gj-ink)" : "var(--gj-grey)",
    cursor: "pointer", fontFamily: "inherit",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
  });
  return (
    <PhoneFrame bg="#fff">
      <AppHeader title="Connexion" subtitle="Vérification par SMS" onBack={() => {}} />
      <StepBar step={1} total={5} />
      <div style={body}>
        <div>
          <FieldLabel required>Ton numéro de téléphone</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", fontWeight: 700, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 12px", minHeight: 50 }}>
              <SnFlag size={16} />
              <span style={{ fontSize: 15 }}>+221</span>
            </div>
            <div style={{ flex: 1 }}>
              <Input value="77 654 32 10" type="tel" />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 6, lineHeight: 1.5 }}>
            Tu vas recevoir un code à 6 chiffres par SMS. Gratuit, valable 10 min.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={operatorBtn(true, "Orange", "var(--gj-yellow-deep)")}>
            <span style={{ color: "var(--gj-yellow-deep)", fontWeight: 900, fontSize: 12 }}>orange</span>
            <span style={{ fontSize: 11, color: "var(--gj-grey)" }}>77 · 78</span>
          </button>
          <button style={operatorBtn(false, "Free")}>
            <span style={{ color: "#CE0F69", fontWeight: 900, fontSize: 12 }}>free</span>
            <span style={{ fontSize: 11, color: "var(--gj-grey)" }}>76</span>
          </button>
          <button style={operatorBtn(false, "Expresso")}>
            <span style={{ color: "#E60000", fontWeight: 900, fontSize: 12 }}>expresso</span>
            <span style={{ fontSize: 11, color: "var(--gj-grey)" }}>70</span>
          </button>
        </div>

        <div style={{
          background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)",
          borderRadius: 10, padding: "14px 14px",
          display: "flex", flexDirection: "column", gap: 10, marginTop: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--gj-green-soft)", color: "var(--gj-green)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <svg className="gj-icon gj-icon--sm"><use href="#i-check-circle" /></svg>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Code reçu — saisis-le ici</div>
          </div>
          <div style={otpRow}>
            <div style={otpCell("3", false)}>3</div>
            <div style={otpCell("9", false)}>9</div>
            <div style={otpCell("2", false)}>2</div>
            <div style={otpCell("7", true)}>7</div>
            <div style={otpCell("", false)}></div>
            <div style={otpCell("", false)}></div>
          </div>
          <div style={{ fontSize: 11, color: "var(--gj-grey)", display: "flex", justifyContent: "space-between" }}>
            <span>Renvoyer dans 0:48</span>
            <span style={{ color: "var(--gj-teal-deep)", fontWeight: 800 }}>Modifier le numéro</span>
          </div>
        </div>

        <div style={{
          background: "var(--gj-whatsapp)", color: "#fff",
          borderRadius: 10, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg className="gj-icon gj-icon--md" style={{ color: "#fff" }}><use href="#i-chat" /></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Pas de SMS ?</div>
            <div style={{ fontSize: 11, opacity: .9 }}>Recevoir le code sur WhatsApp</div>
          </div>
          <svg className="gj-icon gj-icon--sm" style={{ color: "#fff" }}><use href="#i-arrow-right" /></svg>
        </div>
      </div>
      <FooterCTA primary="Vérifier" />
    </PhoneFrame>
  );
};

// =====================================================================
// SCREEN 3 — Choix objectif
// =====================================================================
const Onboard3Goal = () => {
  const body = { padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16, flex: 1, overflowY: "auto", background: "#fff" };
  const yayeCard = {
    background: "linear-gradient(135deg, var(--gj-teal-soft) 0%, #fff 100%)",
    border: "1.5px solid var(--gj-line)",
    borderRadius: 12, padding: 14,
    display: "flex", gap: 12, alignItems: "center",
  };
  const av = {
    width: 44, height: 44, borderRadius: "50%",
    background: "linear-gradient(135deg, #19a657 0%, #027f7e 100%)",
    color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: 20,
    flexShrink: 0,
  };
  const card = (on, accent) => ({
    background: on ? "rgba(0,159,118,.04)" : "#fff",
    border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
    borderRadius: 12, padding: 14,
    display: "flex", alignItems: "center", gap: 12,
    cursor: "pointer", fontFamily: "inherit",
    textAlign: "left", width: "100%", color: "inherit",
    boxShadow: on ? "0 1px 3px rgba(0,0,0,.04)" : "none",
  });
  const tile = (accent) => ({
    width: 44, height: 44, borderRadius: 10,
    background: `var(--gj-${accent}-soft)`,
    color: `var(--gj-${accent === "yellow" ? "yellow-ink" : accent})`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  });
  const opts = [
    { id: "emploi", icon: "i-employment", label: "Trouver un emploi ou un stage", sub: "850 opps actives", accent: "teal", on: true },
    { id: "projet", icon: "i-project", label: "Lancer mon projet", sub: "Financements & accompagnement", accent: "yellow", on: true },
    { id: "format", icon: "i-learning", label: "Me former", sub: "Bourses & cursus", accent: "blue", on: false },
    { id: "agri", icon: "i-agriculture", label: "Travailler dans l'agriculture", sub: "Maraîchage, élevage, transformation", accent: "green", on: false },
    { id: "engage", icon: "i-engagement", label: "M'engager dans une cause", sub: "Volontariat, civique", accent: "teal", on: false },
  ];
  return (
    <PhoneFrame bg="#fff">
      <AppHeader title="Bienvenue" subtitle="Yaye t'accompagne" onBack={() => {}} />
      <StepBar step={2} total={5} />
      <div style={body}>
        <div style={yayeCard}>
          <div style={av}>Y</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)" }}>Salama Awa</div>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.45, marginTop: 2 }}>
              C'est quoi ton objectif ce mois-ci ? Coche ce qui t'intéresse.
            </div>
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2, marginBottom: 4 }}>
            Qu'est-ce que tu cherches&nbsp;?
          </h2>
          <p style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.5 }}>
            Choisis-en plusieurs. Tu pourras affiner après.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {opts.map(o => (
            <button key={o.id} style={card(o.on, o.accent)}>
              <span style={tile(o.accent)}>
                <svg className="gj-icon gj-icon--md"><use href={"#" + o.icon} /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{o.label}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>{o.sub}</div>
              </div>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                border: `1.5px solid ${o.on ? "var(--gj-teal)" : "var(--gj-line)"}`,
                background: o.on ? "var(--gj-teal)" : "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, color: "#fff",
              }}>
                {o.on && <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-check" /></svg>}
              </div>
            </button>
          ))}
        </div>
      </div>
      <FooterCTA primary="Continuer · 2 sélectionnés" secondary="Passer" />
    </PhoneFrame>
  );
};

// =====================================================================
// SCREEN 4 — Profil minimal (identité + localisation)
// =====================================================================
const Onboard4Profile = () => {
  const body = { padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14, flex: 1, overflowY: "auto", background: "#fff" };
  const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
  const regions = ["Dakar", "Thiès", "Diourbel", "Saint-Louis", "Tambacounda", "Kédougou", "Ziguinchor", "Kolda", "Fatick", "Kaolack", "Matam", "Louga", "Sédhiou", "Kaffrine"];
  const segBtn = (on, label) => ({
    flex: 1, padding: "12px 8px",
    border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
    background: on ? "var(--gj-teal-soft)" : "#fff",
    color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
    borderRadius: 10, fontSize: 14, fontWeight: on ? 800 : 600,
    cursor: "pointer", fontFamily: "inherit", minHeight: 50,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  });
  return (
    <PhoneFrame bg="#fff">
      <AppHeader title="Ton profil" subtitle="Pour matcher les bonnes opps" onBack={() => {}} />
      <StepBar step={3} total={5} />
      <div style={body}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>Qui es-tu&nbsp;?</h2>
          <p style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.5, marginTop: 4 }}>
            On garde tes infos privées. Tu choisis ce que les recruteurs voient.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <FieldLabel required>Prénom</FieldLabel>
          <Input value="Awa" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <FieldLabel required>Nom</FieldLabel>
          <Input value="Diop" />
        </div>
        <div style={row}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <FieldLabel required>Année de naissance</FieldLabel>
            <Input value="2003" type="number" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <FieldLabel required>Je suis</FieldLabel>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={segBtn(true, "F")}>Femme</button>
              <button style={segBtn(false, "H")}>Homme</button>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "var(--gj-line)", margin: "4px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <FieldLabel required>Région</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {regions.map(r => <Chip key={r} label={r} on={r === "Tambacounda"} />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <FieldLabel>Commune <span style={{ color: "var(--gj-grey-2)", fontSize: 11, fontWeight: 600, marginLeft: 4 }}>FACULTATIF</span></FieldLabel>
          <Input value="" placeholder="ex. Bakel, Kidira…" />
        </div>
      </div>
      <FooterCTA primary="Continuer" secondary="← Retour" />
    </PhoneFrame>
  );
};

// =====================================================================
// SCREEN 5 — Recommandations (preview)
// =====================================================================
const Onboard5Preview = () => {
  const body = { padding: "18px 16px 12px", display: "flex", flexDirection: "column", gap: 14, flex: 1, overflowY: "auto", background: "var(--gj-bg)" };
  const yayeBar = {
    background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))",
    color: "#fff", borderRadius: 14, padding: 16,
    display: "flex", flexDirection: "column", gap: 10,
    position: "relative", overflow: "hidden",
  };
  const oppCard = (accent) => ({
    background: "#fff",
    border: "1.5px solid var(--gj-line)",
    borderRadius: 12, padding: 14,
    display: "flex", flexDirection: "column", gap: 10,
    position: "relative", overflow: "hidden",
  });
  const accentPill = (color, bg) => ({
    position: "absolute", top: 12, right: 12,
    background: bg, color: color,
    fontSize: 11, fontWeight: 800,
    padding: "3px 8px", borderRadius: 999,
    letterSpacing: ".4px", textTransform: "uppercase",
  });
  const meta = { display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "var(--gj-grey)" };
  const metaItem = { display: "inline-flex", alignItems: "center", gap: 4 };
  const tile = (accent) => ({
    width: 44, height: 44, borderRadius: 10,
    background: `var(--gj-${accent}-soft)`,
    color: accent === "yellow" ? "var(--gj-yellow-ink)" : `var(--gj-${accent})`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  });
  const matchBar = (pct) => ({
    height: 4, borderRadius: 2, background: "var(--gj-bg)",
    overflow: "hidden", marginTop: 6,
  });
  return (
    <PhoneFrame bg="var(--gj-bg)">
      <AppHeader title="Yaye a trouvé" subtitle="3 opps à 90%+ pour toi" onBack={() => {}} />
      <StepBar step={4} total={5} />
      <div style={body}>
        <div style={yayeBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #19a657, #027f7e)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontFamily: "var(--gj-font-sans)", color: "#fff", fontSize: 17,
              flexShrink: 0,
            }}>Y</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>
                Top Awa — voilà ce que j'ai trouvé pour toi à Tambacounda.
              </div>
              <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>
                Basé sur tes objectifs · Emploi · Projet
              </div>
            </div>
          </div>
        </div>

        <div style={oppCard("red")}>
          <span style={accentPill("var(--gj-red-ink)", "var(--gj-red-soft)")}>Urgent · J-3</span>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={tile("red")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-agriculture" /></svg>
            </div>
            <div style={{ flex: 1, paddingRight: 80 }}>
              <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>Bourse agricole — Micro-initiative maraîchère</div>
              <div style={meta}>
                <span style={metaItem}><svg className="gj-icon gj-icon--xs"><use href="#i-funding" /></svg>jusqu'à 600 000 F</span>
                <span style={metaItem}><svg className="gj-icon gj-icon--xs"><use href="#i-pin" /></svg>Tambacounda</span>
              </div>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800 }}>
              <span style={{ color: "var(--gj-green)" }}>94% match</span>
              <span style={{ color: "var(--gj-grey)" }}>Région · âge · objectif</span>
            </div>
            <div style={matchBar(94)}>
              <div style={{ height: "100%", width: "94%", background: "var(--gj-green)", borderRadius: 2 }} />
            </div>
          </div>
        </div>

        <div style={oppCard("blue")}>
          <span style={accentPill("var(--cat-stage-ink)", "var(--cat-stage-soft)")}>Stage</span>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={tile("blue")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-employment" /></svg>
            </div>
            <div style={{ flex: 1, paddingRight: 70 }}>
              <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>Stage agronomie — Coopérative régionale</div>
              <div style={meta}>
                <span style={metaItem}><svg className="gj-icon gj-icon--xs"><use href="#i-funding" /></svg>180 000 F/mois</span>
                <span style={metaItem}><svg className="gj-icon gj-icon--xs"><use href="#i-clock" /></svg>6 mois · J-12</span>
              </div>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800 }}>
              <span style={{ color: "var(--gj-green)" }}>91% match</span>
              <span style={{ color: "var(--gj-grey)" }}>Région · objectif</span>
            </div>
            <div style={matchBar(91)}>
              <div style={{ height: "100%", width: "91%", background: "var(--gj-green)", borderRadius: 2 }} />
            </div>
          </div>
        </div>

        <div style={oppCard("yellow")}>
          <span style={accentPill("var(--gj-yellow-ink)", "var(--gj-yellow-soft)")}>Concours</span>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={tile("yellow")}>
              <svg className="gj-icon gj-icon--md"><use href="#i-trending" /></svg>
            </div>
            <div style={{ flex: 1, paddingRight: 70 }}>
              <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>Concours Jeunes Entrepreneurs 2026</div>
              <div style={meta}>
                <span style={metaItem}><svg className="gj-icon gj-icon--xs"><use href="#i-funding" /></svg>2 500 000 F + accompagnement</span>
                <span style={metaItem}><svg className="gj-icon gj-icon--xs"><use href="#i-clock" /></svg>J-21</span>
              </div>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800 }}>
              <span style={{ color: "var(--gj-green)" }}>90% match</span>
              <span style={{ color: "var(--gj-grey)" }}>Objectif · âge</span>
            </div>
            <div style={matchBar(90)}>
              <div style={{ height: "100%", width: "90%", background: "var(--gj-green)", borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>
      <FooterCTA primary="Voir mon espace" secondary="← Retour" />
    </PhoneFrame>
  );
};

// =====================================================================
// SCREEN 6 — Dashboard (entry)
// =====================================================================
const Onboard6Dashboard = () => {
  const body = { flex: 1, overflowY: "auto", background: "var(--gj-bg)", paddingBottom: 16 };

  // greeting hero
  const hero = {
    background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)",
    color: "#fff", borderRadius: 16, padding: 18,
    margin: "12px 12px 14px", position: "relative", overflow: "hidden",
  };
  const glow = {
    position: "absolute", right: -40, top: -40, width: 200, height: 200,
    background: "radial-gradient(circle, rgba(248,163,9,.2), transparent 60%)",
  };

  // KPIs
  const kpiGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 12px 14px" };
  const kpi = (tone) => {
    const tints = {
      teal: { bg: "var(--gj-teal-soft)", fg: "var(--gj-teal-deep)" },
      yellow: { bg: "var(--gj-yellow-soft)", fg: "var(--gj-yellow-ink)" },
      blue: { bg: "var(--gj-blue-soft)", fg: "var(--gj-blue)" },
      green: { bg: "var(--gj-green-soft)", fg: "var(--gj-green)" },
    }[tone];
    return {
      card: { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6 },
      tile: { width: 32, height: 32, borderRadius: 8, background: tints.bg, color: tints.fg, display: "inline-flex", alignItems: "center", justifyContent: "center" },
    };
  };
  const k1 = kpi("teal"), k2 = kpi("yellow"), k3 = kpi("blue"), k4 = kpi("green");

  // opportunities card
  const oppHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px 8px" };
  const oppList = { display: "flex", flexDirection: "column", gap: 8, padding: "0 12px" };
  const oppCard = {
    background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12,
    padding: 12, display: "flex", gap: 10, alignItems: "center",
    position: "relative", overflow: "hidden",
  };
  const oppPill = (color, bg) => ({
    position: "absolute", top: 8, right: 8,
    background: bg, color, fontSize: 11, fontWeight: 900,
    padding: "2px 7px", borderRadius: 999, letterSpacing: ".3px",
  });
  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Tambacounda" user="AD" />
      <div style={body}>
        <div style={hero}>
          <span style={glow} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, background: "var(--gj-yellow)", color: "var(--gj-ink)", padding: "3px 8px", borderRadius: 999, position: "relative" }}>
            <svg className="gj-icon gj-icon--xs"><use href="#i-flame" /></svg>BOURSE J-3
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 10, lineHeight: 1.15, position: "relative" }}>
            3 opps t'attendent à&nbsp;90%+&nbsp;de match.
          </div>
          <div style={{ fontSize: 12, opacity: .85, marginTop: 6, lineHeight: 1.5, position: "relative" }}>
            Ta bourse agricole clôture dans 3 jours. Reprends ton dossier en 5 min.
          </div>
          <button style={{
            marginTop: 12, background: "var(--gj-yellow)", color: "var(--gj-ink)",
            border: 0, padding: "0 14px", minHeight: 42, borderRadius: 10,
            fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            position: "relative",
          }}>Reprendre le dossier →</button>
        </div>

        <div style={kpiGrid}>
          <div style={k1.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={k1.tile}><svg className="gj-icon gj-icon--sm"><use href="#i-target" /></svg></div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green)" }}>+8</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>47</div>
            <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>Opps vues</div>
          </div>
          <div style={k2.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={k2.tile}><svg className="gj-icon gj-icon--sm"><use href="#i-bookmark" /></svg></div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green)" }}>+3</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>12</div>
            <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>Sauvegardées</div>
          </div>
          <div style={k3.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={k3.tile}><svg className="gj-icon gj-icon--sm"><use href="#i-document" /></svg></div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-blue)" }}>2 actives</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>5</div>
            <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>Candidatures</div>
          </div>
          <div style={k4.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={k4.tile}><svg className="gj-icon gj-icon--sm"><use href="#i-check-circle" /></svg></div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green)" }}>+1</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>2</div>
            <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>Acceptées</div>
          </div>
        </div>

        <div style={oppHeader}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Pour toi</h3>
          <span style={{ fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 800 }}>Tout voir →</span>
        </div>
        <div style={oppList}>
          <div style={oppCard}>
            <span style={oppPill("var(--gj-red-ink)", "var(--gj-red-soft)")}>J-3</span>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--gj-red-soft)", color: "var(--gj-red)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg className="gj-icon gj-icon--md"><use href="#i-agriculture" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 40 }}>
              <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>Bourse agricole — maraîchage</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>600 000 F · Tambacounda</div>
            </div>
          </div>
          <div style={oppCard}>
            <span style={oppPill("var(--cat-stage-ink)", "var(--cat-stage-soft)")}>STAGE</span>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--cat-stage-soft)", color: "var(--cat-stage-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg className="gj-icon gj-icon--md"><use href="#i-employment" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 50 }}>
              <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>Stage agronomie · 6 mois</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>180 000 F/mois · Coopérative régionale</div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav active="home" />
    </PhoneFrame>
  );
};

Object.assign(window, { Onboard1Welcome, Onboard2Phone, Onboard3Goal, Onboard4Profile, Onboard5Preview, Onboard6Dashboard });
