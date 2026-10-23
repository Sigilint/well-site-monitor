// Regenerates the per-category tables in docs/SENSOR_CATALOG.md from
// js/catalog.jsx + js/site.jsx.  Usage: node scripts/gen-catalog-doc.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
global.window = {};
for (const f of ["catalog.jsx", "site.jsx"]) eval(fs.readFileSync(path.join(root, "js", f), "utf8"));
const { CATEGORIES, SENSOR_TYPES, ZONES } = window.Catalog;
const { SENSORS } = window.SiteDef;

const limits = t => {
  if (!t.limits) return "—";
  const p = [];
  if (t.limits.hi) p.push(`≥ ${t.limits.hi[0]} / ${t.limits.hi[1]}`);
  if (t.limits.lo) p.push(`≤ ${t.limits.lo[0]} / ${t.limits.lo[1]}`);
  return p.join("; ");
};

let out = "";
for (const [key, c] of Object.entries(CATEGORIES)) {
  const types = Object.entries(SENSOR_TYPES).filter(([, t]) => t.category === key);
  const n = SENSORS.filter(s => SENSOR_TYPES[s.type].category === key).length;
  out += `### ${c.label} — shape: ${c.shape}, code \`${c.code}\`\n\n${c.blurb} (${types.length} types, ${n} sensors in the demo)\n\n`;
  out += "| Type | Sensor | Unit | Warn / alarm | What it tells you | Demo locations |\n|---|---|---|---|---|---|\n";
  for (const [tk, t] of types) {
    const zones = [...new Set(SENSORS.filter(s => s.type === tk).map(s => s.zone))].join(", ");
    out += `| \`${tk}\` | ${t.name} | ${t.unit} | ${limits(t)} | ${t.tells.join("; ")} | ${zones} |\n`;
  }
  out += "\n";
}
out += "### Zones\n\n| Code | Location | Sensors |\n|---|---|---|\n";
for (const [k, z] of Object.entries(ZONES)) out += `| \`${k}\` | ${z.label} | ${SENSORS.filter(s => s.zone === k).length} |\n`;

const docPath = path.join(root, "docs", "SENSOR_CATALOG.md");
const doc = fs.readFileSync(docPath, "utf8");
const start = "<!-- BEGIN GENERATED -->", end = "<!-- END GENERATED -->";
const next = doc.slice(0, doc.indexOf(start) + start.length) + "\n\n" + out + doc.slice(doc.indexOf(end));
fs.writeFileSync(docPath, next);
console.log(`wrote ${Object.keys(SENSOR_TYPES).length} types, ${SENSORS.length} sensors`);
