/* eslint-disable */
// Lot 15 — Yaye (assistant IA) · Opportunités · Dépôt de dossier — WEB.
// Tous les composants Yaye + interactions opportunité + dépôt de fichier dans tous ses états.

const yInk = "var(--gj-ink)";
const YBlock = ({ title, sub, children }) => (
  <section style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18, breakInside: "avoid" }}>
    <div><h2 style={{ fontSize: 17, fontWeight: 900, color: yInk }}>{title}</h2>{sub && <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 3 }}>{sub}</div>}</div>
    {children}
  </section>
);
const YDemo = ({ label, children, col }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
    {label && <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</div>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: col ? "stretch" : "center", flexDirection: col ? "column" : "row" }}>{children}</div>
  </div>
);

// ===== IDENTITÉ YAYE =====
const YayeAvatar = ({ size = 40 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #19a657 0%, #027f7e 100%)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: size * 0.5, boxShadow: "0 0 0 2px rgba(255,255,255,.25)" }}>Y</span>
);
const YayeWordmark = ({ size = 18, onDark }) => (
  <span style={{ fontWeight: 900, fontSize: size, fontFamily: "var(--gj-font-sans)", background: onDark ? "linear-gradient(135deg,#fff,var(--gj-yellow))" : "linear-gradient(135deg,#19a657,#027f7e)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Yaye</span>
);
const IaBadge = () => <span style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "2px 7px", borderRadius: 999, letterSpacing: ".4px" }}>IA</span>;
const TypingDots = () => (
  <span style={{ display: "inline-flex", gap: 4, padding: "12px 16px", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "16px 16px 16px 4px" }}>
    {[0, 1, 2].map(i => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gj-teal-deep)", opacity: .5, animation: `gjbounce 1.2s ${i * .18}s infinite ease-in-out` }} />)}
  </span>
);

const YayeIdentity = () => (
  <YBlock title="Identité Yaye" sub="Avatar, wordmark, badge IA, états (au repos · réfléchit · écoute)">
    <YDemo label="Avatar — tailles">
      <YayeAvatar size={28} /><YayeAvatar size={40} /><YayeAvatar size={56} />
      <span style={{ position: "relative" }}><YayeAvatar size={48} /><span style={{ position: "absolute", right: -2, bottom: -2, width: 14, height: 14, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} /></span>
    </YDemo>
    <YDemo label="Wordmark & badge">
      <YayeWordmark size={22} /><IaBadge />
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-teal-deep)", padding: "7px 12px", borderRadius: 10 }}><YayeWordmark size={16} onDark /><IaBadge /></span>
    </YDemo>
    <YDemo label="États">
      <div style={{ textAlign: "center" }}><YayeAvatar size={44} /><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 5, fontWeight: 700 }}>Au repos</div></div>
      <div style={{ textAlign: "center" }}><span style={{ position: "relative", display: "inline-flex" }}><span style={{ position: "absolute", inset: -5, borderRadius: "50%", border: "2px solid var(--gj-teal)", opacity: .4, animation: "gjpulse2 1.6s infinite" }} /><YayeAvatar size={44} /></span><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 5, fontWeight: 700 }}>Écoute (micro)</div></div>
      <div style={{ textAlign: "center" }}><TypingDots /><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 5, fontWeight: 700 }}>Réfléchit</div></div>
    </YDemo>
  </YBlock>
);

// ===== BULLES DE CONVERSATION =====
const YayeBubbles = () => (
  <YBlock title="Bulles de conversation" sub="Message Yaye · message utilisateur · sources · jour">
    <div style={{ background: "var(--gj-bg)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
      <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 999, padding: "3px 10px" }}>Aujourd'hui</span>
      <div style={{ alignSelf: "flex-start", maxWidth: "84%" }}>
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5, color: yInk }}>Bonjour Awa ! J'ai trouvé 3 opportunités qui correspondent à ton profil maraîchage.</div>
        <span style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 3, display: "inline-flex", alignItems: "center", gap: 4 }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-document" /></svg>basé sur ton profil + 142 offres</span>
      </div>
      <div style={{ alignSelf: "flex-end", maxWidth: "84%", background: "var(--gj-teal-deep)", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5, boxShadow: "0 2px 6px rgba(0,122,92,.18)" }}>Montre-moi celle avec financement</div>
      <TypingDots />
    </div>
  </YBlock>
);

