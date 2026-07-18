// ============================================================================
// KitchenPlan — Zustand Store
// Central state: design, analysis, AI, undo/redo, persistence.
// ============================================================================

import create from 'zustand';
import type { KitchenDesign, Carcass, Furniture, Island, ColourScheme, DesignAnalysis, Vec2, Room, Wall } from '../domain/types';
import { createEmptyDesign, buildDesignFromIntent } from '../ai/designBuilder';
import type { DesignIntent } from '../ai/types';
import { wallsFromVertices, boundingBox, polygonArea } from '../engine/geometry';
import { analyzeFlow } from '../engine/flowAnalyzer';
import { analyzeLight } from '../engine/lightCalculator';

interface KitchenState {
  design: KitchenDesign;
  analysis: DesignAnalysis | null;
  selectedId: string | null;
  tool: 'select' | 'place-carcass' | 'place-furniture' | 'place-opening' | 'pan' | 'draw-room';
  selectedCarcassSize: 200 | 400 | 600 | 800 | 1000;
  drawingVertices: Vec2[];
  isDrawingRoom: boolean;
  cursorWorldPos: Vec2 | null;
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
  cursorWorldPos: null,
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
      localStorage.setItem('kitchenplan-design', JSON.stringify(state.design));
    } catch (e) {
      // localStorage might not be available
    }
  },

  load: () => {
    try {
      const saved = localStorage.getItem('kitchenplan-design');
      if (saved) {
        const design = JSON.parse(saved) as KitchenDesign;
        set({ design, analysis: runFullAnalysis(design) });
      }
    } catch (e) {
      // Ignore load errors
    }
  },
}));
