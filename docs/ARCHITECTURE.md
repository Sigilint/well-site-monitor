# Architecture

## Stack

- **No build step.** `index.html` loads React 18.3.1 and ReactDOM from unpkg
  (with subresource integrity hashes) and Babel standalone 7.29.0, which
  compiles the `text/babel` `.jsx` files in the browser. This is the same
  setup as `well-monitor` and `offshore-platform-monitor`.
- Babel fetches the `.jsx` files over HTTP, so the folder has to be served
  (`python3 -m http.server 8735`); `file://` won't work.
- Each file is an IIFE that publishes what it exports on `window`, and
  `index.html` loads them in dependency order.
- Fonts come from Google Fonts: Space Grotesk (display), Inter (body),
  JetBrains Mono (data).

In-browser Babel suits a demo but starts slowly; a production build would add
a bundler.

## Files

| File | Exports | Role |
|---|---|---|
| `js/catalog.jsx` | `window.Catalog` = `{ CATEGORIES, SENSOR_TYPES, ZONES }` | The taxonomy: 6 categories; 46 sensor types with units, limits, descriptions and simulation parameters; 15 zones with their rectangles on the drawing |
| `js/site.jsx` | `window.SiteDef` = `{ SITE, SENSORS, SCENARIOS }` | The well's public identity, the 54 sensor placements, generated ids, node and link assignments, and the 11 scenarios |
| `js/api.jsx` | `window.SiteAPI` | The simulated server and the async API the UI calls |
| `js/glyphs.jsx` | `CategoryIcon`, `StatusIcon`, `ShapePath`, `ShapeLetter`, `window.Fmt` | Category shapes, status icons, value / time / unit formatters |
| `js/schematic.jsx` | `SiteSchematic` | The pad and subsurface drawing, live scene elements, markers, callouts, tooltip |
| `js/panels.jsx` | `FilterRail`, `StatusStrip`, `AlertsPanel`, `SensorDetail` | Side panels, derived states, trend chart |
| `js/feed.jsx` | `RawFeed` | The raw data feed |
| `js/app.jsx` | (mounts `App`) | Initial load, polling, filter and selection state, layout, weather card |
| `styles.css` | | Tokens for both themes, layout, scene and component styles, breakpoints |
| `scripts/gen-catalog-doc.js` | | Regenerates the tables in `docs/SENSOR_CATALOG.md` |

Load order: `catalog` → `site` → `api` → `glyphs` → `schematic` → `panels` →
`feed` → `app`.

### Relationship to the platform monitor

`api.jsx`, `glyphs.jsx`, `panels.jsx`, `feed.jsx`, `app.jsx` and most of
`styles.css` began as copies of `offshore-platform-monitor`. They were changed
in these places:

| Area | Change |
|---|---|
| Site data | `site.jsx` / `SiteDef` / `getSite()` replace `platform.jsx` / `PlatformDef` / `getPlatform()` |
| Links | `wired`, `lora`, `cellular` instead of mesh, satellite, acoustic |
| Two-state contacts | Catalog types can declare `binary: [offLabel, onLabel]` (gate, thief hatch). The simulator snaps their values to 0 or 1, and the formatters show the label instead of a number |
| Derived states | `deriveOps()` in `panels.jsx` has well-site rules |
| Weather card | Wind in mph, temperature, rain, pressure in inHg, lightning in miles |
| Header | API number, formation, county and coordinates; the coordinates are hidden at 1100 px and below |
| Footer | Says which data is real (well identity) and which is simulated |

Nothing is shared at runtime, so a fix in one copy has to be made in the
other. The warm-up fix of 2026-10-23 is an example.

## Data flow

```
 catalog.jsx ─┐
 site.jsx     ┴─► api.jsx  "server"                       app.jsx (React)
                 ┌──────────────────────────┐   Promise   ┌────────────────────────┐
                 │ sim clock (simT, offset) │   + JSON    │ on load:               │
                 │ advance(): due samples   │ ──────────► │  site, sensors,        │
                 │  → valueAt → evaluate    │  40–180 ms  │  scenarios, latest,    │
                 │  → feed ring (4000)      │             │  alerts, recent feed   │
                 │  → history (300/sensor)  │             │ every 1 s:             │
                 │  → latest                │ ◄────────── │  getReadings({after})  │
                 │  → alert engine          │   calls     │  getAlerts()           │
                 └──────────────────────────┘             └───────────┬────────────┘
                                                                      │ props
                       ┌───────────────┬──────────────┬───────────────┼───────────┐
                       ▼               ▼              ▼               ▼           ▼
                  StatusStrip     FilterRail   SiteSchematic    SensorDetail   RawFeed
                  (deriveOps)                                   + AlertsPanel
```

