// ============================================================================
// BottomBar — 4 nav items: Components, Measure, Colours, Analysis
// ============================================================================

import React from 'react';
import type { SheetTab } from '../App';

interface Props {
  activeTab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
}

const NAV_ITEMS: { id: SheetTab; icon: string; label: string }[] = [
  { id: 'components', icon: '📦', label: 'Components' },
  { id: 'measure',    icon: '📐', label: 'Measure' },
  { id: 'colours',    icon: '🎨', label: 'Colours' },
  { id: 'analysis',   icon: '📊', label: 'Analysis' },
];

export default function BottomBar({ activeTab, onTabChange }: Props) {
  return (
    <nav className="bottom-bar">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(activeTab === item.id ? null : item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
