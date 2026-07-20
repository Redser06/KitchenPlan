// ============================================================================
// KitchenPlan — Zustand Store
// Central state: design, analysis, AI, undo/redo, persistence.
// ============================================================================

import create from 'zustand';
import type { KitchenDesign, Carcass, Furniture, Island, ColourScheme, DesignAnalysis, Vec2, Room, Wall, Opening, UtilityPoint, UtilityPointType, OpeningType } from '../domain/types';
import { createEmptyDesign, buildDesignFromIntent } from '../ai/designBuilder';
import type { DesignIntent } from '../ai/types';
import { wallsFromVertices, boundingBox } from '../engine/geometry';
import { analyzeFlow } from '../engine/flowAnalyzer';
import { analyzeLight } from '../engine/lightCalculator';

interface KitchenState {
  design: KitchenDesign;
  analysis: DesignAnalysis | null;
  selectedId: string | null;
  tool: 'select' | 'place-carcass' | 'place-furniture' | 'place-opening' | 'place-utility' | 'pan' | 'draw-room';
  selectedCarcassSize: 200 | 400 | 600 | 800 | 1000;
  drawingVertices: Vec2[];
  isDrawingRoom: boolean;
  isFreehandDrawing: boolean;
  cursorWorldPos: Vec2 | null;
  selectedOpeningType: OpeningType | null;
  selectedUtilityType: UtilityPointType | null;
  pendingAIPreview: { intent: any; explanation: string; roomPreview: { width: number; depth: number; vertices: Vec2[] } } | null;
  editingWallId: string | null;
  history: KitchenDesign[];
  historyIndex: number;

  // Actions
  setDesign: (d: KitchenDesign) => void;
  generateFromIntent: (intent: DesignIntent, name?: string) => void;
  updateRoom: (width: number, depth: number, height: number) => void;
  addCarcass: (c: Carcass) => void;
  updateCarcass: (id: string, updates: Partial<Carcass>) => void;
  removeCarcass: (id: string) => void;
  addFurniture: (f: Furniture) => void;
  updateFurniture: (id: string, updates: Partial<Furniture>) => void;
  removeFurniture: (id: string) => void;
  addIsland: (i: Island) => void;
  updateIsland: (id: string, updates: Partial<Island>) => void;
  removeIsland: (id: string) => void;
  updateColours: (c: Partial<ColourScheme>) => void;
  setSelected: (id: string | null) => void;
  setTool: (t: KitchenState['tool']) => void;
  startDrawingRoom: () => void;
  addDrawingVertex: (v: Vec2) => void;
  updateDrawingCursor: (v: Vec2 | null) => void;
  cancelDrawing: () => void;
  finishDrawingRoom: () => void;
  setRoomVertices: (vertices: Vec2[]) => void;
  addVertexToRoom: (wallIndex: number, point: Vec2) => void;
  updateRoomVertex: (index: number, position: Vec2) => void;
  addOpening: (opening: Opening) => void;
  removeOpening: (id: string) => void;
  addUtilityPoint: (point: UtilityPoint) => void;
  removeUtilityPoint: (id: string) => void;
  setSelectedOpeningType: (t: OpeningType | null) => void;
  setSelectedUtilityType: (t: UtilityPointType | null) => void;
  setPendingAIPreview: (preview: KitchenState['pendingAIPreview']) => void;
  confirmAIPreview: () => void;
  cancelAIPreview: () => void;
  startFreehandDraw: () => void;
  addFreehandPoint: (p: Vec2) => void;
  finishFreehandDraw: () => void;
  setEditingWallId: (id: string | null) => void;
  updateWallLength: (wallId: string, newLength: number) => void;
  setSelectedCarcassSize: (s: KitchenState['selectedCarcassSize']) => void;
  runAnalysis: () => void;
  undo: () => void;
  redo: () => void;
  persist: () => void;
  load: () => void;
}