The UI never reads simulator state directly. It only calls `SiteAPI` methods,
which return deep copies after a random delay, as a network call would.

## Site data (`js/site.jsx`)

### Identity

`SITE` holds the well's public record from the RRC GIS well layer, taken from
the Tarrant County snapshot in
`texas-well-platform/datasets/tarrant/tarrant_wells.sqlite`:

| Field | Value | From |
|---|---|---|
| `api` | 42-439-34308 | `api_raw` 43934308, with the Texas state code (42) added |
| `name` | Well 10H | `well_number` |
| `rrcStatus` | Gas Well (active) | `regulatory_status_raw` |
| `lat`, `lon` | 32.68507617, −97.22433526 | `latitude_nad83`, `longitude_nad83` |
| `locationSource` | Operator reported location — distances and plat | `location_source` |
| `county` | Tarrant County, TX | snapshot metadata |
| `formation`, `type` | Barnett Shale; horizontal gas well, plunger lift | Assumed from the area and the `H` well number; not in the record |

The snapshot has no operator or lease fields. The demo leaves the operator
unnamed on purpose so that none of the simulated incidents is attributed to a
real company.

### Sensors

`PLACEMENTS` lists `[type, zone, x, y, label, overrides]`. Each sensor gets:

- an id `TYPE-ZONE-nn`, with the type's underscore turned into a hyphen
  (`CH4-FL-FNW-01`, `LT-TANK-TNK-03`)
- a node `N-0xx`, three sensors per node
- a link, chosen by zone:

| Link | Zones | Typical latency (metadata) |
|---|---|---|
| `wired` | Everything on the pad, wired to the RTU | 30–90 ms |
| `lora` | West fence, gate and east fence, gathering line | 400–1100 ms |
| `cellular` | Community air station, groundwater monitor well | 180–520 ms |

`overrides` sets per-sensor baselines; for example each tank starts at a
different level.

### Scenarios

Eleven scenarios on a 600-second loop, each a list of effects on named
sensors:

| Kind | Behaviour |
|---|---|
| `plateau` | Smooth rise over `rise` seconds, hold, smooth fall; adds `delta` |
| `ramp` | Linear from 0 to `delta` across the window |
| `offline` | Sensor reports `null` for the window |

