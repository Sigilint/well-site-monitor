// Well site schematic — side elevation of the pad looking north (west is left)
// with a cutaway of the ground below: the Trinity aquifer, the cemented casing
// strings, and the horizontal lateral in the Barnett Shale. Vertical and
// horizontal scales are compressed; depths are illustrative.
//
// Structure is static line art. Weather, tank and separator levels, gas flow,
// the plunger, the combustor, the gate and vehicles, and gas detections are
// driven by the latest readings. Sensor markers carry all alarm color.

(() => {

const { useState, useRef } = React;
const { CATEGORIES, SENSOR_TYPES, ZONES } = window.Catalog;
const { fmtValue, fmtUnit, STATUS_RANK } = window.Fmt;

const W = 1200, H = 760, GY = 330;           // ground line
const VB_Y = 56;                              // crop empty sky above the mast
const WX = 282;                               // wellbore centerline
const AQ_TOP = 346, AQ_BASE = 440;            // Trinity aquifer
const SURF_SHOE = 456;                        // surface casing shoe, below the aquifer
const BAR_TOP = 604, BAR_BASE = 680, LAT_Y = 640;
const TANKS = [
  { x: 680, label: "T1 · WATER",  id: "LT-TANK-TNK-01", hatch: null },
  { x: 748, label: "T2 · WATER",  id: "LT-TANK-TNK-02", hatch: "HATCH-TNK-01" },
  { x: 816, label: "T3 · COND.",  id: "LT-TANK-TNK-03", hatch: "HATCH-TNK-02" },
];
const TANK_TOP = 214, TANK_BOT = 324, PX_PER_FT = (TANK_BOT - TANK_TOP) / 20;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GAS_TYPES = new Set(["GD_LEL", "GD_H2S", "CH4_FL", "VOC_FL"]);
const GAS_NAME = { GD_LEL: "LEL", GD_H2S: "H₂S", CH4_FL: "CH₄", VOC_FL: "VOC" };

// ---------- static: ground & subsurface ----------

const Ground = React.memo(function Ground() {
  return (
    <g className="ground">
      <defs>
        <pattern id="aqDots" width="12" height="9" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1" className="aq-dot" />
          <circle cx="9" cy="7" r="0.8" className="aq-dot" />
        </pattern>
        <pattern id="shaleLines" width="40" height="7" patternUnits="userSpaceOnUse">
          <line x1="0" y1="3" x2="26" y2="3" className="strata-line" />
        </pattern>
        <pattern id="limeBricks" width="24" height="10" patternUnits="userSpaceOnUse">
          <path d="M0,0 H24 M0,5 H24 M6,0 V5 M18,5 V10" className="strata-line" />
        </pattern>
        <pattern id="cement" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.8" className="cement-dot" />
        </pattern>
      </defs>
      <rect x="0" y={GY} width={W} height={AQ_TOP - GY} className="soil" />
      <rect x="0" y={AQ_TOP} width={W} height={AQ_BASE - AQ_TOP} className="aquifer" />
      <rect x="0" y={AQ_TOP} width={W} height={AQ_BASE - AQ_TOP} fill="url(#aqDots)" />
      <rect x="0" y={AQ_BASE} width={W} height={590 - AQ_BASE} className="rock" />
      <rect x="0" y={AQ_BASE} width={W} height={590 - AQ_BASE} fill="url(#shaleLines)" />
      <rect x="0" y="590" width={W} height={BAR_TOP - 590} className="lime" />
      <rect x="0" y={BAR_TOP} width={W} height={BAR_BASE - BAR_TOP} className="barnett" />
      <rect x="0" y={BAR_TOP} width={W} height={BAR_BASE - BAR_TOP} fill="url(#shaleLines)" />
      <rect x="0" y={BAR_BASE} width={W} height={H - BAR_BASE} className="lime" />
      <rect x="0" y={BAR_BASE} width={W} height={H - BAR_BASE} fill="url(#limeBricks)" />
      {/* compressed-scale break */}
      <path d={`M0,${AQ_BASE + 70} l12,-6 l12,6 l12,-6`} className="scale-break" />
      <line x1="0" y1={AQ_BASE} x2={W} y2={AQ_BASE} className="buqw" />

      <text x="12" y={AQ_TOP + 50} className="sx-label strong">TRINITY AQUIFER</text>
      <text x="12" y={AQ_TOP + 61} className="sx-label">fresh groundwater</text>
      <text x="12" y={AQ_BASE + 14} className="sx-label">BASE OF USABLE-QUALITY WATER · ~500 ft</text>
      <text x="12" y={AQ_BASE + 46} className="sx-label">PENNSYLVANIAN SHALES &amp; SANDS</text>
      <text x="12" y={AQ_BASE + 58} className="sx-label">≈ 7,000 ft · not to scale</text>
      <text x="12" y="600" className="sx-label">MARBLE FALLS LIMESTONE</text>
      <text x="12" y={BAR_TOP + 30} className="sx-label strong">BARNETT SHALE</text>
      <text x="12" y={BAR_TOP + 41} className="sx-label">target · ~7,800 ft TVD (illus.)</text>
      <text x="12" y={BAR_BASE + 30} className="sx-label">VIOLA / ELLENBURGER</text>
      <text x={W - 10} y={H - 10} textAnchor="end" className="sx-label">vertical &amp; horizontal scales compressed · depths illustrative</text>
    </g>
  );
});

const Wellbore = React.memo(function Wellbore() {
  const fracs = [];
  for (let x = 372; x < 1150; x += 38) {
    fracs.push(
      <g key={x} className="frac">
        <path d={`M${x},${LAT_Y - 6} L${x - 5},${BAR_TOP + 10} M${x},${LAT_Y - 6} L${x + 6},${BAR_TOP + 16}`} />
        <path d={`M${x},${LAT_Y + 6} L${x + 4},${BAR_BASE - 10} M${x},${LAT_Y + 6} L${x - 6},${BAR_BASE - 14}`} />
      </g>
    );
  }
  const prod = `M${WX},${GY} V${LAT_Y - 40} Q${WX},${LAT_Y} ${WX + 40},${LAT_Y} H1165`;
  return (
    <g className="wellbore">
      {fracs}
      {/* cement around surface casing */}
      <rect x={WX - 20} y={GY} width="6" height={SURF_SHOE - GY} fill="url(#cement)" className="cement" />
      <rect x={WX + 14} y={GY} width="6" height={SURF_SHOE - GY} fill="url(#cement)" className="cement" />
      <line x1={WX - 14} y1={GY} x2={WX - 14} y2={SURF_SHOE} className="casing" />
      <line x1={WX + 14} y1={GY} x2={WX + 14} y2={SURF_SHOE} className="casing" />
      <path d={`M${WX - 18},${SURF_SHOE} h8 M${WX + 10},${SURF_SHOE} h8`} className="casing" />
      {/* production casing (tube) + tubing */}
      <path d={prod} className="prod-casing" />
      <path d={prod} className="prod-bore" />
      <line x1={WX} y1={GY} x2={WX} y2={LAT_Y - 34} className="tubing" />
      <text x={WX - 24} y={SURF_SHOE + 4} textAnchor="end" className="sx-label">surface casing shoe</text>
      <text x={WX + 48} y={LAT_Y + 26} className="sx-label">heel</text>
      <text x="1160" y={LAT_Y + 26} textAnchor="end" className="sx-label">toe · ~1.5 mi lateral, fracture-stimulated in stages</text>
    </g>
  );
});

const MonitorWell = React.memo(function MonitorWell() {
  return (
    <g className="monitor-well">
      <rect x="1033" y="318" width="10" height="12" className="equip" />
      <line x1="1035" y1={GY} x2="1035" y2="432" className="casing thin-casing" />
      <line x1="1041" y1={GY} x2="1041" y2="432" className="casing thin-casing" />
      <path d="M1035,396 V432 M1041,396 V432" className="screen" />
      <text x="1050" y="430" className="sx-label">screen</text>
    </g>
  );
});

// ---------- static: surface ----------

const Surface = React.memo(function Surface() {
  const posts = [];
  for (let x = 104; x <= 876; x += 64) posts.push(<line key={x} x1={x} y1={GY} x2={x} y2={292} className="post" />);
  return (
    <g className="surface">
      <defs>
        <pattern id="mesh" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0,0 L7,7 M7,0 L0,7" className="mesh-line" />
        </pattern>
      </defs>
      {/* back fence + pad + lease road */}
      <rect x="100" y="292" width="780" height={GY - 292} fill="url(#mesh)" className="fence-back" />
      {posts}
      <rect x="96" y={GY - 3} width="846" height="3" className="pad" />
      <rect x="942" y={GY - 2} width={W - 942} height="2" className="road" />

      {/* weather mast */}
      <line x1="58" y1={GY} x2="58" y2="78" className="mast" />
      <line x1="26" y1="110" x2="90" y2="110" className="mast" />
      <rect x="44" y="300" width="28" height="22" className="equip" />

      {/* west fence */}
      <rect x="104" y="288" width="24" height={GY - 288} fill="url(#mesh)" className="fence" />
      <line x1="104" y1={GY} x2="104" y2="286" className="post strong" />
      <line x1="128" y1={GY} x2="128" y2="286" className="post strong" />

      {/* combustor + OGI pole */}
      <rect x="160" y="168" width="36" height={GY - 168} rx="3" className="equip" />
      <rect x="156" y="162" width="44" height="8" className="equip" />
      <rect x="152" y={GY - 10} width="52" height="10" className="equip" />
      <line x1="210" y1={GY} x2="210" y2="146" className="mast thin" />
      <path d="M200,130 h14 v10 h-14 z M214,133 l6,-2 v8 l-6,-2" className="equip" />
      <path d={`M684,214 V178 H178 V162`} className="vapor-line" />
      <text x="430" y="174" textAnchor="middle" className="sx-label">vapor line → combustor</text>

      {/* wellhead: casing head, valves, lubricator, controller */}
      <rect x={WX - 22} y={GY - 14} width="44" height="14" className="equip" />
      <rect x={WX - 16} y={GY - 26} width="32" height="12" className="equip" />
      <rect x={WX - 8} y="232" width="16" height={GY - 26 - 232} className="equip" />
      <circle cx={WX} cy="250" r="9" className="valve" />
      <circle cx={WX} cy="280" r="9" className="valve" />
      <rect x={WX - 6} y="160" width="12" height="72" rx="3" className="equip" />
      <rect x={WX - 10} y="154" width="20" height="8" className="equip" />
      <path d={`M${WX + 8},262 H372`} className="pipe" />
      <line x1="232" y1={GY} x2="232" y2="236" className="mast thin" />
      <rect x="224" y="246" width="18" height="22" className="equip" />
      <path d="M220,232 L246,228 L246,236 L220,240 Z" className="solar" />
      <path d={`M${WX - 22},${GY - 7} h-10`} className="pipe" />

      {/* separator / GPU */}
      <rect x="372" y="206" width="40" height="110" rx="18" className="equip" fill="none" />
      <rect x="360" y="316" width="64" height="10" className="equip" />
      <path d="M392,206 V192 H486 V250" className="pipe" />
      <path d="M392,316 V322 H680" className="pipe dump" />

      {/* compressor */}
      <rect x="466" y="250" width="78" height="66" className="equip" />
      <rect x="474" y="264" width="30" height="20" className="equip" />
      <rect x="546" y="222" width="24" height="94" className="equip" />
      <circle cx="558" cy="254" r="9" className="fan" />
      <line x1="482" y1="250" x2="482" y2="212" className="pipe" />
      <rect x="460" y="316" width="116" height="10" className="equip" />

      {/* meter run + RTU */}
      <path d="M570,270 H596 V278 H646 V346" className="pipe" />
      <rect x="604" y="268" width="16" height="20" className="equip" />
      <line x1="612" y1="268" x2="612" y2="252" className="mast thin" />
      <rect x="584" y="296" width="20" height="30" className="equip" />
      <line x1="600" y1="296" x2="600" y2="236" className="mast thin" />

      {/* tank battery */}
      <line x1="676" y1="204" x2="868" y2="204" className="catwalk" />
      {TANKS.map(t => (
        <g key={t.x}>
          <rect x={t.x} y={TANK_TOP} width="48" height={TANK_BOT - TANK_TOP} className="equip" fill="none" />
          <path d={`M${t.x},${TANK_TOP} L${t.x + 24},${TANK_TOP - 7} L${t.x + 48},${TANK_TOP}`} className="equip" fill="none" />
          <text x={t.x + 24} y={TANK_TOP + 14} textAnchor="middle" className="sx-label tank-label">{t.label}</text>
        </g>
      ))}
      <path d={`M664,${GY} V310 M870,${GY} V310`} className="berm" />

      {/* east fence + camera + sensor mast */}
      <line x1="880" y1={GY} x2="880" y2="286" className="post strong" />
      <line x1="896" y1={GY} x2="896" y2="210" className="mast thin" />
      <line x1="928" y1={GY} x2="928" y2="210" className="mast thin" />
      <line x1="938" y1={GY} x2="938" y2="286" className="post strong" />

      {/* community air station + homes */}
      <rect x="956" y="270" width="26" height={GY - 270} className="equip" />
      <line x1="968" y1="270" x2="968" y2="196" className="mast thin" />
      <g className="house">
        <path d="M1062,330 V266 L1100,240 L1138,266 V330" className="equip" />
        <rect x="1074" y="282" width="14" height="12" className="window" />
        <rect x="1112" y="282" width="14" height="12" className="window" />
        <rect x="1094" y="306" width="12" height="24" className="equip" />
        <path d="M1150,330 V272 L1184,248 L1218,272 V330" className="equip" />
        <rect x="1162" y="288" width="12" height="12" className="window" />
        <circle cx="1046" cy="296" r="14" className="tree" />
        <line x1="1046" y1="310" x2="1046" y2={GY} className="mast thin" />
      </g>
      <text x="1130" y="341" textAnchor="middle" className="sx-label">NEAREST HOMES</text>

      {/* equipment labels, in the soil band */}
      {[[58, "MET"], [116, "FENCE"], [178, "COMBUSTOR"], [WX, "WELL 10H"], [392, "SEPARATOR"], [515, "COMPRESSOR"],
        [615, "METER · RTU"], [767, "TANK BATTERY"], [910, "GATE"], [969, "AIR STN"]].map(([x, t]) => (
        <text key={t} x={x} y="341" textAnchor="middle" className="sx-label">{t}</text>
      ))}
      <text x="12" y="368" className="sx-label">← to gathering system</text>
    </g>
  );
});

// ---------- dynamic layers ----------

function Sky({ storm, lightningMi }) {
  return (
    <g className="sky">
      <defs>
        <pattern id="rain" width="18" height="18" patternUnits="userSpaceOnUse">
          <line x1="16" y1="0" x2="10" y2="12" className="rain-line" />
        </pattern>
        <clipPath id="skyClip"><rect x="0" y="0" width={W} height={GY} /></clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={GY} className="sky-fill" />
      <rect x="0" y="0" width={W} height={GY} className="storm-fill" style={{ opacity: storm * 0.75 }} />
      <g clipPath="url(#skyClip)" style={{ opacity: clamp((storm - 0.3) * 1.6, 0, 0.9) }}>
        <rect x="-36" y="-36" width={W + 72} height={GY + 72} fill="url(#rain)" className="rain-anim" />
      </g>
      {lightningMi < 12 && <rect x="0" y="0" width={W} height={GY} className="lightning-flash" />}
    </g>
  );
}

// Buried gathering line + surface gas piping, dashes move with gas rate
function GasFlow({ rate }) {
  const dur = rate > 50 ? clamp(2.2 * 1850 / rate, 0.8, 8) : 0;
  const style = dur ? { animationDuration: `${dur}s` } : { animation: "none" };
  return (
    <g className="gas-flow">
      <path d={`M646,352 H0`} className="buried-pipe" />
      <path d={`M${WX + 8},262 H372 M392,206 V192 H486 V250 M570,270 H596 V278 H646 V352 H0`} className="flow" style={style} />
    </g>
  );
}

function Plunger({ arrivalMin }) {
  const loading = arrivalMin >= 30;
  // liquid accumulates at the bottom of the tubing as arrivals slip
  const h = 14 + clamp((arrivalMin - 18) / 22, 0, 1) * 170;
  const bottom = LAT_Y - 34;
  return (
    <g>
      <rect x={WX - 4} y={bottom - h} width="8" height={h} className="liquid wb-liquid" />
      <g className={`plunger ${loading ? "stuck" : ""}`}>
        <rect x={WX - 3.5} y="-5" width="7" height="10" rx="1.5" className="plunger-body" />
      </g>
      {loading && <text x={WX + 10} y={bottom - h - 4} className="sx-label strong">liquid loading</text>}
    </g>
  );
}

function AnnulusGas({ psi }) {
  // gas bubbles behind pipe as bradenhead pressure builds
  const n = Math.round(clamp((psi - 40) / 12, 0, 10));
  if (!n) return null;
  return (
    <g className="annulus-gas">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={WX + (i % 2 ? 10 : -10)} cy={SURF_SHOE - 12 - i * 11} r="2" className="bubble"
                style={{ animationDelay: `${(i * 0.37) % 2}s` }} />
      ))}
      {n >= 3 && <text x={WX + 20} y={GY + 66} className="sx-label strong">gas behind pipe?</text>}
    </g>
  );
}