// ===== CARTE D'ACTION YAYE =====
const YayeActionCard = () => (
  <YBlock title="Carte d'action" sub="« J'ai préparé X pour toi » — Yaye agit, l'utilisateur valide">
    <div style={{ maxWidth: 420, background: "#fff", border: "1.5px solid var(--gj-teal)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)", padding: "10px 13px", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid var(--gj-line)" }}>
        <YayeAvatar size={28} /><div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)" }}>J'ai pré-rempli ta candidature</div>
      </div>
      <div style={{ padding: "12px 13px", display: "flex", flexDirection: "column", gap: 10 }}>
        {["CV joint depuis ton profil", "Lettre de motivation générée", "Champs requis complétés"].map(t => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: yInk }}><span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--gj-green-soft)", color: "var(--gj-green)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg></span>{t}</div>
        ))}
        <div style={{ display: "flex", gap: 9, marginTop: 4 }}>
          <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Vérifier & envoyer</button>
          <button style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", minHeight: 44, padding: "0 16px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Modifier</button>
        </div>
      </div>
    </div>
  </YBlock>
);

// ===== RÉPONSES RAPIDES + INSIGHT + NUDGE + INPUT =====
const YayeMisc = () => (
  <YBlock title="Réponses rapides · insight · nudge · saisie" sub="Suggestions cliquables, encart d'analyse, incitation inline, barre de saisie">
    <YDemo label="Réponses rapides (quick replies)" col>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Trouve-moi un stage", "Améliore mon CV", "Quelles bourses ?"].map(t => <button key={t} style={{ background: "#fff", border: "1.5px solid var(--gj-teal-deep)", color: "var(--gj-teal-deep)", borderRadius: 999, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-sparkle" /></svg>{t}</button>)}
      </div>
    </YDemo>
    <YDemo label="Encart d'analyse (insight)" col>
      <div style={{ display: "flex", gap: 11, background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: "1px solid var(--gj-teal)", borderRadius: 12, padding: "13px 15px", maxWidth: 460 }}>
        <YayeAvatar size={32} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-teal-deep)" }}><span style={{ fontFamily: "var(--gj-font-sans)", fontSize: 14 }}>Le conseil de Yaye</span></div><div style={{ fontSize: 12.5, color: yInk, marginTop: 4, lineHeight: 1.45 }}>Ce stage correspond à ton objectif maraîchage et reste proche de Tambacounda — pense à joindre ton attestation de scolarité.</div></div>
      </div>
    </YDemo>
    <YDemo label="Nudge inline (bandeau)" col>
      <div style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--gj-teal-deep)", color: "#fff", borderRadius: 12, padding: "11px 14px", maxWidth: 460, cursor: "pointer" }}>
        <YayeAvatar size={30} /><div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>Yaye peut t'aider à trouver des opportunités. <b>Demande-lui !</b></div><svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-yellow)" }}><use href="#i-arrow-right" /></svg>
      </div>
    </YDemo>
    <YDemo label="Barre de saisie" col>
      <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 460 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 8px 0 16px", minHeight: 46, background: "var(--gj-bg)" }}>
          <span style={{ flex: 1, fontSize: 14, color: "var(--gj-grey-2)" }}>Écris ton message à Yaye…</span>
          {/* Saisie vocale retirée pour l'instant : la barre n'accepte que l'écrit. */}
        </div>
        <button style={{ width: 46, height: 46, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Envoyer"><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-arrow-right" /></svg></button>
      </div>
    </YDemo>
    <YDemo label="Bouton flottant (FAB) & suggestions d'accueil">
      <button style={{ width: 56, height: 56, borderRadius: "50%", border: 0, background: "linear-gradient(135deg, #19a657 0%, #027f7e 100%)", color: "#fff", cursor: "pointer", boxShadow: "0 8px 22px rgba(2,127,126,.4)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--gj-font-sans)", fontSize: 26, fontWeight: 900 }}>Y</button>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{["Trouve-moi un emploi", "Relis mon CV", "Quelles formations ?"].map(t => <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 11, padding: "9px 13px", fontSize: 12.5, fontWeight: 600, color: yInk }}><svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-teal-deep)" }}><use href="#i-sparkle" /></svg>{t}</span>)}</div>
    </YDemo>
  </YBlock>
);

