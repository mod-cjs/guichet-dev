/* eslint-disable */
// Lot 11 — Administration · primitives de data-viz (SVG pur, sans dépendance).

// Sparkline (mini courbe pour les KPIs)
const Spark = ({ data, color = "var(--gj-teal)", w = 80, h = 28 }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / rng) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path d={area} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
};

// Line chart (croissance) avec axes légers
const LineChart = ({ data, labels, color = "var(--gj-teal-deep)", h = 200 }) => {
  const w = 560;
  const pad = { l: 8, r: 8, t: 14, b: 22 };
  const max = Math.max(...data), min = Math.min(...data) * 0.96;
  const rng = max - min || 1;
  const px = (i) => pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
  const py = (v) => pad.t + (1 - (v - min) / rng) * (h - pad.t - pad.b);
  const d = data.map((v, i) => (i === 0 ? "M" : "L") + px(i).toFixed(1) + "," + py(v).toFixed(1)).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
      {[0, 0.5, 1].map((g, i) => <line key={i} x1={pad.l} x2={w - pad.r} y1={pad.t + g * (h - pad.t - pad.b)} y2={pad.t + g * (h - pad.t - pad.b)} stroke="var(--gj-line)" strokeWidth="1" />)}
      <path d={d + ` L${px(data.length - 1)},${h - pad.b} L${px(0)},${h - pad.b} Z`} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />)}
      {labels && labels.map((l, i) => <text key={i} x={px(i)} y={h - 6} textAnchor="middle" style={{ fontSize: 10, fill: "var(--gj-grey)", fontWeight: 700 }}>{l}</text>)}
    </svg>
  );
};

// Bar chart vertical
const BarChart = ({ data, color = "var(--gj-teal)", h = 200 }) => {
  const w = 560;
  const pad = { t: 14, b: 22 };
  const max = Math.max(...data.map((d) => d.v));
  const bw = (w / data.length) * 0.5;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const x = (i + 0.5) * (w / data.length);
        const bh = (d.v / max) * (h - pad.t - pad.b);
        return (
          <g key={i}>
            <rect x={x - bw / 2} y={h - pad.b - bh} width={bw} height={bh} rx="5" fill={i === data.length - 1 ? "var(--gj-teal-deep)" : color} opacity={i === data.length - 1 ? 1 : 0.55} />
            <text x={x} y={h - pad.b - bh - 5} textAnchor="middle" style={{ fontSize: 10, fill: "var(--gj-ink)", fontWeight: 800 }}>{d.v}</text>
            <text x={x} y={h - 6} textAnchor="middle" style={{ fontSize: 10, fill: "var(--gj-grey)", fontWeight: 700 }}>{d.m}</text>
          </g>
        );
      })}
    </svg>
  );
};

// Donut chart
const Donut = ({ data, size = 160, thickness = 26 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const seg = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc * c} />;
          acc += frac;
          return seg;
        })}
      </g>
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: size * 0.16, fontWeight: 900, fill: "var(--gj-ink)" }}>49K</text>
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: size * 0.07, fontWeight: 700, fill: "var(--gj-grey)" }}>comptes</text>
    </svg>
  );
};

// Bubble map — réutilise SenegalMap (centres-data.jsx) avec des bulles proportionnelles.
// pins enrichis : {x, y, label, r (rayon), active}
const SenegalBubbleMap = ({ points = [], height = 360 }) => {
  const land = "M44,28 L78,18 L120,16 L150,24 L175,40 L188,62 L200,82 L224,92 L236,120 L242,150 L240,176 L252,182 L250,192 L210,190 L170,184 L150,190 L120,192 L90,190 L60,186 L44,190 L40,168 L42,150 L42,140 L150,142 L166,138 L150,126 L44,124 L40,112 L36,96 L10,84 L34,72 L36,52 Z";
  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: 14, overflow: "hidden", background: "linear-gradient(135deg, #EAF3F0, #DCEAE5)", border: "1.5px solid var(--gj-line)" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,122,92,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,122,92,.06) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <svg viewBox="0 0 270 210" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", padding: 14 }}>
        <path d={land} fill="var(--gj-teal-soft)" stroke="var(--gj-teal-deep)" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="42" y="125" width="124" height="15" rx="5" fill="#EAF3F0" stroke="var(--gj-teal-deep)" strokeWidth="1" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={p.r} fill="var(--gj-teal)" opacity="0.28" />
            <circle cx={p.x} cy={p.y} r={Math.max(3, p.r * 0.42)} fill="var(--gj-teal-deep)" stroke="#fff" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
    </div>
  );
};

Object.assign(window, { Spark, LineChart, BarChart, Donut, SenegalBubbleMap });
