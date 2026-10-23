# Well site sensor catalog

What can be instrumented on a producing onshore gas well pad, grouped by what
the reading is *for*, and what each sensor can tell an operator.
`js/catalog.jsx` is the source of truth; the tables below are generated from
it (`node scripts/gen-catalog-doc.js`).

> **Demo values.** Thresholds are plausible illustrative numbers, not
> engineering, permit or regulatory limits. Real set points come from the
> operator's procedures, equipment vendors, air and noise permits, local
> ordinances and Railroad Commission rules. A monitoring overlay like Sigil
> Watch runs alongside the well's own controls and shutdowns and never
> replaces them.

## The six categories

| Category | Question it answers | Typical consumers |
|---|---|---|
| **Production** | Is the well flowing, and is the equipment moving gas efficiently? | Lease operator, production engineer, gas control |
| **Safety** | Is anyone on the pad at risk from gas, fire or a failed shut-in? | Lease operator, field supervisor, emergency response |
| **Environment** | What is leaving the pad — to the air, the ground, the groundwater, the neighbours? | HSE / air permitting, community relations, regulators |
| **Integrity** | Are the casing, flowlines and ground sound? | Well integrity and pipeline engineers |
| **Security** | Who came onto the pad, and did anything leave without a ticket? | Field security, production accounting |
| **Weather** | Can crews and trucks work safely, and where will a release drift? | Field supervisor, haulers |

What sets a single urban Barnett well apart from an offshore platform is how
much of the monitoring faces *outward*. The pad sits close to homes, so
fenceline air, noise, community air quality and groundwater are as central as
production.

Readings that matter twice:

- **Bradenhead pressure** is an integrity reading, but its real meaning is
  environmental: gas behind the surface casing is gas that could reach the
  aquifer the casing protects.
- **Tank level** is production data, but a level that falls with no haul
  ticket is a security event, and one that rises toward the top is a spill
  risk.
- **Wind direction** decides which fenceline monitor is downwind and whether
  emissions blow toward the houses.
- **Gate and badge** together separate a routine visit from an unauthorised
  entry; neither alone does.

## Derived states

The strip at the top of the screen combines several sensors into decisions:

| State | Inputs | Example rule (demo) |
|---|---|---|
| Well | Plunger arrival, casing pressure, SSV, gas and water meters | Loading up if arrival ≥ 30 min or casing ≥ 900 psi; shut in if SSV ≤ 10 % |
| Site work | Lightning, wind, gust, containment level | Suspended if lightning ≤ 10 mi, gust ≥ 58 mph or berm full; limited if lightning ≤ 20 mi, wind ≥ 30 mph, gust ≥ 40 mph or berm ≥ 2 in |
| Access | Badge reader, gate contact, haul ticket reconciliation | Unbadged entry if the gate is open with nobody badged in; no haul ticket if ≥ 5 bbl left unticketed |
| Emissions | Thief hatches, combustor temperature, OGI camera, fenceline CH₄ and VOC | Venting if the combustor is out, the OGI score ≥ 70 or a fenceline alarm; elevated for any other finding |
| Neighbours | Residence noise, community benzene and PM2.5 | Worst status of the three, showing noise at the nearest home |

## Sensor types

<!-- BEGIN GENERATED -->

### Production — shape: square, code `P`

Wellhead, lift, separation, compression and sales — keep the well flowing efficiently. (12 types, 14 sensors in the demo)

| Type | Sensor | Unit | Warn / alarm | What it tells you | Demo locations |
|---|---|---|---|---|---|
| `PT_TUB` | Tubing pressure | psi | ≤ 320 / 200 | Whether the well is flowing or loading up with liquid; Plunger-lift cycle timing; Choke and line-pressure effects on the well | WH |
| `PT_CSG` | Casing pressure | psi | ≥ 900 / 1100 | Rising casing with falling tubing pressure is the classic liquid-loading signature; How much energy is available to lift the plunger | WH |
| `PT_BHP` | Downhole pressure gauge | psi | — | Reservoir drawdown and depletion over time; Hydrostatic load from liquid accumulating in the wellbore | LAT |
| `PLUNGER` | Plunger arrival time | min | ≥ 30 / 45 | Late or missed arrivals mean the well is loading up; When to change cycle timing or swab the well | WH |
| `FT_GAS` | Gas meter (orifice) | Mcf/d | ≤ 1300 / 900 | Production rate and revenue; Sudden drops point to loading, freezing, a closed valve or high line pressure; Allocation between wells on the pad | MTR |
| `FT_WTR` | Produced water meter | bbl/d | ≥ 160 / 220 | Water cut trend; Truck haul scheduling; Unusual water can mean a casing or frac-hit problem | SEP |
| `PT_SEP` | Separator pressure | psi | ≥ 270 / 300 | Approach to the relief valve set point; Downstream restrictions (compressor, line pressure) | SEP |
| `LT_SEP` | Separator level | % | ≥ 75 / 90 | Dump valve failure before liquid carries over into the gas line; Slugs of liquid arriving from the well | SEP |
| `PT_LINE` | Sales line pressure | psi | ≥ 230 / 260 | High line pressure backs out low-pressure wells; Midstream outages and curtailment | MTR |
| `CMP_VIB` | Compressor vibration | in/s | ≥ 0.5 / 0.8 | Developing mechanical faults before a failure; Loose mounts, worn bearings, unbalance | CMP |
| `TT_DIS` | Compressor discharge temp | °F | ≥ 300 / 330 | Cooler fouling or fan failure on hot days; Valve problems and over-compression; Shutdown risk before it trips | CMP |
| `LT_TANK` | Tank level (radar) | ft | ≥ 16 / 18 | When to call a water or condensate haul; Overfill risk before the high-high shut-in; Level falling with no haul ticket can mean theft or a leak | TNK |