// ===== SYSTÈME DE TYPES D'OPPORTUNITÉ (≈10 sous-catégories, couleur signature) =====
const OPP_TYPES = {
  emploi:      { label: "Emploi",       icon: "i-employment", c: "#1e35ba", soft: "#E7EAFA" },
  stage:       { label: "Stage",        icon: "i-target",     c: "#0B5F8D", soft: "#E2F2FD" },
  alternance:  { label: "Alternance",   icon: "i-learning",   c: "#0B5F8D", soft: "#E2F2FD" },
  formation:   { label: "Formation",    icon: "i-resources",  c: "#0E6234", soft: "#E4F6EB" },
  bourse:      { label: "Bourse",       icon: "i-funding",    c: "#97400F", soft: "#FDEDE3" },
  financement: { label: "Financement",  icon: "i-funding",    c: "#97400F", soft: "#FDEDE3" },
  volontariat: { label: "Volontariat",  icon: "i-heart",      c: "#014B4A", soft: "#E2F1F1" },
  concours:    { label: "Concours",     icon: "i-bolt",       c: "#ae0057", soft: "#FCE4EE" },
  mentorat:    { label: "Mentorat",     icon: "i-users",      c: "#1e35ba", soft: "#E7EAFA" },
  atelier:     { label: "Atelier",      icon: "i-calendar",   c: "#139ce8", soft: "#E2F2FD" },
};

const OppTypesLegend = () => (
  <YBlock title="Types d'opportunité — design system" sub="Chaque sous-catégorie a sa couleur, son icône et son traitement de carte. Le type devient le repère visuel principal du guichet.">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      {Object.values(OPP_TYPES).map((t) => (
        <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 10, border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: "11px 12px" }}>
          <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: t.soft, color: t.c, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + t.icon} /></svg></span>
          <span style={{ fontSize: 13, fontWeight: 800, color: yInk }}>{t.label}</span>
        </div>
      ))}
    </div>
  </YBlock>
);

