// ============================================================================
// BottomSheet — slides up from bottom, shows content per active tab
// ============================================================================

import React from 'react';
import type { SheetTab } from '../App';
import { useStore } from '../store/useStore';
import { CARCASS_SIZES, FITTING_CATALOG, APPLIANCE_CATALOG, COLOUR_PALETTES } from '../domain/catalog';
import type { CarcassSize, FittingType, ApplianceType, Furniture, ColourScheme } from '../domain/types';

interface Props {
  tab: SheetTab;
  onClose: () => void;
}

export default function BottomSheet({ tab, onClose }: Props) {
  if (!tab) return null;

  return (
    <div className="bottom-sheet">
      <div className="bottom-sheet-header">
        <h2>
          {tab === 'components' && 'Components'}
          {tab === 'measure' && 'Room Measurements'}
          {tab === 'colours' && 'Colour & Style'}
          {tab === 'analysis' && 'Analysis & Recommendations'}
        </h2>
        <button className="bottom-sheet-close" onClick={onClose}>×</button>
      </div>
      <div className="bottom-sheet-content">
        {tab === 'components' && <ComponentsPanel />}
        {tab === 'measure' && <MeasurePanel />}
        {tab === 'colours' && <ColourPanel />}
        {tab === 'analysis' && <AnalysisPanel />}
      </div>
    </div>
  );
}

