// ============================================================================
// KitchenPlan — Core Domain Types
// All measurements in millimetres (mm) unless otherwise stated.
// ============================================================================

// --- Geometry primitives ----------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LineSegment {
  start: Vec2;
  end: Vec2;
}

// --- Room ------------------------------------------------------------------

export type WallOrientation = 'north' | 'south' | 'east' | 'west';

export interface Wall {
  id: string;
  start: Vec2;       // mm from room origin (0,0)
  end: Vec2;
  thickness: number; // typically 100-150mm internal
}

export type OpeningType = 'window' | 'door' | 'archway' | 'skylight';

export interface Opening {
  id: string;
  type: OpeningType;
  wallId: string;       // which wall this opening sits on
  offset: number;       // distance from wall start (mm)
  width: number;        // opening width (mm)
  height?: number;       // opening height (mm) — sill/header info
  sillHeight?: number;   // for windows: height of sill above floor
  headerHeight?: number; // distance from top of opening to ceiling
  orientation?: WallOrientation; // compass direction the opening faces
}

export interface Room {
  id: string;
  name: string;
  width: number;        // internal dimension X (mm)
  depth: number;        // internal dimension Y (mm)
  height: number;       // ceiling height (mm)
  walls: Wall[];
  openings: Opening[];
  origin: Vec2;          // top-left corner (always 0,0 for now)
  vertices: Vec2[];      // polygon corners for custom room shapes
}

// --- Carcasses -------------------------------------------------------------

export type CarcassSize = 200 | 400 | 600 | 800 | 1000;

export type CarcassDepth = 500 | 550 | 600 | 650;

export type CarcassHeight = 720 | 850 | 900;

export type CarcassMount = 'floor' | 'wall' | 'tall';

export type FittingType =
  | 'shelf'
  | 'pullout-shelf'
  | 'drawer'
  | 'cutlery-drawer'
  | 'spice-rack'
  | 'corner-turning'
  | 'corner-pullout'
  | 'larder'
  | 'tray-dividers'
  | 'plate-rack'
  | 'wine-rack'
  | 'bin-pullout'
  | 'plain';

export interface Fitting {
  id: string;
  type: FittingType;
  label: string;
  quantity: number;  // e.g. number of shelves, number of drawers
  notes?: string;
}

export type ApplianceType =
  | 'oven'
  | 'hob'
  | 'fridge'
  | 'freezer'
  | 'fridge-freezer'
  | 'dishwasher'
  | 'sink'
  | 'microwave'
  | 'rangehood'
  | 'washing-machine'
  | 'tumble-dryer'
  | 'coffee-machine'
  | 'wine-cooler'
  | 'integrated-fridge';

export interface Appliance {
  id: string;
  type: ApplianceType;
  label: string;
  width: number;     // mm — must match a carcass width
  height?: number;
  depth?: number;
  integrated: boolean; // built into carcass vs freestanding
  notes?: string;
}

export interface Carcass {
  id: string;
  size: CarcassSize;      // width
  depth: CarcassDepth;
  height: CarcassHeight;
  mount: CarcassMount;
  position: Vec2;          // top-left corner on canvas (mm)
  rotation: number;        // degrees (0, 90, 180, 270)
  wallId?: string;         // which wall it's placed against
  fittings: Fitting[];
  appliance?: Appliance;   // allocated appliance if any
  label?: string;
  color?: string;          // override colour
}

// --- Islands & Furniture ---------------------------------------------------

export interface Island {
  id: string;
  carcassIds: string[];   // carcasses that make up the island
  position: Vec2;
  rotation: number;
  width: number;
  depth: number;
  overhang?: number;       // seating overhang (mm)
}

export type FurnitureType =
  | 'dining-table'
  | 'round-table'
  | 'chair'
  | 'stool'
  | 'sideboard'
  | 'freestanding-unit'
  | 'pantry'
  | 'island-cart'
  | 'custom';

export interface Furniture {
  id: string;
  type: FurnitureType;
  label: string;
  position: Vec2;
  width: number;
  depth: number;
  height?: number;
  rotation: number;
  seats?: number;
}

// --- Colour & Style --------------------------------------------------------

export interface ColourScheme {
  cabinets: string;       // hex
  countertops: string;
  walls: string;
  floor: string;
  backsplash: string;
  handles: string;
}

// --- Design Document -------------------------------------------------------

export interface KitchenDesign {
  id: string;
  name: string;
  room: Room;
  carcasses: Carcass[];
  islands: Island[];
  furniture: Furniture[];
  colours: ColourScheme;
  createdAt: number;
  updatedAt: number;
}

// --- Analysis Results ------------------------------------------------------

export type Severity = 'ok' | 'warning' | 'error';

export interface AnalysisIssue {
  id: string;
  severity: Severity;
  category: 'flow' | 'fit' | 'light' | 'safety' | 'ergonomics';
  message: string;
  detail?: string;
  fix?: string;
}

export interface LightAnalysis {
  totalWindowArea: number;     // m²
  totalGlazingArea: number;    // includes skylights
  roomFloorArea: number;       // m²
  lightRatio: number;          // glazing area / floor area
  rating: 'poor' | 'adequate' | 'good' | 'excellent';
  notes: string[];
}

export interface FlowAnalysis {
  walkwayClearances: { from: string; to: string; clearance: number; status: Severity }[];
  workTriangle: {
    sink: Vec2;
    fridge: Vec2;
    hob: Vec2;
    perimeter: number;
    status: Severity;
  } | null;
  islandFit: { fits: boolean; clearance: number; message: string } | null;
  issues: AnalysisIssue[];
}

export interface DesignAnalysis {
  flow: FlowAnalysis;
  light: LightAnalysis;
  issues: AnalysisIssue[];
}
