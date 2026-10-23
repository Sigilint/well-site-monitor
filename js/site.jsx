// Site definition — one producing Barnett Shale gas well, its pad equipment,
// sensor placements, and the scripted scenarios the simulator plays on a loop.
// Coordinates are schematic space (viewBox 0 0 1200 760).
//
// The well's identity (API number, well number, location, status) is from the
// public RRC GIS well layer (texas-well-platform/datasets/tarrant). The
// operator is deliberately not named, and everything else here — equipment,
// sensors, readings and events — is simulated.

(() => {

const SITE = {
  name: "Well 10H",
  api: "42-439-34308",
  county: "Tarrant County, TX",
  formation: "Barnett Shale",
  type: "Horizontal gas well · plunger lift",
  rrcStatus: "Gas Well (active)",
  lat: 32.68507617,
  lon: -97.22433526,
  locationSource: "Operator reported location — distances and plat",
  source: "RRC public GIS well layer, Tarrant County snapshot 2026-10-21",
  loopSeconds: 600,
};

// [type, zone, x, y, label, overrides]
const PLACEMENTS = [
  // Weather mast
  ["WIND",      "MET", 34, 110, "Mast anemometer"],
  ["GUST",      "MET", 58, 110, "Mast gust"],
  ["WDIR",      "MET", 82, 110, "Mast wind vane"],
  ["AIRT",      "MET", 58, 160, "Air temperature"],
  ["RAIN",      "MET", 58, 200, "Rain gauge"],
  ["BARO",      "MET", 58, 240, "Barometer"],
  ["LIGHTNING", "MET", 58, 280, "Lightning detector"],

  // West fence (usually downwind in the prevailing southerly)
  ["CH4_FL",    "FNW", 116, 236, "West fence methane"],
  ["VOC_FL",    "FNW", 116, 268, "West fence VOC"],
  ["FENCE",     "FNW", 116, 300, "West fence intrusion"],

  // Combustor
  ["OGI",       "CMB", 206, 136, "OGI camera (tank battery view)"],
  ["COMB_T",    "CMB", 178, 250, "Combustor firebox"],

  // Wellhead
  ["PLUNGER",   "WH", 282, 162, "Plunger arrival sensor"],
  ["GD_LEL",    "WH", 318, 192, "Wellhead gas detector"],
  ["PT_TUB",    "WH", 252, 214, "Tubing pressure"],
  ["SSV",       "WH", 312, 242, "Surface safety valve"],
  ["PT_CSG",    "WH", 252, 282, "Casing pressure"],

  // Separator / gas production unit
  ["PT_SEP",    "SEP", 392, 202, "Separator pressure"],
  ["LT_SEP",    "SEP", 430, 258, "Separator level"],
  ["FT_WTR",    "SEP", 362, 300, "Water dump meter"],
  ["GD_LEL",    "SEP", 432, 304, "Separator gas detector"],

  // Compressor
  ["FD_FLAME",  "CMP", 470, 214, "Compressor flame detector"],
  ["TT_DIS",    "CMP", 540, 222, "Compressor discharge temp"],
  ["CMP_VIB",   "CMP", 488, 262, "Compressor frame vibration"],
  ["GD_LEL",    "CMP", 556, 304, "Compressor gas detector"],

  // Meter run + RTU
  ["FT_GAS",    "MTR", 612, 248, "Sales gas meter"],
  ["PT_LINE",   "MTR", 600, 300, "Sales line pressure"],
  ["RTU_SEC",   "MTR", 638, 306, "RTU network monitor"],

  // Tank battery — T1, T2 produced water; T3 condensate
  ["GD_H2S",    "TNK", 704, 204, "Tank T1 H₂S"],
  ["LT_TANK",   "TNK", 704, 270, "Tank T1 level (water)", { base: 9.5 }],
  ["HATCH",     "TNK", 772, 204, "Tank T2 thief hatch"],
  ["LT_TANK",   "TNK", 772, 270, "Tank T2 level (water)", { base: 7.2 }],
  ["HATCH",     "TNK", 840, 204, "Tank T3 thief hatch"],
  ["LT_TANK",   "TNK", 840, 270, "Tank T3 level (condensate)", { base: 11.8 }],
  ["GD_LEL",    "TNK", 738, 236, "Tank battery gas detector"],
  ["FD_FLAME",  "TNK", 806, 236, "Tank battery flame detector"],
  ["BERM",      "TNK", 676, 316, "Containment liquid sensor"],
  ["HAUL_VAR",  "TNK", 856, 186, "Haul ticket reconciliation"],

  // Gate & east fence
  ["PERS",      "GTE", 896, 222, "Badge reader"],
  ["CCTV",      "GTE", 928, 216, "Gate camera"],
  ["NOISE_FL",  "GTE", 896, 252, "East fence noise"],
  ["CH4_FL",    "GTE", 896, 282, "East fence methane"],
  ["GATE",      "GTE", 924, 310, "Pad gate"],

  // Neighbourhood
  ["BTEX",      "COM", 968, 206, "Community air station — benzene"],
  ["PM25",      "COM", 968, 236, "Community air station — PM2.5"],
  ["NOISE_RES", "COM", 1104, 286, "Nearest residence noise"],

  // Buried gathering line (west of pad)
  ["LEAK_DET",  "PL", 60, 352, "Gathering line mass balance"],
  ["CP",        "PL", 120, 352, "Gathering line CP test station"],
  ["CORR",      "PL", 180, 352, "Gathering line ER probe"],

  // Pad ground
  ["SEIS",      "GND", 500, 356, "Pad seismometer vault"],

  // Groundwater monitoring well (Trinity aquifer)
  ["GW_CH4",    "GW", 1038, 408, "Monitor well dissolved methane"],
  ["GW_COND",   "GW", 1038, 440, "Monitor well conductivity"],

  // Wellbore & lateral
  ["PT_BH",     "WB", 304, 362, "Bradenhead (surface casing annulus)"],
  ["PT_BHP",    "LAT", 352, 640, "Heel pressure gauge"],
];

// How each zone's sensors reach the RTU / cloud
const LINK_BY_ZONE = { COM: "cellular", GW: "cellular", FNW: "lora", GTE: "lora", PL: "lora" };

// Build sensor records with stable IDs: TYPE-ZONE-nn
const SENSORS = (() => {
  const counts = {};
  return PLACEMENTS.map(([type, zone, x, y, label, overrides], i) => {
    const key = `${type}-${zone}`;
    counts[key] = (counts[key] || 0) + 1;
    const id = `${type.replace("_", "-")}-${zone}-${String(counts[key]).padStart(2, "0")}`;
    return {
      id, type, zone, x, y, label, index: i,
      node: `N-${String(10 + Math.floor(i / 3)).padStart(3, "0")}`,
      link: LINK_BY_ZONE[zone] || "wired",
      ...overrides,
    };
  });
})();

// Scenario effects:
//   plateau — smooth rise over `rise` s, hold, smooth fall; adds `delta`
//   ramp    — linear 0 → delta over the window
//   offline — sensor stops reporting during the window
// Optional per-effect `at: [start, end]` overrides the scenario window.
const SCENARIOS = [
  {
    id: "bradenhead", title: "Bradenhead pressure building", category: "integrity",
    window: [0, 600],
    story: "Pressure behind the surface casing creeps up all loop. Sustained bradenhead pressure means gas is migrating behind pipe — the integrity issue that matters most for the aquifer above it.",
    effects: [{ sensor: "PT-BH-WB-01", kind: "ramp", delta: 118 }],
  },
  {
    id: "visit", title: "Lease operator site visit", category: "safety",
    window: [20, 150],
    story: "The lease operator badges in, gauges the tanks and checks the plunger controller. The gate opens on arrival and departure.",
    effects: [
      { sensor: "PERS-GTE-01", kind: "plateau", delta: 1, rise: 4 },
      { sensor: "GATE-GTE-01", kind: "plateau", delta: 1, rise: 1, at: [18, 30] },
      { sensor: "GATE-GTE-01", kind: "plateau", delta: 1, rise: 1, at: [140, 152] },
    ],
  },
  {
    id: "loading", title: "Liquid loading — plunger arriving late", category: "production",
    window: [60, 230],
    story: "Water builds up in the wellbore faster than the plunger can lift it. Gas rate sags, casing pressure climbs, arrivals slip past 30 minutes. The controller lengthens the shut-in to recover.",
    effects: [
      { sensor: "FT-GAS-MTR-01",   kind: "plateau", delta: -720, rise: 50 },
      { sensor: "PT-CSG-WH-01",    kind: "plateau", delta: 300, rise: 50 },
      { sensor: "PT-TUB-WH-01",    kind: "plateau", delta: -230, rise: 50 },
      { sensor: "PLUNGER-WH-01",   kind: "plateau", delta: 21, rise: 40 },
      { sensor: "PT-BHP-LAT-01",   kind: "plateau", delta: 160, rise: 60 },
      { sensor: "FT-WTR-SEP-01",   kind: "plateau", delta: -40, rise: 40 },
    ],
  },
  {
    id: "hatch", title: "Thief hatch left open on tank T2", category: "environment",
    window: [150, 300],
    story: "After gauging, the T2 thief hatch didn't latch. Tank vapours vent directly to air: the OGI camera sees a plume, and the downwind west fence picks up methane and VOCs.",
    effects: [
      { sensor: "HATCH-TNK-01",   kind: "plateau", delta: 1, rise: 2, at: [148, 290] },
      { sensor: "OGI-CMB-01",     kind: "plateau", delta: 58, rise: 20, at: [158, 292] },
      { sensor: "GD-LEL-TNK-01",  kind: "plateau", delta: 24, rise: 20, at: [155, 288] },
      { sensor: "CH4-FL-FNW-01",  kind: "plateau", delta: 13, rise: 30 },
      { sensor: "VOC-FL-FNW-01",  kind: "plateau", delta: 190, rise: 30 },
    ],
  },
  {
    id: "pilot", title: "Combustor pilot out", category: "environment",
    window: [240, 320],
    story: "The combustor pilot goes out. Firebox temperature collapses and the vapours it should be burning go out the stack unburned.",
    effects: [
      { sensor: "COMB-T-CMB-01",  kind: "plateau", delta: -680, rise: 25 },
      { sensor: "VOC-FL-FNW-01",  kind: "plateau", delta: 80, rise: 25, at: [250, 320] },
    ],
  },
  {
    id: "compressor", title: "Compressor running hot in the afternoon heat", category: "production",
    window: [270, 420],
    story: "Air temperature passes 100 °F and the compressor's cooler can't keep up. Discharge temperature and vibration rise, and so does noise at the nearest house.",
    effects: [
      { sensor: "AIRT-MET-01",       kind: "plateau", delta: 13, rise: 60, at: [250, 410] },
      { sensor: "TT-DIS-CMP-01",     kind: "plateau", delta: 56, rise: 45 },
      { sensor: "CMP-VIB-CMP-01",    kind: "plateau", delta: 0.32, rise: 45 },
      { sensor: "NOISE-RES-COM-01",  kind: "plateau", delta: 9, rise: 30 },
      { sensor: "NOISE-FL-GTE-01",   kind: "plateau", delta: 7, rise: 30 },
    ],
  },
  {
    id: "theft", title: "After-hours entry — condensate withdrawn without a ticket", category: "security",
    window: [330, 430],
    story: "The gate opens with nobody badged in. The camera sees a vacuum truck, condensate tank T3 drops five feet, and there is no haul ticket to match.",
    effects: [
      { sensor: "GATE-GTE-01",      kind: "plateau", delta: 1, rise: 1, at: [334, 416] },
      { sensor: "CCTV-GTE-01",      kind: "plateau", delta: 2.6, rise: 5, at: [334, 416] },
      { sensor: "LT-TANK-TNK-03",   kind: "plateau", delta: -5.4, rise: 50, at: [345, 600] },
      { sensor: "HAUL-VAR-TNK-01",  kind: "plateau", delta: 36, rise: 50, at: [345, 600] },
      { sensor: "PM25-COM-01",      kind: "plateau", delta: 30, rise: 10, at: [334, 420] },
    ],
  },
  {
    id: "storm", title: "Severe thunderstorm", category: "weather",
    window: [400, 560],
    story: "A line of storms brings severe gusts, lightning within a few miles and heavy rain. The wind veers to the northwest, toward the houses. Truck loading stops and containment starts to fill.",
    effects: [
      { sensor: "WIND-MET-01",      kind: "plateau", delta: 22, rise: 50 },
      { sensor: "GUST-MET-01",      kind: "plateau", delta: 44, rise: 50 },
      { sensor: "WDIR-MET-01",      kind: "plateau", delta: 140, rise: 60 },
      { sensor: "AIRT-MET-01",      kind: "plateau", delta: -18, rise: 50 },
      { sensor: "RAIN-MET-01",      kind: "plateau", delta: 1.7, rise: 30, at: [420, 540] },
      { sensor: "LIGHTNING-MET-01", kind: "plateau", delta: -68, rise: 60 },
      { sensor: "BARO-MET-01",      kind: "plateau", delta: -0.34, rise: 70 },
      { sensor: "BERM-TNK-01",      kind: "plateau", delta: 3.6, rise: 60, at: [430, 600] },
    ],
  },
  {
    id: "gwoff", title: "Groundwater sonde offline", category: "environment",
    window: [440, 520],
    story: "The monitor well's cellular modem drops during the storm. Its readings show NO DATA and a comms fault rather than the last good value.",
    effects: [
      { sensor: "GW-CH4-GW-01",  kind: "offline" },
      { sensor: "GW-COND-GW-01", kind: "offline" },
    ],
  },
  {
    id: "rtu", title: "Unexpected remote commands to the RTU", category: "security",
    window: [470, 540],
    story: "The RTU network monitor sees setpoint writes from an address that isn't the SCADA host — a misconfigured poller, or someone who shouldn't be there.",
    effects: [{ sensor: "RTU-SEC-MTR-01", kind: "plateau", delta: 62, rise: 15 }],
  },
  {
    id: "quake", title: "Small earthquake felt nearby", category: "integrity",
    window: [505, 530],
    story: "A small regional earthquake shakes the pad. Ground velocity spikes briefly — the cue to check casing pressures, tanks and lines.",
    effects: [{ sensor: "SEIS-GND-01", kind: "plateau", delta: 3.4, rise: 3 }],
  },
];

// Built-in saved views (filter presets) offered to every user
const VIEWS = [
  { id: "all", name: "All sensors", filters: {} },
  { id: "attention", name: "Needs attention", description: "Everything in warning or alarm", filters: { status: "attention" } },
  { id: "well", name: "Well & artificial lift", filters: { zones: ["LAT", "SEP", "WB", "WH"] } },
  { id: "tanks", name: "Tank battery", filters: { zones: ["TNK"] } },
  { id: "fence", name: "Fenceline & neighbours", filters: { zones: ["COM", "FNW", "GTE"] } },
  { id: "emissions", name: "Emissions & environment", filters: { categories: ["environment"] } },
  { id: "below", name: "Below ground", filters: { zones: ["GND", "GW", "LAT", "PL", "WB"] } },
  { id: "security", name: "Security & access", filters: { categories: ["security"] } },
];

window.SiteDef = { SITE, SENSORS, SCENARIOS, VIEWS };

})();
