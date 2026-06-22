/* eslint-disable */
// Shared component — Carte CJS bénéficiaire avec QR code de check-in.
// Used both on web dashboard and mobile Centres CJS screen.

// =====================================================================
// QR Glyph — SVG pseudo-QR pattern (purely decorative, looks real)
// =====================================================================
const QRGlyph = ({ size = 160, plain = false }) => {
  // Generate a deterministic-looking QR-ish pattern of 25×25 cells.
  // 3 corner finder patterns + scattered cells.
  const cells = 25;
  const cell = size / cells;
  const filled = new Set();

  // Helpers
  const fillRect = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) filled.add(`${x},${y}`);
  };
  const clearRect = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) filled.delete(`${x},${y}`);
  };
  const finder = (x, y) => {
    fillRect(x, y, 7, 7);
    clearRect(x + 1, y + 1, 5, 5);
    fillRect(x + 2, y + 2, 3, 3);
  };

  finder(0, 0);
  finder(cells - 7, 0);
  finder(0, cells - 7);

  // Timing patterns
  for (let i = 8; i < cells - 8; i++) {
    if (i % 2 === 0) {
      filled.add(`${i},6`);
      filled.add(`6,${i}`);
    }
  }

  // Pseudo-random data cells (deterministic)
  const seed = "GJS-AD-23045"; const hash = (i) => {
    let h = 5381;
    for (let k = 0; k < seed.length; k++) h = ((h << 5) + h + seed.charCodeAt(k) + i) | 0;
    return Math.abs(h);
  };
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // Skip finder areas
      const inTL = x < 8 && y < 8;
      const inTR = x > cells - 9 && y < 8;
      const inBL = x < 8 && y > cells - 9;
      if (inTL || inTR || inBL) continue;
      const v = hash(y * cells + x) % 100;
      if (v < 47) filled.add(`${x},${y}`);
    }
  }

  // Center logo cutout
  const cx = Math.floor(cells / 2), cy = Math.floor(cells / 2);
  if (!plain) clearRect(cx - 3, cy - 3, 7, 7);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", background: "#fff", borderRadius: 8 }}>
      <rect x="0" y="0" width={size} height={size} fill="#fff" />
      {[...filled].map((k, i) => {
        const [x, y] = k.split(",").map(Number);
        return <rect key={i} x={x * cell} y={y * cell} width={cell} height={cell} fill={plain ? "#111" : "#0A2A24"} />;
      })}
      {!plain && <rect x={(cx - 2.5) * cell} y={(cy - 2.5) * cell} width={5 * cell} height={5 * cell} rx={cell * 1.2} fill="#fff" stroke="#0A2A24" strokeWidth={cell * 0.6} />}
      {!plain && <circle cx={cx * cell + cell / 2} cy={cy * cell + cell / 2} r={cell * 1.4} fill="var(--gj-teal-deep)" />}
    </svg>
  );
};

// =====================================================================
// EMVChip — puce dorée style carte bancaire (formes simples)
// =====================================================================
const EMVChip = ({ w = 38 }) => (
  <div style={{ width: w, height: w * 0.76, borderRadius: w * 0.16, background: "linear-gradient(135deg, #FBD24E 0%, #E0A93B 45%, #C79C00 100%)", position: "relative", flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)", overflow: "hidden" }}>
    <span style={{ position: "absolute", top: "32%", left: 0, right: 0, height: 1.2, background: "rgba(120,90,0,.55)" }} />
    <span style={{ position: "absolute", top: "62%", left: 0, right: 0, height: 1.2, background: "rgba(120,90,0,.55)" }} />
    <span style={{ position: "absolute", top: "12%", bottom: "12%", left: "34%", width: 1.2, background: "rgba(120,90,0,.55)" }} />
    <span style={{ position: "absolute", top: "12%", bottom: "12%", left: "64%", width: 1.2, background: "rgba(120,90,0,.55)" }} />
    <span style={{ position: "absolute", inset: "26% 30%", border: "1.2px solid rgba(120,90,0,.55)", borderRadius: 2 }} />
  </div>
);

// =====================================================================
// Barcode — code-barres décoratif (formes simples) pour le verso.
// =====================================================================
const Barcode = ({ height = 46 }) => {
  const w = [2, 4, 2, 3, 5, 2, 2, 4, 2, 3, 2, 5, 3, 2, 2, 4, 2, 3, 5, 2, 2, 3, 4, 2, 2, 5, 2, 3, 2, 4, 2, 2, 3];
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 1.5, height }}>
      {w.map((x, i) => <span key={i} style={{ width: x, background: "#111" }} />)}
    </div>
  );
};

