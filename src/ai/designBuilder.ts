// ============================================================================
// KitchenPlan — Design Builder
// Converts a DesignIntent (from AI) into a full KitchenDesign with
// actual carcass placements, fittings, and appliances.
// ============================================================================

import type { Vec2,
  KitchenDesign, Room, Wall, Opening, Carcass, Fitting, Appliance,
  Island, Furniture, ColourScheme, CarcassSize, CarcassHeight,
  CarcassDepth, CarcassMount, FittingType, ApplianceType,
} from '../domain/types';
import type { Vec2, DesignIntent } from './types';
import { autoFillWall, wallLength } from '../engine/geometry';
import { COLOUR_PALETTES, FITTING_CATALOG, APPLIANCE_CATALOG } from '../domain/catalog';

let idCounter = 0;
const uid = (prefix: string) => `${prefix}-${++idCounter}-${Date.now()}`;

// --- Build room from intent -----------------------------------------------

function buildRoom(intent: DesignIntent): Room {
  const w = intent.roomDimensions?.width || 4000;
  const d = intent.roomDimensions?.depth || 3000;
  const h = intent.roomDimensions?.height || 2400;

  const walls: Wall[] = [
    { id: 'wall-n', start: { x: 0, y: 0 }, end: { x: w, y: 0 }, thickness: 120 },
    { id: 'wall-e', start: { x: w, y: 0 }, end: { x: w, y: d }, thickness: 120 },
    { id: 'wall-s', start: { x: w, y: d }, end: { x: 0, y: d }, thickness: 120 },
    { id: 'wall-w', start: { x: 0, y: d }, end: { x: 0, y: 0 }, thickness: 120 },
  ];

  // Generate vertices for rectangular room
  const vertices: Vec2[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: d },
    { x: 0, y: d },
  ];

  const openings: Opening[] = (intent.openings || []).map((o) => ({
    id: uid('opening'),
    type: o.type as Opening['type'],
    wallId: o.wall,
    offset: o.offset,
    width: o.width,
    height: o.height,
    orientation: o.orientation as Opening['orientation'],
  }));

  return {
    id: uid('room'),
    name: 'Kitchen',
    width: w,
    depth: d,
    height: h,
    walls,
    openings,
    origin: { x: 0, y: 0 },
    vertices,
  };
}

// --- Build carcasses from intent ------------------------------------------

function buildCarcasses(intent: DesignIntent, room: Room): Carcass[] {
  const carcasses: Carcass[] = [];

  // If intent specifies explicit carcasses, place them
  if (intent.carcasses && intent.carcasses.length > 0) {
    let xOffset = 0;
    let wallIndex = 0;
    let yOffset = 0;

    for (const c of intent.carcasses) {
      const wall = room.walls[wallIndex % room.walls.length];
      const wLen = wallLength(wall);
      let mount: CarcassMount = (c.mount as CarcassMount) || 'floor';
      let height: CarcassHeight = mount === 'tall' ? 850 : 720;
      let depth: CarcassDepth = 600;

      // Position based on wall
      let position = { x: 0, y: 0 };
      let rotation = 0;

      if (wallIndex === 0) {
        // North wall — top of room, carcasses below
        position = { x: xOffset, y: 0 };
        rotation = 90;
      } else if (wallIndex === 1) {
        // East wall — right side
        position = { x: room.width - depth, y: yOffset };
        rotation = 180;
      } else if (wallIndex === 2) {
        // South wall — bottom
        position = { x: xOffset, y: room.depth - depth };
        rotation = 270;
      } else {
        // West wall
        position = { x: 0, y: yOffset };
        rotation = 0;
      }

      // Determine fitting
      const fittings: Fitting[] = [];
      if (c.fitting && c.fitting !== 'plain') {
        const fittingType = c.fitting as FittingType;
        const catalogEntry = FITTING_CATALOG.find((f) => f.type === fittingType);
        fittings.push({
          id: uid('fitting'),
          type: fittingType,
          label: catalogEntry?.label || c.fitting,
          quantity: fittingType === 'drawer' ? 3 : fittingType === 'shelf' ? 2 : 1,
        });
      } else {
        fittings.push({ id: uid('fitting'), type: 'plain', label: 'Plain Cupboard', quantity: 1 });
      }

      // Determine appliance
      let appliance: Appliance | undefined;
      if (c.appliance) {
        const apType = c.appliance as ApplianceType;
        const catalogEntry = APPLIANCE_CATALOG.find((a) => a.type === apType);
        appliance = {
          id: uid('appliance'),
          type: apType,
          label: catalogEntry?.label || c.appliance,
          width: c.size as CarcassSize,
          integrated: catalogEntry?.integrated ?? true,
        };
      }

      const carcass: Carcass = {
        id: uid('carcass'),
        size: c.size as CarcassSize,
        depth,
        height,
        mount,
        position,
        rotation,
        wallId: wall.id,
        fittings,
        appliance,
        label: c.label,
      };

      carcasses.push(carcass);

      // Advance position
      xOffset += c.size;
      yOffset += c.size;
      if (xOffset > wLen - 200) {
        xOffset = 0;
        wallIndex++;
      }
    }
  }

  // If layout style specified, auto-fill walls
  if (intent.layoutStyle && carcasses.length === 0) {
    const style = intent.layoutStyle;

    if (style === 'galley') {
      // Fill north and south walls
      fillWall(carcasses, room.walls[0], room);
      fillWall(carcasses, room.walls[2], room);
    } else if (style === 'l-shape') {
      fillWall(carcasses, room.walls[0], room);
      fillWall(carcasses, room.walls[3], room);
    } else if (style === 'u-shape') {
      fillWall(carcasses, room.walls[0], room);
      fillWall(carcasses, room.walls[1], room);
      fillWall(carcasses, room.walls[3], room);
    } else if (style === 'g-shape') {
      fillWall(carcasses, room.walls[0], room);
      fillWall(carcasses, room.walls[1], room);
      fillWall(carcasses, room.walls[2], room);
      fillWall(carcasses, room.walls[3], room);
    } else if (style === 'island') {
      fillWall(carcasses, room.walls[0], room);
      fillWall(carcasses, room.walls[1], room);
      fillWall(carcasses, room.walls[3], room);
    }
  }

  return carcasses;
}

