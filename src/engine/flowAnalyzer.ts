// ============================================================================
// KitchenPlan — Flow Analyzer
// Walkway clearance, work triangle, island fit, ergonomic checks.
// ============================================================================

import type { KitchenDesign, FlowAnalysis, AnalysisIssue, Vec2, Carcass } from '../domain/types';
import { carcassToRect, rectClearance, dist } from './geometry';
import {
  MIN_WALKWAY, COMFORTABLE_WALKWAY, MAX_TRIANGLE_LEG,
  MAX_TRIANGLE_SUM, MIN_TRIANGLE_LEG, KITCHEN_NORMS
} from '../domain/catalog';

let issueIdCounter = 0;
const nextIssueId = () => `issue-${++issueIdCounter}`;

// --- Find appliance positions from carcasses ------------------------------

interface AppliancePos {
  type: string;
  position: Vec2;
  carcassId: string;
}

const findAppliances = (carcasses: Carcass[]): AppliancePos[] => {
  return carcasses
    .filter((c) => c.appliance)
    .map((c) => ({
      type: c.appliance!.type,
      position: { x: c.position.x + c.size / 2, y: c.position.y + c.depth / 2 },
      carcassId: c.id,
    }));
};

// --- Work triangle analysis -----------------------------------------------

function analyzeWorkTriangle(design: KitchenDesign): FlowAnalysis['workTriangle'] {
  const appliances = findAppliances(design.carcasses);
  const sink = appliances.find((a) => a.type === 'sink');
  const fridge = appliances.find((a) => a.type === 'fridge' || a.type === 'fridge-freezer' || a.type === 'integrated-fridge');
  const hob = appliances.find((a) => a.type === 'hob');

  if (!sink || !fridge || !hob) return null;

  const leg1 = dist(sink.position, fridge.position);
  const leg2 = dist(fridge.position, hob.position);
  const leg3 = dist(hob.position, sink.position);
  const perimeter = leg1 + leg2 + leg3;

  const legsOk = [leg1, leg2, leg3].every((l) => l >= MIN_TRIANGLE_LEG && l <= MAX_TRIANGLE_LEG);
  const sumOk = perimeter <= MAX_TRIANGLE_SUM;
  const status = legsOk && sumOk ? 'ok' : 'warning';

  return {
    sink: sink.position,
    fridge: fridge.position,
    hob: hob.position,
    perimeter,
    status,
  };
}

// --- Walkway clearance analysis -------------------------------------------

function analyzeWalkways(design: KitchenDesign, workTriangle: FlowAnalysis['workTriangle']): { walkwayClearances: FlowAnalysis['walkwayClearances']; issues: AnalysisIssue[] } {
  const walkwayClearances: NonNullable<FlowAnalysis['walkwayClearances']> = [];
  const issues: AnalysisIssue[] = [];

  // Check clearance between island and perimeter carcasses
  if (design.islands.length > 0) {
    const island = design.islands[0];
    const islandRects = island.carcassIds
      .map((id) => design.carcasses.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => carcassToRect(c!));

    for (const carcass of design.carcasses) {
      if (island.carcassIds.includes(carcass.id)) continue;
      const cRect = carcassToRect(carcass);
      for (const iRect of islandRects) {
        const clearance = rectClearance(iRect, cRect);
        const label = `Island ↔ ${carcass.label || carcass.id}`;
        walkwayClearances.push({
          from: 'Island',
          to: carcass.label || carcass.id,
          clearance,
          status: clearance >= COMFORTABLE_WALKWAY ? 'ok' : clearance >= MIN_WALKWAY ? 'warning' : 'error',
        });
        if (clearance < MIN_WALKWAY) {
          issues.push({
            id: nextIssueId(),
            severity: 'error',
            category: 'flow',
            message: `${label}: only ${Math.round(clearance)}mm clearance`,
            detail: `Minimum walkway is ${MIN_WALKWAY}mm. Recommended ${COMFORTABLE_WALKWAY}mm.`,
            fix: 'Reduce island size or move it away from this run.',
          });
        } else if (clearance < COMFORTABLE_WALKWAY) {
          issues.push({
            id: nextIssueId(),
            severity: 'warning',
            category: 'flow',
            message: `${label}: ${Math.round(clearance)}mm clearance (tight)`,
            detail: `Comfortable walkway is ${COMFORTABLE_WALKWAY}mm.`,
            fix: 'Consider widening this gap if possible.',
          });
        }
      }
    }
  }

  // Work triangle leg checks
  if (workTriangle) {
    const { sink, fridge, hob, perimeter } = workTriangle;
    const legs = [
      { name: 'Sink→Fridge', d: dist(sink, fridge) },
      { name: 'Fridge→Hob', d: dist(fridge, hob) },
      { name: 'Hob→Sink', d: dist(hob, sink) },
    ];
    for (const leg of legs) {
      if (leg.d < MIN_TRIANGLE_LEG) {
        issues.push({
          id: nextIssueId(),
          severity: 'warning',
          category: 'ergonomics',
          message: `${leg.name} distance is ${Math.round(leg.d)}mm — too short`,
          detail: `Minimum recommended leg is ${MIN_TRIANGLE_LEG}mm.`,
          fix: 'Spread these appliances further apart.',
        });
      } else if (leg.d > MAX_TRIANGLE_LEG) {
        issues.push({
          id: nextIssueId(),
          severity: 'warning',
          category: 'ergonomics',
          message: `${leg.name} distance is ${Math.round(leg.d)}mm — too long`,
          detail: `Maximum recommended leg is ${MAX_TRIANGLE_LEG}mm.`,
          fix: 'Bring these appliances closer together.',
        });
      }
    }
    if (perimeter > MAX_TRIANGLE_SUM) {
      issues.push({
        id: nextIssueId(),
        severity: 'warning',
        category: 'ergonomics',
        message: `Work triangle total perimeter is ${Math.round(perimeter)}mm — too large`,
        detail: `Maximum total perimeter is ${MAX_TRIANGLE_SUM}mm.`,
        fix: 'Compact the kitchen layout to reduce travel distance.',
      });
    }
  }

  return { walkwayClearances, issues };
}