function SeparatorLevel({ level }) {
  const h = 110 * clamp(level, 0, 100) / 100;
  return (
    <g>
      <defs><clipPath id="sepClip"><rect x="372" y="206" width="40" height="110" rx="18" /></clipPath></defs>
      <rect x="372" y={316 - h} width="40" height={h} clipPath="url(#sepClip)" className="liquid" />
    </g>
  );
}

function Tanks({ latest, driftSign }) {
  return TANKS.map(t => {
    const ft = latest[t.id]?.value ?? 8;
    const h = clamp(ft, 0, 20) * PX_PER_FT;
    const open = t.hatch && (latest[t.hatch]?.value ?? 0) >= 0.5;
    const hx = t.x + 30;
    return (
      <g key={t.x}>
        <rect x={t.x + 1} y={TANK_BOT - h} width="46" height={h}
              className={`liquid ${t.id.endsWith("03") ? "condensate" : ""}`} />
        <rect x={t.x + 46} y={TANK_TOP + 4} width="2" height={TANK_BOT - TANK_TOP - 4} className="gauge-strip" />
        <g transform={`translate(${hx} ${TANK_TOP - 4})`}>
          <rect x="-1" y="-3" width="8" height="3" className="equip" />
          <rect x="-1" y="-6" width="8" height="2.5" className="hatch-lid"
                transform={open ? "rotate(-70 -1 -4)" : undefined} />
          {open && <VaporPuffs driftSign={driftSign} />}
        </g>
      </g>
    );
  });
}