An effect may set `at: [start, end]` to lag or lead its scenario. Two effects
on the same sensor add together; the gate uses two plateaus, one for the
lease operator's arrival and one for their departure. The scenario table is in
the [README](../README.md#scenarios-10-minute-loop).

## The simulator (`js/api.jsx`)

### Clock

- `simT` is monotonic simulated seconds. Every API call runs `advance()`,
  which moves `simT` forward by the elapsed wall-clock time multiplied by the
  speed.
- Timestamps are `page load time + simT`, so they never go backwards.
- Loop time is `(simT + offset) mod 600`. `sim.seek(t)` changes only `offset`.
- **Warm-up:** at start-up, `simT` is set to −60 and the wall clock back-dated
  by 60 s. One `advance()` then generates a minute of history (loop 0–60), so
  trends have data on first paint and "now" is loop 01:00.
- After the tab has been in the background, each sensor backfills at most
  60 s.

### Values

```
value = base + noise(index, t) × amplitude + Σ effects
```

- **Noise** is two slow sines plus a per-second pseudo-random term, seeded by
  the sensor's index. It looks organic and repeats exactly each loop.
- Values are clamped at zero, except cathodic protection (millivolts, always
  negative) and wind direction, which wraps at 360°.
- Binary types snap to 0 or 1.
- Values are rounded to the type's decimal places.
- `evaluate(type, value)` checks the high limits first, then the low limits,
  and returns `normal`, `warning`, `alarm`, or `offline` when there is no
  value.

Each type has a reporting period of 2–10 s. `advance()` collects every due
sample time across all sensors, sorts them, and emits them in time order, as
a gateway would.

### Storage and alerts

| Store | Size | Used by |
|---|---|---|
| `feed` | Ring of the last 4,000 samples | `getReadings` |
| `history[sensorId]` | Last 300 samples per sensor | `getHistory` |
| `latest[sensorId]` | Most recent sample | `getLatest`, derived states |
| `alerts` | At most one per sensor | `getAlerts`, acknowledgements |

The alert engine follows the platform monitor's, loosely after ISA-18.2:

- **Priorities:** `alarm`, `warning`, or `fault` (no data).
- **States:**
  - **active:** raised and unacknowledged.
  - **acked:** acknowledged; removed once the reading returns to normal.
  - **rtn:** back to normal but not yet acknowledged; acknowledging removes
    it.
- **Escalation:** going from warning to alarm requires a new acknowledgement.

Each alert records its peak value and the limit crossed.

## The client (`js/app.jsx`)

- **Initial load:** applies `?t` and `?speed`, then fetches the site,
  sensors, scenarios, latest readings, alerts and the most recent 400 samples
  in parallel.
- **Polling:** every second, `getReadings({ after: cursor })` and
  `getAlerts()` in parallel.
  - New samples update `latest`.
  - They are prepended to the feed, which is capped at 1,500.
  - They are appended to the selected sensor's history.
- **Filters:** one object, `{ categories, zones, type, status, q }`.
  - `isVisible(sensor)` controls dimming on the drawing and the alert filter.
  - `matchSample(reading)` filters the feed.
- **Errors:**
  - A failed initial load replaces the app with the error.
  - A failed poll shows *API ERROR* in the status bar, and the next poll
    retries.

### Derived states (`deriveOps` in `js/panels.jsx`)

These are computed on the client from `latest`, keyed by sensor id:

| Tile | Reads | Rule (demo) |
|---|---|---|
| Well | `PLUNGER-WH-01`, `PT-CSG-WH-01`, `SSV-WH-01`, `FT-GAS-MTR-01`, `FT-WTR-SEP-01` | Shut in if SSV ≤ 10 %; loading up if arrival ≥ 30 min or casing ≥ 900 psi; otherwise flowing |
| Site work | `LIGHTNING-MET-01`, `GUST-MET-01`, `WIND-MET-01`, `BERM-TNK-01` | Suspended at lightning ≤ 10 mi, gust ≥ 58 mph or berm ≥ 6 in; limited at lightning ≤ 20 mi, wind ≥ 30, gust ≥ 40 or berm ≥ 2 |
| Access | `PERS-GTE-01`, `GATE-GTE-01`, `HAUL-VAR-TNK-01` | Unbadged entry if the gate is open with nobody badged in; no haul ticket at ≥ 5 bbl unticketed |
| Emissions | All `HATCH-*`, `COMB-T-CMB-01`, `OGI-CMB-01`, all `CH4-FL-*` and `VOC-FL-*` | Venting if the combustor is ≤ 1,000 °F, the OGI score is ≥ 70 or there is a fenceline alarm; elevated for any other finding |
| Neighbours | `NOISE-RES-COM-01`, `BTEX-COM-01`, `PM25-COM-01` | Worst of the three; the value shows residence noise |

In a real system these rules would run on the server and be configured per
site.

## The schematic (`js/schematic.jsx`)

The drawing uses a 1200 × 760 coordinate space with the ground line at
y = 330. The viewBox starts at y = 56 to crop empty sky. It is built in
layers, back to front:

| Layer | Static or live | Content |
|---|---|---|
| `Sky` | live | Storm darkening and rain from wind speed; lightning flash when lightning is within 12 mi |
| `Ground` | static (memo) | Soil; Trinity aquifer; base of usable-quality water; Pennsylvanian section; Marble Falls; Barnett Shale; Viola/Ellenburger; labels |
| `Wellbore` | static (memo) | Cemented surface casing set below the aquifer; production casing and tubing turning into the lateral; frac stages |
| `MonitorWell` | static (memo) | Shallow groundwater monitor well with screened interval |
| `AnnulusGas` | live | Bubbles behind the casing, more as bradenhead pressure rises |
| `Plunger` | live | Liquid column in the tubing grows with arrival time; the plunger animates, and stalls when loading |
| `Surface` | static (memo) | Mast, fences, combustor, OGI pole, wellhead, separator, compressor, meter and RTU, tanks, berm, gate, air station, homes, labels |
| `GasFlow` | live | Dashes along the gas piping and buried line; speed scales with the metered rate |
| `SeparatorLevel`, `Tanks`, `Berm` | live | Liquid levels; thief hatch lids and vapour puffs |
| `Combustor` | live | Lit (glow and heat shimmer) or pilot out (vapour and label) |
| `Gate`, `Vehicles` | live | Gate leaf open or closed; lease operator's pickup, or an unscheduled truck when the gate is open with nobody badged in |
| `NoiseArcs`, `Seismic`, `Windsock` | live | Compressor noise when the residence monitor is abnormal; ground ripples; wind direction and lift |
| Zones | interactive | Hover outlines; click toggles a location filter |
| `GasDetections` | live | Dashed outline around gas detectors in warning or alarm per zone, with a wind-drift arrow |
| Markers, callouts | live | One marker per sensor; value callouts placed to avoid overlap |

**Wind drift.** The elevation looks north, so a wind *from* the east blows
gas to the left. The drift sign is the sign of −sin(wind direction). The
prevailing southerly gives a slight westward drift, and the thunderstorm's
northwesterly sends it east, toward the homes.

Static layers are wrapped in `React.memo`, so each one-second update only
re-renders the live layers and the markers.

## Connecting real data

The procedure is the same as for the platform monitor (see its
[architecture doc](../../offshore-platform-monitor/docs/ARCHITECTURE.md#connecting-a-real-service)):
replace the `SiteAPI` bodies with `fetch` calls that return the shapes in
[API shapes](#api-shapes), delete the simulator, and move the alert rules and
derived states to the server.

Possible sources for a well site like this one:

| Data | Typical source |
|---|---|
| Pressures, plunger, meters, separator, compressor, tanks, SSV | The pad RTU / SCADA historian (Modbus or OPC UA at the RTU; MQTT or a historian API upstream) |
| Fenceline and community air, noise | Vendor cloud APIs for continuous monitors |
| OGI camera | Camera analytics events |
| Groundwater | Data logger or sonde vendor portal |
| Gate, badge, camera | Access control and video management systems |
| Haul reconciliation | Run tickets from the hauling or production accounting system, compared with tank gauges |
| Weather, lightning | On-site station plus a lightning network feed |
| Seismic | A regional seismic network event feed, or an on-site sensor |
| Well identity | RRC public GIS and well records |

## API shapes

The endpoints and objects are the platform monitor's (see its
[API reference](../../offshore-platform-monitor/docs/API.md)), with these
differences:

- `getSite()` → `GET /site` returns:

  ```json
  {
    "name": "Well 10H", "api": "42-439-34308", "county": "Tarrant County, TX",
    "formation": "Barnett Shale", "type": "Horizontal gas well · plunger lift",
    "rrcStatus": "Gas Well (active)", "lat": 32.68507617, "lon": -97.22433526,
    "locationSource": "Operator reported location — distances and plat",
    "source": "RRC public GIS well layer, Tarrant County snapshot 2026-10-21",
    "loopSeconds": 600, "zones": { "WH": { "label": "Wellhead", "rect": [226, 150, 112, 178] } }
  }
  ```

- Readings have `link` set to `wired`, `lora` or `cellular`.
- Binary sensors report `0` or `1`. Their type in `getCatalog()` carries
  `binary: ["CLOSED", "OPEN"]`.

## Maintaining the docs

After changing `js/catalog.jsx` or sensor placements, regenerate the
catalog tables:

```sh
node scripts/gen-catalog-doc.js
```

It evaluates `catalog.jsx` and `site.jsx` in Node and rewrites the section
between the `BEGIN GENERATED` / `END GENERATED` markers in
`docs/SENSOR_CATALOG.md`.

To check the scenarios without a browser, load `catalog.jsx`, `site.jsx` and
`api.jsx` in Node with stubbed `window`, `performance.now` and `setTimeout`.
Then step the clock and call `getAlerts()`. This is how each scenario was
checked to raise its intended alerts.
