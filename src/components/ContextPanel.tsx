// ============================================================================
// ContextPanel — floating panel for the selected element on the canvas
// Appears top-right when something is selected
// ============================================================================

import React from 'react';
import { useStore } from '../store/useStore';
import { CARCASS_SIZES, CARCASS_DEPTHS, FITTING_CATALOG, APPLIANCE_CATALOG } from '../domain/catalog';
import type { CarcassSize, FittingType, ApplianceType } from '../domain/types';

export default function ContextPanel() {
  const design = useStore((s) => s.design);
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateCarcass = useStore((s) => s.updateCarcass);
  const removeCarcass = useStore((s) => s.removeCarcass);
  const updateFurniture = useStore((s) => s.updateFurniture);
  const removeFurniture = useStore((s) => s.removeFurniture);

  const carcass = design.carcasses.find((c) => c.id === selectedId);
  const furniture = design.furniture.find((f) => f.id === selectedId);

  if (!carcass && !furniture) return null;

  if (furniture) {
    return (
      <div className="context-panel">
        <h3>{furniture.label}</h3>
        <div className="context-subtitle">{furniture.width} × {furniture.depth}mm{furniture.seats ? ` • ${furniture.seats} seats` : ''}</div>
        <div className="prop-field">
          <label>Label</label>
          <input
            type="text"
            value={furniture.label}
            onChange={(e) => updateFurniture(furniture.id, { label: e.target.value })}
          />
        </div>
        <div className="prop-row">
          <div className="prop-field">
            <label>Width (mm)</label>
            <input type="number" value={furniture.width} step={50}
              onChange={(e) => updateFurniture(furniture.id, { width: Number(e.target.value) })} />
          </div>
          <div className="prop-field">
            <label>Depth (mm)</label>
            <input type="number" value={furniture.depth} step={50}
              onChange={(e) => updateFurniture(furniture.id, { depth: Number(e.target.value) })} />
          </div>
        </div>
        {furniture.seats !== undefined && (
          <div className="prop-field">
            <label>Seats</label>
            <input type="number" value={furniture.seats} min={2} max={12}
              onChange={(e) => updateFurniture(furniture.id, { seats: Number(e.target.value) })} />
          </div>
        )}
        <button className="danger-btn" onClick={() => { removeFurniture(furniture.id); setSelected(null); }}>
          🗑 Delete Furniture
        </button>
      </div>
    );
  }

  if (carcass) {
    return (
      <div className="context-panel">
        <h3>{carcass.label || `${carcass.size}mm Unit`}</h3>
        <div className="context-subtitle">
          {carcass.size} × {carcass.depth}mm
          {carcass.appliance ? ` • ${carcass.appliance.label}` : ''}
          {carcass.fittings[0]?.type !== 'plain' ? ` • ${carcass.fittings[0].label}` : ''}
        </div>

        <div className="prop-row">
          <div className="prop-field">
            <label>Width</label>
            <select
              value={carcass.size}
              onChange={(e) => updateCarcass(carcass.id, { size: Number(e.target.value) as CarcassSize })}
            >
              {CARCASS_SIZES.map((s) => <option key={s} value={s}>{s}mm</option>)}
            </select>
          </div>
          <div className="prop-field">
            <label>Depth</label>
            <select
              value={carcass.depth}
              onChange={(e) => updateCarcass(carcass.id, { depth: Number(e.target.value) as any })}
            >
              {CARCASS_DEPTHS.map((d) => <option key={d} value={d}>{d}mm</option>)}
            </select>
          </div>
        </div>

        <div className="prop-field">
          <label>Mount Type</label>
          <select
            value={carcass.mount}
            onChange={(e) => {
              const mount = e.target.value as any;
              updateCarcass(carcass.id, { mount, height: mount === 'tall' ? 850 : 720 });
            }}
          >
            <option value="floor">Floor Unit</option>
            <option value="wall">Wall Unit</option>
            <option value="tall">Tall Unit (Larder/Oven)</option>
          </select>
        </div>

        <div className="prop-field">
          <label>Label</label>
          <input type="text" value={carcass.label || ''} placeholder={`${carcass.size}mm Unit`}
            onChange={(e) => updateCarcass(carcass.id, { label: e.target.value })} />
        </div>

        <div className="prop-field">
          <label>Fitting / Internal Storage</label>
          <select
            value={carcass.fittings[0]?.type || 'plain'}
            onChange={(e) => {
              const fitType = e.target.value as FittingType;
              const cat = FITTING_CATALOG.find((f) => f.type === fitType);
              updateCarcass(carcass.id, {
                fittings: [{
                  id: `fitting-${Date.now()}`,
                  type: fitType,
                  label: cat?.label || 'Plain',
                  quantity: fitType === 'drawer' ? 3 : fitType === 'shelf' ? 2 : 1,
                }],
              });
            }}
          >
            <option value="plain">— Plain Cupboard —</option>
            {FITTING_CATALOG.filter((f) => f.type !== 'plain').map((f) => (
              <option key={f.type} value={f.type}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="prop-field">
          <label>Appliance</label>
          <select
            value={carcass.appliance?.type || ''}
            onChange={(e) => {
              const apType = e.target.value as ApplianceType;
              if (!apType) {
                updateCarcass(carcass.id, { appliance: undefined });
              } else {
                const cat = APPLIANCE_CATALOG.find((a) => a.type === apType);
                updateCarcass(carcass.id, {
                  appliance: {
                    id: `appliance-${Date.now()}`,
                    type: apType, label: cat?.label || apType,
                    width: carcass.size, integrated: cat?.integrated ?? true,
                  },
                });
              }
            }}
          >
            <option value="">— None —</option>
            {APPLIANCE_CATALOG.map((a) => (
              <option key={a.type} value={a.type}>{a.label}</option>
            ))}
          </select>
        </div>

        <button className="danger-btn" onClick={() => { removeCarcass(carcass.id); setSelected(null); }}>
          🗑 Delete Unit
        </button>
      </div>
    );
  }

  return null;
}