### Safety — shape: circle, code `S`

Gas, fire and people on the pad — detect hazards to life before they escalate. (5 types, 9 sensors in the demo)

| Type | Sensor | Unit | Warn / alarm | What it tells you | Demo locations |
|---|---|---|---|---|---|
| `GD_LEL` | Combustible gas detector | %LEL | ≥ 20 / 40 | Gas leaks at flanges, valves and tank hatches before they reach an ignition source; Triggers the site shutdown at high LEL | WH, SEP, CMP, TNK |
| `GD_H2S` | H₂S detector | ppm | ≥ 5 / 10 | Barnett gas is normally sweet — any H₂S is unusual and may mean souring from bacteria in produced water; Exposure risk for lease operators and haulers at the tanks | TNK |
| `FD_FLAME` | Flame detector (IR³) | % signal | ≥ 40 / 75 | Fire at the tanks or compressor in seconds; Lightning-started tank fires | CMP, TNK |
| `SSV` | Surface safety valve | % open | ≤ 90 / 10 | Whether the well actually shut in when commanded; Spurious closures that stop production | WH |
| `PERS` | Personnel on pad (badge) | persons | — | Lone-worker coverage for lease operators; Who is on site if the alarm sounds; Gate activity with nobody badged in | GTE |

### Environment — shape: hexagon, code `E`

Emissions, spills, groundwater and the neighbours — what leaves the pad. (12 types, 14 sensors in the demo)

| Type | Sensor | Unit | Warn / alarm | What it tells you | Demo locations |
|---|---|---|---|---|---|
| `CH4_FL` | Fenceline methane | ppm | ≥ 10 / 25 | Leaks and venting reaching the property line; Direction of the source when read with wind; Evidence for leak detection and repair follow-up | FNW, GTE |
| `VOC_FL` | Fenceline VOC (PID) | ppb | ≥ 100 / 250 | Tank vapours and condensate emissions; Ozone-precursor emissions in a nonattainment area; Odour complaints before they're called in | FNW |
| `OGI` | Continuous OGI camera | plume score | ≥ 40 / 70 | Which piece of equipment a leak is coming from; Open thief hatches and unlit combustors; Visual record for the leak repair log | CMB |
| `HATCH` | Thief hatch sensor | state | ≥ 0.5 / 0.5 | A hatch left open after gauging vents tank vapours directly to air; Pairs with the OGI camera and fenceline readings | TNK |
| `COMB_T` | Combustor firebox temperature | °F | ≤ 1200 / 1000 | A falling temperature means the pilot is out and vapours are venting unburned; Destruction efficiency for the emissions permit | CMB |
| `BERM` | Secondary containment liquid | in | ≥ 2 / 6 | Tank or line leaks into containment; Rainwater that must be drained before the berm loses capacity | TNK |
| `NOISE_FL` | Fence noise monitor | dBA | ≥ 78 / 85 | Which equipment is driving noise; Changes in compressor or combustor operation | GTE |
| `NOISE_RES` | Neighbour noise monitor | dBA | ≥ 55 / 60 | Whether the site is within its noise limit at homes; Night-time compressor noise before it becomes a complaint | COM |
| `BTEX` | Community benzene monitor | ppb | ≥ 5 / 25 | Air quality where people live, not just at the fence; Separates site emissions from traffic and background | COM |
| `PM25` | Particulate PM2.5 | µg/m³ | ≥ 35 / 55 | Dust from truck traffic on the lease road; Combustion smoke | COM |
| `GW_CH4` | Groundwater dissolved methane | mg/L | ≥ 10 / 28 | Gas migrating up a poorly cemented annulus into drinking water; Baseline record if a neighbour's water well changes | GW |
| `GW_COND` | Groundwater conductivity | µS/cm | ≥ 1500 / 3000 | Brine or produced water reaching the aquifer; Seasonal baseline | GW |

