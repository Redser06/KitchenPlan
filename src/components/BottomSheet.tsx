import React from 'react';
import type { SheetTab } from '../App';
import { useStore } from '../store/useStore';
import { CARCASS_SIZES, CARCASS_DEPTHS, FITTING_CATALOG, APPLIANCE_CATALOG, COLOUR_PALETTES, OPENING_CATALOG, UTILITY_POINT_CATALOG } from '../domain/catalog';
import type { CarcassSize, FittingType, ApplianceType, ColourScheme, OpeningType, UtilityPointType } from '../domain/types';

interface Props { tab: SheetTab; onClose: () => void; }

export default function BottomSheet({ tab, onClose }: Props) {
  if (!tab) return null;
  const titles: Record<string, string> = { components: 'Components', measure: 'Room Measurements', colours: 'Colour & Style', analysis: 'Analysis & Recommendations' };
  return (
    <div className="bottom-sheet">
      <div className="bottom-sheet-header">
        <h2>{titles[tab]}</h2>
        <button className="sheet-close" onClick={onClose}>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>
        </button>
      </div>
      <div className="sheet-content">
        {tab === 'components' && <ComponentsPanel />}
        {tab === 'measure' && <MeasurePanel />}
        {tab === 'colours' && <ColourPanel />}
        {tab === 'analysis' && <AnalysisPanel />}
      </div>
    </div>
  );
}

