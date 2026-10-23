# well-site-monitor

A Sigil Watch demo for a **single producing gas well in Texas**: a live cutaway
of the well pad and the ground beneath it, with 54 sensors across production,
safety, environment, integrity, security and weather, driven by simulated data
served through an async, API-shaped layer.

It has the same layout and code structure as
[`offshore-platform-monitor`](../offshore-platform-monitor), and the same
no-build React stack as [`well-monitor`](../well-monitor). Where well-monitor
shows a field of wells on a map, this view zooms into one of them.

## The well

| | |
|---|---|
| Well | 10H |
| API number | 42-439-34308 |
| County | Tarrant County, Texas (Fort Worth Basin) |
| Formation | Barnett Shale (horizontal gas well) |
| RRC status | Gas Well (active) |
| Location | 32.68508, −97.22434 (NAD83, operator-reported) |
| Source | RRC public GIS well layer, Tarrant County snapshot of 2026-10-21 in [`texas-well-platform/datasets/tarrant`](../texas-well-platform/datasets/tarrant) |

**Only the well's public identity is real.** The pad equipment, sensors,
readings, alerts and events are all simulated, and thresholds are demo values,
not engineering, permit or regulatory limits. The operator is deliberately not
named, so none of the simulated incidents is attributed to a real company. The
depths, aquifer and lateral length in the drawing are typical of the Barnett
in Tarrant County, not this well's completion record.

## Run it

Babel-in-the-browser loads the `.jsx` files over HTTP, so serve the folder:

```sh
python3 -m http.server 8735
# → http://localhost:8735/
```

| Param | Effect | Example |
|---|---|---|
| `t` | Jump the 10-minute scenario loop to second *t* | `?t=400` (thunderstorm) |
| `speed` | Simulation speed multiplier | `?speed=5` |
| `theme` | `dark` (default) or `light` | `?theme=light` |

## What's on screen

- **Status strip:** one tile per sensor category (click to filter) plus five
  derived states:
  - **Well:** flowing, loading up or shut in
  - **Site work:** hauling and gauging open, limited or suspended
  - **Access:** secure, people on pad, unbadged entry or missing haul ticket
  - **Emissions:** controlled, elevated or venting
  - **Neighbours:** noise at the nearest home, plus community air
- **Schematic** (the main view): a side elevation of the pad, looking north,
  above a cutaway of the ground.
  - **Surface:** weather mast, fences, enclosed combustor and OGI camera,
    wellhead with plunger lift, separator, compressor, meter run and RTU, tank
    battery in its berm, gate, community air station and the nearest homes.
  - **Below ground:**
    - the Trinity aquifer and a groundwater monitoring well
    - the cemented surface casing set below the aquifer
    - the production casing turning into a fracture-stimulated lateral in
      the Barnett Shale
  - **Live scene elements:**
    - storm sky, rain and lightning
    - gas moving through the piping at the metered rate
    - the plunger cycling, and stalling as liquid builds up when the well
      loads up
    - gas bubbles behind the casing as bradenhead pressure builds
    - separator, tank and containment levels
    - thief hatch lids and vapour
    - the combustor going from lit to venting
    - the gate, a lease operator's pickup or an unscheduled truck
    - noise arcs from the compressor
    - ground motion at the seismometer
    - dashed outlines around gas detectors in alarm, with a wind-drift arrow
  - **Encoding:** shape and letter show category; colour appears only for
    warning (amber) and alarm (red), per ISA-101.
- **Filter rail:** search, status, category, sensor type, location, plus the
  demo simulation controls.
- **Alerts:** priority-sorted, with acknowledge and ack-all.
- **Sensor detail:** live value, limits, trend, what it measures and what it
  tells you.
- **Raw feed:** every sample as a table or raw JSON, filtered by the same
  controls.

## Scenarios (10-minute loop)

| t (s) | Scenario | Category |
|---|---|---|
| 0–600 | Bradenhead pressure building behind the surface casing | Integrity |
| 20–150 | Lease operator site visit (badge in, gate opens and closes) | Safety |
| 60–230 | Liquid loading: plunger arriving late, gas rate sags, casing pressure climbs | Production |
| 150–300 | Thief hatch left open on tank T2: OGI plume, west fence CH₄ and VOC | Environment |
| 240–320 | Combustor pilot out: vapours venting unburned | Environment |
| 270–420 | Afternoon heat: compressor runs hot, noise at the nearest home rises | Production |
| 330–430 | After-hours entry: gate opens with nobody badged in, condensate withdrawn with no haul ticket | Security |
| 400–560 | Severe thunderstorm: gusts, lightning within 10 mi, heavy rain, berm filling | Weather |
| 440–520 | Groundwater sonde offline (comms fault) | Environment |
| 470–540 | Unexpected remote commands to the RTU | Security |
| 505–530 | Small earthquake felt nearby | Integrity |

Defined in `js/site.jsx` (`SCENARIOS`).

## Code layout

| File | Role |
|---|---|
| `js/catalog.jsx` | Categories, 46 sensor types (unit, limits, what it measures / tells you), zones |
| `js/site.jsx` | The well's identity, sensor placements on the schematic, scenarios |
| `js/api.jsx` | Simulated backend (clock, sample generation, alert engine) + the async `SiteAPI` |
| `js/glyphs.jsx` | Category shapes, status icons, formatters |
| `js/schematic.jsx` | The pad and subsurface drawing and live overlays |
| `js/panels.jsx` | Filter rail, status strip and derived states, alerts, sensor detail + trend |
| `js/feed.jsx` | Raw data feed |
| `js/app.jsx` | Polling loop, filter state, layout, weather card |
| `docs/SENSOR_CATALOG.md` | Sensor taxonomy (tables generated by `scripts/gen-catalog-doc.js`) |

## Documentation

| Document | What it covers |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Files, data flow, site data and provenance, simulator, alert engine, derived states, schematic layers, connecting real data |
| [UI design](docs/UI_DESIGN.md) | Principles, layout, the drawing's composition and live elements, encoding, tokens, accessibility, open questions |
| [Sensor catalog](docs/SENSOR_CATALOG.md) | Six categories, 46 sensor types and what each tells you |

The API shapes and alert lifecycle are shared with the platform monitor; its
[API reference](../offshore-platform-monitor/docs/API.md) applies, with the
differences listed in [Architecture](docs/ARCHITECTURE.md#api-shapes).

```
getSite()                GET  /site
getCatalog()             GET  /catalog
getSensors()             GET  /sensors
getLatest()              GET  /readings/latest
getReadings({ after })   GET  /readings?after=<cursor>
getHistory(id)           GET  /sensors/:id/history
getAlerts()              GET  /alerts
acknowledgeAlert(id)     POST /alerts/:id/ack
acknowledgeAll()         POST /alerts/ack-all
getScenarios(), sim.*    demo-only controls
```

After editing `js/catalog.jsx` or placements, regenerate the doc tables with
`node scripts/gen-catalog-doc.js`.
