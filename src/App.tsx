import React, { useState, useEffect } from 'react';
import KitchenCanvas from './components/KitchenCanvas';
import BottomBar from './components/BottomBar';
import BottomSheet from './components/BottomSheet';
import ContextPanel from './components/ContextPanel';
import { useStore } from './store/useStore';
import { MockAIProvider } from './ai/types';
import type { AIProvider } from './ai/types';
import type { Vec2 } from './domain/types';

export type ViewMode = '2d' | '3d';
export type SheetTab = 'components' | 'measure' | 'colours' | 'analysis' | null;

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: string | null}> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message + '\n\n' + error.stack }; }
  render() {
    if (this.state.error) {
      return React.createElement('pre', { style: { padding: 20, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#B94A3B', background: '#FBEDEA', lineHeight: 1.6 } }, this.state.error);
    }
    return this.props.children;
  }
}

export default function App() {
  const design = useStore((s) => s.design);
  const load = useStore((s) => s.load);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const historyIndex = useStore((s) => s.historyIndex);
  const history = useStore((s) => s.history);
  const selectedId = useStore((s) => s.selectedId);

  const [scale, setScale] = useState(1.15);
  const [position, setPosition] = useState<Vec2>({ x: 220, y: 80 });
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [sheetTab, setSheetTab] = useState<SheetTab>(null);

  useEffect(() => {
    // Clear old localStorage that might not have utilityPoints (pre-migration data)
    try {
      const saved = localStorage.getItem('kitchenplan-design');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.utilityPoints) {
          localStorage.removeItem('kitchenplan-design');
        }
      }
    } catch (e) {
      try { localStorage.removeItem('kitchenplan-design'); } catch {}
    }
    load();
  }, [load]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      const store = useStore.getState();
      if (e.key === 'Escape') { store.setSelected(null); store.cancelDrawing(); store.setEditingWallId(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedId) {
        e.preventDefault();
        const id = store.selectedId;
        if (store.design.carcasses.find((c) => c.id === id)) store.removeCarcass(id);
        else if (store.design.furniture.find((f) => f.id === id)) store.removeFurniture(id);
        else if (store.design.room.openings.find((o) => o.id === id)) store.removeOpening(id);
        else if ((store.design.utilityPoints || []).find((u) => u.id === id)) store.removeUtilityPoint(id);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); store.redo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleNew = () => {
    const store = useStore.getState();
    const choice = confirm('Start fresh with an empty room?\\n\\nClick OK for an empty room, or Cancel to keep your current design.');
    if (choice) {
      store.setDesign({
        id: `design-${Date.now()}`,
        name: 'New Kitchen',
        room: {
          id: `room-${Date.now()}`,
          name: 'Kitchen',
          width: 3000, depth: 3000, height: 2400,
          walls: [
            { id: 'wall-0', start: { x: 0, y: 0 }, end: { x: 3000, y: 0 }, thickness: 120 },
            { id: 'wall-1', start: { x: 3000, y: 0 }, end: { x: 3000, y: 3000 }, thickness: 120 },
            { id: 'wall-2', start: { x: 3000, y: 3000 }, end: { x: 0, y: 3000 }, thickness: 120 },
            { id: 'wall-3', start: { x: 0, y: 3000 }, end: { x: 0, y: 0 }, thickness: 120 },
          ],
          openings: [],
          vertices: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 3000 }, { x: 0, y: 3000 }],
          origin: { x: 0, y: 0 },
        },
        carcasses: [], islands: [], furniture: [], utilityPoints: [],
        colours: { cabinets: '#C9B79C', countertops: '#2E2620', walls: '#F8F3EA', floor: '#E4D3BA', backsplash: '#EFE2D0', handles: '#5B4A38' },
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      setPosition({ x: 250, y: 100 });
      setScale(1.2);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kitchen-design.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (parsed.room && parsed.carcasses) {
            useStore.getState().setDesign(parsed);
          } else {
            alert('Invalid kitchen design file');
          }
        } catch { alert('Could not read file'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const showContextPanel = !!selectedId && sheetTab === null;

  return (
    <ErrorBoundary>
      <div className="app">
        <header className="topbar">
          <div className="topbar-logo">
            <div className="topbar-logo-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M4 13 L12 5 L20 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="7.5" y="13" width="9" height="7" rx="1" fill="#fff" opacity="0.92"/>
              </svg>
            </div>
            <span className="topbar-logo-text">KitchenPlan</span>
          </div>

          <AIPromptBar />

          <div className="view-toggle">
            <button className={viewMode === '2d' ? 'active' : ''} onClick={() => setViewMode('2d')}>2D</button>
            <button className={viewMode === '3d' ? 'active' : ''} onClick={() => setViewMode('3d')}>3D</button>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setScale(s => Math.min(3, s * 1.2))} title="Zoom in">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg>
            </button>
            <button className="icon-btn" onClick={() => setScale(s => Math.max(0.4, s / 1.2))} title="Zoom out">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="4" y1="10" x2="16" y2="10"/></svg>
            </button>
            <span className="topbar-divider" />
            <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5 L3 8 L6 11"/><path d="M3 8 H12 a4 4 0 0 1 0 8 h-3"/></svg>
            </button>
            <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5 L17 8 L14 11"/><path d="M17 8 H8 a4 4 0 0 0 0 8 h3"/></svg>
            </button>
            <span className="topbar-divider" />
            <button className="icon-btn" onClick={handleExport} title="Export">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3 V12"/><path d="M6 9 L10 13 L14 9"/><path d="M4 16 H16"/></svg>
            </button>
            <button className="icon-btn" onClick={handleNew} title="New design">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5 H12 L16 6.5 V17 H6 Z"/><path d="M12 2.5 V6.5 H16"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
            </button>
          </div>
        </header>

        <div className="canvas-area">
          <ErrorBoundary>
            <KitchenCanvas scale={scale} position={position} setScale={setScale} setPosition={setPosition} viewMode={viewMode} />
          </ErrorBoundary>
          {showContextPanel && <ContextPanel />}
        </div>

        {sheetTab && <BottomSheet tab={sheetTab} onClose={() => setSheetTab(null)} />}

        <BottomBar activeTab={sheetTab} onTabChange={setSheetTab} />
      </div>
    </ErrorBoundary>
  );
}


// ---- AI Preview Modal ----
function AIPreviewModal() {
  const pendingAIPreview = useStore((s) => s.pendingAIPreview);
  const confirmAIPreview = useStore((s) => s.confirmAIPreview);
  const cancelAIPreview = useStore((s) => s.cancelAIPreview);

  if (!pendingAIPreview) return null;
  const { roomPreview, explanation } = pendingAIPreview;

  // Render preview SVG
  const MM_TO_PX = 0.12;
  const vertices = roomPreview.vertices;
  const bb = vertices.length > 0 ? {
    minX: Math.min(...vertices.map((v: any) => v.x)),
    minY: Math.min(...vertices.map((v: any) => v.y)),
    maxX: Math.max(...vertices.map((v: any) => v.x)),
    maxY: Math.max(...vertices.map((v: any) => v.y)),
  } : { minX: 0, minY: 0, maxX: 4000, maxY: 3000 };
  const w = (bb.maxX - bb.minX) * MM_TO_PX;
  const h = (bb.maxY - bb.minY) * MM_TO_PX;
  const pts = vertices.map((v: any) => `${(v.x - bb.minX) * MM_TO_PX},${(v.y - bb.minY) * MM_TO_PX}`).join(' ');

  return React.createElement('div', {
    style: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(43,36,32,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'kp-fade-in 0.2s ease',
    },
    onClick: cancelAIPreview,
  },
    React.createElement('div', {
      style: {
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)', padding: 28,
        maxWidth: 520, width: '90%',
      },
      onClick: (e: any) => e.stopPropagation(),
    },
      React.createElement('h2', {
        style: { fontFamily: 'Newsreader, serif', fontSize: 22, fontWeight: 600, marginBottom: 8 },
      }, 'Room Preview'),
      React.createElement('p', {
        style: { fontSize: 14, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.5 },
      }, explanation),
      // SVG preview
      React.createElement('div', {
        style: {
          background: 'var(--bg)', borderRadius: 'var(--radius-md)',
          padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'center',
        },
      },
        React.createElement('svg', {
          viewBox: `0 0 ${Math.max(w + 40, 200)} ${Math.max(h + 40, 150)}`,
          width: '100%', style: { maxWidth: 400, height: 'auto' },
        },
          React.createElement('polygon', {
            points: pts,
            fill: 'var(--accent-soft)', stroke: 'var(--accent)', strokeWidth: 2,
          }),
          // Vertex markers
          ...vertices.map((v: any, i: number) => React.createElement('circle', {
            key: i,
            cx: (v.x - bb.minX) * MM_TO_PX, cy: (v.y - bb.minY) * MM_TO_PX,
            r: 4, fill: i === 0 ? 'var(--success)' : 'var(--accent)',
          })),
          // Wall labels
          ...vertices.map((v: any, i: number) => {
            const next = vertices[(i + 1) % vertices.length];
            const mx = ((v.x - bb.minX) + (next.x - bb.minX)) / 2 * MM_TO_PX;
            const my = ((v.y - bb.minY) + (next.y - bb.minY)) / 2 * MM_TO_PX;
            const len = Math.round(Math.sqrt((next.x - v.x) ** 2 + (next.y - v.y) ** 2));
            return React.createElement('text', {
              key: `lbl-${i}`, x: mx, y: my - 6, fontSize: 10,
              fill: 'var(--text-2)', textAnchor: 'middle', fontFamily: 'Inter, sans-serif',
            }, `${len}mm`);
          }),
        ),
      ),
      // Stats
      React.createElement('div', {
        style: { display: 'flex', gap: 16, marginBottom: 24 },
      },
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: { fontSize: 12, color: 'var(--text-3)', marginBottom: 3 } }, 'Shape'),
          React.createElement('div', { style: { fontFamily: 'Newsreader, serif', fontSize: 17, fontWeight: 600 } }, `${vertices.length} corners`),
        ),
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: { fontSize: 12, color: 'var(--text-3)', marginBottom: 3 } }, 'Floor area'),
          React.createElement('div', { style: { fontFamily: 'Newsreader, serif', fontSize: 17, fontWeight: 600 } },
            `${((roomPreview.width * roomPreview.depth) / 1e6).toFixed(1)} m²`),
        ),
      ),
      // Actions
      React.createElement('div', { style: { display: 'flex', gap: 12 } },
        React.createElement('button', {
          onClick: cancelAIPreview,
          style: {
            flex: 1, padding: '12px 20px', borderRadius: 'var(--radius-sm)',
            fontSize: 14, fontWeight: 600, color: 'var(--text-2)',
            border: '1px solid var(--border)', background: 'var(--surface-soft)',
          },
        }, 'Cancel'),
        React.createElement('button', {
          onClick: confirmAIPreview,
          style: {
            flex: 1, padding: '12px 20px', borderRadius: 'var(--radius-sm)',
            fontSize: 14, fontWeight: 600, color: '#fff',
            background: 'var(--accent)', border: 'none',
          },
        }, '✓ Apply Room Shape'),
      ),
    ),
  );
}

