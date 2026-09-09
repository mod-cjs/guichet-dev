/* eslint-disable */
// Lot 15 — Yaye · Opportunités · Dépôt de dossier — MOBILE (390×844).
// Réutilise PhoneFrame, AppHeader. Écrans complets dans des cadres téléphone.

const ymAv = (size = 38) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #19a657 0%, #027f7e 100%)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: size * 0.5, boxShadow: "0 0 0 2px rgba(255,255,255,.25)" }}>Y</span>
);
const ymHead = () => (
  <div style={{ background: "var(--gj-teal-deep)", color: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", gap: 11, flexShrink: 0, position: "relative" }}>
    {ymAv(38)}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontFamily: "var(--gj-font-sans)", fontWeight: 900, fontSize: 18, background: "linear-gradient(135deg,#fff,var(--gj-yellow))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Yaye</span><span style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "2px 6px", borderRadius: 999 }}>IA</span></div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>Ton assistant Guichet Jeunesse</div>
    </div>
    <button style={{ width: 34, height: 34, borderRadius: 8, border: 0, background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Fermer"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-close" /></svg></button>
    <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "linear-gradient(90deg, var(--gj-yellow) 0%, var(--gj-yellow) 25%, transparent 25%)" }} />
  </div>
);

// 1 — CONVERSATION
const YayeMobChat = () => {
  const bot = { maxWidth: "84%", alignSelf: "flex-start", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "16px 16px 16px 4px", padding: "10px 13px", fontSize: 14, lineHeight: 1.5, color: "var(--gj-ink)" };
  const user = { maxWidth: "84%", alignSelf: "flex-end", background: "var(--gj-teal-deep)", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "10px 13px", fontSize: 14, lineHeight: 1.5 };
  return (
    <PhoneFrame>
      {ymHead()}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 999, padding: "3px 10px" }}>Aujourd'hui</span>
        <div style={bot}>Bonjour Awa. J'ai repéré 3 opportunités qui correspondent à ton parcours en maraîchage.</div>
        <div style={user}>Montre-moi celle avec un financement</div>
        {/* action card — typée (bourse) */}
        <div style={{ maxWidth: "92%", alignSelf: "flex-start", background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: "var(--cat-financement-soft)", padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--gj-line)" }}><span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: "#f8a309", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-funding" /></svg></span><span style={{ fontSize: 11.5, fontWeight: 900, color: "#f8a309", textTransform: "uppercase", letterSpacing: ".4px" }}>Bourse</span><span style={{ flex: 1 }} /><span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "#f8a309" }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-clock" /></svg>Dépôt J-12</span></div>
          <div style={{ padding: "11px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div><div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.25 }}>Bourse maraîchage · DER</div><div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 3, display: "flex", gap: 11, flexWrap: "wrap" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><svg className="gj-icon" style={{ width: 11, height: 11, color: "var(--gj-grey-2)" }}><use href="#i-users" /></svg>DER/FJ</span><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><svg className="gj-icon" style={{ width: 11, height: 11, color: "var(--gj-grey-2)" }}><use href="#i-pin" /></svg>Tambacounda</span></div></div>
            <div style={{ display: "flex", gap: 8, background: "var(--gj-teal-soft)", borderRadius: 10, padding: "8px 10px", alignItems: "flex-start" }}>{ymAv(20)}<div style={{ flex: 1, fontSize: 11.5, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>Ton projet maraîchage colle bien — prépare ton attestation de scolarité.</div></div>
            <button style={{ background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 2, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>Soumettre un dossier<svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-arrow-right" /></svg></button>
          </div>
        </div>
        {/* quick replies */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-start", maxWidth: "84%", marginTop: 4 }}>
          {["Aide-moi à monter le dossier", "Autres bourses ?"].map(t => <button key={t} style={{ background: "#fff", border: "1.5px solid var(--gj-teal-deep)", color: "var(--gj-teal-deep)", borderRadius: 999, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-sparkle" /></svg>{t}</button>)}
        </div>
        {/* demande : envoyer la carte CJS */}
        <div style={user}>Envoie-moi ma carte CJS</div>
        <div style={bot}>Bien sûr, la voici. Présente le QR à l'accueil d'un centre.</div>
        <div style={{ alignSelf: "flex-start", maxWidth: "94%", width: "94%" }}>
          <MyCJSCard />
          <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
            <button style={{ flex: 1, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-teal-deep)", borderRadius: 9, minHeight: 40, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-download" /></svg>Portefeuille</button>
            <button style={{ flex: 1, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-teal-deep)", borderRadius: 9, minHeight: 40, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-arrow-right" /></svg>Voir le verso</button>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#fff", borderTop: "1px solid var(--gj-line)", flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 6px 0 16px", minHeight: 44, background: "var(--gj-bg)" }}><span style={{ flex: 1, fontSize: 14, color: "var(--gj-grey-2)" }}>Écris ton message…</span>{/* Saisie vocale retirée pour l'instant : la barre n'accepte que l'écrit. */}</div>
        <button style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Envoyer"><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-arrow-right" /></svg></button>
      </div>
    </PhoneFrame>
  );
};

// 2 — ACCUEIL / SUGGESTIONS (état vide)
const YayeMobHome = () => (
  <PhoneFrame>
    {ymHead()}
    <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: "26px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <span style={{ position: "relative", display: "inline-flex", marginTop: 10 }}><span style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "2px solid var(--gj-teal)", opacity: .3 }} />{ymAv(72)}</span>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 19, fontWeight: 900, color: "var(--gj-ink)" }}>Salam Awa</div><div style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 5, lineHeight: 1.5, maxWidth: 290 }}>Dis-moi où tu en es, je t'oriente vers la bonne opportunité et je t'aide à monter ton dossier.</div></div>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9, marginTop: 6 }}>
        {[["i-target", "Je cherche une opportunité", "emploi, stage, bourse…"], ["i-document", "Préparer ma candidature", "CV, lettre, dossier"], ["i-resources", "Me former ou me reconvertir", "formations près de moi"], ["i-funding", "Financer mon projet", "subventions & concours"]].map(([ic, t, sub]) => (
          <button key={t} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: "13px 15px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + ic} /></svg></span><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{t}</span><span style={{ display: "block", fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{sub}</span></span><svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)" }}><use href="#i-chevron-right" /></svg>
          </button>
        ))}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#fff", borderTop: "1px solid var(--gj-line)", flexShrink: 0 }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 16px", minHeight: 44, background: "var(--gj-bg)" }}><span style={{ flex: 1, fontSize: 14, color: "var(--gj-grey-2)" }}>Pose ta question à Yaye…</span></div>
      <button style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Micro"><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-play" /></svg></button>
    </div>
  </PhoneFrame>
);

// 3 — OPPORTUNITÉS (liste + reco Yaye)
const OppMobScreen = () => {
  const opp = (typeKey, title, org, lieu, duree, conseil, remu, action) => {
    const t = OPP_TYPES[typeKey];
    return (
      <div key={title} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
        {/* en-tête : type + durée */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: t.c, background: t.soft, padding: "4px 10px", borderRadius: 999 }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + t.icon} /></svg>{t.label}</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href="#i-clock" /></svg>{duree}</span>
        </div>
        {/* titre + méta */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.3 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 5, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href="#i-users" /></svg>{org}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href="#i-pin" /></svg>{lieu}</span>
          </div>
        </div>
        {/* conseil Yaye */}
        <div style={{ display: "flex", gap: 9, background: "var(--gj-teal-soft)", borderRadius: 10, padding: "9px 11px", alignItems: "flex-start" }}>{ymAv(22)}<div style={{ flex: 1, fontSize: 11.5, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>{conseil}</div></div>
        {/* pied : rémunération (si présente) + action */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 11, borderTop: "1px solid var(--gj-line)" }}>
          {remu && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-funding" /></svg>{remu}</span>}
          <span style={{ flex: 1 }} />
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-action)", color: "#fff", border: 0, padding: "9px 16px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>{action || "Voir"}<svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-arrow-right" /></svg></button>
        </div>
      </div>
    );
  };
  return (
    <PhoneFrame>
      <AppHeader title="Opportunités" onBack={() => {}} trailing={<button style={{ width: 38, height: 38, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)", flexShrink: 0 }} aria-label="Filtrer"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-filter" /></svg></button>} />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 0 10px" }}><div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 14px" }}>{["Pour toi", "Emploi", "Stage", "Bourse", "Formation", "Concours"].map((c, i) => <span key={c} style={{ flexShrink: 0, padding: "8px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>)}</div></div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)" }}>
        <div style={{ display: "flex", gap: 10, background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: "1px solid var(--gj-teal)", borderRadius: 13, padding: 12 }}>{ymAv(32)}<div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-teal-deep)" }}><span style={{ fontFamily: "var(--gj-font-sans)" }}>Le conseil de Yaye</span></div><div style={{ fontSize: 11.5, color: "var(--gj-ink)", marginTop: 3 }}>Voici les opportunités les plus proches de ton parcours cette semaine.</div></div></div>
        {opp("stage", "Stage en agronomie · maraîchage", "GIE Diaobé", "Tambacounda", "6 mois", "Aligné avec ton objectif et proche de chez toi.", "180 000 F/mois", "Postuler")}
        {opp("emploi", "Animateur communautaire", "CJS Tambacounda", "Tambacounda", "CDD · 12 mois", "Valorise ton expérience de bénévolat.", "120 000 F/mois", "Postuler")}
        {opp("bourse", "Programme mobilité numérique", "Min. Ens. Sup.", "National", "Année 2026", "Pense à joindre ton relevé de notes — je t'aide.", null, "Soumettre un dossier")}
        {opp("financement", "Subvention de démarrage agricole", "DER/FJ", "National", "Dépôt continu", "Ton plan maraîchage est un bon point de départ.", "jusqu'à 1,5 M F", "Déposer ma demande")}
        {opp("volontariat", "Volontariat reboisement", "Eaux & Forêts", "Kédougou", "2 mois", "Une belle première expérience de terrain.", null, "Rejoindre")}
        {opp("formation", "Initiation maraîchage moderne", "CJS Tambacounda", "Présentiel", "3 semaines", "Idéal avant de te lancer dans l'entrepreneuriat.", null, "S'inscrire")}
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// 4 — DÉPÔT DE DOSSIER (états)
const FileMobScreen = () => {
  const fileRow = (icon, bg, color, border, name, meta, right) => (
    <div key={name} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", border: `1.5px solid ${border}`, borderRadius: 11, background: "#fff" }}>
      <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: bg, color: color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + icon} /></svg></span>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>{name}</div><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{meta}</div></div>
      {right}
    </div>
  );
  return (
    <PhoneFrame>
      <AppHeader title="Mon dossier" subtitle="Bourse maraîchage · 3/5" onBack={() => {}} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)" }}>
        {/* progress */}
        <div style={{ background: "var(--gj-yellow-soft)", border: "1.5px solid var(--gj-yellow)", borderRadius: 12, padding: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 800, marginBottom: 7 }}><span style={{ color: "var(--gj-ink)" }}>Dossier complété</span><span style={{ color: "var(--gj-yellow-ink)" }}>60 %</span></div>
          <div style={{ height: 7, background: "#fff", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: "60%", background: "var(--gj-yellow-deep)" }} /></div>
        </div>
        {/* dropzone */}
        <div style={{ border: "2px dashed var(--gj-line-strong)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "#fff", textAlign: "center" }}>
          <span style={{ width: 42, height: 42, borderRadius: 11, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-upload" /></svg></span>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>Ajouter un document</div>
          <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>PDF, JPG · 5 Mo max</div>
        </div>
        {/* states */}
        {fileRow("i-document", "var(--gj-green-soft)", "var(--gj-green-ink)", "var(--gj-green)", "CV_Awa_Diop.pdf", "Ajouté · 2,4 Mo", <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "3px 8px", borderRadius: 999, flexShrink: 0 }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg>OK</span>)}
        {fileRow("i-document", "var(--gj-teal-soft)", "var(--gj-teal-deep)", "var(--gj-teal)", "Lettre_motivation.pdf", "Générée par Yaye", <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)", background: "var(--gj-teal-soft)", padding: "3px 8px", borderRadius: 999, flexShrink: 0 }}><span style={{ fontFamily: "var(--gj-font-sans)", fontWeight: 900 }}>Y</span>Vérifié</span>)}
        {fileRow("i-document", "var(--gj-blue-soft)", "var(--gj-blue-ink)", "var(--gj-line)", "Diplome.pdf", "Téléversement… 70%", <div style={{ width: 60, height: 6, background: "var(--gj-bg)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}><div style={{ height: "100%", width: "70%", background: "var(--gj-blue)" }} /></div>)}
        {fileRow("i-alert", "var(--gj-red-soft)", "var(--gj-red-ink)", "var(--gj-red)", "CNI_photo.heic", "Format non supporté", <button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "6px 11px", borderRadius: 8, fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Reprendre</button>)}
        {/* missing required */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", border: "1.5px dashed var(--gj-yellow-deep)", borderRadius: 11, background: "var(--gj-yellow-soft)" }}>
          <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: "#fff", color: "var(--gj-yellow-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-plus" /></svg></span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>Pièce d'identité (CNI)</div><div style={{ fontSize: 11, color: "var(--gj-yellow-ink)", marginTop: 1 }}>Requis — non fourni</div></div>
          <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "7px 13px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Ajouter</button>
        </div>
      </div>
      <div style={{ padding: 14, background: "#fff", borderTop: "1px solid var(--gj-line)", flexShrink: 0 }}>
        <button disabled style={{ width: "100%", background: "var(--gj-line)", color: "var(--gj-grey-2)", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, cursor: "not-allowed", fontFamily: "inherit" }}>Envoyer le dossier (2 manquants)</button>
      </div>
    </PhoneFrame>
  );
};

// 5 — FORMULAIRE DE CANDIDATURE
const ApplyMobScreen = () => {
  const inp = { width: "100%", minHeight: 48, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", fontSize: 16, fontFamily: "inherit", color: "var(--gj-ink)", background: "#fff", outline: "none" };
  const lbl = (t, req) => <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 6, display: "block" }}>{t}{req && <span style={{ color: "var(--gj-red)" }}> *</span>}</span>;
  return (
    <PhoneFrame>
      <AppHeader title="Postuler" subtitle="Stage en agronomie · maraîchage" onBack={() => {}} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
        <div style={{ display: "flex", gap: 9, background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: "1px solid var(--gj-teal)", borderRadius: 12, padding: "11px 12px" }}>{ymAv(28)}<div style={{ flex: 1, fontSize: 11.5, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>J'ai pré-rempli tes infos depuis ton profil. Vérifie et complète.</div></div>
        <label>{lbl("Prénom & nom", true)}<input defaultValue="Awa Diop" style={inp} aria-label="Prénom et nom" /></label>
        <label>{lbl("Téléphone", true)}<input defaultValue="+221 77 123 45 67" style={inp} aria-label="Téléphone" /></label>
        <label>{lbl("Motivation", true)}<textarea rows={3} defaultValue="Mon projet de maraîchage…" style={{ ...inp, minHeight: "auto", padding: "12px 14px", resize: "none", lineHeight: 1.5 }} aria-label="Motivation" /></label>
        <div>
          {lbl("Pièces à joindre", true)}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1.5px solid var(--gj-green)", borderRadius: 11, background: "#fff" }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-document" /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>CV_Awa_Diop.pdf</div><div style={{ fontSize: 11, color: "var(--gj-green-ink)", marginTop: 1 }}>Ajouté · 2,4 Mo</div></div>
              <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-green)" }}><use href="#i-check-circle" /></svg>
            </div>
            <div style={{ border: "2px dashed var(--gj-line-strong)", borderRadius: 11, padding: "12px", display: "flex", alignItems: "center", gap: 10, background: "#fff" }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--gj-bg)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-upload" /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>Pièce d'identité</div><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>Requis · PDF, JPG</div></div>
              <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "7px 13px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Ajouter</button>
            </div>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", marginTop: 1 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg></span>
          <span style={{ fontSize: 11.5, color: "var(--gj-grey)", lineHeight: 1.5 }}>J'autorise le partage de ma candidature avec l'organisme.</span>
        </label>
      </div>
      <div style={{ padding: 14, background: "#fff", borderTop: "1px solid var(--gj-line)", flexShrink: 0 }}>
        <button style={{ width: "100%", background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-check" /></svg>Soumettre ma candidature</button>
      </div>
    </PhoneFrame>
  );
};

Object.assign(window, { YayeMobChat, YayeMobHome, OppMobScreen, FileMobScreen, ApplyMobScreen });