// ===== OPPORTUNITÉS — carte fortement typée =====
const OppCard = ({ type, title, org, lieu, duree, conseil, remu, action }) => {
  const t = OPP_TYPES[type];
  return (
    <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 270, flex: "1 1 290px" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* en-tête coloré = repère de type fort */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", background: t.soft }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: t.c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + t.icon} /></svg></span>
          <span style={{ fontSize: 12.5, fontWeight: 900, color: t.c, textTransform: "uppercase", letterSpacing: ".5px" }}>{t.label}</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 800, color: t.c }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-clock" /></svg>{duree}</span>
        </div>
        <div style={{ padding: "13px 14px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: yInk, lineHeight: 1.3 }}>{title}</div>
            <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href="#i-users" /></svg>{org}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href="#i-pin" /></svg>{lieu}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 9, background: "var(--gj-teal-soft)", borderRadius: 10, padding: "9px 11px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#19a657,#027f7e)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--gj-font-sans)", fontWeight: 900, fontSize: 12 }}>Y</span>
            <div style={{ fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.4 }}>{conseil}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto", paddingTop: 11, borderTop: "1px solid var(--gj-line)" }}>
            {remu && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 800, color: yInk }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-funding" /></svg>{remu}</span>}
            <span style={{ flex: 1 }} />
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-action)", color: "#fff", border: 0, padding: "9px 16px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>{action || "Voir"}<svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-arrow-right" /></svg></button>
          </div>
        </div>
      </div>
    </div>
  );
};
const Opportunities = () => (
  <YBlock title="Opportunités — guichet" sub="Carte typée (en-tête coloré = sous-catégorie). Durée et conseil de Yaye en avant. La rémunération n'apparaît que si elle existe, et chaque opportunité porte son action propre.">
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <OppCard type="stage" title="Stage en agronomie · maraîchage" org="GIE Diaobé" lieu="Tambacounda" duree="6 mois" conseil="Aligné avec ton objectif maraîchage et proche de chez toi." remu="180 000 F/mois" action="Postuler" />
      <OppCard type="emploi" title="Animateur communautaire" org="CJS Tambacounda" lieu="Tambacounda" duree="CDD · 12 mois" conseil="Valorise ton expérience de bénévolat associatif." remu="120 000 F/mois" action="Postuler" />
      <OppCard type="bourse" title="Programme mobilité numérique" org="Min. Enseignement Sup." lieu="National" duree="Année 2026" conseil="Prépare ton relevé de notes — je peux t'aider à monter le dossier." action="Soumettre un dossier" />
      <OppCard type="financement" title="Subvention de démarrage agricole" org="DER/FJ" lieu="National" duree="Dépôt continu" conseil="Ton plan maraîchage est un bon point de départ." remu="jusqu'à 1,5 M F" action="Déposer ma demande" />
      <OppCard type="volontariat" title="Volontariat reboisement" org="Eaux & Forêts" lieu="Kédougou" duree="2 mois" conseil="Une belle première expérience de terrain." action="Rejoindre" />
      <OppCard type="formation" title="Initiation maraîchage moderne" org="CJS Tambacounda" lieu="Présentiel" duree="3 semaines" conseil="Idéal avant de te lancer dans l'entrepreneuriat." action="S'inscrire" />
      <OppCard type="concours" title="Concours jeune entrepreneur·e" org="Min. Jeunesse" lieu="National" duree="Inscription J-9" conseil="Présente ton projet — tu as le profil." action="Candidater" />
      <OppCard type="mentorat" title="Mentorat entrepreneuriat" org="Réseau Jángandoo" lieu="À distance" duree="6 séances" conseil="Un mentor peut t'aider à structurer ton idée." action="Demander un mentor" />
    </div>
  </YBlock>
);

