/* eslint-disable */
// Lot 14 — Conversation IA : les briques d'un échange avec Yaye.
// Palette charte : teal pour la marque et la voix de l'utilisateur, ambre pour
// l'accent IA, magenta réservé à l'action de conversion, rouge à l'erreur.

const CONV_INK = "var(--gj-ink)";

const ConvStyle = () => (
  <style>{"@keyframes gj-conv-dot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-4px);opacity:1}}"
    + "@keyframes gj-conv-spin{to{transform:rotate(360deg)}}"
    + "@keyframes gj-conv-caret{0%,49%{opacity:1}50%,100%{opacity:0}}"
    + "@keyframes gj-conv-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}"
    + "html.gjm .gj-conv-anim{animation:none!important}"}</style>
);

// --------------------------------------------------------------------
// Réflexion visible de l'agent : les étapes du raisonnement s'affichent une
// par une pendant la latence. C'est ce qui fait tenir l'attente : le jeune
// voit CE QUE Yaye fait, au lieu d'une pastille de frappe muette.
// --------------------------------------------------------------------
const THINK_STEPS = [
  ["Je relis ton profil", "m\u00e9tier, r\u00e9gion, dipl\u00f4me"],
  ["Je filtre les offres ouvertes", "142 offres actives"],
  ["J'\u00e9carte celles qui ferment trop t\u00f4t", "11 offres \u00e9cart\u00e9es"],
  ["Je garde les 3 plus proches", "pr\u00eat"],
];

// Le réglage « animations réduites » (classe gjm) ne coupe que les animations
// CSS : il faut aussi arrêter les minuteries, sinon le texte continue de
// s'écrire mot à mot pour qui a demandé l'inverse.
const convReducedMotion = () =>
  (typeof document !== "undefined" && document.documentElement.classList.contains("gjm")) ||
  (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const ConvThinking = ({ auto = true, done = 2 }) => {
  const reduced = convReducedMotion();
  const [step, setStep] = React.useState(auto && !reduced ? 0 : done);
  React.useEffect(() => {
    if (!auto || reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % (THINK_STEPS.length + 2)), 1100);
    return () => clearInterval(id);
  }, [auto, reduced]);
  return (
    <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, maxWidth: "92%" }}>
      <YayeMark size={28} />
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "16px 16px 16px 4px", padding: "11px 14px", display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
        {/* En-tête au passé dès que la trace est terminée : un état terminal ne
            peut pas dire « je cherche », et le disque tournant sur un écran
            au repos consomme du processeur pour rien. */}
        {step >= THINK_STEPS.length ? (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 900, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>
            <svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-green-ink)" }}><use href="#i-check" /></svg>
            J'ai cherché
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 900, color: "var(--gj-teal-deep)", textTransform: "uppercase", letterSpacing: ".4px" }}>
            <svg className="gj-icon gj-conv-anim" style={{ width: 13, height: 13, animation: "gj-conv-spin 1.1s linear infinite" }}><use href="#i-refresh" /></svg>
            Je cherche…
          </div>
        )}
        {THINK_STEPS.map(([label, detail], i) => {
          const state = i < step ? "done" : i === step ? "live" : "wait";
          if (state === "wait") return null;
          return (
            <div key={label} className="gj-conv-anim" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: state === "done" ? "var(--gj-grey)" : CONV_INK, fontWeight: state === "live" ? 700 : 600, animation: "gj-conv-in .3s ease-out" }}>
              {state === "done" ? (
                <span style={{ width: 15, height: 15, borderRadius: "50%", background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg className="gj-icon" style={{ width: 10, height: 10 }}><use href="#i-check" /></svg>
                </span>
              ) : (
                <span className="gj-conv-anim" style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid var(--gj-teal-soft)", borderTopColor: "var(--gj-teal-deep)", flexShrink: 0, animation: "gj-conv-spin .8s linear infinite" }} />
              )}
              <span style={{ minWidth: 0 }}>{label}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700, whiteSpace: "nowrap", paddingLeft: 8 }}>{state === "done" ? detail : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --------------------------------------------------------------------
// Réponse en flux : le texte s'écrit mot à mot. On ne fait JAMAIS défiler
// pendant l'écriture — la bulle réserve sa hauteur pour éviter le sursaut.
// --------------------------------------------------------------------
const STREAM_TEXT = "J'ai trouv\u00e9 3 offres en mara\u00eechage avec un financement, pr\u00e8s de Tambacounda. La premi\u00e8re ferme dans 30 jours.";

const ConvStreaming = ({ text = STREAM_TEXT }) => {
  const words = text.split(" ");
  const reduced = convReducedMotion();
  const [n, setN] = React.useState(reduced ? words.length : 0);
  React.useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setN((v) => (v >= words.length + 6 ? 0 : v + 1)), 130);
    return () => clearInterval(id);
  }, [text, reduced]);
  const shown = words.slice(0, Math.min(n, words.length)).join(" ");
  const streaming = n < words.length;
  return (
    <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, maxWidth: "92%" }}>
      <YayeMark size={28} />
      <div style={{ minWidth: 0 }}>
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5, color: CONV_INK }}>
          {shown}
          {streaming && <span className="gj-conv-anim" style={{ display: "inline-block", width: 2, height: "1em", background: "var(--gj-teal-deep)", verticalAlign: "-2px", marginLeft: 2, animation: "gj-conv-caret 1s step-end infinite" }} />}
          {/* Cale invisible : la bulle garde sa hauteur finale dès le premier mot,
              sinon la conversation sursaute à chaque ligne ajoutée. */}
          <span aria-hidden="true" style={{ display: "block", height: 0, overflow: "hidden", visibility: "hidden" }}>{text}</span>
        </div>
        {!streaming && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 11, color: "var(--gj-grey)", fontWeight: 600 }}>
            <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-document" /></svg>3 offres correspondant à ton profil
          </div>
        )}
      </div>
    </div>
  );
};