// --- Island fit analysis --------------------------------------------------

function analyzeIslandFit(design: KitchenDesign): FlowAnalysis['islandFit'] {
  if (design.islands.length === 0) return null;

  const island = design.islands[0];
  const room = design.room;

  // Check space around island
  const islandWidth = island.width;
  const islandDepth = island.depth;

  // Minimum clearance on all sides
  const spaceTop = island.position.y;
  const spaceBottom = room.depth - (island.position.y + islandDepth);
  const spaceLeft = island.position.x;
  const spaceRight = room.width - (island.position.x + islandWidth);

  const minClearance = Math.min(spaceTop, spaceBottom, spaceLeft, spaceRight);

  if (minClearance < MIN_WALKWAY) {
    return {
      fits: false,
      clearance: minClearance,
      message: `Island does not fit — only ${Math.round(minClearance)}mm clearance on the tightest side (minimum ${MIN_WALKWAY}mm).`,
    };
  }

  if (minClearance < COMFORTABLE_WALKWAY) {
    return {
      fits: true,
      clearance: minClearance,
      message: `Island fits but is tight — ${Math.round(minClearance)}mm clearance. Recommended ${COMFORTABLE_WALKWAY}mm+.`,
    };
  }

  return {
    fits: true,
    clearance: minClearance,
    message: `Island fits well — ${Math.round(minClearance)}mm clearance on all sides.`,
  };
}

// --- Hob near window safety check -----------------------------------------

function checkHobNearWindow(design: KitchenDesign): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const hobCarcass = design.carcasses.find((c) => c.appliance?.type === 'hob');
  if (!hobCarcass) return issues;

  for (const opening of design.room.openings) {
    if (opening.type !== 'window') continue;
    const wall = design.room.walls.find((w) => w.id === opening.wallId);
    if (!wall) continue;

    // If the hob carcass is on the same wall as a window and overlaps
    if (hobCarcass.wallId === opening.wallId) {
      const hobOffset = Math.min(hobCarcass.position.x, hobCarcass.position.y) - 
        Math.min(wall.start.x, wall.start.y);
      // Simplified check: if hob is within window range
      if (hobOffset >= opening.offset && hobOffset <= opening.offset + opening.width) {
        issues.push({
          id: nextIssueId(),
          severity: 'warning',
          category: 'safety',
          message: 'Hob is directly under a window',
          detail: 'This can be a safety hazard and may restrict extractor/rangehood placement.',
          fix: 'Move the hob away from the window or use a fixed panel behind the hob.',
        });
      }
    }
  }

  return issues;
}

// --- Main analyze function ------------------------------------------------

export function analyzeFlow(design: KitchenDesign): FlowAnalysis {
  const workTriangle = analyzeWorkTriangle(design);
  const { walkwayClearances, issues } = analyzeWalkways(design, workTriangle);
  const islandFit = analyzeIslandFit(design);

  // Combine all issues
  const allIssues = [...issues];

  // Hob near window safety
  allIssues.push(...checkHobNearWindow(design));

  // Missing key appliances
  const appliances = findAppliances(design.carcasses);
  if (!appliances.find((a) => a.type === 'sink')) {
    allIssues.push({
      id: nextIssueId(),
      severity: 'error',
      category: 'fit',
      message: 'No sink allocated',
      fix: 'Add a sink to a 600 or 800mm carcass.',
    });
  }
  if (!appliances.find((a) => a.type === 'hob')) {
    allIssues.push({
      id: nextIssueId(),
      severity: 'warning',
      category: 'fit',
      message: 'No hob allocated',
      fix: 'Add a hob to a 600 or 800mm carcass.',
    });
  }
  if (!appliances.find((a) => a.type === 'fridge' || a.type === 'fridge-freezer' || a.type === 'integrated-fridge')) {
    allIssues.push({
      id: nextIssueId(),
      severity: 'warning',
      category: 'fit',
      message: 'No fridge allocated',
      fix: 'Add a fridge or fridge-freezer.',
    });
  }

  // Island fit issue
  if (islandFit && !islandFit.fits) {
    allIssues.push({
      id: nextIssueId(),
      severity: 'error',
      category: 'flow',
      message: islandFit.message,
      fix: 'Remove the island or reduce its size.',
    });
  }

  return { walkwayClearances, workTriangle, islandFit, issues: allIssues };
}
