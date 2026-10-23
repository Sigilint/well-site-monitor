// Raw data feed — every sample as it arrives from the API, newest first.
// Table view for scanning, JSON view for "what does the payload look like".
// Click a row to open that sensor in the detail drawer.

(() => {

const { useState, useRef, useEffect } = React;
const { SENSOR_TYPES } = window.Catalog;
const { STATUS_LABEL, fmtValue, fmtTime, fmtUnit } = window.Fmt;

const MAX_SHOWN = 250;
const SIZES = { collapsed: "collapsed", normal: "normal", expanded: "expanded" };

function RawFeed({ rows, matchSample, rate, size, setSize, follow, setFollow, selectedId, onOpen, livePaused }) {
  const [paused, setPaused] = useState(false);
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [matchFilters, setMatchFilters] = useState(true);
  const [view, setView] = useState("table");
  const [clearedSeq, setClearedSeq] = useState(0);
  const frozen = useRef(rows);
  if (!paused) frozen.current = rows;

  // Rows newer than the previous render flash briefly
  const seenSeq = useRef(null);
  const newestSeq = frozen.current[0]?.seq ?? 0;
  const flashAfter = seenSeq.current ?? newestSeq;
  useEffect(() => { seenSeq.current = newestSeq; }, [newestSeq]);

  const shown = [];
  for (const r of frozen.current) {
    if (r.seq <= clearedSeq) break;
    if (follow && selectedId && r.sensorId !== selectedId) continue;
    if (exceptionsOnly && r.status === "normal") continue;
    if (matchFilters && !matchSample(r)) continue;
    shown.push(r);
    if (shown.length >= MAX_SHOWN) break;
  }

  const collapsed = size === SIZES.collapsed;
  const expanded = size === SIZES.expanded;
  const rowProps = r => ({
    key: r.seq,
    tabIndex: 0,
    onClick: () => onOpen(r.sensorId),
    onKeyDown: e => { if (e.key === "Enter") onOpen(r.sensorId); },
    title: `Open ${r.sensorId}`,
  });
  const fresh = r => (r.seq > flashAfter ? " new" : "");

  return (
    <section className={`feed ${collapsed ? "collapsed" : ""}`} aria-label="Raw data feed">
      <header className="panel-head feed-head">
        <span className="panel-title">Raw feed</span>
        <span className="mono muted">
          {Math.round(rate * 60).toLocaleString()} samples/min · showing {shown.length}
          {(paused || livePaused) && <span className="tag">paused</span>}
        </span>
        {follow && selectedId && (
          <button className="tag mono tag-btn" onClick={() => setFollow(false)} title="Show all sensors again">
            sensor: {selectedId} ×
          </button>
        )}
        <div className="feed-controls">
          {!collapsed && (
            <>
              <label className="mini-toggle" title="Off shows every sensor regardless of the filters">
                <input type="checkbox" checked={matchFilters} onChange={e => setMatchFilters(e.target.checked)} />
                Match filters
              </label>
              <label className="mini-toggle">
                <input type="checkbox" checked={exceptionsOnly} onChange={e => setExceptionsOnly(e.target.checked)} />
                Exceptions only
              </label>
              <div className="seg small">
                <button className={view === "table" ? "on" : ""} onClick={() => setView("table")}>Table</button>
                <button className={view === "json" ? "on" : ""} onClick={() => setView("json")}>JSON</button>
              </div>
              <button className={`btn small ${paused ? "on" : ""}`} aria-pressed={paused} onClick={() => setPaused(!paused)}>
                {paused ? "▶ Resume" : "❚❚ Pause"}
              </button>
              <button className="btn small hide-sm" onClick={() => setClearedSeq(newestSeq)}
                      title="Hide what's here now; new samples keep arriving">Clear</button>
              {clearedSeq > 0 && (
                <button className="btn small hide-sm" onClick={() => setClearedSeq(0)}>Restore</button>
              )}
            </>
          )}
          <button className="btn icon" aria-pressed={expanded}
                  aria-label={expanded ? "Restore feed height" : "Expand feed"}
                  title={expanded ? "Restore" : "Expand"}
                  onClick={() => setSize(expanded ? SIZES.normal : SIZES.expanded)}>{expanded ? "⤓" : "⤒"}</button>
          <button className="btn icon" aria-expanded={!collapsed}
                  aria-label={collapsed ? "Show feed" : "Collapse feed"}
                  title={collapsed ? "Show" : "Collapse"}
                  onClick={() => setSize(collapsed ? SIZES.normal : SIZES.collapsed)}>{collapsed ? "▴" : "▾"}</button>
        </div>
      </header>
      {!collapsed && (
        <div className="feed-body">
          {view === "table" ? (
            <table className="feed-table mono">
              <thead>
                <tr>
                  <th>Time</th><th>Sensor</th><th className="hide-sm">Type</th><th>Zone</th>
                  <th className="num">Value</th><th>Unit</th><th>Status</th>
                  <th className="hide-sm">Quality</th><th className="hide-sm">Node / link</th><th className="num hide-sm">Lat ms</th><th className="num hide-sm">Seq</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr {...rowProps(r)} className={`st-${r.status}${fresh(r)}${r.sensorId === selectedId ? " sel" : ""}`}>
                    <td>{fmtTime(r.ts, true)}</td>
                    <td className="cell-id"><CategoryIcon category={r.category} size={12} /> {r.sensorId}</td>
                    <td className="hide-sm muted">{SENSOR_TYPES[r.type].name}</td>
                    <td>{r.zone}</td>
                    <td className="num">{fmtValue(r.value, r.type)}</td>
                    <td className="muted">{fmtUnit(r.type)}</td>
                    <td className="cell-status">{r.status !== "normal" && <StatusIcon status={r.status} size={10} />} {STATUS_LABEL[r.status]}</td>
                    <td className="hide-sm">{r.quality}</td>
                    <td className="hide-sm muted">{r.node} / {r.link}</td>
                    <td className="num hide-sm">{r.latencyMs}</td>
                    <td className="num hide-sm muted">{r.seq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="feed-json">
              {shown.slice(0, 80).map(r => (
                <div {...rowProps(r)} className={`json-line st-${r.status}${fresh(r)}`}>{JSON.stringify(r)}</div>
              ))}
            </pre>
          )}
          {shown.length === 0 && (
            <div className="empty">
              {clearedSeq > 0 ? "Cleared — new samples will appear here." : "No samples match the current filters."}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

window.RawFeed = RawFeed;

})();
