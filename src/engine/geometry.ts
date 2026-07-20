// ============================================================================
// KitchenPlan — Geometry Engine
// Vector math, collision detection, wall placement, carcass fitting.
// All units: millimetres.
// ============================================================================

import type { Vec2, Rect, Wall, Carcass, LineSegment } from '../domain/types';

// --- Vector operations ----------------------------------------------------

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const len = (a: Vec2): number => Math.sqrt(a.x * a.x + a.y * a.y);
export const normalize = (a: Vec2): Vec2 => {
  const l = len(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
export const dist = (a: Vec2, b: Vec2): number => len(sub(a, b));

// --- Rectangle operations --------------------------------------------------

export const rectContains = (r: Rect, p: Vec2): boolean =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

// --- Rotation helpers ------------------------------------------------------

export const rotate = (p: Vec2, angleDeg: number, origin: Vec2 = { x: 0, y: 0 }): Vec2 => {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
};

export const rotateRect = (r: Rect, angleDeg: number, origin: Vec2 = { x: r.x, y: r.y }): Rect => {
  const corners: Vec2[] = [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ].map((c) => rotate(c, angleDeg, origin));

  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

// --- Wall operations -------------------------------------------------------

export const wallLength = (w: Wall): number => dist(w.start, w.end);

export const wallDirection = (w: Wall): Vec2 =>
  normalize(sub(w.end, w.start));

export const wallNormal = (w: Wall): Vec2 => {
  const dir = wallDirection(w);
  return { x: -dir.y, y: dir.x }; // perpendicular, pointing into room
};

export const pointOnWall = (w: Wall, offset: number): Vec2 => {
  const dir = wallDirection(w);
  return { x: w.start.x + dir.x * offset, y: w.start.y + dir.y * offset };
};

// Given a wall and an offset, get the carcass rect placed against it
export const carcassRectOnWall = (
  wall: Wall,
  offset: number,
  carcassWidth: number,
  carcassDepth: number,
): Rect => {
  const dir = wallDirection(wall);
  const normal = wallNormal(wall);
  // Top-left corner of carcass = wall point - half of depth along normal
  // Carcass sits flush against wall
  const wallPoint = pointOnWall(wall, offset);
  // The carcass extends from the wall inward by depth
  return {
    x: wallPoint.x,
    y: wallPoint.y,
    width: carcassWidth,
    height: carcassDepth,
  };
};

// --- Point-to-segment distance --------------------------------------------

export const pointToSegmentDist = (p: Vec2, s: LineSegment): number => {
  const l2 = dist(s.start, s.end) ** 2;
  if (l2 === 0) return dist(p, s.start);
  let t = dot(sub(p, s.start), sub(s.end, s.start)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = add(s.start, scale(sub(s.end, s.start), t));
  return dist(p, proj);
};

// --- Carcass as rect (in world coords) ------------------------------------

export const carcassToRect = (c: Carcass): Rect => {
  const baseRect: Rect = { x: c.position.x, y: c.position.y, width: c.size, height: c.depth };
  if (c.rotation === 0) return baseRect;
  return rotateRect(baseRect, c.rotation);
};

// --- Collision: do two carcasses overlap? ---------------------------------

export const carcassesOverlap = (a: Carcass, b: Carcass): boolean =>
  rectsOverlap(carcassToRect(a), carcassToRect(b));

// --- Snap to wall ----------------------------------------------------------
// Given a position and a list of walls, find the nearest wall and the
// snapped position + rotation for a carcass of given width.

export interface SnapResult {
  wallId: string;
  position: Vec2;
  rotation: number;
  offset: number; // distance along wall from wall start
}

export const snapToWall = (
  pos: Vec2,
  walls: Wall[],
  carcassWidth: number,
  snapThreshold = 100, // mm
): SnapResult | null => {
  let best: SnapResult | null = null;
  let bestDist = snapThreshold;

  for (const wall of walls) {
    const seg: LineSegment = { start: wall.start, end: wall.end };
    const d = pointToSegmentDist(pos, seg);
    if (d < bestDist) {
      // Determine rotation based on wall direction
      const dir = wallDirection(wall);
      const angle = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
      // Normalize rotation to 0, 90, 180, 270
      const rotation = Math.round(angle / 90) * 90;

      // Calculate offset along wall
      const wallVec = sub(wall.end, wall.start);
      const wallLenSq = len(wallVec) ** 2;
      if (wallLenSq === 0) continue;
      const t = Math.max(0, Math.min(1, dot(sub(pos, wall.start), wallVec) / wallLenSq));
      const offset = t * wallLength(wall) - carcassWidth / 2;

      best = {
        wallId: wall.id,
        position: pointOnWall(wall, Math.max(0, offset)),
        rotation,
        offset: Math.max(0, offset),
      };
      bestDist = d;
    }
  }

  return best;
};

// --- Auto-fit: fill a wall run with standard carcasses -------------------
// Greedy fill: start at offset 0, place largest carcass that fits,
// prefer 600mm, then fill remaining with smaller sizes.

import { CARCASS_SIZES } from '../domain/catalog';

export interface FillResult {
  placements: { size: number; offset: number }[];
  totalUsed: number;
  gap: number;
}

export const autoFillWall = (wallLen: number, startOffset = 0): FillResult => {
  const available = wallLen - startOffset;
  if (available < 200) return { placements: [], totalUsed: 0, gap: available };

  const placements: { size: number; offset: number }[] = [];
  let remaining = available;
  let currentOffset = startOffset;

  // Prefer 600mm, then 800, 1000, 400, 200
  const preference: number[] = [600, 800, 1000, 400, 200];

  while (remaining >= 200) {
    let placed = false;
    for (const size of preference) {
      if (size <= remaining && CARCASS_SIZES.includes(size as 200 | 400 | 600 | 800 | 1000)) {
        placements.push({ size, offset: currentOffset });
        currentOffset += size;
        remaining -= size;
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }

  return {
    placements,
    totalUsed: placements.reduce((s, p) => s + p.size, 0),
    gap: remaining,
  };
};

// --- Clearance between two rects (minimum gap) ----------------------------

export const rectClearance = (a: Rect, b: Rect): number => {
  // If overlapping, return negative
  if (rectsOverlap(a, b)) {
    const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return -Math.min(overlapX, overlapY);
  }
  // Otherwise, minimum gap
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
  return Math.sqrt(dx * dx + dy * dy);
};

// --- Polygon helpers (for custom room shapes) ------------------------------

// Generate walls from a list of vertices (polygon)
export function wallsFromVertices(vertices: Vec2[]): Wall[] {
  if (vertices.length < 2) return [];
  const walls: Wall[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertices.length];
    walls.push({
      id: `wall-${i}`,
      start,
      end,
      thickness: 120,
    });
  }
  return walls;
}

// Bounding box of a set of points
export function boundingBox(points: Vec2[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; depth: number } {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, depth: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, depth: maxY - minY };
}

// Polygon area using the shoelace formula (returns absolute value in mm²)
export function polygonArea(vertices: Vec2[]): number {
  if (vertices.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

// Point-in-polygon test (ray casting)
export function pointInPolygon(point: Vec2, vertices: Vec2[]): boolean {
  if (vertices.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Snap a point to 90-degree angles relative to the previous vertex
// (helps draw orthogonal rooms)
export function snapToRightAngle(
  current: Vec2,
  previous: Vec2,
  snapThreshold = 15, // degrees of tolerance
): Vec2 {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const snappedAngle = Math.round(angle / 90) * 90;
  const diff = Math.abs(angle - snappedAngle);

  if (diff < snapThreshold) {
    // Snap to the nearest axis-aligned direction
    const rad = (snappedAngle * Math.PI) / 180;
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
      x: previous.x + Math.cos(rad) * len,
      y: previous.y + Math.sin(rad) * len,
    };
  }

  // Also try snapping to 45 degrees
  const snapped45 = Math.round(angle / 45) * 45;
  if (Math.abs(angle - snapped45) < snapThreshold / 2) {
    const rad = (snapped45 * Math.PI) / 180;
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
      x: previous.x + Math.cos(rad) * len,
      y: previous.y + Math.sin(rad) * len,
    };
  }

  return current;
}

// Distance from a point to the first vertex (for polygon closing detection)
export function distToFirstVertex(point: Vec2, firstVertex: Vec2, snapPx = 200): boolean {
  return dist(point, firstVertex) < snapPx;
}

// Insert a vertex into a wall (split the wall at a point)
export function insertVertexOnWall(
  vertices: Vec2[],
  wallIndex: number,
  point: Vec2,
): Vec2[] {
  const result = [...vertices];
  result.splice(wallIndex + 1, 0, point);
  return result;
}

// Get the wall index and offset for a point near a wall
export function findNearestWall(
  point: Vec2,
  vertices: Vec2[],
  threshold = 100,
): { wallIndex: number; distance: number; projectedPoint: Vec2 } | null {
  let best: { wallIndex: number; distance: number; projectedPoint: Vec2 } | null = null;

  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertices.length];
    const seg: LineSegment = { start, end };
    const d = pointToSegmentDist(point, seg);
    if (d < threshold && (!best || d < best.distance)) {
      // Project the point onto the segment
      const wallVec = sub(end, start);
      const wallLenSq = len(wallVec) ** 2;
      if (wallLenSq === 0) continue;
      const t = Math.max(0, Math.min(1, dot(sub(point, start), wallVec) / wallLenSq));
      const projected = add(start, scale(wallVec, t));
      best = { wallIndex: i, distance: d, projectedPoint: projected };
    }
  }

  return best;
}


// Find the nearest wall segment from a point, returning wall index and projected point
export function findNearestWallFromVertices(
  point: Vec2,
  vertices: Vec2[],
  threshold = 150,
): { wallIndex: number; distance: number; projectedPoint: Vec2; wallId: string } | null {
  if (vertices.length < 2) return null;
  let best: { wallIndex: number; distance: number; projectedPoint: Vec2; wallId: string } | null = null;

  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertices.length];
    const seg: LineSegment = { start, end };
    const d = pointToSegmentDist(point, seg);
    if (d < threshold && (!best || d < best.distance)) {
      const wallVec = sub(end, start);
      const wallLenSq = len(wallVec) ** 2;
      if (wallLenSq === 0) continue;
      const t = Math.max(0, Math.min(1, dot(sub(point, start), wallVec) / wallLenSq));
      const projected = add(start, scale(wallVec, t));
      best = { wallIndex: i, distance: d, projectedPoint: projected, wallId: `wall-${i}` };
    }
  }

  return best;
}

// Get wall length by index
export function wallLengthByIndex(vertices: Vec2[], index: number): number {
  if (vertices.length < 2 || index < 0 || index >= vertices.length) return 0;
  const start = vertices[index];
  const end = vertices[(index + 1) % vertices.length];
  return dist(start, end);
}
