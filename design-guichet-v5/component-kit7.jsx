/* eslint-disable */
// Lot 14 — Écrans mobiles manquants : charte, règles, fondations, données,
// états, composants signature, pastilles & avatars.

const mkSec = { fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" };
const mkCard = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 14, display: "flex", flexDirection: "column", gap: 11 };
const mkScroll = { flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 16, display: "flex", flexDirection: "column", gap: 16 };

const MobCharte = () => (
  <PhoneFrame>
    <AppHeader title="Charte Yaakaar 2030" onBack={() => {}} />
    <div style={mkScroll}>
      <div style={mkCard}>
        <span style={mkSec}>Palette officielle</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[["#f8a309", "Ambre"], ["#ee6f21", "Orange"], ["#ae0057", "Magenta"], ["#1e35ba", "Indigo"], ["#fc3241", "Rouge"], ["#fe1c66", "Rose"], ["#139ce8", "Cyan"], ["#19a657", "Vert"], ["#027f7e", "Teal"], ["#162c5e", "Navy"], ["#202020", "Noir"], ["#FFFFFF", "Blanc"]].map(([hex, n]) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ height: 40, borderRadius: 9, background: hex, border: "1px solid rgba(0,0,0,.08)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gj-grey)" }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Typographie · Lexend</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[["Titre d'écran", 22, 900], ["Titre de carte", 16, 800], ["Libellé", 13, 700], ["Corps de texte", 16, 400]].map(([l, s, w]) => (
            <div key={l} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: s, fontWeight: w, color: "var(--gj-ink)", flex: 1 }}>{l}</span>
              <span style={{ fontSize: 11, color: "var(--gj-grey)", fontWeight: 700 }}>{s}·{w}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Contraste en plein soleil</span>
        <div style={{ background: "#f8a309", color: "var(--gj-ink)", fontWeight: 800, fontSize: 13, padding: "11px 13px", borderRadius: 10 }}>Aplat vif · texte noir</div>
        <div style={{ background: "#7A4E02", color: "#fff", fontWeight: 800, fontSize: 13, padding: "11px 13px", borderRadius: 10 }}>Variante assombrie · texte blanc</div>
      </div>
    </div>
  </PhoneFrame>
);

const MobRegles = () => (
  <PhoneFrame>
    <AppHeader title="Règles design V3" onBack={() => {}} />
    <div style={mkScroll}>
      <div style={mkCard}>
        <span style={mkSec}>Une seule action par écran</span>
        <button style={{ background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, fontFamily: "inherit" }}>Postuler maintenant</button>
        <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line-strong)", minHeight: 48, borderRadius: 11, fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Enregistrer l'offre</button>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Type et urgence séparés</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="gj-cat gj-cat--stage">Stage</span>
          <span className="gj-urgent"><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />J-3</span>
          <span className="gj-cat gj-cat--formation">Formation</span>
          <span className="gj-cat gj-cat--financement">Financement</span>
        </div>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Zone de dépôt photo</span>
        <div style={{ height: 120, borderRadius: 11, overflow: "hidden" }}>
          <image-slot id="kit-mob-photo" shape="rounded" radius="11" fit="cover" placeholder="Photo réelle — jeune en formation"></image-slot>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

const MobFoundations = () => (
  <PhoneFrame>
    <AppHeader title="Fondations" onBack={() => {}} />
    <div style={mkScroll}>
      <div style={mkCard}>
        <span style={mkSec}>Zones tactiles</span>
        {[["Confortable", 52], ["Standard", 48], ["Dense", 44]].map(([l, h]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: h, height: h, borderRadius: 10, background: "var(--gj-teal-soft)", border: "1.5px dashed var(--gj-teal)", flexShrink: 0 }} />
            <div><div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{l}</div><div style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>{h} px — minimum 44</div></div>
          </div>
        ))}
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Rayons & élévations</span>
        <div style={{ display: "flex", gap: 10 }}>
          {[["8", "0 1px 2px rgba(0,0,0,.06)"], ["13", "0 4px 12px rgba(0,0,0,.08)"], ["20", "0 12px 28px rgba(0,0,0,.12)"]].map(([r, sh]) => (
            <div key={r} style={{ flex: 1, height: 62, borderRadius: Number(r), background: "#fff", boxShadow: sh, border: "1px solid var(--gj-line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "var(--gj-grey)" }}>{r}px</div>
          ))}
        </div>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Espacements</span>
        {[4, 8, 12, 16, 24].map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ height: 10, width: s * 4, background: "var(--gj-teal)", borderRadius: 3 }} />
            <span style={{ fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 700 }}>{s} px</span>
          </div>
        ))}
      </div>
    </div>
  </PhoneFrame>
);