// ---- COMPONENTS PANEL ----
function ComponentsPanel() {
  const setTool = useStore((s) => s.setTool);
  const tool = useStore((s) => s.tool);
  const selectedCarcassSize = useStore((s) => s.selectedCarcassSize);
  const setSelectedCarcassSize = useStore((s) => s.setSelectedCarcassSize);
  const addFurniture = useStore((s) => s.addFurniture);
  const design = useStore((s) => s.design);

  return (
    <div>
      {/* Tools */}
      <div className="section-label">Tools</div>
      <div className="chip-list" style={{ marginBottom: 20 }}>
        <button
          className={`chip ${tool === 'select' ? 'active' : ''}`}
          onClick={() => setTool('select')}
        >
          <span className="chip-icon">🖱️</span> Select & Move
        </button>
        <button
          className={`chip ${tool === 'pan' ? 'active' : ''}`}
          onClick={() => setTool('pan')}
        >
          <span className="chip-icon">✋</span> Pan
        </button>
        <button
          className={`chip ${tool === 'place-carcass' ? 'active' : ''}`}
          onClick={() => { setTool('place-carcass'); }}
        >
          <span className="chip-icon">📦</span> Place Carcass
        </button>
        <button
          className={`chip ${tool === 'place-furniture' ? 'active' : ''}`}
          onClick={() => setTool('place-furniture')}
        >
          <span className="chip-icon">🪑</span> Place Furniture
        </button>
        <button
          className={`chip ${tool === 'draw-room' ? 'active' : ''}`}
          onClick={() => useStore.getState().startDrawingRoom()}
        >
          <span className="chip-icon">✏️</span> Draw Room
        </button>
      </div>

      {/* Carcass Sizes */}
      <div className="section-label">Standard Carcass Widths</div>
      <div className="card-grid" style={{ marginBottom: 20 }}>
        {CARCASS_SIZES.map((size) => (
          <button
            key={size}
            className={`size-card ${selectedCarcassSize === size ? 'active' : ''}`}
            onClick={() => {
              setSelectedCarcassSize(size as CarcassSize);
              setTool('place-carcass');
            }}
          >
            <div className="size-number">{size}</div>
            <div className="size-unit">mm</div>
            <div className="size-visual" style={{ width: `${size / 12}px`, maxWidth: '100%' }} />
          </button>
        ))}
      </div>

      {/* Fittings */}
      <div className="section-label">Fittings & Internal Storage</div>
      <div className="chip-list" style={{ marginBottom: 20 }}>
        {FITTING_CATALOG.filter((f) => f.type !== 'plain').map((f) => (
          <button key={f.type} className="chip" title={f.description}>
            <span className="chip-icon">
              {f.type.includes('drawer') ? '🗄️' : f.type.includes('corner') ? '🔄' : f.type.includes('shelf') ? '📏' : f.type.includes('spice') ? '🧂' : f.type.includes('wine') ? '🍷' : f.type.includes('bin') ? '🗑️' : f.type.includes('larder') ? '🥫' : '📦'}
            </span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Appliances */}
      <div className="section-label">Appliances (allocate to a carcass)</div>
      <div className="card-grid" style={{ marginBottom: 20 }}>
        {APPLIANCE_CATALOG.map((a) => (
          <div key={a.type} className="component-card" title={a.description}>
            <div className="card-icon">
              {a.type === 'sink' ? '🚰' : a.type === 'hob' ? '🔥' : a.type.includes('fridge') ? '🧊' : a.type === 'oven' ? '🍳' : a.type === 'dishwasher' ? '🫧' : a.type === 'microwave' ? '📡' : a.type === 'rangehood' ? '💨' : a.type.includes('wine') ? '🍷' : a.type.includes('wash') ? '🌀' : a.type.includes('dryer') ? '👕' : a.type.includes('coffee') ? '☕' : '🔌'}
            </div>
            <div className="card-title">{a.label}</div>
            <div className="card-subtitle">{a.standardWidths.join('/')}mm</div>
          </div>
        ))}
      </div>

      {/* Furniture */}
      <div className="section-label">Furniture</div>
      <div className="card-grid">
        <button
          className="component-card"
          onClick={() => {
            addFurniture({
              id: `furniture-${Date.now()}`,
              type: 'dining-table', label: 'Dining Table',
              position: { x: design.room.width / 2, y: design.room.depth / 2 },
              width: 1800, depth: 900, rotation: 0, seats: 6,
            });
          }}
        >
          <div className="card-icon">🍽️</div>
          <div className="card-title">Dining Table</div>
          <div className="card-subtitle">6 seats</div>
        </button>
        <button
          className="component-card"
          onClick={() => {
            addFurniture({
              id: `furniture-${Date.now()}`,
              type: 'round-table', label: 'Round Table',
              position: { x: design.room.width / 2, y: design.room.depth / 2 },
              width: 1200, depth: 1200, rotation: 0, seats: 4,
            });
          }}
        >
          <div className="card-icon">⭕</div>
          <div className="card-title">Round Table</div>
          <div className="card-subtitle">4 seats</div>
        </button>
        <button
          className="component-card"
          onClick={() => {
            addFurniture({
              id: `furniture-${Date.now()}`,
              type: 'sideboard', label: 'Sideboard',
              position: { x: 200, y: design.room.depth - 600 },
              width: 1500, depth: 400, rotation: 0,
            });
          }}
        >
          <div className="card-icon">🗄️</div>
          <div className="card-title">Sideboard</div>
          <div className="card-subtitle">1500 × 400mm</div>
        </button>
      </div>
    </div>
  );
}

// ---- MEASURE PANEL ----

// ---- Preset Shape Button ----
function PresetShapeButton({ label, icon, vertices }: { label: string; icon: string; vertices: { x: number; y: number }[] }) {
  const setRoomVertices = useStore((s) => s.setRoomVertices);
  return (
    <button
      className="component-card"
      onClick={() => setRoomVertices(vertices)}
      style={{ minWidth: 80 }}
    >
      <div className="card-icon">{icon}</div>
      <div className="card-title">{label}</div>
      <div className="card-subtitle">{vertices.length} walls</div>
    </button>
  );
}

function MeasurePanel() {
  const design = useStore((s) => s.design);
  const updateRoom = useStore((s) => s.updateRoom);
  const startDrawingRoom = useStore((s) => s.startDrawingRoom);
  const isDrawingRoom = useStore((s) => s.isDrawingRoom);
  const drawingVertices = useStore((s) => s.drawingVertices);
  const cancelDrawing = useStore((s) => s.cancelDrawing);
  const finishDrawingRoom = useStore((s) => s.finishDrawingRoom);

  return (
    <div>
      {/* Draw Room Section */}
      <div className="section-label">Room Shape</div>
      <div style={{ marginBottom: 20 }}>
        {isDrawingRoom ? (
          <div style={{
            background: 'var(--accent-soft)', border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)', padding: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--accent)' }}>
              ✏️ Drawing room — {drawingVertices.length} {drawingVertices.length === 1 ? 'corner' : 'corners'} placed
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Click on the canvas to add corners. Click the first point (green) or double-click to close the room. Press Esc to cancel.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="send-btn"
                style={{ background: 'var(--green)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, color: '#fff' }}
                disabled={drawingVertices.length < 3}
                onClick={() => finishDrawingRoom()}
              >✓ Finish Room ({drawingVertices.length} corners)</button>
              <button
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                onClick={() => cancelDrawing()}
              >✕ Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => startDrawingRoom()}
            style={{
              width: '100%', padding: '14px', fontSize: 14, fontWeight: 600,
              background: 'var(--bg-soft)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            ✏️ Draw Custom Room Shape
          </button>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
          Draw an L-shape, irregular room, or any polygon. Your current room is a {design.room.vertices.length}-corner shape.
        </p>
      </div>

      {/* Preset Shapes */}
      <div className="section-label" style={{ marginTop: 16 }}>Preset Room Shapes</div>
      <div className="card-grid" style={{ marginBottom: 20 }}>
        <PresetShapeButton
          label="Rectangle"
          icon="▭"
          vertices={[{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }]}
        />
        <PresetShapeButton
          label="L-Shape"
          icon="∟"
          vertices={[{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 2000 }, { x: 2500, y: 2000 }, { x: 2500, y: 3500 }, { x: 0, y: 3500 }]}
        />
        <PresetShapeButton
          label="Galley"
          icon="∥"
          vertices={[{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2500 }, { x: 0, y: 2500 }]}
        />
        <PresetShapeButton
          label="U-Shape"
          icon="∪"
          vertices={[{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 2800, y: 3000 }, { x: 2800, y: 800 }, { x: 1200, y: 800 }, { x: 1200, y: 3000 }, { x: 0, y: 3000 }]}
        />
        <PresetShapeButton
          label="Square"
          icon="□"
          vertices={[{ x: 0, y: 0 }, { x: 3500, y: 0 }, { x: 3500, y: 3500 }, { x: 0, y: 3500 }]}
        />
        <PresetShapeButton
          label="Open Plan"
          icon="⌐"
          vertices={[{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 4000 }, { x: 2000, y: 4000 }, { x: 2000, y: 2500 }, { x: 0, y: 2500 }]}
        />
      </div>

      <div className="section-label">Adjust Dimensions (rectangle mode)</div>
      <div className="measure-row">
        <label>Width</label>
        <div className="slider-wrap">
          <input
            type="range" min={2000} max={8000} step={100}
            value={design.room.width}
            onChange={(e) => updateRoom(Number(e.target.value), design.room.depth, design.room.height)}
          />
          <div className="value-display">{(design.room.width / 1000).toFixed(1)}m<span className="unit"> ({design.room.width}mm)</span></div>
        </div>
      </div>
      <div className="measure-row">
        <label>Depth</label>
        <div className="slider-wrap">
          <input
            type="range" min={2000} max={8000} step={100}
            value={design.room.depth}
            onChange={(e) => updateRoom(design.room.width, Number(e.target.value), design.room.height)}
          />
          <div className="value-display">{(design.room.depth / 1000).toFixed(1)}m<span className="unit"> ({design.room.depth}mm)</span></div>
        </div>
      </div>
      <div className="measure-row">
        <label>Ceiling Height</label>
        <div className="slider-wrap">
          <input
            type="range" min={2200} max={3200} step={50}
            value={design.room.height}
            onChange={(e) => updateRoom(design.room.width, design.room.depth, Number(e.target.value))}
          />
          <div className="value-display">{(design.room.height / 1000).toFixed(1)}m<span className="unit"> ({design.room.height}mm)</span></div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 20 }}>Room Summary</div>
      <div className="metric-card">
        <div className="metric-line">
          <span className="ml">Floor Area</span>
          <span className="mv">{((design.room.width * design.room.depth) / 1_000_000).toFixed(1)} m²</span>
        </div>
        <div className="metric-line">
          <span className="ml">Wall Perimeter</span>
          <span className="mv">{(2 * (design.room.width + design.room.depth) / 1000).toFixed(1)}m</span>
        </div>
        <div className="metric-line">
          <span className="ml">Room Volume</span>
          <span className="mv">{((design.room.width * design.room.depth * design.room.height) / 1_000_000_000).toFixed(1)} m³</span>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 20 }}>Openings (Windows, Doors, Skylights)</div>
      {design.room.openings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-text">No openings added yet. In the full version you'll be able to add windows, doors, and skylights by clicking on walls.</div>
        </div>
      ) : (
        <div className="item-list">
          {design.room.openings.map((o) => (
            <div key={o.id} className="item-row">
              <div className="item-info">
                <div className="item-name">{o.type} — {o.width}mm</div>
                <div className="item-detail">On {o.wallId} at {o.offset}mm</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- COLOUR PANEL ----
function ColourPanel() {
  const colours = useStore((s) => s.design.colours);
  const updateColours = useStore((s) => s.updateColours);

  const colourFields: { key: keyof ColourScheme; label: string }[] = [
    { key: 'cabinets', label: 'Cabinets' },
    { key: 'countertops', label: 'Countertops' },
    { key: 'walls', label: 'Walls' },
    { key: 'floor', label: 'Floor' },
    { key: 'backsplash', label: 'Backsplash' },
    { key: 'handles', label: 'Handles' },
  ];

  return (
    <div>
      <div className="section-label">Colour Scheme</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {colourFields.map(({ key, label }) => (
          <div key={key} className="colour-row">
            <div className="colour-swatch" style={{ background: colours[key] }}>
              <input
                type="color"
                value={colours[key]}
                onChange={(e) => updateColours({ [key]: e.target.value } as Partial<ColourScheme>)}
              />
            </div>
            <div>
              <div className="colour-name">{label}</div>
              <div className="colour-hex">{colours[key].toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-label">Preset Palettes</div>
      <div className="palette-cards">
        {Object.entries(COLOUR_PALETTES).map(([key, palette]) => (
          <div
            key={key}
            className="palette-card"
            onClick={() => updateColours({
              cabinets: palette.cabinets,
              countertops: palette.countertops,
              walls: palette.walls,
              floor: palette.floor,
              backsplash: palette.backsplash,
              handles: palette.handles,
            })}
          >
            <div className="palette-name">{palette.name}</div>
            <div className="palette-swatches">
              <div style={{ background: palette.cabinets }} />
              <div style={{ background: palette.countertops }} />
              <div style={{ background: palette.walls }} />
              <div style={{ background: palette.floor }} />
              <div style={{ background: palette.handles }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- ANALYSIS PANEL ----
function AnalysisPanel() {
  const analysis = useStore((s) => s.analysis);
  const design = useStore((s) => s.design);

  if (!analysis) {
    return (
      <div className="empty-state">
        <div className="empty-text">Analysis will appear once you add some components to your kitchen.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Light */}
      <div className="section-label">Natural Light</div>
      <div className="metric-card">
        <div className="metric-title">
          ☀️ Light Rating
          <span className={`light-badge ${analysis.light.rating}`}>
            {analysis.light.rating.charAt(0).toUpperCase() + analysis.light.rating.slice(1)}
          </span>
        </div>
        <div className="metric-line">
          <span className="ml">Floor Area</span>
          <span className="mv">{analysis.light.roomFloorArea.toFixed(1)} m²</span>
        </div>
        <div className="metric-line">
          <span className="ml">Glazing Area</span>
          <span className="mv">{analysis.light.totalGlazingArea.toFixed(2)} m²</span>
        </div>
        <div className="metric-line">
          <span className="ml">Light Ratio</span>
          <span className="mv">{(analysis.light.lightRatio * 100).toFixed(1)}%</span>
        </div>
        {analysis.light.notes.map((note, i) => (
          <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>{note}</p>
        ))}
      </div>

      {/* Flow */}
      <div className="section-label">Flow & Ergonomics</div>
      <div className="metric-card">
        {analysis.flow.workTriangle && (
          <>
            <div className="metric-line">
              <span className="ml">Work Triangle (sink→fridge→hob)</span>
              <span className="mv">{Math.round(analysis.flow.workTriangle.perimeter)}mm</span>
            </div>
          </>
        )}
        {analysis.flow.islandFit && (
          <div className="metric-line">
            <span className="ml">Island Fit</span>
            <span className="mv" style={{ color: analysis.flow.islandFit.fits ? 'var(--green)' : 'var(--red)' }}>
              {analysis.flow.islandFit.fits ? '✓ Fits' : '✗ Too tight'}
            </span>
          </div>
        )}
        {analysis.flow.walkwayClearances.map((wc, i) => (
          <div key={i} className="metric-line">
            <span className="ml">{wc.from} → {wc.to}</span>
            <span className="mv" style={{ color: wc.status === 'ok' ? 'var(--green)' : wc.status === 'warning' ? 'var(--amber)' : 'var(--red)' }}>
              {Math.round(wc.clearance)}mm
            </span>
          </div>
        ))}
      </div>

      {/* Issues */}
      <div className="section-label">Issues & Recommendations ({analysis.issues.length})</div>
      {analysis.issues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <div className="empty-text">No issues detected. Your kitchen layout looks good!</div>
        </div>
      ) : (
        analysis.issues.map((issue) => (
          <div key={issue.id} className={`issue-card sev-${issue.severity}`}>
            <div className="issue-msg">{issue.message}</div>
            {issue.detail && <div className="issue-detail">{issue.detail}</div>}
            {issue.fix && <div className="issue-fix">💡 {issue.fix}</div>}
          </div>
        ))
      )}

      {/* Summary */}
      <div className="section-label">Design Summary</div>
      <div className="metric-card">
        <div className="metric-line">
          <span className="ml">Carcass Units</span>
          <span className="mv">{design.carcasses.length}</span>
        </div>
        <div className="metric-line">
          <span className="ml">Total Carcass Run</span>
          <span className="mv">{design.carcasses.reduce((s, c) => s + c.size, 0)}mm</span>
        </div>
        <div className="metric-line">
          <span className="ml">Furniture Items</span>
          <span className="mv">{design.furniture.length}</span>
        </div>
        <div className="metric-line">
          <span className="ml">Islands</span>
          <span className="mv">{design.islands.length}</span>
        </div>
      </div>
    </div>
  );
}
