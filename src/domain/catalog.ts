// ============================================================================
// KitchenPlan — Standard Catalog
// Provider-agnostic standard sizes & kitchen norms.
// ============================================================================

import type { CarcassSize, CarcassDepth, CarcassHeight, FittingType, ApplianceType } from './types';

// --- Standard carcass widths (mm) -----------------------------------------
export const CARCASS_SIZES: CarcassSize[] = [200, 400, 600, 800, 1000];

// --- Standard carcass depths (mm) -----------------------------------------
export const CARCASS_DEPTHS: CarcassDepth[] = [500, 550, 600, 650];

// --- Standard carcass heights (mm) ---------------------------------------
// 720 = standard base, 850 = tall larder/oven housing, 900 = mid-height
export const CARCASS_HEIGHTS: CarcassHeight[] = [720, 850, 900];

// --- Standard worktop overhang (mm) --------------------------------------
export const WORKTOP_OVERHANG = 20;

// --- Standard worktop depth (mm) -----------------------------------------
export const WORKTOP_DEPTH = 600;

// --- Walkway clearances (mm) ---------------------------------------------
export const MIN_WALKWAY = 900;       // absolute minimum
export const COMFORTABLE_WALKWAY = 1200; // recommended
export const IDEAL_WALKWAY = 1500;

// --- Work triangle norms (mm) --------------------------------------------
export const MIN_TRIANGLE_LEG = 1200;
export const MAX_TRIANGLE_LEG = 2700;
export const MAX_TRIANGLE_SUM = 6600;  // total perimeter

// --- Fitting catalog ------------------------------------------------------
export const FITTING_CATALOG: { type: FittingType; label: string; description: string; typicalSizes: CarcassSize[] }[] = [
  { type: 'shelf',             label: 'Adjustable Shelf',     description: 'Standard adjustable shelving',           typicalSizes: [200, 400, 600, 800, 1000] },
  { type: 'pullout-shelf',     label: 'Pull-out Shelf',       description: 'Slide-out wire or solid shelving',       typicalSizes: [200, 400, 600, 800] },
  { type: 'drawer',            label: 'Drawer Bank',         description: 'Standard pot/pan drawers (2-4)',         typicalSizes: [400, 600, 800, 1000] },
  { type: 'cutlery-drawer',    label: 'Cutlery Drawer',      description: 'Top drawer with cutlery insert',          typicalSizes: [400, 600, 800] },
  { type: 'spice-rack',        label: 'Spice Rack',           description: 'Internal door-mounted or pull-out',      typicalSizes: [200, 400] },
  { type: 'corner-turning',    label: 'Corner Turning Unit',  description: 'Lazy Susan / carousel for corner',       typicalSizes: [800, 1000] },
  { type: 'corner-pullout',    label: 'Corner Pull-out',      description: 'Magic corner / full-extension pull-out', typicalSizes: [800, 1000] },
  { type: 'larder',            label: 'Larder Unit',          description: 'Tall unit with internal drawers/shelves', typicalSizes: [400, 600] },
  { type: 'tray-dividers',     label: 'Tray Dividers',        description: 'Vertical dividers for baking trays',     typicalSizes: [400, 600] },
  { type: 'plate-rack',        label: 'Plate Rack',           description: 'Vertical or horizontal plate storage',   typicalSizes: [400, 600] },
  { type: 'wine-rack',         label: 'Wine Rack',            description: 'Horizontal or vertical wine storage',    typicalSizes: [200, 400] },
  { type: 'bin-pullout',       label: 'Bin Pull-out',         description: 'Slide-out waste sorting (2-3 bins)',      typicalSizes: [200, 400] },
  { type: 'plain',             label: 'Plain Cupboard',       description: 'Hinged door with shelf, no special fit',   typicalSizes: [200, 400, 600, 800, 1000] },
];

// --- Appliance catalog ----------------------------------------------------
export const APPLIANCE_CATALOG: { type: ApplianceType; label: string; standardWidths: CarcassSize[]; integrated: boolean; description: string }[] = [
  { type: 'oven',              label: 'Built-in Oven',         standardWidths: [600],         integrated: true,  description: 'Single or double oven in tall housing' },
  { type: 'hob',               label: 'Hob',                    standardWidths: [600, 800],   integrated: true,  description: 'Gas, induction, or ceramic cooktop' },
  { type: 'fridge',            label: 'Fridge',                 standardWidths: [600],         integrated: false, description: 'Freestanding or integrated fridge' },
  { type: 'freezer',           label: 'Freezer',                standardWidths: [600],         integrated: false, description: 'Freestanding or integrated freezer' },
  { type: 'fridge-freezer',    label: 'Fridge-Freezer',         standardWidths: [600, 800],   integrated: false, description: 'Combined unit' },
  { type: 'dishwasher',        label: 'Dishwasher',             standardWidths: [600],         integrated: true,  description: 'Full-size 60cm or slimline 45cm' },
  { type: 'sink',              label: 'Sink',                   standardWidths: [600, 800],   integrated: true,  description: 'Belfast, undermount, or composite' },
  { type: 'microwave',         label: 'Built-in Microwave',     standardWidths: [600],         integrated: true,  description: 'In tall housing or wall unit' },
  { type: 'rangehood',         label: 'Rangehood / Extractor',  standardWidths: [600, 800],   integrated: true,  description: 'Integrated or canopy extractor' },
  { type: 'washing-machine',   label: 'Washing Machine',       standardWidths: [600],         integrated: false, description: 'Freestanding or integrated' },
  { type: 'tumble-dryer',      label: 'Tumble Dryer',          standardWidths: [600],         integrated: false, description: 'Freestanding or integrated' },
  { type: 'coffee-machine',    label: 'Coffee Machine',        standardWidths: [600],         integrated: true,  description: 'Built-in coffee station' },
  { type: 'wine-cooler',       label: 'Wine Cooler',           standardWidths: [400, 600],   integrated: true,  description: 'Under-counter wine storage' },
  { type: 'integrated-fridge', label: 'Integrated Fridge',     standardWidths: [600, 800],   integrated: true,  description: 'Door-on-door integrated fridge' },
];