const MobData = () => (
  <PhoneFrame>
    <AppHeader title="Données & progression" onBack={() => {}} />
    <div style={mkScroll}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["Candidatures", "12", "i-document"], ["Entretiens", "3", "i-calendar"], ["Formations", "2", "i-learning"], ["Réponses", "58%", "i-trending"]].map(([l, v, ic]) => (
          <div key={l} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 13 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href={"#" + ic} /></svg></span>
            <div style={{ fontSize: 22, fontWeight: 900, color: "var(--gj-ink)", lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Profil complété</span>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ flex: 1, height: 10, borderRadius: 999, background: "var(--gj-bg)", overflow: "hidden" }}><div style={{ width: "72%", height: "100%", background: "var(--gj-teal-deep)" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 900, color: "var(--gj-teal-deep)" }}>72%</span>
        </div>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Suivi de candidature</span>
        {[["Envoyée", true], ["Vue par l'employeur", true], ["Entretien", false], ["Réponse", false]].map(([l, done], i, arr) => (
          <div key={l} style={{ display: "flex", gap: 11 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "var(--gj-green)" : "#fff", border: done ? 0 : "2px solid var(--gj-line-strong)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{done && <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg>}</span>
              {i < arr.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 16, background: "var(--gj-line)" }} />}
            </div>
            <span style={{ fontSize: 13.5, fontWeight: done ? 800 : 600, color: done ? "var(--gj-ink)" : "var(--gj-grey)", paddingBottom: 10 }}>{l}</span>
          </div>
        ))}
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Répartition par domaine</span>
        {[["Agriculture", 48, "var(--cat-formation)"], ["Numérique", 31, "var(--cat-emploi)"], ["Artisanat", 21, "var(--cat-financement)"]].map(([l, p, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gj-ink)", width: 84 }}>{l}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--gj-bg)", overflow: "hidden" }}><div style={{ width: p + "%", height: "100%", background: c }} /></div>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-grey)", width: 30, textAlign: "right" }}>{p}%</span>
          </div>
        ))}
      </div>
    </div>
  </PhoneFrame>
);