// =====================================================================
// CardShell — feuille blanche commune (bord teal + coin plié optionnel),
// fidèle au design imprimable officiel Guichet Jeunesse.
// =====================================================================
const CardShell = ({ children, maxWidth = 420, folded = false, foldText }) => (
  <div style={{
    width: "100%", maxWidth, aspectRatio: "1.585 / 1",
    background: "#fff", borderRadius: 16, border: "1.5px solid var(--gj-line)",
    boxShadow: "var(--gj-shadow-md)", position: "relative", overflow: "hidden", flexShrink: 0,
    fontFamily: "var(--gj-font-sans)", display: "flex", flexDirection: "column",
  }}>
    <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 7, background: "linear-gradient(var(--gj-teal), var(--gj-teal-deep))", zIndex: 3 }} />
    {/* texture de sécurité subtile (papier officiel) */}
    <span style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.5, backgroundImage: "repeating-linear-gradient(135deg, rgba(0,122,92,.05) 0 1px, transparent 1px 9px), radial-gradient(circle at 88% 86%, rgba(0,122,92,.06), transparent 38%)" }} />
    {folded && (
      <React.Fragment>
        <div style={{ position: "absolute", top: 0, right: 0, width: "24%", aspectRatio: "1 / 1", background: "linear-gradient(135deg, var(--gj-yellow), #E8B400)", clipPath: "polygon(100% 0, 0 0, 100% 100%)", zIndex: 2 }} />
        {foldText && (
          <div style={{ position: "absolute", top: "8%", right: "5%", textAlign: "right", lineHeight: 1.05, zIndex: 3 }}>
            <div style={{ fontSize: "clamp(8px,2.5%,10px)", fontWeight: 800, letterSpacing: ".6px", color: "var(--gj-ink)" }}>CARTE</div>
            <div style={{ fontSize: "clamp(13px,4.2%,16px)", fontWeight: 900, color: "var(--gj-ink)" }}>{foldText}</div>
          </div>
        )}
      </React.Fragment>
    )}
    {children}
  </div>
);

const CJSLogo = ({ h = 24 }) => (
  <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: h, width: "auto", display: "block", flexShrink: 0 }} />
);