// ===== DÉPÔT DE DOSSIER — TOUS LES ÉTATS =====
const FileRow = ({ icon, color, bg, name, meta, right, border }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", border: `1.5px solid ${border || "var(--gj-line)"}`, borderRadius: 11, background: "#fff" }}>
    <span style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: bg, color: color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + icon} /></svg></span>
    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, color: yInk }}>{name}</div><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{meta}</div></div>
    {right}
  </div>
);
const FileDeposit = () => (
  <YBlock title="Dépôt de dossier — tous les états" sub="Vide · survol/glisser · téléversement · succès · erreur · vérifié — couvre toutes les éventualités">
    <YDemo label="Zone de dépôt : repos & glisser-déposer actif">
      <div style={{ border: "2px dashed var(--gj-line-strong)", borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "var(--gj-bg)", flex: "1 1 220px", textAlign: "center" }}>
        <span style={{ width: 46, height: 46, borderRadius: 12, background: "#fff", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-upload" /></svg></span>
        <div style={{ fontSize: 13, fontWeight: 800, color: yInk }}>Glisse ton fichier ici</div>
        <div style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>ou <span style={{ color: "var(--gj-teal-deep)", fontWeight: 800 }}>parcourir</span> · PDF, JPG · 5 Mo max</div>
      </div>
      <div style={{ border: "2px dashed var(--gj-teal-deep)", borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "var(--gj-teal-soft)", flex: "1 1 220px", textAlign: "center" }}>
        <span style={{ width: 46, height: 46, borderRadius: 12, background: "var(--gj-teal-deep)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-download" /></svg></span>
        <div style={{ fontSize: 13, fontWeight: 900, color: "var(--gj-teal-deep)" }}>Dépose pour téléverser</div>
        <div style={{ fontSize: 11.5, color: "var(--gj-teal-deep)" }}>Relâche le fichier</div>
      </div>
    </YDemo>
    <YDemo label="États d'un fichier" col>
      {/* uploading */}
      <FileRow icon="i-document" bg="var(--gj-blue-soft)" color="var(--gj-blue-ink)" name="CV_Awa_Diop.pdf" meta="Téléversement… 1,2 Mo / 2,4 Mo"
        right={<div style={{ width: 90, display: "flex", flexDirection: "column", gap: 4 }}><div style={{ height: 6, background: "var(--gj-bg)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: "52%", background: "var(--gj-blue)", borderRadius: 3 }} /></div><span style={{ fontSize: 11, color: "var(--gj-grey)", textAlign: "right", fontWeight: 700 }}>52%</span></div>} />
      {/* success */}
      <FileRow icon="i-document" bg="var(--gj-green-soft)" color="var(--gj-green-ink)" border="var(--gj-green)" name="CV_Awa_Diop.pdf" meta="Ajouté · 2,4 Mo"
        right={<div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "3px 9px", borderRadius: 999 }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg>Ajouté</span><button style={{ width: 30, height: 30, border: "1.5px solid var(--gj-line)", borderRadius: 8, background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Supprimer"><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-close" /></svg></button></div>} />
      {/* verified by Yaye */}
      <FileRow icon="i-document" bg="var(--gj-teal-soft)" color="var(--gj-teal-deep)" border="var(--gj-teal)" name="Diplôme_Licence.pdf" meta="Vérifié par Yaye · lisible & valide"
        right={<span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)", background: "var(--gj-teal-soft)", padding: "4px 10px", borderRadius: 999 }}><span style={{ fontFamily: "var(--gj-font-sans)", fontWeight: 900 }}>Y</span>Vérifié</span>} />
      {/* error format */}
      <FileRow icon="i-alert" bg="var(--gj-red-soft)" color="var(--gj-red-ink)" border="var(--gj-red)" name="photo.heic" meta="Format non supporté — utilise PDF ou JPG"
        right={<button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "7px 12px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Réessayer</button>} />
      {/* error size */}
      <FileRow icon="i-alert" bg="var(--gj-red-soft)" color="var(--gj-red-ink)" border="var(--gj-red)" name="scan_dossier.pdf" meta="Trop volumineux (8,1 Mo) — 5 Mo max"
        right={<button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "7px 12px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Compresser</button>} />
    </YDemo>
    <YDemo label="Check-list des pièces du dossier" col>
      <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden", maxWidth: 520 }}>
        {[
          ["CV", "ok", "Ajouté & vérifié"],
          ["Lettre de motivation", "ok", "Générée par Yaye"],
          ["Pièce d'identité (CNI)", "missing", "Requis — non fourni"],
          ["Justificatif de domicile", "optional", "Facultatif"],
          ["Diplôme", "rejected", "Illisible — à reprendre"],
        ].map(([label, st, meta], i, arr) => {
          const map = { ok: ["var(--gj-green)", "i-check", "var(--gj-green-soft)", "var(--gj-green-ink)"], missing: ["var(--gj-yellow-deep)", "i-plus", "var(--gj-yellow-soft)", "var(--gj-yellow-ink)"], optional: ["var(--gj-grey-2)", "i-document", "var(--gj-bg)", "var(--gj-grey)"], rejected: ["var(--gj-red)", "i-close", "var(--gj-red-soft)", "var(--gj-red-ink)"] }[st];
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderBottom: i < arr.length - 1 ? "1px solid var(--gj-line)" : 0 }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: map[0], color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href={"#" + map[1]} /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 800, color: yInk }}>{label}</div><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{meta}</div></div>
              {st === "missing" && <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "7px 13px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Ajouter</button>}
              {st === "rejected" && <button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "7px 13px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Reprendre</button>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gj-yellow-soft)", borderRadius: 11, padding: "11px 14px", maxWidth: 520 }}>
        <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-yellow-ink)", flexShrink: 0 }}><use href="#i-info" /></svg>
        <div style={{ flex: 1, fontSize: 12, color: "var(--gj-yellow-ink)", fontWeight: 600 }}>Dossier à <b>60 %</b> — il manque la CNI et un diplôme lisible.</div>
        <span style={{ fontSize: 12.5, fontWeight: 900, color: "var(--gj-yellow-ink)" }}>3/5</span>
      </div>
    </YDemo>
  </YBlock>
);

// ===== FORMULAIRE DE CANDIDATURE =====
const ApplyForm = () => {
  const inp = { width: "100%", minHeight: 46, border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "0 13px", fontSize: 14, fontFamily: "inherit", color: yInk, background: "var(--gj-bg)", outline: "none" };
  const lbl = (t, req) => <span style={{ fontSize: 11.5, fontWeight: 800, color: yInk, marginBottom: 6, display: "block" }}>{t}{req && <span style={{ color: "var(--gj-red)" }}> *</span>}</span>;
  return (
    <YBlock title="Formulaire de candidature" sub="Adapté à l'opportunité : champs requis, dépôt de pièces, et envoi avec récap. Yaye peut pré-remplir.">
      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: "1px solid var(--gj-teal)", borderRadius: 12, padding: "11px 13px" }}>
          <YayeAvatar size={30} /><div style={{ flex: 1, fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>J'ai pré-rempli tes infos depuis ton profil. Vérifie et complète ce qui manque.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label>{lbl("Prénom", true)}<input defaultValue="Awa" style={inp} aria-label="Prénom" /></label>
          <label>{lbl("Nom", true)}<input defaultValue="Diop" style={inp} aria-label="Nom" /></label>
          <label>{lbl("Téléphone", true)}<input defaultValue="+221 77 123 45 67" style={inp} aria-label="Téléphone" /></label>
          <label>{lbl("Région", true)}<div style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between" }}>Tambacounda<svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-grey)" }}><use href="#i-chevron-down" /></svg></div></label>
        </div>
        <label>{lbl("Motivation (quelques lignes)", true)}<textarea rows={3} defaultValue="Mon projet de maraîchage…" style={{ ...inp, minHeight: "auto", padding: "11px 13px", resize: "none", lineHeight: 1.5 }} aria-label="Motivation" /></label>
        <div>
          {lbl("Pièces à joindre", true)}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <FileRow icon="i-document" bg="var(--gj-green-soft)" color="var(--gj-green-ink)" border="var(--gj-green)" name="CV_Awa_Diop.pdf" meta="Ajouté · 2,4 Mo" right={<span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)" }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-check" /></svg></span>} />
            <div style={{ border: "2px dashed var(--gj-line-strong)", borderRadius: 11, padding: "13px", display: "flex", alignItems: "center", gap: 11, background: "var(--gj-bg)" }}>
              <span style={{ width: 36, height: 36, borderRadius: 9, background: "#fff", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-upload" /></svg></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: yInk }}>Pièce d'identité (CNI)</div><div style={{ fontSize: 11, color: "var(--gj-grey)" }}>Requis · PDF ou JPG</div></div>
              <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "8px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Ajouter</button>
            </div>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", marginTop: 1 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg></span>
          <span style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.5 }}>J'autorise le partage de ma candidature avec l'organisme et le Guichet Jeunesse.</span>
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", minHeight: 48, padding: "0 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Enregistrer</button>
          <button style={{ flex: 1, background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 48, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg>Soumettre ma candidature</button>
        </div>
      </div>
    </YBlock>
  );
};

const YayeKitWeb = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <YayeIdentity /><YayeBubbles /><YayeActionCard /><YayeMisc /><OppTypesLegend /><Opportunities /><ApplyForm /><FileDeposit />
  </div>
);

Object.assign(window, { YayeKitWeb, YayeAvatar, YayeWordmark, IaBadge, TypingDots, OppCard, OPP_TYPES });
