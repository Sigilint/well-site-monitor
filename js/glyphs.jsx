// Shared glyphs + formatting helpers.
// Category is encoded by SHAPE + letter, never by color; color is reserved
// for status (warning / alarm), per ISA-101 alarm-color conventions.

(() => {

const SHAPE_PATHS = {
  circle:      null,
  diamond:     "M0,-8.5 L8.5,0 L0,8.5 L-8.5,0 Z",
  square:      "M-6.5,-6.5 H6.5 V6.5 H-6.5 Z",
  triangle:    "M0,-8.5 L8,6 L-8,6 Z",
  hexagon:     "M7.5,0 L3.75,6.5 L-3.75,6.5 L-7.5,0 L-3.75,-6.5 L3.75,-6.5 Z",
  invtriangle: "M-8,-6 L8,-6 L0,8.5 Z",
};
const LETTER_DY = { triangle: 2, invtriangle: -1.5 };

// SVG shape, centered at 0,0 — use inside a <g transform>
function ShapePath({ shape, className }) {
  if (shape === "circle") return <circle r="7" className={className} />;
  return <path d={SHAPE_PATHS[shape]} className={className} />;
}

function ShapeLetter({ shape, code }) {
  return (
    <text className="mk-letter" textAnchor="middle" dominantBaseline="central"
          y={LETTER_DY[shape] || 0}>{code}</text>
  );
}

// Standalone inline icon for HTML (filters, tables, legends)
function CategoryIcon({ category, size = 16 }) {
  const cat = window.Catalog.CATEGORIES[category];
  return (
    <svg className="cat-icon" width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      <ShapePath shape={cat.shape} className="cat-icon-shape" />
      <ShapeLetter shape={cat.shape} code={cat.code} />
    </svg>
  );
}

// Status icon: shape differs by severity so it never relies on color alone
function StatusIcon({ status, size = 12 }) {
  const s = size;
  if (status === "alarm") {
    return (
      <svg width={s} height={s} viewBox="0 0 12 12" className="st-icon st-alarm" aria-label="Alarm">
        <path d="M6 0.5 L11.5 6 L6 11.5 L0.5 6 Z" />
        <path d="M6 3 V6.6 M6 8.2 V8.9" className="st-icon-mark" />
      </svg>
    );
  }
  if (status === "warning") {
    return (
      <svg width={s} height={s} viewBox="0 0 12 12" className="st-icon st-warning" aria-label="Warning">
        <path d="M6 0.8 L11.6 11 L0.4 11 Z" />
        <path d="M6 4.2 V7.6 M6 9 V9.6" className="st-icon-mark" />
      </svg>
    );
  }
  if (status === "offline" || status === "fault") {
    return (
      <svg width={s} height={s} viewBox="0 0 12 12" className="st-icon st-offline" aria-label="Offline">
        <rect x="1" y="1" width="10" height="10" />
        <path d="M3.5 3.5 L8.5 8.5 M8.5 3.5 L3.5 8.5" className="st-icon-mark" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" className="st-icon st-normal" aria-label="Normal">
      <circle cx="6" cy="6" r="4" />
    </svg>
  );
}

const STATUS_LABEL = { normal: "NORMAL", warning: "WARNING", alarm: "ALARM", offline: "OFFLINE", fault: "FAULT" };
const STATUS_RANK = { normal: 0, offline: 1, fault: 1, warning: 2, alarm: 3 };

function fmtValue(value, typeKey) {
  if (value == null) return "—";
  const t = window.Catalog.SENSOR_TYPES[typeKey];
  if (t.binary) return value >= 0.5 ? t.binary[1] : t.binary[0];
  return value.toLocaleString("en-US", {
    minimumFractionDigits: t.sim.dp, maximumFractionDigits: t.sim.dp,
  });
}

function fmtTime(iso, ms = false) {
  const d = new Date(iso);
  const p = n => String(n).padStart(2, "0");
  const base = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return ms ? `${base}.${String(d.getMilliseconds()).padStart(3, "0")}` : base;
}

function fmtUnit(typeKey) {
  const t = window.Catalog.SENSOR_TYPES[typeKey];
  return t.binary ? "" : t.unit;
}

function limitText(typeKey) {
  const t = window.Catalog.SENSOR_TYPES[typeKey];
  const l = t.limits;
  if (!l) return "No alarm limits — informational";
  if (t.binary) return `Alarm when ${t.binary[1].toLowerCase()}`;
  const u = window.Catalog.SENSOR_TYPES[typeKey].unit;
  const parts = [];
  if (l.hi) parts.push(`High: warn ≥ ${l.hi[0]}, alarm ≥ ${l.hi[1]} ${u}`);
  if (l.lo) parts.push(`Low: warn ≤ ${l.lo[0]}, alarm ≤ ${l.lo[1]} ${u}`);
  return parts.join(" · ");
}

Object.assign(window, {
  ShapePath, ShapeLetter, CategoryIcon, StatusIcon,
  Fmt: { STATUS_LABEL, STATUS_RANK, fmtValue, fmtTime, fmtUnit, limitText },
});

})();
