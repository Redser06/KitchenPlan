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

export default function App() {
  const design = useStore((s) => s.design);
  const load = useStore((s) => s.load);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const historyIndex = useStore((s) => s.historyIndex);
  const history = useStore((s) => s.history);
  const selectedId = useStore((s) => s.selectedId);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Vec2>({ x: 150, y: 65 });
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [sheetTab, setSheetTab] = useState<SheetTab>(null);

  useEffect(() => { load(); }, [load]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleNew = () => {
    const store = useStore.getState();
    if (confirm('Start a new kitchen design?')) {
      store.setDesign({
        ...store.design,
        id: `design-${Date.now()}`,
        name: 'New Kitchen',
        carcasses: [], islands: [], furniture: [],
        room: { ...store.design.room, openings: [] },
        updatedAt: Date.now(),
      });
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kitchen-design.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const showContextPanel = !!selectedId && sheetTab === null;

  return (
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
        <KitchenCanvas scale={scale} position={position} setScale={setScale} setPosition={setPosition} viewMode={viewMode} />
        {showContextPanel && <ContextPanel />}
      </div>

      {sheetTab && <BottomSheet tab={sheetTab} onClose={() => setSheetTab(null)} />}

      <BottomBar activeTab={sheetTab} onTabChange={setSheetTab} />
    </div>
  );
}

function AIPromptBar() {
  const generateFromIntent = useStore((s) => s.generateFromIntent);
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
      const match = input.match(/(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/i);
      if (match) {
        const w = Math.round(parseFloat(match[1]) * 1000);
        const d = Math.round(parseFloat(match[2]) * 1000);
        updateRoom(w, d, design.room.height);
        setFeedback(`Resized your room to ${match[1]}m × ${match[2]}m. Your cabinets stayed in place — nudge anything that now overlaps.`);
      } else {
        const result = await provider.interpretDesign(input, design);
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