const YayeMark = ({ size = 30 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    <svg className="gj-icon" style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }}><use href="#i-sparkle" /></svg>
  </span>
);

// Indicateur de frappe : aligné sous les bulles de Yaye (même retrait avatar +
// goutière) et non étiré — en enfant direct d'une colonne flex, alignSelf par
// défaut vaut stretch et la pastille remplirait toute la largeur.
const ConvDots = () => (
  <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, alignItems: "center" }}>
    <span style={{ width: 28, flexShrink: 0 }} />
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "16px 16px 16px 4px", padding: "11px 14px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gj-teal-deep)", animation: "gj-conv-dot 1.3s infinite", animationDelay: i * 0.16 + "s" }} />
      ))}
    </span>
  </div>
);

const BubbleYaye = ({ children, sources }) => (
  <div style={{ alignSelf: "flex-start", maxWidth: "86%", display: "flex", gap: 8 }}>
    <YayeMark size={28} />
    <div style={{ minWidth: 0 }}>
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5, color: CONV_INK }}>{children}</div>
      {sources && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 11, color: "var(--gj-grey)", fontWeight: 600 }}>
          <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-document" /></svg>{sources}
        </div>
      )}
    </div>
  </div>
);

const BubbleUser = ({ children }) => (
  <div style={{ alignSelf: "flex-end", maxWidth: "86%", background: "var(--gj-teal-deep)", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5 }}>{children}</div>
);

const ConvFeedback = () => (
  <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 700, flexWrap: "wrap", paddingLeft: 36 }}>
    Cette réponse t'a aidée ?
    {[["#i-check", "Oui"], ["#i-close", "Non"]].map(([ic, l]) => (
      <button key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "5px 11px", minHeight: 32, fontSize: 11.5, fontWeight: 800, color: "var(--gj-teal-deep)", cursor: "pointer", fontFamily: "inherit" }}>
        <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={ic} /></svg>{l}
      </button>
    ))}
  </div>
);

// Carte compacte pour le fil de conversation : même signalétique sectorielle que
// la carte de liste (tuile picto + monogramme employeur), mais allégée — ni
// favori, ni rémunération : la carte entière est la cible.
// Ordre significatif : la nature de l'offre (financement, formation) primaire
// sur le domaine (agri, numérique), sinon une « bourse agro-alimentaire » ou un
// « certificat en irrigation » héritent de la tuile agricole et deviennent
// indistinguables de l'offre d'emploi voisine.
const CONV_SECTORS = [
  [/bourse|amorçage|financement|subvention|appel [àa] projets?/i, ["i-funding", "linear-gradient(135deg,#f8a309,#C97F03)"]],
  [/formation|certificat|bootcamp|atelier/i, ["i-learning", "linear-gradient(135deg,#027f7e,#162c5e)"]],
  [/data|num[ée]rique|dev|web|informatique/i, ["i-desktop", "linear-gradient(135deg,#1e35ba,#162c5e)"]],
  [/agro|mara[iî]ch|agri|irrigation|élevage/i, ["i-agriculture", "linear-gradient(135deg,#027f7e,#014B4A)"]],
];