// ---- COMPONENTS ----
function ComponentsPanel() {
  const setTool = useStore((s) => s.setTool);
  const tool = useStore((s) => s.tool);
  const selectedCarcassSize = useStore((s) => s.selectedCarcassSize);
  const setSelectedCarcassSize = useStore((s) => s.setSelectedCarcassSize);
  const addFurniture = useStore((s) => s.addFurniture);
  const design = useStore((s) => s.design);
  const selectedId = useStore((s) => s.selectedId);
  const updateCarcass = useStore((s) => s.updateCarcass);
  const selectedCarcass = design.carcasses.find((c) => c.id === selectedId);
  const selectedOpeningType = useStore((s) => s.selectedOpeningType);
  const selectedUtilityType = useStore((s) => s.selectedUtilityType);
  const isFreehandDrawing = useStore((s) => s.isFreehandDrawing);

  const hasSel = !!selectedCarcass;

  const tools = [
    { id: 'select', label: 'Select & move', icon: <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor"><path d="M4 3 L16 10 L10.4 11.2 L13 17 L10.7 18 L8.1 12.2 L4 15.5 Z"/></svg> },
    { id: 'pan', label: 'Pan', icon: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10 V4.6 a1.2 1.2 0 0 1 2.4 0 V9"/><path d="M9.4 9 V3.6 a1.2 1.2 0 0 1 2.4 0 V9"/><path d="M11.8 9 V5.1 a1.2 1.2 0 0 1 2.4 0 V11"/><path d="M14.2 11 V7.6 a1.1 1.1 0 0 1 2.2 0 V13 c0 3-2 5.5-5.4 5.5 h-1 c-2 0-3-0.8-4-2 L4 13.5 c-0.6-0.8-0.3-1.8 0.5-2.2 c0.7-0.3 1.4 0 1.9 0.6 L7 12.5"/></svg> },
    { id: 'place-carcass', label: 'Place cabinet', icon: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><rect x="3" y="3" width="14" height="14" rx="1.5"/><line x1="10" y1="3" x2="10" y2="17"/></svg> },
    { id: 'place-furniture', label: 'Place furniture', icon: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="5" width="16" height="3" rx="1"/><line x1="4" y1="8" x2="4" y2="16"/><line x1="16" y1="8" x2="16" y2="16"/></svg> },
  ];

  return (
    <div>
      <div className="section-label">Tools</div>
      <div className="chip-row">
        {tools.map((t) => (
          <button key={t.id} className={`chip ${tool === t.id ? 'active' : ''}`} onClick={() => setTool(t.id as any)}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div className="section-label">Standard cabinet widths</div>
      <div className="size-card-row">
        {CARCASS_SIZES.map((size) => (
          <button key={size} className={`size-card ${selectedCarcassSize === size ? 'active' : ''}`} onClick={() => { setSelectedCarcassSize(size as CarcassSize); setTool('place-carcass'); }}>
            <div className="num">{size}</div><div className="unit">mm</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div className="section-label" style={{ margin: 0 }}>Fittings & internal storage</div>
        <div className="hint-text">{!hasSel ? '(select a cabinet on the canvas first)' : ''}</div>
      </div>
      <div className="fitting-chip-row" style={{ opacity: hasSel ? 1 : 0.45, pointerEvents: hasSel ? 'auto' : 'none', marginBottom: 24 }}>
        {FITTING_CATALOG.filter((f) => f.type !== 'plain').map((f) => (
          <button key={f.type} className="fitting-chip" onClick={() => selectedCarcass && updateCarcass(selectedCarcass.id, {
            fittings: [{ id: `fitting-${Date.now()}`, type: f.type as FittingType, label: f.label, quantity: f.type === 'drawer' ? 3 : f.type === 'shelf' ? 2 : 1 }]
          })}>{f.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div className="section-label" style={{ margin: 0 }}>Appliances</div>
        <div className="hint-text">{!hasSel ? '(select a cabinet on the canvas first)' : ''}</div>
      </div>
      <div className="appliance-grid" style={{ opacity: hasSel ? 1 : 0.45, pointerEvents: hasSel ? 'auto' : 'none', marginBottom: 24 }}>
        {APPLIANCE_CATALOG.map((a) => (
          <button key={a.type} className="appliance-card" onClick={() => selectedCarcass && updateCarcass(selectedCarcass.id, {
            appliance: { id: `appliance-${Date.now()}`, type: a.type as ApplianceType, label: a.label, width: selectedCarcass.size, integrated: a.integrated }
          })}>
            <div className="name">{a.label}</div>
            <div className="sizes">{a.standardWidths.join(' / ')}mm</div>
          </button>
        ))}
      </div>

      {/* Openings */}
      <div className="section-label">Openings (doors, windows, skylights)</div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        {OPENING_CATALOG.map((o) => (
          <button
            key={o.type}
            className={`chip ${selectedOpeningType === o.type ? 'active' : ''}`}
            onClick={() => useStore.getState().setSelectedOpeningType(selectedOpeningType === o.type ? null : o.type as OpeningType)}
          >{o.icon} {o.label}</button>
        ))}
      </div>

      {/* Utility Points */}
      <div className="section-label">Plumbing & Electrics</div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        {UTILITY_POINT_CATALOG.map((u) => (
          <button
            key={u.type}
            className={`chip ${selectedUtilityType === u.type ? 'active' : ''}`}
            onClick={() => useStore.getState().setSelectedUtilityType(selectedUtilityType === u.type ? null : u.type as UtilityPointType)}
          >{u.icon} {u.label}</button>
        ))}
      </div>

      {/* Freehand drawing */}
      <div className="section-label">Draw room by hand</div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        <button
          className={`chip ${isFreehandDrawing ? 'active' : ''}`}
          onClick={() => useStore.getState().startFreehandDraw()}
        >✏️ Freehand trace (mouse/stylus)</button>
      </div>

      <div className="section-label">Furniture</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="furniture-card" onClick={() => addFurniture({ id: `f-${Date.now()}`, type: 'dining-table', label: 'Dining Table', position: { x: design.room.width / 2 - 900, y: design.room.depth / 2 - 450 }, width: 1800, depth: 900, rotation: 0, seats: 6 })}>
          <div className="name">Dining table</div><div className="detail">6 seats · 1800×900mm</div>
        </button>
        <button className="furniture-card" onClick={() => addFurniture({ id: `f-${Date.now()}`, type: 'round-table', label: 'Round Table', position: { x: design.room.width / 2 - 600, y: design.room.depth / 2 - 600 }, width: 1200, depth: 1200, rotation: 0, seats: 4 })}>
          <div className="name">Round table</div><div className="detail">4 seats · Ø1200mm</div>
        </button>
        <button className="furniture-card" onClick={() => addFurniture({ id: `f-${Date.now()}`, type: 'sideboard', label: 'Sideboard', position: { x: 200, y: 200 }, width: 1500, depth: 400, rotation: 0 })}>
          <div className="name">Sideboard</div><div className="detail">1500×400mm</div>
        </button>
      </div>
    </div>
  );
}

// ---- MEASURE ----
function MeasurePanel() {
  const design = useStore((s) => s.design);
  const updateRoom = useStore((s) => s.updateRoom);
  const startDrawingRoom = useStore((s) => s.startDrawingRoom);
  const isDrawingRoom = useStore((s) => s.isDrawingRoom);
  const drawingVertices = useStore((s) => s.drawingVertices);
  const cancelDrawing = useStore((s) => s.cancelDrawing);
  const finishDrawingRoom = useStore((s) => s.finishDrawingRoom);
  const setRoomVertices = useStore((s) => s.setRoomVertices);

  return (
    <div>
      <div className="section-label">Room shape</div>
      {isDrawingRoom ? (
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--accent)' }}>✏️ Drawing room — {drawingVertices.length} {drawingVertices.length === 1 ? 'corner' : 'corners'} placed</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Click on the canvas to add corners. Click the first point or double-click to close. Press Esc to cancel.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ai-send" style={{ background: 'var(--success)' }} disabled={drawingVertices.length < 3} onClick={() => finishDrawingRoom()}>✓ Finish ({drawingVertices.length} corners)</button>
            <button style={{ padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', border: '1px solid var(--border)' }} onClick={() => cancelDrawing()}>✕ Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => startDrawingRoom()} style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 600, background: 'var(--surface-soft)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>✏️ Draw Custom Room Shape</button>
      )}
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20, lineHeight: 1.4 }}>Current room: {design.room.vertices.length}-corner shape.</p>

      <div className="section-label">Preset shapes</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'Rectangle', icon: '▭', vertices: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }] },
          { label: 'L-Shape', icon: '∟', vertices: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 2000 }, { x: 2500, y: 2000 }, { x: 2500, y: 3500 }, { x: 0, y: 3500 }] },
          { label: 'Galley', icon: '∥', vertices: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2500 }, { x: 0, y: 2500 }] },
          { label: 'U-Shape', icon: '∪', vertices: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 2800, y: 3000 }, { x: 2800, y: 800 }, { x: 1200, y: 800 }, { x: 1200, y: 3000 }, { x: 0, y: 3000 }] },
          { label: 'Square', icon: '□', vertices: [{ x: 0, y: 0 }, { x: 3500, y: 0 }, { x: 3500, y: 3500 }, { x: 0, y: 3500 }] },
        ].map((p) => (
          <button key={p.label} className="furniture-card" style={{ minWidth: 80, textAlign: 'center' }} onClick={() => setRoomVertices(p.vertices)}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{p.icon}</div>
            <div className="name" style={{ fontSize: 13 }}>{p.label}</div>
            <div className="detail">{p.vertices.length} walls</div>
          </button>
        ))}
      </div>

      <div className="section-label">Dimensions (rectangle mode)</div>
      <div className="measure-row">
        <label>Width</label>
        <input type="range" min={2000} max={8000} step={100} value={design.room.width} onChange={(e) => updateRoom(Number(e.target.value), design.room.depth, design.room.height)} />
        <div className="val">{(design.room.width / 1000).toFixed(1)}m</div>
      </div>
      <div className="measure-row">
        <label>Depth</label>
        <input type="range" min={2000} max={8000} step={100} value={design.room.depth} onChange={(e) => updateRoom(design.room.width, Number(e.target.value), design.room.height)} />
        <div className="val">{(design.room.depth / 1000).toFixed(1)}m</div>
      </div>
      <div className="measure-row">
        <label>Ceiling</label>
        <input type="range" min={2200} max={3200} step={50} value={design.room.height} onChange={(e) => updateRoom(design.room.width, design.room.depth, Number(e.target.value))} />
        <div className="val">{(design.room.height / 1000).toFixed(2)}m</div>
      </div>

      <div className="section-label">Room summary</div>
      <div className="summary-grid cols-3">
        <div className="summary-card"><div className="label">Floor area</div><div className="val">{((design.room.width * design.room.depth) / 1e6).toFixed(1)} m²</div></div>
        <div className="summary-card"><div className="label">Perimeter</div><div className="val">{(2 * (design.room.width + design.room.depth) / 1000).toFixed(1)} m</div></div>
        <div className="summary-card"><div className="label">Volume</div><div className="val">{((design.room.width * design.room.depth * design.room.height) / 1e9).toFixed(1)} m³</div></div>
      </div>

      <div className="section-label">Openings ({design.room.openings.length})</div>
      {design.room.openings.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>No openings yet. Use Components → Openings to add windows, doors, and skylights.</p>
      ) : (
        <div className="item-list" style={{ marginBottom: 20 }}>
          {design.room.openings.map((o) => (
            <div key={o.id} className="item-row">
              <div className="item-info">
                <div className="item-name">{o.type} — {o.width}mm</div>
                <div className="item-detail">Wall {o.wallId} at {o.offset}mm</div>
              </div>
              <button className="item-delete" onClick={() => useStore.getState().removeOpening(o.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="section-label">Plumbing & Electrics ({(design.utilityPoints || []).length})</div>
      {(design.utilityPoints || []).length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No utility points yet. Use Components → Plumbing & Electrics to add water, power, gas points.</p>
      ) : (
        <div className="item-list">
          {(design.utilityPoints || []).map((up) => (
            <div key={up.id} className="item-row">
              <div className="item-info">
                <div className="item-name">{up.label}</div>
                <div className="item-detail">At {Math.round(up.position.x)}, {Math.round(up.position.y)}mm</div>
              </div>
              <button className="item-delete" onClick={() => useStore.getState().removeUtilityPoint(up.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- COLOURS ----
function ColourPanel() {
  const colours = useStore((s) => s.design.colours);
  const updateColours = useStore((s) => s.updateColours);
  const fields: { key: keyof ColourScheme; label: string }[] = [
    { key: 'cabinets', label: 'Cabinets' }, { key: 'countertops', label: 'Countertops' },
    { key: 'walls', label: 'Walls' }, { key: 'floor', label: 'Floor' },
    { key: 'backsplash', label: 'Backsplash' }, { key: 'handles', label: 'Handles' },
  ];
  return (
    <div>
      <div className="section-label">Colour scheme</div>
      <div className="colour-grid">
        {fields.map(({ key, label }) => (
          <div key={key} className="colour-row">
            <div className="colour-swatch" style={{ background: colours[key] }}>
              <input type="color" value={colours[key]} onChange={(e) => updateColours({ [key]: e.target.value } as Partial<ColourScheme>)} />
            </div>
            <div><div className="colour-name">{label}</div><div className="colour-hex">{colours[key]}</div></div>
          </div>
        ))}
      </div>
      <div className="section-label">Preset palettes</div>
      <div className="palette-grid">
        {Object.entries(COLOUR_PALETTES).map(([key, p]) => (
          <button key={key} className="palette-card" onClick={() => updateColours({ cabinets: p.cabinets, countertops: p.countertops, walls: p.walls, floor: p.floor, backsplash: p.backsplash, handles: p.handles })}>
            <div className="name">{p.name}</div>
            <div className="swatches">
              <div style={{ background: p.cabinets }} /><div style={{ background: p.countertops }} />
              <div style={{ background: p.walls }} /><div style={{ background: p.floor }} /><div style={{ background: p.handles }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- ANALYSIS ----
function AnalysisPanel() {
  const analysis = useStore((s) => s.analysis);
  const design = useStore((s) => s.design);

  if (!analysis) return <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 24 }}>Add some components to see analysis.</div>;

  const light = analysis.light;
  const lightColorMap: Record<string, string> = { poor: 'var(--error)', adequate: 'var(--warning)', good: 'var(--blue)', excellent: 'var(--success)' };
  const lightColor = lightColorMap[light.rating];
  const circumference = 2 * Math.PI * 40;
  const frac = Math.max(0.02, Math.min(1, light.lightRatio / 0.4));
  const lightDash = `${(circumference * frac).toFixed(1)} ${circumference.toFixed(1)}`;

  const wt = analysis.flow.workTriangle;
  const trianglePercent = wt ? Math.max(4, Math.min(100, (wt.perimeter / 6600) * 100)) : 0;
  const triangleColor = wt?.status === 'ok' ? 'var(--success)' : 'var(--warning)';

  const walkway = analysis.flow.walkwayClearances[0];
  const walkwayPercent = walkway ? Math.max(4, Math.min(100, (walkway.clearance / 1500) * 100)) : 0;
  const walkwayColorMap: Record<string, string> = { ok: 'var(--success)', warning: 'var(--warning)', error: 'var(--error)' };
  const walkwayColor = walkway ? walkwayColorMap[walkway.status] : 'var(--success)';

  return (
    <div>
      <div className="analysis-top">
        <div className="light-gauge-card">
          <div className="section-label" style={{ alignSelf: 'flex-start', margin: '0 0 10px 0' }}>Natural light</div>
          <svg viewBox="0 0 100 100" width="118" height="118">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={lightColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={lightDash} transform="rotate(-90 50 50)" />
            <text x="50" y="47" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--text)" fontFamily="Newsreader,serif">{Math.round(light.lightRatio * 100)}%</text>
            <text x="50" y="62" textAnchor="middle" fontSize="8" fill="var(--text-3)" fontFamily="Inter,sans-serif">glazing ratio</text>
          </svg>
          <div className={`light-badge ${light.rating}`}>{light.rating.charAt(0).toUpperCase() + light.rating.slice(1)}</div>
        </div>
        <div className="flow-card">
          <div className="section-label" style={{ margin: '0 0 14px 0' }}>Work triangle & flow</div>
          {wt && (
            <>
              <div className="flow-line"><span className="fl">Sink → Hob → Fridge perimeter</span><span className="fv">{Math.round(wt.perimeter)}mm</span></div>
              <div className="progress-bar" style={{ marginBottom: 4 }}><div style={{ width: `${trianglePercent}%`, background: triangleColor }} /></div>
              <div className="progress-note" style={{ marginBottom: 16 }}>Ideal range: 4000–6600mm total, each leg 1200–2700mm</div>
            </>
          )}
          {walkway && (
            <>
              <div className="flow-line"><span className="fl">Walkway clearance — {walkway.from} to {walkway.to}</span><span className="fv">{Math.round(walkway.clearance)}mm</span></div>
              <div className="progress-bar"><div style={{ width: `${walkwayPercent}%`, background: walkwayColor }} /></div>
              <div className="progress-note" style={{ marginTop: 4 }}>900mm minimum recommended</div>
            </>
          )}
        </div>
      </div>

      <div className="section-label">Issues & recommendations ({analysis.issues.length})</div>
      {analysis.issues.length === 0 ? (
        <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderLeft: '3px solid var(--success)', borderRadius: 10, padding: 14, marginBottom: 9 }}>
          <div className="msg" style={{ fontSize: 13.5, fontWeight: 600 }}>No issues detected</div>
          <div className="detail" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Your layout meets standard ergonomic and safety guidelines.</div>
        </div>
      ) : (
        analysis.issues.map((issue) => (
          <div key={issue.id} className={`issue-card ${issue.severity}`}>
            <div className="msg">{issue.message}</div>
            {issue.detail && <div className="detail">{issue.detail}</div>}
            {issue.fix && <div className="fix">→ {issue.fix}</div>}
          </div>
        ))
      )}

      <div style={{ height: 12 }} />
      <div className="section-label">Design summary</div>
      <div className="summary-grid cols-4">
        <div className="summary-card"><div className="label">Cabinets</div><div className="val">{design.carcasses.length}</div></div>
        <div className="summary-card"><div className="label">Run length</div><div className="val">{(design.carcasses.reduce((s, c) => s + c.size, 0) / 1000).toFixed(1)}m</div></div>
        <div className="summary-card"><div className="label">Furniture</div><div className="val">{design.furniture.length}</div></div>
        <div className="summary-card"><div className="label">Floor area</div><div className="val">{((design.room.width * design.room.depth) / 1e6).toFixed(1)} m²</div></div>
      </div>
    </div>
  );
}