// =====================================================================
// MyCJSCard — RECTO de la carte bénéficiaire (fidèle au design officiel).
// =====================================================================
const MyCJSCard = ({ compact = false, maxWidth = 420 }) => (
  <CardShell maxWidth={maxWidth} folded foldText="2026">
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "clamp(14px,4.4%,20px)", paddingLeft: "clamp(18px,5.4%,24px)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,2.6%,11px)" }}>
        <CJSLogo h={compact ? 22 : 27} />
        <span style={{ width: 1.5, height: 22, background: "var(--gj-line)", flexShrink: 0 }} />
        <span style={{ fontSize: "clamp(8px,2.4%,9.5px)", fontWeight: 800, color: "var(--gj-teal-deep)", letterSpacing: ".6px", textTransform: "uppercase" }}>Bokk · Jàng · Liguéey</span>
      </div>
      {/* body */}
      <div style={{ display: "flex", gap: "clamp(13px,4.2%,18px)", alignItems: "center" }}>
        <div style={{ background: "var(--gj-teal-soft)", border: "1px solid var(--gj-line)", borderRadius: 10, padding: "clamp(6px,1.8%,8px)", flexShrink: 0 }}>
          <QRGlyph size={compact ? 104 : 124} plain />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "clamp(9px,2.8%,11px)", fontWeight: 800, color: "var(--gj-teal-deep)", letterSpacing: ".4px", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--gj-green)" }} />Bénéficiaire actif
          </div>
          <div style={{ fontSize: "clamp(19px,6.2%,26px)", fontWeight: 900, color: "var(--gj-ink)", lineHeight: 1.08, marginTop: 7 }}>Awa Diop</div>
          <div style={{ fontSize: "clamp(11px,3.3%,13px)", color: "var(--gj-ink)", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-teal-deep)" }}><use href="#i-pin" /></svg><b>Tambacounda</b>
          </div>
        </div>
      </div>
      {/* footer */}
      <div style={{ borderTop: "1px solid var(--gj-line)", paddingTop: "clamp(8px,2.6%,11px)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: "clamp(12px,3.6%,14px)", fontWeight: 700, letterSpacing: ".5px", color: "var(--gj-ink)" }}>GJ-2026-77294A</span>
        <span style={{ textAlign: "right" }}>
          <span style={{ display: "block", fontSize: 8, fontWeight: 800, color: "var(--gj-grey)", letterSpacing: ".6px", textTransform: "uppercase" }}>Inscrite le</span>
          <span style={{ fontSize: "clamp(12px,3.7%,14px)", fontWeight: 800, color: "var(--gj-ink)" }}>14 mars 2024</span>
        </span>
      </div>
    </div>
  </CardShell>
);

// =====================================================================
// MyCJSCardBack — VERSO de la carte bénéficiaire.
// =====================================================================
const MyCJSCardBack = ({ maxWidth = 420 }) => {
  const chip = (label) => (
    <span key={label} style={{ border: "1.5px solid var(--gj-line-strong)", borderRadius: 8, padding: "6px 12px", fontSize: "clamp(10px,2.9%,12px)", fontWeight: 700, color: "var(--gj-ink)", whiteSpace: "nowrap" }}>{label}</span>
  );
  return (
    <CardShell maxWidth={maxWidth}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "clamp(14px,4.4%,20px)", paddingLeft: "clamp(18px,5.4%,24px)" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <CJSLogo h={22} />
          </div>
          <span style={{ fontSize: "clamp(9px,2.6%,11px)", fontWeight: 800, color: "var(--gj-grey)", letterSpacing: ".5px", textTransform: "uppercase", flexShrink: 0 }}>Bénéficiaire</span>
        </div>
        {/* access + barcode */}
        <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "clamp(11px,3.3%,13px)", fontWeight: 900, color: "var(--gj-ink)", letterSpacing: ".3px", marginBottom: 9 }}>CETTE CARTE OUVRE L'ACCÈS À</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, maxWidth: 280 }}>
              {["Centres", "Ateliers", "Cours", "Bibliothèque", "Événements"].map(chip)}
            </div>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <Barcode height={40} />
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5, fontWeight: 700, color: "var(--gj-ink)", marginTop: 5, letterSpacing: ".5px" }}>GJ20267729 4A</div>
          </div>
        </div>
        {/* footer */}
        <div style={{ borderTop: "1px solid var(--gj-line)", paddingTop: "clamp(8px,2.6%,11px)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: "clamp(8px,2.3%,9.5px)", color: "var(--gj-grey)", lineHeight: 1.4, maxWidth: "58%" }}>
            Document officiel non transférable. En cas de perte, contacter le 33 877 78 05 pour blocage. Conditions : guichetjeunesse.sn/carte
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "clamp(11px,3.2%,13px)", fontWeight: 900, color: "var(--gj-teal-deep)" }}>guichetjeunesse.sn</div>
            <div style={{ fontSize: "clamp(10px,3%,12px)", fontWeight: 800, color: "var(--gj-ink)", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-teal-deep)" }}><use href="#i-phone" /></svg>33 877 78 05
            </div>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

Object.assign(window, { QRGlyph, MyCJSCard, MyCJSCardBack, Barcode, EMVChip });