const ConvOppCard = ({ cat, catLabel, title, org, region, deadline, urgent }) => {
  const found = CONV_SECTORS.find(([re]) => re.test(title || "")) || [null, ["i-employment", "linear-gradient(135deg,var(--gj-teal),var(--gj-teal-deep))"]];
  const secIcon = found[1][0], secBg = found[1][1];
  return (
    <button style={{ display: "flex", gap: 11, alignItems: "center", textAlign: "left", width: "100%", background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 10, cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
      <span style={{ position: "relative", width: 54, height: 54, borderRadius: 10, background: secBg, overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg className="gj-icon" style={{ position: "absolute", right: -9, bottom: -10, width: 38, height: 38, opacity: .22, color: "#fff" }}><use href={"#" + secIcon} /></svg>
        <svg className="gj-icon" style={{ width: 23, height: 23, color: "#fff", position: "relative" }}><use href={"#" + secIcon} /></svg>
        <span style={{ position: "absolute", top: 4, left: 4, width: 18, height: 18, borderRadius: 6, background: "rgba(255,255,255,.94)", color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{(org || "?")[0]}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ background: "var(--cat-" + cat + "-soft)", color: "var(--cat-" + cat + "-ink)", fontSize: 11, fontWeight: 900, padding: "2px 7px", borderRadius: 999, letterSpacing: ".3px" }}>{catLabel}</span>
          <span style={{ background: urgent ? "var(--gj-red-soft)" : "var(--gj-bg)", color: urgent ? "var(--gj-red-ink)" : "var(--gj-grey)", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>{deadline}</span>
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: CONV_INK, lineHeight: 1.3 }}>{title}</span>
        <span style={{ fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org} · {region}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-grey-2)" }}><use href="#i-arrow-right" /></svg>
      </span>
    </button>
  );
};

// Saisie vocale retirée pour l'instant : la barre n'accepte que l'écrit.
const ConvComposer = ({ wide = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: wide ? 470 : "100%" }}>
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 16px", minHeight: 48, background: "#fff" }}>
      <span style={{ flex: 1, fontSize: 14, color: "var(--gj-grey)" }}>Écris ton message à Yaye…</span>
    </div>
    <button aria-label="Envoyer" style={{ width: 48, height: 48, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-arrow-right" /></svg>
    </button>
  </div>
);

// --------------------------------------------------------------------
// Conteneur de conversation — la coquille qui porte le fil, commune à toutes
// les surfaces. En-tête d'identité fixe, zone de fil défilante (SEULE zone qui
// défile), composeur épinglé en pied. Trois intégrations web, une mobile.
// --------------------------------------------------------------------
const ConvHeader = ({ onClose = true, sub = "R\u00e9pond en moins d'une minute" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "#fff", borderBottom: "1.5px solid var(--gj-line)", flexShrink: 0 }}>
    <YayeMark size={32} />
    <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: CONV_INK }}>Yaye</span>
        <span style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "1px 6px", borderRadius: 999 }}>IA</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
    </div>
    {onClose && (
      <button aria-label="Fermer la conversation" style={{ width: 34, height: 34, borderRadius: 9, border: 0, background: "var(--gj-bg)", color: "var(--gj-grey)", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-close" /></svg>
      </button>
    )}
  </div>
);

const ConvLimits = ({ compact = false }) => (
  <div style={{ display: "flex", gap: 9, background: "var(--gj-yellow-soft)", border: "1px solid var(--gj-yellow)", borderRadius: 12, padding: compact ? "9px 11px" : "11px 13px" }}>
    <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-yellow-ink)", flexShrink: 0, marginTop: 1 }}><use href="#i-info" /></svg>
    <div style={{ fontSize: 12, color: CONV_INK, lineHeight: 1.45 }}>Yaye oriente et prépare. Elle ne décide d'aucune attribution.</div>
  </div>
);

// Tailles RÉELLES de production — les vignettes de la fiche sont des schémas,
// ces valeurs sont celles à implémenter :
//   panneau latéral web   400 × hauteur du cadre (820 px sur nos maquettes)
//   bulle flottante web    384 × 560, ancrée 24 px des bords, au-dessus du bouton
//   mobile plein écran     390 × 844 moins en-tête et barre d'onglets
//   feuille basse mobile   390 × 608 (72 % de la hauteur d'écran)
const ConvSizeTag = ({ w, h, note }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 7, flexWrap: "wrap" }}>
    <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 700, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", padding: "3px 8px", borderRadius: 7 }}>{w} × {h}</span>
    <span style={{ fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 700 }}>{note}</span>
  </div>
);

