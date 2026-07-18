// ============================================================================
// KitchenPlan — Main App (v2: canvas-first creative layout)
// ============================================================================

import React, { useState, useEffect } from 'react';
import KitchenCanvas from './components/KitchenCanvas';
import BottomBar from './components/BottomBar';
import BottomSheet from './components/BottomSheet';
import ContextPanel from './components/ContextPanel';
import { useStore } from './store/useStore';
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
  const [position, setPosition] = useState<Vec2>({ x: 80, y: 40 });
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
        carcasses: [],
        islands: [],
        furniture: [],
        room: { ...store.design.room, openings: [] },
        updatedAt: Date.now(),
      });
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${design.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Something selected on canvas → show floating context panel
  const showContextPanel = !!selectedId && sheetTab === null;

  return (
    <div className="app">
      {/* ---- Top Bar ---- */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">🍳</div>
          <span>KitchenPlan</span>
        </div>

        {/* AI Prompt — the hero */}
        <AIPromptBar />

        {/* View toggle */}
        <div className="view-toggle">
          <button
            className={viewMode === '2d' ? 'active' : ''}
            onClick={() => setViewMode('2d')}
          >2D</button>
          <button
            className={viewMode === '3d' ? 'active' : ''}
            onClick={() => setViewMode('3d')}
          >3D</button>
        </div>

        {/* Actions */}
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setScale(scale * 1.2)} title="Zoom in">＋</button>
          <button className="icon-btn" onClick={() => setScale(scale / 1.2)} title="Zoom out">－</button>
          <span style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo">↶</button>
          <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo">↷</button>
          <span style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <button className="icon-btn" onClick={handleExport} title="Export">⬇</button>
          <button className="icon-btn" onClick={handleNew} title="New">✕</button>
        </div>
      </header>

      {/* ---- Canvas (full bleed) ---- */}
      <div className="canvas-wrapper">
        <KitchenCanvas
          scale={scale}
          position={position}
          setScale={setScale}
          setPosition={setPosition}
          viewMode={viewMode}
        />

        {showContextPanel && <ContextPanel />}
      </div>

      {/* ---- Bottom Sheet (slides up when a nav item is active) ---- */}
      {sheetTab && (
        <BottomSheet tab={sheetTab} onClose={() => setSheetTab(null)} />
      )}

      {/* ---- Bottom Bar ---- */}
      <BottomBar activeTab={sheetTab} onTabChange={setSheetTab} />
    </div>
  );
}

// ---- AI Prompt Bar (inline in App for simplicity) ----
import { useStore as useAppStore } from './store/useStore';
import { MockAIProvider } from './ai/types';
import type { AIProvider } from './ai/types';

function AIPromptBar() {
  const generateFromIntent = useAppStore((s) => s.generateFromIntent);
  const design = useAppStore((s) => s.design);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [provider] = useState<AIProvider>(new MockAIProvider());

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    setIsProcessing(true);
    setFeedback(null);
    setShowSuggestions(false);
    try {
      const result = await provider.interpretDesign(input, design);
      generateFromIntent(result.intent, `AI: ${input.slice(0, 40)}`);
      setFeedback(result.explanation);
      setInput('');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const suggestions = [
    '4m × 3m L-shape with sink, hob, oven, fridge, cutlery drawers',
    'Galley kitchen 3m × 2.5m with corner carousel and larder',
    '5m × 4m kitchen with island and 6-seat dining table',
    'U-shape with dishwasher, wine rack, spice rack, bin pullout',
  ];

  return (
    <>
      <div className="ai-prompt">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Describe your dream kitchen… e.g. '4m × 3m L-shape with island, sink by the window'"
        />
        <button className="send-btn" onClick={handleSend} disabled={!input.trim() || isProcessing}>
          {isProcessing ? '⏳' : '✨ Design'}
        </button>
      </div>

      {showSuggestions && !input && (
        <div className="ai-suggestions">
          {suggestions.map((s, i) => (
            <button key={i} className="suggestion-chip" onMouseDown={() => { setInput(s); }}>
              {s.length > 45 ? s.slice(0, 45) + '…' : s}
            </button>
          ))}
        </div>
      )}

      {feedback && <div className="ai-feedback">{feedback}</div>}
    </>
  );
}
