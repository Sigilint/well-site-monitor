// Area banner — sits at the top of the schematic and names the area in
// focus. Hovering an area (or a sensor, or a location in the rail) shows it
// briefly; clicking an area pins it, with a quick button to filter the whole
// screen to that area's sensors.

(() => {

const { ZONES } = window.Catalog;
const { STATUS_RANK } = window.Fmt;

function ZoneBanner({ zone, pinned, sensors, latest, filters, setFilters, onClose }) {
  if (!zone) return null;
  const z = ZONES[zone];
  const here = sensors.filter(s => s.zone === zone);
  const counts = { alarm: 0, warning: 0, offline: 0 };
  here.forEach(s => {
    const st = latest[s.id]?.status;
    if (counts[st] != null) counts[st]++;
  });
  const worst = Object.keys(counts).sort((a, b) => STATUS_RANK[b] - STATUS_RANK[a]).find(k => counts[k]) || "normal";
  const onlyThis = filters.zones.size === 1 && filters.zones.has(zone);
  const included = filters.zones.has(zone);

  const setZones = zones => setFilters(f => ({ ...f, zones }));

  return (
    <div className={`zone-banner st-${worst} ${pinned ? "pinned" : ""}`} role={pinned ? "region" : "status"}
         aria-label={`Area: ${z.label}`}>
      <div className="zb-main">
        <div className="zb-title">
          <span className="zone-code mono">{zone}</span>
          <span className="zb-name">{z.label}</span>
          <span className="zb-counts mono">
            {here.length} sensor{here.length === 1 ? "" : "s"}
            {counts.alarm > 0 && <span className="cnt st-alarm"><StatusIcon status="alarm" size={10} />{counts.alarm}</span>}
            {counts.warning > 0 && <span className="cnt st-warning"><StatusIcon status="warning" size={10} />{counts.warning}</span>}
            {counts.offline > 0 && <span className="cnt st-offline"><StatusIcon status="offline" size={10} />{counts.offline}</span>}
          </span>
        </div>
        {z.desc && <div className="zb-desc">{z.desc}</div>}
      </div>
      {pinned ? (
        <div className="zb-actions">
          {onlyThis ? (
            <button className="btn small on" onClick={() => setZones(new Set())}>Showing only this area · show all</button>
          ) : (
            <>
              <button className="btn small primary" onClick={() => setZones(new Set([zone]))}>
                Show only these {here.length} sensors
              </button>
              {filters.zones.size > 0 && !included && (
                <button className="btn small" onClick={() => setZones(new Set([...filters.zones, zone]))}>Add to filter</button>
              )}
            </>
          )}
          <button className="btn icon" aria-label="Close area banner" onClick={onClose}>×</button>
        </div>
      ) : (
        <div className="zb-hint">click to pin</div>
      )}
    </div>
  );
}

window.ZoneBanner = ZoneBanner;

})();