function VaporPuffs({ driftSign, scale = 1 }) {
  return (
    <g className="vapor" transform={`scale(${driftSign * scale} ${scale})`}>
      {[0, 1, 2].map(i => (
        <circle key={i} cx={4} cy={-8} r={4 + i * 2} className="puff" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
    </g>
  );
}

function Combustor({ tempF, driftSign }) {
  const lit = tempF >= 1200;
  return (
    <g>
      <rect x="170" y="296" width="16" height="10" className={lit ? "fire-window lit" : "fire-window"} />
      {lit ? (
        <g className="shimmer">
          <path d="M168,158 q4,-6 0,-12 q-4,-6 0,-12 M178,158 q4,-6 0,-12 q-4,-6 0,-12 M188,158 q4,-6 0,-12 q-4,-6 0,-12" />
        </g>
      ) : (
        <g transform="translate(176 160)">
          <VaporPuffs driftSign={driftSign} scale={1.6} />
          <text x="0" y="-30" textAnchor="middle" className="sx-label strong">PILOT OUT · VENTING</text>
        </g>
      )}
    </g>
  );
}

function Berm({ inches }) {
  const h = clamp(inches / 6, 0, 1) * 18;
  if (h < 0.6) return null;
  return <rect x="665" y={GY - h} width="204" height={h} className="liquid berm-water" />;
}

function Gate({ open }) {
  return open
    ? <rect x="882" y="288" width="6" height={GY - 288} fill="url(#mesh)" className="fence gate-open" />
    : <rect x="882" y="288" width="54" height={GY - 288} fill="url(#mesh)" className="fence" />;
}

function Vehicles({ persons, gateOpen }) {
  if (gateOpen && persons === 0) {
    return (
      <g className="vehicle intruder">
        <rect x="948" y="298" width="64" height="20" rx="9" className="equip" />
        <path d="M1014,318 V296 H1032 L1042,308 V318 Z" className="equip" />
        <rect x="944" y="316" width="100" height="6" className="equip" />
        {[960, 996, 1032].map(x => <circle key={x} cx={x} cy="324" r="5" className="wheel" />)}
        <text x="996" y="290" textAnchor="middle" className="sx-label strong">UNSCHEDULED VACUUM TRUCK</text>
      </g>
    );
  }
  if (persons > 0) {
    return (
      <g className="vehicle">
        <path d="M948,322 V312 H972 L978,302 H992 L1000,312 V322 Z" className="equip" />
        {[958, 990].map(x => <circle key={x} cx={x} cy="324" r="4.5" className="wheel" />)}
        <text x="974" y="296" textAnchor="middle" className="sx-label">lease operator</text>
      </g>
    );
  }
  return null;
}

function NoiseArcs({ status }) {
  if (status === "normal" || status === "offline") return null;
  return (
    <g className={`noise st-${status}`}>
      {[16, 26, 36].map((r, i) => (
        <path key={r} d={`M${505 - r},230 A${r},${r} 0 0 1 ${505 + r},230`} style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </g>
  );
}

function Seismic({ pgv }) {
  if (pgv < 0.5) return null;
  return (
    <g className="seismic">
      {[0, 1, 2].map(i => <ellipse key={i} cx="500" cy="356" rx="20" ry="6" style={{ animationDelay: `${i * 0.5}s` }} />)}
    </g>
  );
}

function Windsock({ mph, driftSign }) {
  const lift = clamp(mph / 22, 0.1, 1);
  return (
    <g transform="translate(58 78)">
      <g transform={`scale(${driftSign} 1)`}>
        <path d="M0,1 L18,3 L18,6 L0,8 Z" className="sock" transform={`rotate(${90 - lift * 85} 0 4)`} />
      </g>
    </g>
  );
}

// Gas detections: outline the detectors in warning/alarm per zone, with drift arrow
function GasDetections({ sensors, latest, driftSign }) {
  const groups = {};
  sensors.forEach(s => {
    if (!GAS_TYPES.has(s.type)) return;
    const r = latest[s.id];
    if (!r || (r.status !== "warning" && r.status !== "alarm")) return;
    (groups[s.zone] = groups[s.zone] || []).push({ s, r });
  });
  return Object.entries(groups).map(([zone, items]) => {
    const xs = items.map(i => i.s.x), ys = items.map(i => i.s.y);
    const x0 = Math.min(...xs) - 20, x1 = Math.max(...xs) + 20;
    const y0 = Math.min(...ys) - 18, y1 = Math.max(...ys) + 18;
    const worst = items.some(i => i.r.status === "alarm") ? "alarm" : "warning";
    const gases = [...new Set(items.map(i => GAS_NAME[i.s.type]))].join(" + ");
    const ax = driftSign >= 0 ? x1 + 4 : x0 - 4;
    return (
      <g key={zone} className={`gas-hull st-${worst}`}>
        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="12" />
        <text x={x0} y={y0 - 5} className="sx-label strong">
          {gases} {worst.toUpperCase()}
        </text>
        <path d={`M${ax},${(y0 + y1) / 2} h${driftSign * 26} m${-driftSign * 6},-4 l${driftSign * 6},4 l${-driftSign * 6},4`}
              className="drift-arrow" />
      </g>
    );
  });
}

// ---------- markers + callouts ----------

function SensorMarker({ sensor, reading, alert, dimmed, selected, hovered, onSelect, onHover, onLeave }) {
  const cat = CATEGORIES[sensor.category];
  const status = reading ? reading.status : "normal";
  const unack = alert && !alert.acked && alert.state === "active" && status !== "normal";
  return (
    <g
      className={`mk st-${status} ${dimmed ? "dim" : ""} ${selected ? "sel" : ""} ${hovered ? "hov" : ""}`}
      transform={`translate(${sensor.x} ${sensor.y})`}
      onClick={e => { e.stopPropagation(); onSelect(sensor.id); }}
      onMouseEnter={e => onHover(sensor.id, e)}
      onMouseMove={e => onHover(sensor.id, e)}
      onMouseLeave={onLeave}
      tabIndex={dimmed ? -1 : 0}
      role="button"
      aria-label={`${sensor.label}, ${sensor.id}, ${status}`}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(sensor.id); } }}
    >
      <circle r="13" className="mk-hit" />
      {unack && <circle r="9" className="mk-pulse" />}
      {selected && <circle r="13" className="mk-ring" />}
      <g className="mk-body">
        <ShapePath shape={cat.shape} className="mk-shape" />
        <ShapeLetter shape={cat.shape} code={cat.code} />
      </g>
    </g>
  );
}

// Greedy placement of value callouts for alerting sensors so they don't collide
function placeCallouts(items) {
  const placed = [];
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const out = [];
  items.sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status]);
  for (const it of items) {
    const w = 10 + it.text.length * 5.9, h = 14;
    const cands = [
      { x: it.x + 11, y: it.y - h / 2 },
      { x: it.x - 11 - w, y: it.y - h / 2 },
      { x: it.x - w / 2, y: it.y + 11 },
      { x: it.x - w / 2, y: it.y - 11 - h },
    ];
    const box = cands.map(c => ({ ...c, w, h })).find(b => !placed.some(p => hit(p, b)) && b.x > 0 && b.x + w < W);
    if (!box) continue;
    placed.push(box);
    out.push({ ...it, box });
  }
  return out;
}

function Callouts({ sensors, latest, isVisible }) {
  const items = [];
  sensors.forEach(s => {
    const r = latest[s.id];
    if (!r || !isVisible(s)) return;
    if (r.status === "warning" || r.status === "alarm" || r.status === "offline") {
      const text = r.status === "offline" ? "NO DATA" : `${fmtValue(r.value, s.type)} ${fmtUnit(s.type)}`.trim();
      items.push({ id: s.id, x: s.x, y: s.y, status: r.status, text });
    }
  });
  return placeCallouts(items).map(c => (
    <g key={c.id} className={`callout st-${c.status}`} pointerEvents="none">
      <rect x={c.box.x} y={c.box.y} width={c.box.w} height={c.box.h} rx="2" />
      <text x={c.box.x + 5} y={c.box.y + c.box.h / 2} dominantBaseline="central">{c.text}</text>
    </g>
  ));
}

// ---------- main ----------

function SiteSchematic({
  sensors, latest, alertBySensor, isVisible, selectedId, onSelect,
  focusZones, hoverZone, pinnedZone, onZoneHover, onZoneClick, showZones, children,
}) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const v = (id, d) => latest[id]?.value ?? d;

  const wind = v("WIND-MET-01", 11), wdir = v("WDIR-MET-01", 170);
  const storm = clamp((wind - 15) / 18, 0, 1);
  // Elevation looks north: wind from the east (90°) drifts gas west (left)
  const driftSign = -Math.sin(wdir * Math.PI / 180) >= 0 ? 1 : -1;
  const persons = v("PERS-GTE-01", 0), gateOpen = v("GATE-GTE-01", 0) >= 0.5;

  const onHover = (id, e) => {
    const box = wrapRef.current.getBoundingClientRect();
    setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top, w: box.width });
    onZoneHover(sensors.find(s => s.id === id)?.zone || null);
  };
  const onLeave = () => { setHover(null); onZoneHover(null); };

  const zoneEntries = Object.entries(ZONES);
  const hovered = hover && sensors.find(s => s.id === hover.id);

  return (
    <div className="schematic" ref={wrapRef}>
      <svg viewBox={`0 ${VB_Y} ${W} ${H - VB_Y}`} preserveAspectRatio="xMidYMid meet" className="schematic-svg"
           onClick={() => onZoneClick(null)}
           role="img" aria-label="Well site schematic with sensor markers">
        <Sky storm={storm} lightningMi={v("LIGHTNING-MET-01", 75)} />
        <Ground />
        <Wellbore />
        <MonitorWell />
        <AnnulusGas psi={v("PT-BH-WB-01", 15)} />
        <Plunger arrivalMin={v("PLUNGER-WH-01", 18)} />
        <Surface />
        <GasFlow rate={v("FT-GAS-MTR-01", 1850)} />
        <SeparatorLevel level={v("LT-SEP-SEP-01", 42)} />
        <Tanks latest={latest} driftSign={driftSign} />
        <Berm inches={v("BERM-TNK-01", 0)} />
        <Combustor tempF={v("COMB-T-CMB-01", 1450)} driftSign={driftSign} />
        <Gate open={gateOpen} />
        <Vehicles persons={persons} gateOpen={gateOpen} />
        <NoiseArcs status={latest["NOISE-RES-COM-01"]?.status || "normal"} />
        <Seismic pgv={v("SEIS-GND-01", 0)} />
        <Windsock mph={wind} driftSign={driftSign} />

        {/* zones: hover to name, click to pin the area banner */}
        <g className="zones">
          {zoneEntries.map(([key, z]) => {
            const [x, y, w, h] = z.rect;
            const on = showZones || hoverZone === key || pinnedZone === key || focusZones.has(key);
            return (
              <g key={key} className={`zone ${on ? "on" : ""} ${focusZones.has(key) ? "focus" : ""} ${pinnedZone === key ? "pinned" : ""}`}
                 onMouseEnter={() => onZoneHover(key)} onMouseLeave={() => onZoneHover(null)}
                 onClick={e => { e.stopPropagation(); onZoneClick(key); }}>
                <rect x={x} y={y} width={w} height={h} rx="4" />
                {on && <text x={x + 4} y={y + 10} className="zone-label">{z.label.toUpperCase()}</text>}
              </g>
            );
          })}
        </g>

        <GasDetections sensors={sensors} latest={latest} driftSign={driftSign} />

        <g className="markers">
          {sensors.map(s => (
            <SensorMarker
              key={s.id}
              sensor={s}
              reading={latest[s.id]}
              alert={alertBySensor[s.id]}
              dimmed={!isVisible(s)}
              selected={selectedId === s.id}
              hovered={hover?.id === s.id}
              onSelect={onSelect}
              onHover={onHover}
              onLeave={onLeave}
            />
          ))}
        </g>
        <Callouts sensors={sensors} latest={latest} isVisible={isVisible} />
      </svg>

      {children}

      {hovered && (
        <SensorTooltip sensor={hovered} reading={latest[hovered.id]} x={hover.x} y={hover.y} w={hover.w} />
      )}
    </div>
  );
}

function SensorTooltip({ sensor, reading, x, y, w }) {
  const type = SENSOR_TYPES[sensor.type];
  const status = reading?.status || "normal";
  const left = x > w - 260 ? x - 250 : x + 16;
  return (
    <div className="tooltip" style={{ left, top: y + 14 }}>
      <div className="tt-head">
        <CategoryIcon category={sensor.category} />
        <span className="mono tt-id">{sensor.id}</span>
        <span className={`pill st-${status}`}><StatusIcon status={status} size={10} /> {window.Fmt.STATUS_LABEL[status]}</span>
      </div>
      <div className="tt-name">{sensor.label}</div>
      <div className="tt-type">{type.name}</div>
      <div className="tt-value mono">
        {fmtValue(reading?.value, sensor.type)} <span>{fmtUnit(sensor.type)}</span>
      </div>
      <div className="tt-hint">Click for detail & trend</div>
    </div>
  );
}

window.SiteSchematic = SiteSchematic;

})();
