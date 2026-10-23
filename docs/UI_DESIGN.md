# UI design

## Principles

1. **The drawing leads.** The pad and the ground beneath it fill the middle of
   the screen. The strip, rail, alerts and feed exist to find and explain what
   is on it.
2. **Show above and below ground together.** A well's biggest risks to people
   nearby are both visible (emissions, noise, trucks) and hidden (gas behind
   casing, groundwater). The cutaway puts the aquifer, the surface casing that
   protects it and the producing lateral in the same picture as the tanks and
   the neighbours.
3. **Face outward.** On an urban pad, what crosses the fence matters as much
   as what happens inside it. Fenceline, community and groundwater monitors
   get the same weight as production, and the homes are part of the drawing.
4. **Colour means abnormal.** Following ISA-101 practice, amber and red appear
   only for warnings and alarms. Normal equipment is greyscale. One blue
   accent marks selection and interactive state.
5. **Never colour alone.** Every status has an icon shape and a word, and
   every category has a shape and a letter.
6. **Show the data, not a guess.**
   - Gas is outlined around the detectors that are alarming, with a drift
     arrow; there is no modelled plume.
   - A silent sensor shows NO DATA.
   - "Gas behind pipe?" carries a question mark, because pressure is evidence,
     not proof.
7. **Be clear about what's real.** The well's identity is public record;
   everything else is simulated. The footer, README and catalog all say so,
   and the operator is left unnamed.

## Layout

The layout is the platform monitor's: a top bar, the status strip, then three
columns (views and filter rail, schematic, alerts), with the raw feed docked
below and a status bar at the bottom.

**Detail drawer.** It slides in next to the alerts column, so alerts stay
visible. Below 1100 px it covers the screen from the right instead.

**Overlays on the schematic:**
- the **area banner**, top left
- the collapsible **weather card**, top right

```
┌──────────────────────────────────────────────────────────────────────────┐
│ sigilint · Well 10H // API 42-439-34308 // Barnett // Tarrant // lat,lon │
│                                    Live · UNACK · clock · theme          │
├──────────────────────────────────────────────────────────────────────────┤
│ Production Safety Environment Integrity Security Weather │ Well · Site   │
│                                                           │ work · Access │
│                                                           │ · Emissions · │
│                                                           │ Neighbours    │
├────────────┬──────────────────────────────────────────┬──────────────────┤
│ Views      │ [area banner]               [weather]    │ Alerts           │
│ Filters    │  sky · mast · combustor · well · sep ·   │                  │
│            │  compressor · meter · tanks ┌──────────┐ │                  │
│            │ ──────────── ground ────────│ Detail   │ │                  │
│            │  aquifer · monitor well     │ drawer   │ │                  │
│ Simulation │  Barnett lateral ═══════    └──────────┘ │                  │
├────────────┴──────────────────────────────────────────┴──────────────────┤
│ Raw feed                                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ telemetry · nodes · poll · calls · samples · sim · provenance            │
└──────────────────────────────────────────────────────────────────────────┘
```

| Width | Layout |
|---|---|
| Above 1440 px | Rail 248 px · schematic · side 330 px; the strip shows category tiles and derived states side by side |
| 1101–1440 px | Rail 220 px · side 300 px; categories and derived states on two rows |
| 641–1100 px | Single column, page scrolls: schematic, alerts, filters, feed. Strip tiles three across. Header coordinates and the weather card shrink or hide. The drawer covers the screen from the right over a dimmed backdrop |
| Up to 640 px | Tiles two across; secondary feed columns, weather card and stage note hidden; top bar wraps |

Checked at 1600 px (dark and light) and 820 px. Phone widths have not been
checked yet.

## The drawing

### Composition

- **Elevation:** a side view looking north, so west is on the left. The
  ground line sits about 40 % of the way down the cropped view.
- **Left to right**, in process order where possible:
  1. weather mast
  2. west fence
  3. combustor and OGI camera
  4. wellhead
  5. separator
  6. compressor
  7. meter run and RTU
  8. tank battery in its berm
  9. gate and east fence
  10. community air station
  11. the nearest homes
- **Below ground, top to bottom:** soil, Trinity aquifer, base of
  usable-quality water (dashed), Pennsylvanian section with a scale-break
  mark, Marble Falls, Barnett Shale with the lateral and fracture stages,
  Viola/Ellenburger.
- **Scale:** both axes are compressed and labelled as such; the depths
  shown are illustrative. Roughly 7,000 ft of rock between the aquifer and
  the Barnett is collapsed into a short band. Without that, the casing that
  protects the aquifer and the lateral could not both be shown.
- Equipment labels sit in the soil band just below the ground line, out of the
  markers' way.

### Line art

- Equipment is outline-only, drawn in the steel tokens.
- Liquids have their own neutral fills:
  - water and separator liquid use `--liquid`
  - condensate uses `--condensate`
- Nothing in the scene uses the warning or alarm colours, except:
  - noise arcs, which take the residence monitor's status colour
  - gas detection outlines
  - markers and callouts

### Live elements

Each one reflects a reading and is there to make a scenario readable at a
glance:

| Element | Reading | Reads as |
|---|---|---|
| Storm sky, rain | Wind speed | Weather building |
| Lightning flash | Lightning distance < 12 mi | Stop work |
| Gas dashes along piping | Gas meter rate | Flowing, and how fast |
| Plunger and liquid column | Plunger arrival | Lift working, or loading up |
| Bubbles behind casing | Bradenhead pressure | Integrity concern near the aquifer |
| Separator, tank, berm levels | Level sensors | Capacity; a tank draining with no ticket |
| Thief hatch lid and vapour | Hatch sensor, wind | Venting from the tank |
| Combustor glow vs. vapour | Firebox temperature | Burning or venting |
| Gate leaf, pickup, truck | Gate, badge | Routine visit vs. unbadged entry |
| Noise arcs | Residence noise status | Compressor heard at the homes |
| Ground ripples | Seismometer | Shaking felt at the pad |
| Windsock, drift arrows | Wind speed and direction | Where a release is going |

## Encoding

### Category: shape and letter

| Category | Shape | Letter |
|---|---|---|
| Production | Square | P |
| Safety | Circle | S |
| Environment | Hexagon | E |
| Integrity | Triangle | I |
| Security | Diamond | X |
| Weather | Inverted triangle | W |

The shapes match the platform monitor. Production takes the square that
Operations had there.

### Status: colour, icon, word

| Status | Colour | Icon | On the drawing |
|---|---|---|---|
| Normal | none | circle | Default marker |
| Warning | Amber `#fab219` | triangle | Amber marker and value callout |
| Alarm | Red `#d03b3b` | diamond | Red marker and value callout |
| Offline / fault | none | crossed box | Dashed marker, NO DATA callout |
| Unacknowledged | status colour | | Pulsing ring |
| Selected | accent blue | | Ring |

Two-state sensors (gate, thief hatch) show their state word (OPEN / CLOSED)
everywhere a number would appear. The thief hatch alarms when open. The gate
is informational: an open gate alone is not abnormal, but together with no
badge-in it becomes the *Unbadged entry* state.

## Tokens

All colours are CSS custom properties defined for `light` and `dark` on
`:root[data-theme]`. Dark is the default, and the choice is stored as
`wsm-theme`.

| Group | Tokens |
|---|---|
| Surfaces, rules, text | `--bg`, `--panel`, `--panel-2`, `--stage`, `--rule`, `--rule-2`, `--ink`, `--ink-2`, `--ink-3` |
| Accent | `--accent`, `--accent-soft` |
| Status | `--warn*`, `--alarm*`, `--ok-text` |
| Sky and weather | `--sky`, `--storm`, `--rain`, `--wave-line` (aquifer base line) |
| Ground | `--soil`, `--aquifer`, `--aq-dot`, `--rock`, `--lime`, `--barnett`, `--strata-line`, `--cement`, `--bore` |
| Equipment | `--steel`, `--steel-2`, `--equip`, `--window`, `--solar`, `--pad`, `--road`, `--tree` |
| Fluids | `--liquid`, `--condensate`, `--flame`, `--flow` |
| Markers | `--mk-fill`, `--mk-stroke`, `--mk-letter` |
| Type | `--display` Space Grotesk, `--sans` Inter, `--mono` JetBrains Mono |

Ground colours are kept low in contrast so the strata stay in the background
behind the wellbore and markers. In dark mode the strata differ by only a few
percent in lightness, and the patterns (dots for the aquifer, lines for
shale, bricks for limestone) carry the distinction.

## Interaction and accessibility

- Sensor markers are focusable buttons whose label gives the name, id and
  status; Enter or Space selects one. Dimmed markers leave the tab order.
- **Areas on the drawing:**
  - Hovering an area outlines it and names it in the area banner, with a
    one-line description, sensor count and status counts.
  - Clicking pins the banner, which offers **Show only these N sensors**
    (and **Add to filter** when other areas are already filtered).
  - Clicking the area again, clicking empty space, Esc or × unpins it.
  - The rail's location list filters directly and works from the
    keyboard.
- **Detail drawer:**
  - Opens from a marker, an alert or a feed row (Enter on a focused row).
  - Focus moves to its close button, and Esc closes it.
  - Sensors listed under *Also at* open in place.
- **Live / Paused** freezes the screen and shows a dashed outline around the
  schematic. The feed's own Pause freezes only the feed.
- **Saved views** mark the active view with `aria-pressed`. Saving asks for a
  name inline, not in a browser prompt.
- Category tiles in the strip toggle the category filter.
- `prefers-reduced-motion` stops every animation:
  - pulses
  - rain and lightning
  - gas flow
  - the plunger, which then rests at the bottom of the tubing
  - vapour, shimmer, noise arcs and ripples
- Hover-only information (marker tooltip, trend crosshair) is also available
  by selecting the sensor.

Not done yet: a live region announcing new alarms, keyboard access to zones on
the drawing, and screen-reader testing.

## Open design questions

- **Plan view:** a top-down pad layout, alongside the elevation, would show
  where the fenceline monitors and homes really sit relative to the wind.
- **Neighbour-facing view:** a reduced public view (noise, air, groundwater,
  no production data) could support community transparency.
- **Multi-well pads:** the RRC record shows other permitted and active
  wells on this pad. Shared surface equipment would need allocating between
  wells, and the drawing would need several wellbores.
- **Real depths:** the completion record (surface casing depth, true
  vertical depth, lateral length) could replace the illustrative depths.
