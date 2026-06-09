/* eslint-disable */
// Shared component — Carte CJS bénéficiaire avec QR code de check-in.
// Used both on web dashboard and mobile Centres CJS screen.

// =====================================================================
// QR Glyph — SVG pseudo-QR pattern (purely decorative, looks real)
// =====================================================================
const QRGlyph = ({ size = 160 }) => {
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
  clearRect(cx - 3, cy - 3, 7, 7);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", background: "#fff", borderRadius: 8 }}>
      <rect x="0" y="0" width={size} height={size} fill="#fff" />
      {[...filled].map((k, i) => {
        const [x, y] = k.split(",").map(Number);
        return <rect key={i} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0A2A24" />;
      })}
      {/* Center brand spot */}
      <rect x={(cx - 2.5) * cell} y={(cy - 2.5) * cell} width={5 * cell} height={5 * cell} rx={cell * 1.2} fill="#fff" stroke="#0A2A24" strokeWidth={cell * 0.6} />
      <circle cx={cx * cell + cell / 2} cy={cy * cell + cell / 2} r={cell * 1.4} fill="var(--gj-teal-deep)" />
    </svg>
  );
};

// =====================================================================
// MyCJSCard — full member card with QR (for web dashboard, full size)
// =====================================================================
const MyCJSCard = ({ compact = false, dark = true }) => {
  const wrap = {
    background: dark
      ? "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)"
      : "#fff",
    color: dark ? "#fff" : "var(--gj-ink)",
    border: dark ? "0" : "1.5px solid var(--gj-line)",
    borderRadius: 14, padding: compact ? 14 : 18,
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column", gap: 12,
  };
  const glow = {
    position: "absolute", right: -50, top: -60,
    width: 220, height: 220,
    background: "radial-gradient(circle, rgba(249,196,0,.18), transparent 60%)",
    pointerEvents: "none",
  };
  const head = { display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" };
  const brand = {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 10.5, fontWeight: 800,
    color: dark ? "var(--gj-yellow)" : "var(--gj-teal-deep)",
    letterSpacing: ".5px", textTransform: "uppercase",
  };
  const body = { display: "flex", gap: 14, alignItems: "center", position: "relative" };
  const qrBox = {
    background: "#fff", padding: 8, borderRadius: 10,
    flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,.18)",
  };
  const idCol = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 };
  const nameRow = { fontSize: 16, fontWeight: 900, lineHeight: 1.2 };
  const idLine = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13, fontWeight: 700, letterSpacing: ".5px",
    color: dark ? "var(--gj-yellow)" : "var(--gj-teal-deep)",
  };
  const meta = {
    display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11,
    color: dark ? "rgba(255,255,255,.78)" : "var(--gj-grey)",
  };
  const metaItem = { display: "inline-flex", alignItems: "center", gap: 4 };
  const footRow = {
    display: "flex", alignItems: "center", gap: 8,
    paddingTop: 10, borderTop: `1px solid ${dark ? "rgba(255,255,255,.14)" : "var(--gj-line)"}`,
    fontSize: 11, color: dark ? "rgba(255,255,255,.7)" : "var(--gj-grey)",
    position: "relative",
  };

  return (
    <div style={wrap}>
      <span style={glow} />
      <div style={head}>
        <div style={brand}>
          <svg className="gj-icon gj-icon--sm"><use href="#i-pin" /></svg>
          Carte CJS
        </div>
        <div style={{
          background: dark ? "rgba(0,0,0,.25)" : "var(--gj-bg)",
          padding: "3px 8px", borderRadius: 999,
          fontSize: 9.5, fontWeight: 800, letterSpacing: ".4px",
          color: dark ? "var(--gj-yellow)" : "var(--gj-grey)",
          textTransform: "uppercase",
        }}>Membre actif</div>
      </div>

      <div style={body}>
        <div style={qrBox}>
          <QRGlyph size={compact ? 110 : 140} />
        </div>
        <div style={idCol}>
          <div style={nameRow}>Awa Diop</div>
          <div style={idLine}>GJS · AD · 23045</div>
          <div style={meta}>
            <span style={metaItem}>
              <svg className="gj-icon gj-icon--xs" style={{ color: dark ? "var(--gj-yellow)" : "var(--gj-teal-deep)" }}><use href="#i-pin" /></svg>
              CJS Tambacounda
            </span>
            <span style={metaItem}>
              <svg className="gj-icon gj-icon--xs" style={{ color: dark ? "var(--gj-yellow)" : "var(--gj-teal-deep)" }}><use href="#i-calendar" /></svg>
              Actif depuis 03/2025
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: dark ? "rgba(255,255,255,.55)" : "var(--gj-grey-2)", marginTop: 2, lineHeight: 1.4 }}>
            Présente ce code à l'accueil de n'importe quel centre CJS.
          </div>
        </div>
      </div>

      {!compact && (
        <div style={footRow}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7BE5B5" }} />
          <span>QR valide · expire le 31 décembre 2026</span>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { QRGlyph, MyCJSCard });
