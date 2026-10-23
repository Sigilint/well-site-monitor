// Saved views — named filter sets. Built-in views come from the API
// (GET /views); views a person saves are kept in their browser for the demo.
// A real service would store them per user.

(() => {

const { useState } = React;

// Filters hold Sets; views hold plain sorted arrays so they compare and store cleanly
const toView = f => ({
  categories: [...f.categories].sort(),
  zones: [...f.zones].sort(),
  type: f.type,
  status: f.status,
  q: f.q.trim(),
});
const fromView = v => ({
  categories: new Set(v.categories || []),
  zones: new Set(v.zones || []),
  type: v.type || "all",
  status: v.status || "all",
  q: v.q || "",
});
const sameView = (a, b) => JSON.stringify(toView(fromView(a))) === JSON.stringify(toView(fromView(b)));

function loadSaved(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function storeSaved(key, views) {
  try { localStorage.setItem(key, JSON.stringify(views)); } catch {}
}

function ViewsSection({ builtIn, saved, filters, onApply, onSave, onDelete }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const current = toView(filters);
  const all = [...builtIn, ...saved];
  const active = all.find(v => sameView(v.filters, current));
  const empty = sameView(current, toView(window.EMPTY_FILTERS()));

  const save = e => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onSave({ id: `v-${Date.now().toString(36)}`, name: n, filters: current });
    setName("");
    setNaming(false);
  };

  return (
    <div className="rail-section views">
      <div className="rail-title">
        Views
        {!active && !empty && <span className="tag">unsaved</span>}
      </div>
      <ul className="view-list">
        {all.map(v => {
          const on = active && active.id === v.id;
          return (
            <li key={v.id} className={on ? "on" : ""}>
              <button className="view-btn" aria-pressed={!!on} onClick={() => onApply(fromView(v.filters))}
                      title={v.description || v.name}>
                <span className="view-name">{v.name}</span>
                {v.builtIn ? null : <span className="tag">mine</span>}
              </button>
              {!v.builtIn && (
                <button className="btn icon view-del" aria-label={`Delete view ${v.name}`}
                        onClick={() => onDelete(v.id)}>×</button>
              )}
            </li>
          );
        })}
      </ul>
      {naming ? (
        <form className="view-form" onSubmit={save}>
          <label className="sr" htmlFor="view-name">View name</label>
          <input id="view-name" className="input" autoFocus placeholder="Name this view…" value={name}
                 onChange={e => setName(e.target.value)}
                 onKeyDown={e => { if (e.key === "Escape") setNaming(false); }} />
          <div className="view-form-row">
            <button className="btn small primary" type="submit" disabled={!name.trim()}>Save</button>
            <button className="btn small" type="button" onClick={() => setNaming(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        !active && !empty && (
          <button className="btn ghost full" onClick={() => setNaming(true)}>+ Save current filters as a view</button>
        )
      )}
    </div>
  );
}

Object.assign(window, { ViewsSection, ViewStore: { load: loadSaved, store: storeSaved } });

})();