// Le conteneur est TOUJOURS de hauteur bornée, jamais en flux — c'est ce qui
// garantit que le composeur reste visible et que seul le fil défile.
const ConvContainer = ({ height = 560, width = 400, header = true, limits = true, children, radius = 16, shadow = true }) => (
  <div style={{ width, height, display: "flex", flexDirection: "column", background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: radius, overflow: "hidden", boxShadow: shadow ? "var(--gj-shadow-md)" : "none", flexShrink: 0 }}>
    {header && <ConvHeader />}
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 13, display: "flex", flexDirection: "column", gap: 9 }}>
      {limits && <ConvLimits compact />}
      {children}
    </div>
    <div style={{ padding: "10px 12px", background: "#fff", borderTop: "1.5px solid var(--gj-line)", flexShrink: 0 }}>
      <ConvComposer wide={false} />
    </div>
  </div>
);

const ConvSampleThread = () => (
  <React.Fragment>
    <BubbleYaye sources="ton profil + 142 offres">Bonjour Awa ! Que cherches-tu aujourd'hui ?</BubbleYaye>
    <BubbleUser>Une offre en maraîchage avec un financement</BubbleUser>
    <ConvThinking auto={false} done={4} />
    <BubbleYaye sources="3 offres correspondant à ton profil">J'ai trouvé 3 offres, près de Tambacounda.</BubbleYaye>
    <div style={{ paddingLeft: 36, display: "flex", flexDirection: "column", gap: 7 }}>
      <ConvOppCard cat="financement" catLabel="FINANCEMENT" title="Bourse d'amorçage agro-alimentaire" org="Fonds Yaakaar 2030" region="National" deadline="J-30" />
      <ConvOppCard cat="emploi" catLabel="EMPLOI" title="Technicien maraîchage irrigué" org="GIE Diaobé" region="Tambacounda" deadline="J-3" urgent />
    </div>
  </React.Fragment>
);