function runFullAnalysis(design: KitchenDesign): DesignAnalysis {
  const flow = analyzeFlow(design);
  const light = analyzeLight(design);
  const issues = [...flow.issues];

  // Light-based issues
  if (light.rating === 'poor') {
    issues.push({
      id: 'light-poor',
      severity: 'warning',
      category: 'light',
      message: 'Poor natural light in this kitchen',
      detail: light.notes.join(' '),
      fix: 'Add skylights, enlarge windows, or add glazed doors.',
    });
  }

  return { flow, light, issues };
}

export const useStore = create<KitchenState>((set, get) => ({
  design: createEmptyDesign(),
  analysis: null,
  selectedId: null,
  tool: 'select',
  selectedCarcassSize: 600,
  drawingVertices: [],
  isDrawingRoom: false,
  isFreehandDrawing: false,
  cursorWorldPos: null,
  selectedOpeningType: null,
  selectedUtilityType: null,
  pendingAIPreview: null,
  editingWallId: null,
  history: [createEmptyDesign()],
  historyIndex: 0,

  setDesign: (d) => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(d);
      return {
        design: d,
        analysis: runFullAnalysis(d),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
    get().persist();
  },

  generateFromIntent: (intent, name) => {
    const design = buildDesignFromIntent(intent, name || 'AI Generated Kitchen');
    get().setDesign(design);
  },

  updateRoom: (width, depth, height) => {
    set((state) => {
      const newDesign: KitchenDesign = {
        ...state.design,
        room: {
          ...state.design.room,
          width,
          depth,
          height,
          walls: [
            { id: 'wall-0', start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness: 120 },
            { id: 'wall-1', start: { x: width, y: 0 }, end: { x: width, y: depth }, thickness: 120 },
            { id: 'wall-2', start: { x: width, y: depth }, end: { x: 0, y: depth }, thickness: 120 },
            { id: 'wall-3', start: { x: 0, y: depth }, end: { x: 0, y: 0 }, thickness: 120 },
          ],
          vertices: [
            { x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: depth }, { x: 0, y: depth },
          ],
        },
        updatedAt: Date.now(),
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return {
        design: newDesign,
        analysis: runFullAnalysis(newDesign),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
    get().persist();
  },

  addCarcass: (c) => {
    set((state) => {
      const newDesign = {
        ...state.design,
        carcasses: [...state.design.carcasses, c],
        updatedAt: Date.now(),
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return {
        design: newDesign,
        analysis: runFullAnalysis(newDesign),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
    get().persist();
  },

  updateCarcass: (id, updates) => {
    set((state) => {
      const newDesign = {
        ...state.design,
        carcasses: state.design.carcasses.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        updatedAt: Date.now(),
      };
      return {
        design: newDesign,
        analysis: runFullAnalysis(newDesign),
      };
    });
    get().persist();
  },

  removeCarcass: (id) => {
    set((state) => {
      const newDesign = {
        ...state.design,
        carcasses: state.design.carcasses.filter((c) => c.id !== id),
        updatedAt: Date.now(),
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return {
        design: newDesign,
        selectedId: state.selectedId === id ? null : state.selectedId,
        analysis: runFullAnalysis(newDesign),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
    get().persist();
  },

  addFurniture: (f) => {
    set((state) => {
      const newDesign = { ...state.design, furniture: [...state.design.furniture, f], updatedAt: Date.now() };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return {
        design: newDesign,
        analysis: runFullAnalysis(newDesign),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
    get().persist();
  },

  updateFurniture: (id, updates) => {
    set((state) => ({
      design: {
        ...state.design,
        furniture: state.design.furniture.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        updatedAt: Date.now(),
      },
    }));
    get().persist();
  },

  removeFurniture: (id) => {
    set((state) => {
      const newDesign = {
        ...state.design,
        furniture: state.design.furniture.filter((f) => f.id !== id),
        updatedAt: Date.now(),
      };
      return {
        design: newDesign,
        selectedId: state.selectedId === id ? null : state.selectedId,
        analysis: runFullAnalysis(newDesign),
      };
    });
    get().persist();
  },

  addIsland: (i) => {
    set((state) => {
      const newDesign = { ...state.design, islands: [...state.design.islands, i], updatedAt: Date.now() };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return {
        design: newDesign,
        analysis: runFullAnalysis(newDesign),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
    get().persist();
  },

  updateIsland: (id, updates) => {
    set((state) => ({
      design: {
        ...state.design,
        islands: state.design.islands.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        updatedAt: Date.now(),
      },
    }));
    get().persist();
  },

  removeIsland: (id) => {
    set((state) => {
      const newDesign = {
        ...state.design,
        islands: state.design.islands.filter((i) => i.id !== id),
        updatedAt: Date.now(),
      };
      return {
        design: newDesign,
        selectedId: state.selectedId === id ? null : state.selectedId,
        analysis: runFullAnalysis(newDesign),
      };
    });
    get().persist();
  },

  updateColours: (c) => {
    set((state) => {
      const newDesign = {
        ...state.design,
        colours: { ...state.design.colours, ...c },
        updatedAt: Date.now(),
      };
      return { design: newDesign, analysis: runFullAnalysis(newDesign) };
    });
    get().persist();
  },

  setSelected: (id) => set({ selectedId: id }),
  setTool: (t) => set({ tool: t }),

  startDrawingRoom: () => set({ isDrawingRoom: true, drawingVertices: [], tool: 'draw-room' }),

  addDrawingVertex: (v) => set((state) => ({ drawingVertices: [...state.drawingVertices, v] })),

  updateDrawingCursor: (v) => set({ cursorWorldPos: v }),

  cancelDrawing: () => set({ isDrawingRoom: false, drawingVertices: [], tool: 'select' }),

  finishDrawingRoom: () => {
    set((state) => {
      if (state.drawingVertices.length < 3) return { isDrawingRoom: false, drawingVertices: [], tool: 'select' };
      const vertices = [...state.drawingVertices];
      const walls = wallsFromVertices(vertices);
      const bb = boundingBox(vertices);
      const newDesign: KitchenDesign = {
        ...state.design,
        room: {
          ...state.design.room,
          width: bb.width,
          depth: bb.depth,
          walls,
          vertices,
          origin: { x: bb.minX, y: bb.minY },
        },
        updatedAt: Date.now(),
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return {
        design: newDesign,
        analysis: runFullAnalysis(newDesign),
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDrawingRoom: false,
        drawingVertices: [],
        tool: 'select',
      };
    });
    get().persist();
  },

  setRoomVertices: (vertices) => {
    set((state) => {
      const walls = wallsFromVertices(vertices);
      const bb = boundingBox(vertices);
      const newDesign: KitchenDesign = {
        ...state.design,
        room: { ...state.design.room, width: bb.width, depth: bb.depth, walls, vertices, origin: { x: bb.minX, y: bb.minY } },
        updatedAt: Date.now(),
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return { design: newDesign, analysis: runFullAnalysis(newDesign), history: newHistory, historyIndex: newHistory.length - 1 };
    });
    get().persist();
  },

  addVertexToRoom: (wallIndex, point) => {
    set((state) => {
      const vertices = [...state.design.room.vertices];
      vertices.splice(wallIndex + 1, 0, point);
      const walls = wallsFromVertices(vertices);
      const bb = boundingBox(vertices);
      const newDesign: KitchenDesign = {
        ...state.design,
        room: { ...state.design.room, width: bb.width, depth: bb.depth, walls, vertices, origin: { x: bb.minX, y: bb.minY } },
        updatedAt: Date.now(),
      };
      return { design: newDesign, analysis: runFullAnalysis(newDesign) };
    });
    get().persist();
  },

  updateRoomVertex: (index, position) => {
    set((state) => {
      const vertices = [...state.design.room.vertices];
      if (index < 0 || index >= vertices.length) return {};
      // Snap to grid
      const snapped = { x: Math.round(position.x / 50) * 50, y: Math.round(position.y / 50) * 50 };
      vertices[index] = snapped;
      const walls = wallsFromVertices(vertices);
      const bb = boundingBox(vertices);
      const newDesign: KitchenDesign = {
        ...state.design,
        room: { ...state.design.room, width: bb.width, depth: bb.depth, walls, vertices, origin: { x: bb.minX, y: bb.minY } },
        updatedAt: Date.now(),
      };
      return { design: newDesign, analysis: runFullAnalysis(newDesign) };
    });
  },

  addOpening: (opening) => {
    set((state) => {
      const newDesign = { ...state.design, room: { ...state.design.room, openings: [...state.design.room.openings, opening] }, updatedAt: Date.now() };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return { design: newDesign, analysis: runFullAnalysis(newDesign), history: newHistory, historyIndex: newHistory.length - 1, selectedOpeningType: null };
    });
    get().persist();
  },

  removeOpening: (id) => {
    set((state) => {
      const newDesign = { ...state.design, room: { ...state.design.room, openings: state.design.room.openings.filter((o) => o.id !== id) }, updatedAt: Date.now() };
      return { design: newDesign, analysis: runFullAnalysis(newDesign) };
    });
    get().persist();
  },

  addUtilityPoint: (point) => {
    set((state) => {
      const newDesign = { ...state.design, utilityPoints: [...(state.design.utilityPoints || []), point], updatedAt: Date.now() };
      return { design: newDesign, analysis: runFullAnalysis(newDesign), selectedUtilityType: null };
    });
    get().persist();
  },

  removeUtilityPoint: (id) => {
    set((state) => {
      const newDesign = { ...state.design, utilityPoints: (state.design.utilityPoints || []).filter((p) => p.id !== id), updatedAt: Date.now() };
      return { design: newDesign, analysis: runFullAnalysis(newDesign) };
    });
    get().persist();
  },

  setSelectedOpeningType: (t) => set({ selectedOpeningType: t, tool: t ? 'place-opening' : 'select' }),
  setSelectedUtilityType: (t) => set({ selectedUtilityType: t, tool: t ? 'place-utility' : 'select' }),

  setPendingAIPreview: (preview) => set({ pendingAIPreview: preview }),

  confirmAIPreview: () => {
    set((state) => {
      if (!state.pendingAIPreview) return {};
      const { intent, roomPreview } = state.pendingAIPreview;
      // Build design from the confirmed intent
      // For now, just set the room vertices
      const walls = wallsFromVertices(roomPreview.vertices);
      const bb = boundingBox(roomPreview.vertices);
      const newDesign: KitchenDesign = {
        ...state.design,
        room: { ...state.design.room, width: roomPreview.width, depth: roomPreview.depth, walls, vertices: roomPreview.vertices, origin: { x: bb.minX, y: bb.minY }, openings: [] },
        updatedAt: Date.now(),
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return { design: newDesign, analysis: runFullAnalysis(newDesign), history: newHistory, historyIndex: newHistory.length - 1, pendingAIPreview: null };
    });
    get().persist();
  },

  cancelAIPreview: () => set({ pendingAIPreview: null }),

  startFreehandDraw: () => set({ isFreehandDrawing: true, isDrawingRoom: true, drawingVertices: [], tool: 'draw-room' }),
  addFreehandPoint: (p) => set((state) => ({ drawingVertices: [...state.drawingVertices, p] })),
  finishFreehandDraw: () => {
    set((state) => {
      if (state.drawingVertices.length < 3) return { isFreehandDrawing: false, isDrawingRoom: false, drawingVertices: [], tool: 'select' };
      // Simplify the freehand path — keep every Nth point
      const raw = state.drawingVertices;
      const simplified: Vec2[] = [];
      const step = Math.max(1, Math.floor(raw.length / 20));
      for (let i = 0; i < raw.length; i += step) simplified.push(raw[i]);
      if (simplified[simplified.length - 1] !== raw[raw.length - 1]) simplified.push(raw[raw.length - 1]);
      // Snap to grid
      const snapped = simplified.map((v) => ({ x: Math.round(v.x / 200) * 200, y: Math.round(v.y / 200) * 200 }));
      // Remove duplicate consecutive points
      const deduped: Vec2[] = [];
      for (const v of snapped) {
        const last = deduped[deduped.length - 1]; if (Math.hypot(last.x - v.x, last.y - v.y) > 100) deduped.push(v);
      }
      if (deduped.length < 3) return { isFreehandDrawing: false, isDrawingRoom: false, drawingVertices: [], tool: 'select' };
      const walls = wallsFromVertices(deduped);
      const bb = boundingBox(deduped);
      const newDesign: KitchenDesign = {
        ...state.design,
        room: { ...state.design.room, width: bb.width, depth: bb.depth, walls, vertices: deduped, origin: { x: bb.minX, y: bb.minY } },
        updatedAt: Date.now(),
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDesign);
      return { design: newDesign, analysis: runFullAnalysis(newDesign), history: newHistory, historyIndex: newHistory.length - 1, isFreehandDrawing: false, isDrawingRoom: false, drawingVertices: [], tool: 'select' };
    });
    get().persist();
  },

  setEditingWallId: (id) => set({ editingWallId: id }),

  updateWallLength: (wallId, newLength) => {
    set((state) => {
      const vertices = [...state.design.room.vertices];
      if (vertices.length < 2) return {};
      // Find the wall index
      let wallIdx = -1;
      for (let i = 0; i < vertices.length; i++) {
        if (state.design.room.walls[i]?.id === wallId) { wallIdx = i; break; }
      }
      if (wallIdx === -1) return {};
      const start = vertices[wallIdx];
      const end = vertices[(wallIdx + 1) % vertices.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const currentLen = Math.sqrt(dx * dx + dy * dy);
      if (currentLen === 0) return {};
      const ratio = newLength / currentLen;
      const newEnd = { x: start.x + dx * ratio, y: start.y + dy * ratio };
      vertices[(wallIdx + 1) % vertices.length] = newEnd;
      const walls = wallsFromVertices(vertices);
      const bb = boundingBox(vertices);
      const newDesign: KitchenDesign = {
        ...state.design,
        room: { ...state.design.room, width: bb.width, depth: bb.depth, walls, vertices, origin: { x: bb.minX, y: bb.minY } },
        updatedAt: Date.now(),
      };
      return { design: newDesign, analysis: runFullAnalysis(newDesign), editingWallId: null };
    });
    get().persist();
  },
  setSelectedCarcassSize: (s) => set({ selectedCarcassSize: s }),

  runAnalysis: () => {
    set((state) => ({ analysis: runFullAnalysis(state.design) }));
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return { design: state.history[newIndex], historyIndex: newIndex, analysis: runFullAnalysis(state.history[newIndex]) };
      }
      return {};
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return { design: state.history[newIndex], historyIndex: newIndex, analysis: runFullAnalysis(state.history[newIndex]) };
      }
      return {};
    });
  },

  persist: () => {
    try {
      const state = get();
      localStorage.setItem('kitchenplan-design-v2', JSON.stringify(state.design));
    } catch (e) {
      // localStorage might not be available
    }
  },

  load: () => {
    try {
      const saved = localStorage.getItem('kitchenplan-design-v2');
      if (saved) {
        const design = JSON.parse(saved) as KitchenDesign;
        // Migrate old data — ensure all required fields exist
        if (!design.room.vertices || design.room.vertices.length === 0) {
          // No vertices — create from walls or dimensions
          const w = design.room.width || 4000;
          const d = design.room.depth || 3000;
          design.room.vertices = [
            { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: d }, { x: 0, y: d },
          ];
          design.room.walls = wallsFromVertices(design.room.vertices);
        }
        if (!design.utilityPoints) design.utilityPoints = [];
        if (!design.islands) design.islands = [];
        if (!design.furniture) design.furniture = [];
        if (!design.colours) design.colours = { cabinets: '#C9B79C', countertops: '#2E2620', walls: '#F8F3EA', floor: '#E4D3BA', backsplash: '#EFE2D0', handles: '#5B4A38' };
        set({ design, analysis: runFullAnalysis(design) });
      }
    } catch (e) {
      // If load fails, clear and use default
      try { localStorage.removeItem('kitchenplan-design-v2'); } catch {}
    }
  },
}));