// --- Standard kitchen layout norms ---------------------------------------
export const KITCHEN_NORMS = {
  // Sink should be near a window if possible
  sinkNearWindow: true,
  // Hob should not be directly under a window (safety)
  hobNotUnderWindow: true,
  // Oven housing should be at least 850mm tall
  ovenHousingMinHeight: 850,
  // Minimum distance between hob and sink (mm)
  minHobSinkGap: 300,
  // Minimum distance between hob and fridge (mm)
  minHobFridgeGap: 300,
  // Fridge should be at the end of a run for easy access
  fridgeAtEndOfRun: true,
  // Standard plinth/kickboard height (mm)
  plinthHeight: 150,
  // Standard wall unit height (mm) above worktop
  wallUnitAboveWorktop: 500,
  // Gap between worktop and wall units (mm)
  worktopToWallUnit: 500,
};

// --- Colour palettes -----------------------------------------------------
export const COLOUR_PALETTES = {
  modern: {
    name: 'Modern Monochrome',
    cabinets: '#2C2C2C',
    countertops: '#1A1A1A',
    walls: '#F5F5F5',
    floor: '#8C8C8C',
    backsplash: '#E0E0E0',
    handles: '#C0C0C0',
  },
  warm: {
    name: 'Warm Oak',
    cabinets: '#B8860B',
    countertops: '#8B4513',
    walls: '#FAF0E6',
    floor: '#D2B48C',
    backsplash: '#DEB887',
    handles: '#8B4513',
  },
  coastal: {
    name: 'Coastal Blue',
    cabinets: '#4682B4',
    countertops: '#F5F5DC',
    walls: '#F0F8FF',
    floor: '#DSC0909',
    backsplash: '#B0C4DE',
    handles: '#CD853F',
  },
  scandinavian: {
    name: 'Scandinavian White',
    cabinets: '#FFFFFF',
    countertops: '#E8E8E8',
    walls: '#F8F8F8',
    floor: '#D3D3D3',
    backsplash: '#F0F0F0',
    handles: '#2F4F4F',
  },
  bold: {
    name: 'Bold Emerald',
    cabinets: '#2D5016',
    countertops: '#1A1A1A',
    walls: '#F5F5F0',
    floor: '#3C3C3C',
    backsplash: '#2D5016',
    handles: '#D4AF37',
  },
  industrial: {
    name: 'Industrial Steel',
    cabinets: '#4A4A4A',
    countertops: '#2C2C2C',
    walls: '#C0C0C0',
    floor: '#696969',
    backsplash: '#808080',
    handles: '#1A1A1A',
  },
};

// --- Compass orientation for light calculation -----------------------------
export const ORIENTATION_LIGHT_FACTOR: Record<string, number> = {
  north: 0.6,   // least direct sunlight
  south: 1.0,   // most direct sunlight
  east: 0.8,    // morning sun
  west: 0.85,   // afternoon/evening sun
};

// --- Utility point catalog -----------------------------------------------
export const UTILITY_POINT_CATALOG: { type: import('./types').UtilityPointType; label: string; icon: string; description: string; color: string }[] = [
  { type: 'water-supply',   label: 'Water Supply',    icon: '💧', description: 'Cold/hot water supply point',    color: '#4E7A96' },
  { type: 'waste',          label: 'Waste / Drain',   icon: '🕳️', description: 'Waste water drainage',            color: '#5B6B7A' },
  { type: 'gas',            label: 'Gas Point',       icon: '🔥', description: 'Gas supply for hob/cooker',       color: '#C08A3E' },
  { type: 'electric',       label: 'Electrical Outlet',icon: '⚡', description: 'Standard electrical socket',     color: '#C1602C' },
  { type: 'electric-heavy', label: 'Heavy Duty Power', icon: '🔌', description: 'High-amperage circuit (oven/hob)', color: '#B94A3B' },
  { type: 'data',           label: 'Data / Network',  icon: '🌐', description: 'Network/data connection',         color: '#4C7A5B' },
  { type: 'extractor-vent', label: 'Extractor Vent',  icon: '💨', description: 'Extractor fan vent to exterior',   color: '#8A7A63' },
  { type: 'radiator',       label: 'Radiator',        icon: '🌡️', description: 'Heating radiator',                color: '#9C6B5B' },
];

// --- Opening catalog (for placement UI) ----------------------------------
export const OPENING_CATALOG: { type: import('./types').OpeningType; label: string; icon: string; defaultWidth: number; defaultHeight: number }[] = [
  { type: 'window',   label: 'Window',   icon: '🪟', defaultWidth: 1200, defaultHeight: 1200 },
  { type: 'door',     label: 'Door',     icon: '🚪', defaultWidth: 900,  defaultHeight: 2100 },
  { type: 'archway',  label: 'Archway',  icon: '🚶', defaultWidth: 1000, defaultHeight: 2100 },
  { type: 'skylight', label: 'Skylight', icon: '🔆', defaultWidth: 800,  defaultHeight: 800 },
];