const ConversationIA = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <ConvStyle />

    <V3Card title="Fil de conversation" sub="Le vocabulaire de messages du fil. Yaye parle depuis la gauche sur fond blanc, l'utilisateur depuis la droite sur teal. Chaque réponse de Yaye annonce ce sur quoi elle s'appuie : sans cette ligne de sources, la réponse n'est pas publiable.">
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ background: "var(--gj-bg)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 9, width: 384, flexShrink: 0, alignSelf: "flex-start" }}>
          <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 999, padding: "3px 10px" }}>Aujourd'hui</span>
          <BubbleYaye sources="ton profil + 142 offres du guichet">Bonjour Awa ! Que cherches-tu aujourd'hui ?</BubbleYaye>
          <BubbleUser>Un stage en agro à Tambacounda</BubbleUser>
          <ConvDots />
          <ConvFeedback />
        </div>
        <div style={{ flex: 1, minWidth: 250, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px" }}>Séquence canonique d'un échange</div>
          {[
            ["1", "Question de l'utilisateur", "BubbleUser · teal, alignée à droite, 86 % de large au maximum"],
            ["2", "Attente", "ConvDots sous une seconde · ConvThinking au-delà, avec ses étapes chiffrées"],
            ["3", "Réponse", "ConvStreaming mot à mot, puis la ligne de sources à la fin"],
            ["4", "Contenu", "ConvOppCard, trois au maximum, en retrait de 36 px sous la bulle"],
            ["5", "Rebonds", "deux puces bordées teal, portant sur ce qui vient d'être montré"],
            ["6", "Retour d'utilité", "ConvFeedback, une seule fois par réponse substantielle"],
          ].map(([n, t, d]) => (
            <div key={n} style={{ display: "flex", gap: 10, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: "10px 12px" }}>
              <span style={{ width: 21, height: 21, borderRadius: "50%", background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", fontSize: 11.5, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 900, color: CONV_INK }}>{t}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", lineHeight: 1.45, marginTop: 2 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <V3Rule ok>Une ligne de sources sous chaque réponse, un séparateur de jour par groupe de messages, et l'aveu d'incertitude quand la réponse n'est pas sûre. La pastille de frappe ne sert qu'aux attentes brèves : dès qu'une recherche dépasse une seconde, on passe à la réflexion visible.</V3Rule>
      <V3Rule>Faire parler Yaye au nom d'un conseiller, promettre une décision d'attribution, afficher une réponse sans source, ou cumuler pastille de frappe et réflexion visible pour la même attente.</V3Rule>
    </V3Card>

    <V3Card title="Attente utile — réflexion visible et réponse en flux" sub="Une recherche d'offres prend plusieurs secondes. Plutôt qu'une pastille de frappe muette, Yaye montre ce qu'elle fait, étape par étape, puis écrit sa réponse mot à mot. L'attente devient lisible — et c'est elle qui fait patienter.">
      <div style={{ background: "var(--gj-bg)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
        <BubbleUser>Trouve-moi une offre en maraîchage avec un financement</BubbleUser>
        <ConvThinking />
        <ConvStreaming />
      </div>
      <V3Rule ok>Trois à quatre étapes nommées en langage courant, chacune fermée par son résultat chiffré (« 142 offres actives », « 11 écartées ») : c'est ce chiffre qui rend l'attente crédible. La bulle en flux réserve dès le premier mot la hauteur de la réponse entière, pour que la conversation ne sursaute pas.</V3Rule>
      <V3Rule>Des étapes techniques (« requête vectorielle », « inférence »), une barre de progression sans étape nommée, ou un flux si lent qu'il devient pénible : au-delà de six secondes, la réponse s'affiche d'un coup. Le réglage « animations réduites » coupe la rotation et l'écriture progressive.</V3Rule>
    </V3Card>

    <V3Card title="Conteneur de conversation" sub="La coquille qui porte le fil, identique sur toutes les surfaces : en-tête d'identité fixe, zone de fil défilante, composeur épinglé en pied. Sa hauteur est toujours bornée — c'est ce qui garantit que le composeur reste visible et que seul le fil défile. Ci-dessous à sa TAILLE RÉELLE de bulle flottante.">
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <ConvSizeTag w={384} h={560} note="taille réelle · bulle flottante web" />
          <ConvContainer width={384} height={560}><ConvSampleThread /></ConvContainer>
        </div>
        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 9, paddingTop: 27 }}>
          {[
            ["1 · En-tête", "58 px de haut, filet compris. Identité Yaye, pastille IA, délai de réponse annoncé, fermeture. Fixe, ne défile pas."],
            ["2 · Encart de limites", "Première chose lue du fil. Reste en tête, pas en pied."],
            ["3 · Fil", "Seule zone défilante, 13 px de marge intérieure, 9 px entre messages. Bulles à 86 % de large au maximum."],
            ["4 · Composeur", "70 px de haut, filet compris, épinglé en pied sur fond blanc. Champ de 48 px, bouton d'envoi de 48 px — au-dessus du plancher tactile de 44 px."],
          ].map(([t, d]) => (
            <div key={t} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: "10px 13px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 900, color: "var(--gj-teal-deep)" }}>{t}</div>
              <div style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.45, marginTop: 3 }}>{d}</div>
            </div>
          ))}
          <div style={{ background: "var(--gj-teal-soft)", borderRadius: 11, padding: "11px 13px", fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 700, lineHeight: 1.5 }}>
            Tailles de production : panneau latéral <b>400 × hauteur de page</b> · bulle flottante <b>384 × 560</b> · mobile plein écran <b>390 × 844</b> moins en-tête et barre d'onglets · feuille basse <b>390 × 608</b>. Largeur minimale absolue : 320 px — en dessous, les cartes d'offre ne tiennent plus.
          </div>
        </div>
      </div>
      <V3Rule ok>Hauteur bornée, une seule zone défilante, composeur toujours visible. L'encart de limites ouvre le fil.</V3Rule>
      <V3Rule>Un conteneur en hauteur libre qui pousse le composeur hors de l'écran, ou deux zones défilantes imbriquées — sur mobile, l'utilisateur ne sait plus laquelle il fait glisser. Un panneau sous 320 px : les cartes d'offre y sont illisibles.</V3Rule>
    </V3Card>

    <V3Card title="Intégrations — web" sub="Le même conteneur, deux ancrages selon le contexte. Les deux vignettes ci-dessous sont des SCHÉMAS d'implantation à échelle réduite — les cotes réelles sont indiquées au-dessus de chacune.">
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <ConvSizeTag w={400} h="hauteur de page" note="A · panneau latéral — par défaut" />
          <div style={{ width: 420, height: 300, border: "1.5px solid var(--gj-line)", borderRadius: 12, background: "var(--gj-bg)", position: "relative", overflow: "hidden", display: "flex" }}>
            <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 7 }}>
              {[76, 54, 68].map((w, i) => (
                <div key={i} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 9, height: 40, width: w + "%" }} />
              ))}
              <div style={{ fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700, marginTop: "auto" }}>Page en place, non masquée</div>
            </div>
            <div style={{ width: 154, flexShrink: 0, borderLeft: "1.5px solid var(--gj-line)", background: "#fff", display: "flex", flexDirection: "column" }}>
              <div style={{ height: 34, borderBottom: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", gap: 6, padding: "0 9px", flexShrink: 0 }}>
                <YayeMark size={20} /><span style={{ fontSize: 11.5, fontWeight: 900, color: CONV_INK }}>Yaye</span>
              </div>
              <div style={{ flex: 1, background: "var(--gj-bg)", padding: 9, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ alignSelf: "flex-start", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "9px 9px 9px 2px", height: 26, width: "82%" }} />
                <span style={{ alignSelf: "flex-end", background: "var(--gj-teal-deep)", borderRadius: "9px 9px 2px 9px", height: 20, width: "58%" }} />
              </div>
              <div style={{ height: 40, borderTop: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", padding: "0 9px", gap: 6, flexShrink: 0 }}>
                <span style={{ flex: 1, height: 24, borderRadius: 999, border: "1.5px solid var(--gj-line)" }} />
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--gj-teal-deep)", flexShrink: 0 }} />
              </div>
            </div>
          </div>
        </div>
        <div>
          <ConvSizeTag w={384} h={560} note="B · bulle flottante — depuis le bouton" />
          <div style={{ width: 300, height: 300, border: "1.5px solid var(--gj-line)", borderRadius: 12, background: "var(--gj-bg)", position: "relative", overflow: "hidden", padding: 12 }}>
            <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 9, height: 40, width: "70%" }} />
            <div style={{ position: "absolute", right: 12, bottom: 12, width: 168, height: 224, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, boxShadow: "var(--gj-shadow-md)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ height: 34, borderBottom: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", gap: 6, padding: "0 9px", flexShrink: 0 }}>
                <YayeMark size={20} /><span style={{ fontSize: 11.5, fontWeight: 900, color: CONV_INK }}>Yaye</span>
              </div>
              <div style={{ flex: 1, background: "var(--gj-bg)", padding: 9 }}>
                <span style={{ display: "block", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "9px 9px 9px 2px", height: 30, width: "84%" }} />
              </div>
              <div style={{ height: 40, borderTop: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", padding: "0 9px", gap: 6, flexShrink: 0 }}>
                <span style={{ flex: 1, height: 24, borderRadius: 999, border: "1.5px solid var(--gj-line)" }} />
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--gj-teal-deep)", flexShrink: 0 }} />
              </div>
            </div>
            <span style={{ position: "absolute", right: 16, bottom: 244, fontSize: 11, fontWeight: 800, color: "var(--gj-grey)" }}>24 px des bords</span>
          </div>
        </div>
      </div>
      <V3Rule ok>Panneau latéral de 400 px, la page reste lisible à côté : sous 1280 px de large, il devient une bulle flottante. Bulle ancrée au même coin que le bouton, 24 px des bords.</V3Rule>
      <V3Rule>Un modal plein écran qui masque la page : l'utilisateur perd le contexte dont il parle à Yaye.</V3Rule>
    </V3Card>

    <V3Card title="Opportunités dans la conversation" sub="Le cas le plus fréquent : Yaye répond avec des offres, pas avec du texte. La carte de conversation garde la tuile sectorielle et le monogramme employeur — reconnaître le métier avant de lire — mais allège le reste : pas de favori, pas de rémunération, la carte entière ouvre le détail.">
      <div style={{ background: "var(--gj-bg)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 9, maxWidth: 520 }}>
        <BubbleYaye sources="3 offres correspondant à ton profil">Voici les 3 offres en maraîchage avec un financement, la plus proche de ton profil en premier.</BubbleYaye>
        <div style={{ alignSelf: "flex-start", width: "100%", paddingLeft: 36, display: "flex", flexDirection: "column", gap: 7 }}>
          <ConvOppCard cat="financement" catLabel="FINANCEMENT" title="Bourse d'amorçage agro-alimentaire" org="Fonds Yaakaar 2030" region="National" deadline="J-30" />
          <ConvOppCard cat="emploi" catLabel="EMPLOI" title="Technicien maraîchage irrigué" org="GIE Diaobé" region="Tambacounda" deadline="J-3" urgent />
          <ConvOppCard cat="formation" catLabel="FORMATION" title="Certificat irrigation solaire" org="Centre CJS Tamba" region="Tambacounda" deadline="J-12" />
          <button style={{ alignSelf: "flex-start", background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-teal-deep)", borderRadius: 999, padding: "9px 14px", minHeight: 40, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Voir les 14 autres offres →</button>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", paddingLeft: 36 }}>
          {["Compare les deux premières", "Prépare ma candidature"].map((t) => (
            <button key={t} style={{ background: "#fff", border: "1.5px solid var(--gj-teal-deep)", color: "var(--gj-teal-deep)", borderRadius: 999, padding: "9px 13px", minHeight: 40, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>
          ))}
        </div>
      </div>
      <V3Rule ok>Trois offres au maximum dans une réponse, avec un renvoi vers la liste complète. Les rebonds proposés portent sur les offres montrées.</V3Rule>
      <V3Rule>Empiler dix cartes dans une bulle, ou réutiliser la carte de liste pleine dans le fil : sa tuile de 86 × 96 px et son bouton favori écrasent la conversation.</V3Rule>
      <V3Rule ok>Une ligne de sources sous chaque réponse, un horodatage par groupe de messages, et l'aveu d'incertitude quand la réponse n'est pas sûre.</V3Rule>
      <V3Rule>Faire parler Yaye au nom d'un conseiller, promettre une décision d'attribution, ou afficher une réponse sans source.</V3Rule>
    </V3Card>

    <V3Card title="Suggestions et carte d'action" sub="Trois amorces maximum au démarrage, formulées à la première personne. Quand Yaye a préparé quelque chose, elle le dit et l'utilisateur garde la main.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Trouve-moi un stage", "Relis mon CV", "Quelles bourses ce mois ?"].map((t) => (
          <button key={t} style={{ background: "#fff", border: "1.5px solid var(--gj-teal-deep)", color: "var(--gj-teal-deep)", borderRadius: 999, padding: "10px 15px", minHeight: 42, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-sparkle" /></svg>{t}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 440, background: "#fff", border: "1.5px solid var(--gj-teal)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: "var(--gj-teal-soft)", padding: "10px 13px", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid var(--gj-line)" }}>
          <YayeMark size={26} />
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)" }}>J'ai pré-rempli ta candidature</div>
        </div>
        <div style={{ padding: "12px 13px", display: "flex", flexDirection: "column", gap: 9 }}>
          {["CV joint depuis ton profil", "Lettre de motivation proposée", "Champs obligatoires complétés"].map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: CONV_INK }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg></span>{t}
            </div>
          ))}
          <div style={{ display: "flex", gap: 9, marginTop: 3 }}>
            <button style={{ flex: 1, background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Vérifier et envoyer</button>
            <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 44, padding: "0 16px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Modifier</button>
          </div>
        </div>
      </div>
      <V3Rule ok>L'action de conversion prend le magenta ; le retrait ou la modification reste en bouton bordé.</V3Rule>
    </V3Card>

    <V3Card title="Saisie, limites et panne" sub="La barre de saisie accepte l'écrit et la voix — indispensable pour un public peu lettré. Les limites de Yaye sont dites avant l'échange, pas après l'erreur.">
      <ConvComposer />
      <div style={{ display: "flex", gap: 10, background: "var(--gj-yellow-soft)", border: "1px solid var(--gj-yellow)", borderRadius: 12, padding: "12px 14px", maxWidth: 470 }}>
        <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-yellow-ink)", flexShrink: 0, marginTop: 1 }}><use href="#i-info" /></svg>
        <div style={{ fontSize: 12.5, color: CONV_INK, lineHeight: 1.5 }}>
          <strong>Yaye est une assistante, pas un conseiller.</strong> Elle oriente et prépare ; elle ne décide d'aucune attribution et ne remplace pas un rendez-vous au centre CJS.
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, background: "var(--gj-red-soft)", border: "1px solid var(--gj-red)", borderRadius: 12, padding: "12px 14px", maxWidth: 470, alignItems: "center" }}>
        <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-red-ink)", flexShrink: 0 }}><use href="#i-alert" /></svg>
        <div style={{ flex: 1, fontSize: 12.5, color: CONV_INK, lineHeight: 1.5 }}>Yaye est momentanément indisponible. Tes messages sont conservés.</div>
        <button style={{ background: "#fff", border: "1.5px solid var(--gj-red)", color: "var(--gj-red-ink)", borderRadius: 9, padding: "8px 12px", minHeight: 36, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Réessayer</button>
      </div>
      <V3Rule ok>Micro toujours accessible, message de limites visible au premier écran, panne annoncée avec la promesse de conservation des messages.</V3Rule>
    </V3Card>
  </div>
);

const MobConversationIA = () => (
  <PhoneFrame>
    <ConvStyle />
    <AppHeader title="Yaye" onBack={() => {}} />
    <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", gap: 9, background: "var(--gj-yellow-soft)", border: "1px solid var(--gj-yellow)", borderRadius: 12, padding: "10px 12px" }}>
        <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-yellow-ink)", flexShrink: 0, marginTop: 1 }}><use href="#i-info" /></svg>
        <div style={{ fontSize: 12, color: CONV_INK, lineHeight: 1.45 }}>Yaye oriente et prépare. Elle ne décide d'aucune attribution.</div>
      </div>
      <BubbleUser>Montre-moi celle avec un financement</BubbleUser>
      <ConvThinking auto={false} done={4} />
      <BubbleYaye sources="3 offres correspondant à ton profil">J'ai trouvé 3 offres en maraîchage avec un financement, près de Tambacounda.</BubbleYaye>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingLeft: 34 }}>
        <ConvOppCard cat="financement" catLabel="FINANCEMENT" title="Bourse d'amorçage agro-alimentaire" org="Fonds Yaakaar 2030" region="National" deadline="J-30" />
        <ConvOppCard cat="emploi" catLabel="EMPLOI" title="Technicien maraîchage irrigué" org="GIE Diaobé" region="Tambacounda" deadline="J-3" urgent />
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 2, paddingLeft: 34 }}>
        {["Voir les 14 autres", "Prépare ma candidature"].map((t) => (
          <button key={t} style={{ background: "#fff", border: "1.5px solid var(--gj-teal-deep)", color: "var(--gj-teal-deep)", borderRadius: 999, padding: "9px 13px", minHeight: 40, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>
        ))}
      </div>
    </div>
    <div style={{ padding: "10px 12px 16px", background: "#fff", borderTop: "1.5px solid var(--gj-line)" }}>
      <ConvComposer wide={false} />
    </div>
  </PhoneFrame>
);

// Intégration mobile B — feuille basse ouverte par-dessus la page en cours :
// l'utilisateur garde sous les yeux l'écran dont il parle à Yaye.
const MobConvSheet = () => (
  <PhoneFrame>
    <ConvStyle />
    <AppHeader title="Opportunités" onBack={() => {}} />
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--gj-bg)" }}>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        <ConvOppCard cat="emploi" catLabel="EMPLOI" title="Technicien maraîchage irrigué" org="GIE Diaobé" region="Tambacounda" deadline="J-3" urgent />
        <ConvOppCard cat="formation" catLabel="FORMATION" title="Certificat irrigation solaire" org="Centre CJS Tamba" region="Tambacounda" deadline="J-12" />
      </div>
      <span style={{ position: "absolute", inset: 0, background: "rgba(32,32,32,.42)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 608, display: "flex", flexDirection: "column", background: "var(--gj-bg)", borderRadius: "18px 18px 0 0", overflow: "hidden", boxShadow: "0 -10px 30px rgba(14,28,60,.24)" }}>
        <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--gj-line-strong)", margin: "8px auto 0", flexShrink: 0 }} />
        <ConvHeader sub="À propos de : Technicien maraîchage" />
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 13, display: "flex", flexDirection: "column", gap: 9 }}>
          <ConvLimits compact />
          <BubbleYaye sources="fiche de l'offre">Cette offre demande 2 ans d'expérience. Ton profil en compte 1 — tu peux quand même postuler en expliquant ta formation.</BubbleYaye>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", paddingLeft: 36 }}>
            {["Prépare ma candidature", "Offres plus accessibles"].map((t) => (
              <button key={t} style={{ background: "#fff", border: "1.5px solid var(--gj-teal-deep)", color: "var(--gj-teal-deep)", borderRadius: 999, padding: "9px 13px", minHeight: 40, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "10px 12px 14px", background: "#fff", borderTop: "1.5px solid var(--gj-line)", flexShrink: 0 }}>
          <ConvComposer wide={false} />
        </div>
      </div>
    </div>
  </PhoneFrame>
);

Object.assign(window, { ConversationIA, MobConversationIA, MobConvSheet, BubbleYaye, BubbleUser, ConvDots, ConvThinking, ConvStreaming, ConvComposer, ConvContainer, ConvHeader, ConvLimits, ConvSizeTag, ConvSampleThread, ConvOppCard, YayeMark });