### Integrity — shape: triangle, code `I`

Casing, flowlines and ground — the well's and pipe's long-term soundness. (5 types, 5 sensors in the demo)

| Type | Sensor | Unit | Warn / alarm | What it tells you | Demo locations |
|---|---|---|---|---|---|
| `PT_BH` | Bradenhead pressure | psi | ≥ 100 / 200 | Sustained pressure means gas is getting behind casing — a cement or casing problem; Risk to the groundwater the surface casing protects; Triggers a bradenhead test and possible remediation | WB |
| `LEAK_DET` | Flowline leak detection | % imbalance | ≥ 3 / 6 | Buried flowline leaks that nobody can see; Meter drift | PL |
| `CP` | Cathodic protection potential | mV | ≥ -900 / -850 | Whether the line is protected against external corrosion (more negative than −850 mV); Rectifier failures and coating damage | PL |
| `CORR` | Corrosion probe (ER) | mpy | ≥ 5 / 10 | Corrosive produced water or bacteria; When to adjust chemical treatment | PL |
| `SEIS` | Seismometer | mm/s PGV | ≥ 1 / 5 | Felt earthquakes near the site — North Texas has a record of small induced events; When to check casing pressures and tanks after shaking | GND |

### Security — shape: diamond, code `X`

Who comes onto the pad and what leaves it — physical and SCADA. (5 types, 5 sensors in the demo)

| Type | Sensor | Unit | Warn / alarm | What it tells you | Demo locations |
|---|---|---|---|---|---|
| `GATE` | Gate contact | state | — | Entry to the pad, matched against badge-ins and haul tickets; Gates left open after a visit | GTE |
| `CCTV` | Camera analytics | events/min | ≥ 1 / 3 | Unexpected vehicles, especially after hours; Visual confirmation of other alarms | GTE |
| `FENCE` | Fence intrusion sensor | events/min | ≥ 1 / 3 | Climbing or cutting the fence; Tampering away from the gate | FNW |
| `HAUL_VAR` | Unticketed tank withdrawal | bbl | ≥ 5 / 20 | Condensate or oil theft; A missing ticket that would throw off royalty and production accounting | TNK |
| `RTU_SEC` | RTU network monitor | score | ≥ 60 / 85 | Unexpected remote commands or logins; A compromised cellular modem or misconfigured SCADA poll | MTR |

### Weather — shape: invtriangle, code `W`

Wind, lightning, rain and heat — can crews and trucks work safely? (7 types, 7 sensors in the demo)

| Type | Sensor | Unit | Warn / alarm | What it tells you | Demo locations |
|---|---|---|---|---|---|
| `WIND` | Wind speed | mph | ≥ 30 / 45 | Truck loading and workover rig limits; How far and which way a gas release will drift | MET |
| `GUST` | Wind gust | mph | ≥ 40 / 58 | Severe thunderstorm winds (58 mph and up); Securing loose equipment and hatches | MET |
| `WDIR` | Wind direction | ° | — | Which fenceline monitor is downwind; Whether emissions blow toward the neighbours | MET |
| `AIRT` | Air temperature | °F | ≥ 100 / 106; ≤ 34 / 28 | Compressor cooling margin in summer heat; Freeze-offs and hydrates in winter | MET |
| `RAIN` | Rain rate | in/hr | ≥ 1 / 2 | Containment filling with stormwater; Lease-road flooding and truck access | MET |
| `LIGHTNING` | Lightning distance | mi | ≤ 20 / 10 | Stop truck loading and tank work when lightning is close; Tank-fire risk from strikes | MET |
| `BARO` | Barometric pressure | inHg | ≤ 29.6 / 29.4 | Approaching fronts and storms | MET |

### Zones

| Code | Location | Sensors |
|---|---|---|
| `MET` | Weather mast | 7 |
| `FNW` | West fence | 3 |
| `CMB` | Combustor | 2 |
| `WH` | Wellhead | 5 |
| `SEP` | Separator (GPU) | 4 |
| `CMP` | Compressor | 4 |
| `MTR` | Meter run & RTU | 3 |
| `TNK` | Tank battery | 10 |
| `GTE` | Gate & east fence | 5 |
| `COM` | Neighbourhood | 3 |
| `PL` | Gathering line (buried) | 3 |
| `GND` | Pad ground | 1 |
| `GW` | Groundwater monitor well | 2 |
| `WB` | Wellbore & casing | 1 |
| `LAT` | Lateral — Barnett Shale | 1 |
<!-- END GENERATED -->

## Data quality

Every reading carries a quality flag. When a sensor stops reporting, the
demo shows **NO DATA** and raises a comms fault; it never carries the last
value forward as if it were current. Links are `wired` (to the pad RTU),
`lora` (fence and gathering-line sensors) or `cellular` (community air
station and groundwater sonde), each with typical latency as metadata.