const MobEtats = () => (
  <PhoneFrame>
    <AppHeader title="États & feedback" onBack={() => {}} />
    <div style={mkScroll}>
      {[["i-check", "var(--gj-green-soft)", "var(--gj-green-ink)", "Candidature envoyée", "Tu recevras une réponse par SMS."],
        ["i-info", "var(--gj-blue-soft)", "var(--gj-blue-ink)", "Profil en cours de vérification", "Un conseiller le valide sous 48 h."],
        ["i-alert", "var(--gj-red-soft)", "var(--gj-red-ink)", "Document illisible", "Reprends la photo à la lumière du jour."]].map(([ic, bg, fg, t, s]) => (
        <div key={t} style={{ display: "flex", gap: 11, background: bg, borderRadius: 12, padding: 13 }}>
          <svg className="gj-icon" style={{ width: 19, height: 19, color: fg, flexShrink: 0, marginTop: 1 }}><use href={"#" + ic} /></svg>
          <div><div style={{ fontSize: 13.5, fontWeight: 800, color: fg }}>{t}</div><div style={{ fontSize: 12.5, color: fg, opacity: .9, marginTop: 2, lineHeight: 1.45 }}>{s}</div></div>
        </div>
      ))}
      <div style={mkCard}>
        <span style={mkSec}>Chargement</span>
        {[70, 100, 45].map((w, i) => <span key={i} style={{ height: 12, width: w + "%", borderRadius: 5, background: "var(--gj-line)" }} />)}
      </div>
      <div style={{ ...mkCard, alignItems: "center", textAlign: "center", padding: "26px 18px" }}>
        <span style={{ width: 56, height: 56, borderRadius: 16, background: "var(--gj-bg)", color: "var(--gj-grey-2)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 26, height: 26 }}><use href="#i-search" /></svg></span>
        <div><div style={{ fontSize: 15, fontWeight: 800, color: "var(--gj-ink)" }}>Aucun résultat</div><div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 4, lineHeight: 1.45 }}>Élargis ta recherche à toute la région.</div></div>
        <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 46, borderRadius: 10, padding: "0 18px", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Élargir la recherche</button>
      </div>
      <div style={{ display: "inline-flex", alignSelf: "center", alignItems: "center", gap: 9, background: "var(--gj-ink-teal)", color: "#fff", padding: "11px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--gj-green)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg></span>
        Offre enregistrée
      </div>
    </div>
  </PhoneFrame>
);

const MobSignature = () => (
  <PhoneFrame>
    <AppHeader title="Composants signature" onBack={() => {}} />
    <div style={mkScroll}>
      {/* Carte CJS — composant officiel du design system (cjs-card.jsx).
          Fluide depuis la mise à l'échelle du QR en pourcentage : plus besoin
          de marges négatives pour lui donner sa largeur de conception. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={mkSec}>Carte CJS · recto</span>
        <MyCJSCard />
        <span style={mkSec}>Verso</span>
        <MyCJSCardBack />
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Assistant Yaye</span>
        <div style={{ display: "flex", gap: 10, background: "var(--gj-teal-soft)", borderRadius: 12, padding: 12 }}>
          <span style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "var(--gj-yaye-gradient)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15 }}>Y</span>
          <div style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>Trois bourses correspondent à ton projet de maraîchage.</div>
        </div>
      </div>
      {/* Carte du Sénégal — composant partagé (centres-data.jsx) */}
      <div style={mkCard}>
        <span style={mkSec}>Localisation des centres</span>
        <SenegalMap pins={centrePins("tamba")} height={210} />
        <div><div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>Centre CJS Tambacounda</div><div style={{ fontSize: 12, color: "var(--gj-grey)" }}>à 1,2 km · ouvert jusqu'à 18 h</div></div>
      </div>
    </div>
  </PhoneFrame>
);

const MobBadges = () => (
  <PhoneFrame>
    <AppHeader title="Pastilles & avatars" onBack={() => {}} />
    <div style={mkScroll}>
      <div style={mkCard}>
        <span style={mkSec}>Catégories d'offre</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["emploi", "stage", "formation", "financement", "evenement"].map((c) => <span key={c} className={"gj-cat gj-cat--" + c}>{c}</span>)}
        </div>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Statuts</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["Validée", "var(--gj-green-soft)", "var(--gj-green-ink)"], ["En attente", "var(--gj-yellow-soft)", "var(--gj-yellow-ink)"], ["Refusée", "var(--gj-red-soft)", "var(--gj-red-ink)"], ["Brouillon", "var(--cat-neutre-soft)", "var(--cat-neutre-ink)"]].map(([l, bg, fg]) => (
            <span key={l} style={{ fontSize: 11, fontWeight: 800, background: bg, color: fg, padding: "5px 11px", borderRadius: 999 }}>{l}</span>
          ))}
        </div>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Avatars</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {[["AD", 56], ["MS", 44], ["IF", 36], ["OB", 30]].map(([i, s]) => (
            <span key={i} style={{ width: s, height: s, borderRadius: "50%", background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: s * 0.36 }}>{i}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ position: "relative", width: 44, height: 44 }}>
            <span style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--gj-yellow), var(--gj-yellow-deep))", color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>MS</span>
            <span style={{ position: "absolute", right: -1, bottom: -1, width: 13, height: 13, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} />
          </span>
          <span style={{ fontSize: 12.5, color: "var(--gj-grey)" }}>Conseiller · en ligne</span>
        </div>
      </div>
      <div style={mkCard}>
        <span style={mkSec}>Compteurs</span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {["3", "12", "99+"].map((n) => <span key={n} style={{ minWidth: 22, height: 22, padding: "0 7px", borderRadius: 999, background: "var(--gj-red)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>)}
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gj-red)" }} />
        </div>
      </div>
    </div>
  </PhoneFrame>
);

Object.assign(window, { MobCharte, MobRegles, MobFoundations, MobData, MobEtats, MobSignature, MobBadges });