function AIPromptBar() {
  const generateFromIntent = useStore((s) => s.generateFromIntent);
  const setPendingAIPreview = useStore((s) => s.setPendingAIPreview);
  const design = useStore((s) => s.design);
  const updateRoom = useStore((s) => s.updateRoom);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [provider] = useState<AIProvider>(new MockAIProvider());

  const handleSend = async () => {
    if (!input.trim() || busy) return;
    setBusy(true); setFeedback(null); setShowSuggestions(false);
    try {
      const result = await provider.interpretDesign(input, design);
      if (result.intent.roomShape) {
        // Show preview before applying
        const store = useStore.getState();
        store.setPendingAIPreview({
          intent: result.intent,
          explanation: result.explanation,
          roomPreview: {
            width: result.intent.roomDimensions?.width || 4000,
            depth: result.intent.roomDimensions?.depth || 3000,
            vertices: result.intent.roomShape.vertices,
          },
        });
      } else if (result.intent.roomDimensions) {
        const rd = result.intent.roomDimensions;
        updateRoom(rd.width, rd.depth, rd.height);
        setFeedback(`Resized your room to ${(rd.width/1000).toFixed(1)}m × ${(rd.depth/1000).toFixed(1)}m.`);
      } else {
        generateFromIntent(result.intent, `AI: ${input.slice(0, 40)}`);
        setFeedback(result.explanation);
      }
      setInput('');
    } catch (err) {
      setFeedback(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const suggestions = [
    '4m × 3m L-shape with an island',
    'Galley kitchen, 3m × 2.5m',
    '5m × 4m with a dining table for six',
    'U-shape, 4.5m × 3.5m',
  ];

  return (
    <div className="ai-prompt-wrap">
      <div className="ai-prompt">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder='Describe your dream kitchen — e.g. "4m x 3m with an island and a dishwasher"'
        />
        <button className="ai-send" onClick={handleSend} disabled={!input.trim() || busy}>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M10 2 L11.4 7.6 L17 9 L11.4 10.4 L10 16 L8.6 10.4 L3 9 L8.6 7.6 Z"/></svg>
          <span>{busy ? 'Thinking…' : 'Design'}</span>
        </button>
      </div>
      {showSuggestions && !input && (
        <div className="ai-suggestions">
          {suggestions.map((s, i) => (
            <button key={i} onMouseDown={() => setInput(s)}>{s}</button>
          ))}
        </div>
      )}
      {feedback && <div className="ai-feedback">{feedback}</div>}
    </div>
  );
}
