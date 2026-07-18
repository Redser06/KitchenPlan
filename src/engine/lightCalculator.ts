// ============================================================================
// KitchenPlan — Light Calculator
// Estimates natural light ingress from windows, skylights, and doors.
// Uses glazing area, orientation, sill height, and room dimensions.
// ============================================================================

import type { KitchenDesign, LightAnalysis, Opening, Room } from '../domain/types';
import { ORIENTATION_LIGHT_FACTOR } from '../domain/catalog';

// --- Calculate total glazing area (m²) -----------------------------------

function calculateGlazingArea(room: Room): { windowArea: number; totalGlazing: number; bySource: { type: string; area: number; orientation: string }[] } {
  let windowArea = 0;
  let totalGlazing = 0;
  const bySource: { type: string; area: number; orientation: string }[] = [];

  for (const opening of room.openings) {
    if (opening.type === 'skylight') {
      // Skylight area = width × height (height = depth of skylight / opening)
      const w = opening.width / 1000; // m
      const h = (opening.height || 800) / 1000; // m
      const area = w * h;
      totalGlazing += area;
      bySource.push({ type: 'Skylight', area, orientation: 'ceiling' });
    } else if (opening.type === 'window') {
      const w = opening.width / 1000;
      const h = ((opening.height || 1200)) / 1000;
      const area = w * h;
      windowArea += area;
      totalGlazing += area;
      bySource.push({
        type: 'Window',
        area,
        orientation: opening.orientation || 'north',
      });
    } else if (opening.type === 'door' || opening.type === 'archway') {
      // Doors/archways contribute some light, typically glazed doors
      const w = opening.width / 1000;
      const h = (opening.height || 2100) / 1000;
      // Only glazed portion (assume 50% for doors, 100% for archways/open)
      const glazingFraction = opening.type === 'archway' ? 0.9 : 0.4;
      const area = w * h * glazingFraction;
      totalGlazing += area;
      bySource.push({
        type: opening.type === 'archway' ? 'Archway' : 'Door (glazed)',
        area,
        orientation: opening.orientation || 'north',
      });
    }
  }

  return { windowArea, totalGlazing, bySource };
}

// --- Orientation-weighted light score ------------------------------------

function weightedLightScore(sources: { type: string; area: number; orientation: string }[]): number {
  return sources.reduce((sum, s) => {
    const factor = s.orientation === 'ceiling' ? 1.2 : (ORIENTATION_LIGHT_FACTOR[s.orientation] ?? 0.7);
    return sum + s.area * factor;
  }, 0);
}

// --- Main light analysis ---------------------------------------------------

export function analyzeLight(design: KitchenDesign): LightAnalysis {
  const room = design.room;
  const { windowArea, totalGlazing, bySource } = calculateGlazingArea(room);

  // Floor area in m²
  const roomFloorArea = (room.width / 1000) * (room.depth / 1000);

  // Light ratio: weighted glazing area / floor area
  const weighted = weightedLightScore(bySource);
  const lightRatio = roomFloorArea > 0 ? weighted / roomFloorArea : 0;

  // Rating thresholds (weighted ratio)
  let rating: LightAnalysis['rating'];
  if (lightRatio < 0.08) rating = 'poor';
  else if (lightRatio < 0.15) rating = 'adequate';
  else if (lightRatio < 0.25) rating = 'good';
  else rating = 'excellent';

  // Notes
  const notes: string[] = [];

  if (bySource.length === 0) {
    notes.push('No windows or openings detected. This kitchen will rely entirely on artificial lighting.');
  } else {
    notes.push(`Total glazing area: ${totalGlazing.toFixed(2)} m²`);
    notes.push(`Floor area: ${roomFloorArea.toFixed(2)} m²`);
    notes.push(`Weighted light ratio: ${(lightRatio * 100).toFixed(1)}%`);

    const orientations = bySource.filter((s) => s.orientation !== 'ceiling').map((s) => s.orientation);
    const uniqueOrientations = [...new Set(orientations)];

    if (uniqueOrientations.length > 0) {
      notes.push(`Light sources face: ${uniqueOrientations.join(', ')}`);
    }

    const skylights = bySource.filter((s) => s.type === 'Skylight');
    if (skylights.length > 0) {
      notes.push(`${skylights.length} skylight(s) provide excellent overhead light.`);
    }

    // South-facing windows are best
    const south = bySource.filter((s) => s.orientation === 'south');
    if (south.length > 0) {
      notes.push('South-facing openings provide the most consistent natural light throughout the day.');
    }

    // North-facing only
    const north = bySource.filter((s) => s.orientation === 'north');
    if (north.length > 0 && uniqueOrientations.every((o) => o === 'north')) {
      notes.push('All openings face north — consider supplementary artificial lighting or a skylight.');
    }
  }

  // Work area light check
  const sinkCarcass = design.carcasses.find((c) => c.appliance?.type === 'sink');
  if (sinkCarcass) {
    // Check if there's a window near the sink
    const sinkWallId = sinkCarcass.wallId;
    const windowNear = room.openings.some((o) => o.type === 'window' && o.wallId === sinkWallId);
    if (windowNear) {
      notes.push('✓ Sink is positioned near a window — excellent task lighting during the day.');
    } else {
      notes.push('Consider placing the sink near a window for natural task lighting.');
    }
  }

  return {
    totalWindowArea: windowArea,
    totalGlazingArea: totalGlazing,
    roomFloorArea,
    lightRatio,
    rating,
    notes,
  };
}