function fillWall(carcasses: Carcass[], wall: Wall, room: Room) {
  const wLen = wallLength(wall);
  const fill = autoFillWall(wLen, 0);
  let offset = 0;

  for (const p of fill.placements) {
    let position = { x: 0, y: 0 };
    let rotation = 0;

    if (wall.id === 'wall-n') {
      position = { x: offset, y: 0 };
      rotation = 90;
    } else if (wall.id === 'wall-e') {
      position = { x: room.width - 600, y: offset };
      rotation = 180;
    } else if (wall.id === 'wall-s') {
      position = { x: offset, y: room.depth - 600 };
      rotation = 270;
    } else if (wall.id === 'wall-w') {
      position = { x: 0, y: offset };
      rotation = 0;
    }

    carcasses.push({
      id: uid('carcass'),
      size: p.size as CarcassSize,
      depth: 600,
      height: 720,
      mount: 'floor',
      position,
      rotation,
      wallId: wall.id,
      fittings: [{ id: uid('fitting'), type: 'plain', label: 'Plain Cupboard', quantity: 1 }],
      label: `${p.size}mm Unit`,
    });

    offset += p.size;
  }
}

// --- Build islands --------------------------------------------------------

function buildIslands(intent: DesignIntent): Island[] {
  if (!intent.islands) return [];

  return intent.islands.map((i) => ({
    id: uid('island'),
    carcassIds: [], // linked later
    position: i.position,
    rotation: 0,
    width: i.width,
    depth: i.depth,
    overhang: 200,
  }));
}

// --- Build furniture ------------------------------------------------------

function buildFurniture(intent: DesignIntent): Furniture[] {
  if (!intent.furniture) return [];

  return intent.furniture.map((f) => ({
    id: uid('furniture'),
    type: f.type as Furniture['type'],
    label: f.type === 'dining-table' ? 'Dining Table' : f.type,
    position: f.position,
    width: f.width,
    depth: f.depth,
    rotation: 0,
    seats: f.seats,
  }));
}

// --- Build colour scheme --------------------------------------------------

function buildColours(intent: DesignIntent): ColourScheme {
  if (intent.colours) return intent.colours as ColourScheme;
  return { ...COLOUR_PALETTES.scandinavian };
}

// --- Main builder ----------------------------------------------------------

export function buildDesignFromIntent(intent: DesignIntent, name = 'Untitled Kitchen'): KitchenDesign {
  const room = buildRoom(intent);
  const carcasses = buildCarcasses(intent, room);
  const islands = buildIslands(intent);
  const furniture = buildFurniture(intent);
  const colours = buildColours(intent);

  return {
    id: uid('design'),
    name,
    room,
    carcasses,
    islands,
    furniture,
    colours,
    utilityPoints: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// --- Create empty design --------------------------------------------------

export function createEmptyDesign(): KitchenDesign {
  return {
    id: uid('design'),
    name: 'New Kitchen',
    room: {
      id: uid('room'),
      name: 'Kitchen',
      width: 4000,
      depth: 3000,
      height: 2400,
      walls: [
        { id: 'wall-n', start: { x: 0, y: 0 }, end: { x: 4000, y: 0 }, thickness: 120 },
        { id: 'wall-e', start: { x: 4000, y: 0 }, end: { x: 4000, y: 3000 }, thickness: 120 },
        { id: 'wall-s', start: { x: 4000, y: 3000 }, end: { x: 0, y: 3000 }, thickness: 120 },
        { id: 'wall-w', start: { x: 0, y: 3000 }, end: { x: 0, y: 0 }, thickness: 120 },
      ],
      openings: [],
      vertices: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }],
      origin: { x: 0, y: 0 },
    },
    carcasses: [],
    islands: [],
    furniture: [],
    colours: { ...COLOUR_PALETTES.scandinavian },
    utilityPoints: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
