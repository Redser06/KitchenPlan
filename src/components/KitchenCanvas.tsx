import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { snapToWall, pointOnWall, snapToRightAngle, dist, findNearestWallFromVertices, wallLengthByIndex } from '../engine/geometry';
import type { Carcass, Furniture, Vec2 } from '../domain/types';
import type { ViewMode } from '../App';

const MM_TO_PX = 0.16;

interface Props {
  scale: number;
  position: Vec2;
  setScale: (s: number) => void;
  setPosition: (p: Vec2) => void;
  viewMode: ViewMode;
}

export default function KitchenCanvas({ scale, position, setScale, setPosition, viewMode }: Props) {
  const design = useStore((s) => s.design);
  const selectedId = useStore((s) => s.selectedId);
  const tool = useStore((s) => s.tool);
  const selectedCarcassSize = useStore((s) => s.selectedCarcassSize);
  const setSelected = useStore((s) => s.setSelected);
  const setTool = useStore((s) => s.setTool);
  const addCarcass = useStore((s) => s.addCarcass);
  const updateCarcass = useStore((s) => s.updateCarcass);
  const updateFurniture = useStore((s) => s.updateFurniture);
  const updateIsland = useStore((s) => s.updateIsland);
  const analysis = useStore((s) => s.analysis);
  const colours = useStore((s) => s.design.colours);
  const isDrawingRoom = useStore((s) => s.isDrawingRoom);
  const drawingVertices = useStore((s) => s.drawingVertices);
  const cursorWorldPos = useStore((s) => s.cursorWorldPos);
  const startDrawingRoom = useStore((s) => s.startDrawingRoom);
  const addDrawingVertex = useStore((s) => s.addDrawingVertex);
  const updateDrawingCursor = useStore((s) => s.updateDrawingCursor);
  const cancelDrawing = useStore((s) => s.cancelDrawing);
  const finishDrawingRoom = useStore((s) => s.finishDrawingRoom);
  const isFreehandDrawing = useStore((s) => s.isFreehandDrawing);
  const startFreehandDraw = useStore((s) => s.startFreehandDraw);
  const addFreehandPoint = useStore((s) => s.addFreehandPoint);
  const finishFreehandDraw = useStore((s) => s.finishFreehandDraw);
  const selectedOpeningType = useStore((s) => s.selectedOpeningType);
  const selectedUtilityType = useStore((s) => s.selectedUtilityType);
  const addOpening = useStore((s) => s.addOpening);
  const removeOpening = useStore((s) => s.removeOpening);
  const addUtilityPoint = useStore((s) => s.addUtilityPoint);
  const removeUtilityPoint = useStore((s) => s.removeUtilityPoint);
  const editingWallId = useStore((s) => s.editingWallId);
  const setEditingWallId = useStore((s) => s.setEditingWallId);
  const updateWallLength = useStore((s) => s.updateWallLength);
  const utilityPoints = useStore((s) => s.design.utilityPoints || []);
  const updateRoomVertex = useStore((s) => s.updateRoomVertex);
  const addVertexToRoom = useStore((s) => s.addVertexToRoom);
  const [hoveredVertex, setHoveredVertex] = useState<number | null>(null);
  const [hoveredWall, setHoveredWall] = useState<number | null>(null);
  const [vertexDrag, setVertexDrag] = useState<{ index: number; startClientX: number; startClientY: number; startPos: Vec2; rectW: number; rectH: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [dragState, setDragState] = useState<{ id: string; type: string; startClientX: number; startClientY: number; startPos: Vec2; rectW: number; rectH: number; moved: boolean } | null>(null);
  const [panState, setPanState] = useState<{ sx: number; sy: number; startPos: Vec2 } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => { if (containerRef.current) setContainerSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight }); };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const toPx = useCallback((mm: number) => mm * MM_TO_PX, []);
  const roomWpx = toPx(design.room.width);
  const roomHpx = toPx(design.room.depth);
  const groupTransform = `translate(${position.x} ${position.y}) scale(${scale})`;
  const is3D = viewMode === '3d';

  const screenToVB = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) * (1000 / rect.width), y: (clientY - rect.top) * (700 / rect.height) };
  }, []);

  const screenToWorld = useCallback((clientX: number, clientY: number): Vec2 => {
    const vb = screenToVB(clientX, clientY);
    return { x: (vb.x - position.x) / scale / MM_TO_PX, y: (vb.y - position.y) / scale / MM_TO_PX };
  }, [screenToVB, position, scale]);

  const onCanvasBackgroundClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    if (tool === 'pan') return;
    const wp = screenToWorld(e.clientX, e.clientY);
    if (tool === 'place-carcass') {
      const size = selectedCarcassSize;
      const id = `carcass-${Date.now()}`;
      addCarcass({ id, size, depth: 600, height: 720, mount: 'floor', position: { x: Math.round(wp.x / 50) * 50, y: Math.round(wp.y / 50) * 50 }, rotation: 0, wallId: undefined, fittings: [{ id: `fitting-${Date.now()}`, type: 'plain', label: 'Plain Cupboard', quantity: 1 }], label: `${size}mm Unit` });
      setSelected(id); setTool('select');
    } else if (tool === 'place-furniture') {
      const id = `furniture-${Date.now()}`;
      useStore.getState().addFurniture({ id, type: 'dining-table', label: 'Dining Table', position: { x: Math.round(wp.x / 50) * 50, y: Math.round(wp.y / 50) * 50 }, width: 1400, depth: 800, rotation: 0, seats: 4 });
      setSelected(id); setTool('select');
    } else if (tool === 'draw-room') {
      if (drawingVertices.length >= 3 && dist(wp, drawingVertices[0]) < 200) { finishDrawingRoom(); return; }
      let vertex = wp;
      if (drawingVertices.length >= 1) vertex = snapToRightAngle(wp, drawingVertices[drawingVertices.length - 1]);
      vertex = { x: Math.round(vertex.x / 200) * 200, y: Math.round(vertex.y / 200) * 200 };
      addDrawingVertex(vertex);
    } else if (tool === 'place-opening' && selectedOpeningType) {
      // Find nearest wall and place opening
      const nearest = findNearestWallFromVertices(wp, design.room.vertices, 300);
      if (nearest) {
        const wall = design.room.walls[nearest.wallIndex];
        if (wall) {
          const wallStart = wall.start;
          const offset = Math.round(dist(wallStart, nearest.projectedPoint));
          addOpening({
            id: `opening-${Date.now()}`,
            type: selectedOpeningType,
            wallId: nearest.wallId,
            offset,
            width: selectedOpeningType === 'door' ? 900 : selectedOpeningType === 'skylight' ? 800 : 1200,
            height: selectedOpeningType === 'door' ? 2100 : selectedOpeningType === 'skylight' ? 800 : 1200,
          });
        }
      }
    } else if (tool === 'place-utility' && selectedUtilityType) {
      addUtilityPoint({
        id: `utility-${Date.now()}`,
        type: selectedUtilityType,
        label: selectedUtilityType.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        position: { x: Math.round(wp.x / 50) * 50, y: Math.round(wp.y / 50) * 50 },
      });
    } else {
      setSelected(null);
    }
  }, [tool, selectedCarcassSize, drawingVertices, addCarcass, setSelected, setTool, addDrawingVertex, finishDrawingRoom, screenToWorld]);

  const startVertexDrag = useCallback((e: React.MouseEvent, vertexIndex: number) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    const v = design.room.vertices[vertexIndex];
    setVertexDrag({
      index: vertexIndex,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPos: { ...v },
      rectW: rect.width,
      rectH: rect.height,
    });
  }, [tool, design.room.vertices]);

  const startDrag = useCallback((e: React.MouseEvent, id: string, type: string) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    setSelected(id);
    const rect = containerRef.current!.getBoundingClientRect();
    const item = type === 'carcass' ? design.carcasses.find((c) => c.id === id) : type === 'furniture' ? design.furniture.find((f) => f.id === id) : design.islands.find((i) => i.id === id);
    if (!item) return;
    setDragState({ id, type, startClientX: e.clientX, startClientY: e.clientY, startPos: { ...item.position }, rectW: rect.width, rectH: rect.height, moved: false });
  }, [tool, setSelected, design]);

  const onCanvasMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (isDrawingRoom && !isFreehandDrawing) { const wp = screenToWorld(e.clientX, e.clientY); updateDrawingCursor(wp); }
    if (isFreehandDrawing && dragState === null && panState === null) {
      const wp = screenToWorld(e.clientX, e.clientY);
      const snapped = { x: Math.round(wp.x / 100) * 100, y: Math.round(wp.y / 100) * 100 };
      addFreehandPoint(snapped);
    }
    if (dragState) {
      const ds = dragState;
      const dxVB = (e.clientX - ds.startClientX) * (1000 / ds.rectW);
      const dyVB = (e.clientY - ds.startClientY) * (700 / ds.rectH);
      if (Math.abs(dxVB) > 1 || Math.abs(dyVB) > 1) ds.moved = true;
      const dxMm = dxVB / (scale * MM_TO_PX);
      const dyMm = dyVB / (scale * MM_TO_PX);
      const newPos = { x: ds.startPos.x + dxMm, y: ds.startPos.y + dyMm };
      if (ds.type === 'carcass') updateCarcass(ds.id, { position: newPos });
      else if (ds.type === 'furniture') updateFurniture(ds.id, { position: newPos });
      else if (ds.type === 'island') updateIsland(ds.id, { position: newPos });
    }
    if (panState) {
      const rect = containerRef.current!.getBoundingClientRect();
      const dxVB = (e.clientX - panState.sx) * (1000 / rect.width);
      const dyVB = (e.clientY - panState.sy) * (700 / rect.height);
      setPosition({ x: panState.startPos.x + dxVB, y: panState.startPos.y + dyVB });
    }
    if (vertexDrag) {
      const vd = vertexDrag;
      const dxVB = (e.clientX - vd.startClientX) * (1000 / vd.rectW);
      const dyVB = (e.clientY - vd.startClientY) * (700 / vd.rectH);
      const dxMm = dxVB / (scale * MM_TO_PX);
      const dyMm = dyVB / (scale * MM_TO_PX);
      updateRoomVertex(vd.index, { x: vd.startPos.x + dxMm, y: vd.startPos.y + dyMm });
    }
  }, [isDrawingRoom, dragState, panState, scale, screenToWorld, updateDrawingCursor, updateCarcass, updateFurniture, updateIsland, setPosition]);

  const onCanvasMouseUp = useCallback(() => {
    if (dragState && dragState.moved) useStore.getState().runAnalysis();
    if (isFreehandDrawing) finishFreehandDraw();
    setDragState(null);
    setPanState(null);
    setVertexDrag(null);
  }, [dragState, isFreehandDrawing, finishFreehandDraw]);

  const onCanvasMouseDown = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    if (isFreehandDrawing) {
      // Start collecting freehand points
      const wp = screenToWorld(e.clientX, e.clientY);
      const snapped = { x: Math.round(wp.x / 100) * 100, y: Math.round(wp.y / 100) * 100 };
      addFreehandPoint(snapped);
    } else if (tool === 'pan') {
      setPanState({ sx: e.clientX, sy: e.clientY, startPos: { ...position } });
    }
  }, [isFreehandDrawing, tool, position, screenToWorld, addFreehandPoint]);

  const onCanvasBackgroundMouseDown = onCanvasMouseDown;

  const onDoubleClick = useCallback(() => {
    if (isDrawingRoom && drawingVertices.length >= 3) finishDrawingRoom();
  }, [isDrawingRoom, drawingVertices, finishDrawingRoom]);

  // 3D iso helper
  const iso = (x: number, y: number, z = 0): { x: number; y: number } => {
    const a = Math.PI / 6;
    return { x: (x - y) * Math.cos(a), y: (x + y) * Math.sin(a) - z };
  };
  const ptsToStr = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const boxFaces = (cx: number, cy: number, cw: number, cd: number, hpx: number) => {
    const top = [iso(cx, cy, hpx), iso(cx + cw, cy, hpx), iso(cx + cw, cy + cd, hpx), iso(cx, cy + cd, hpx)];
    const front = [iso(cx, cy + cd, 0), iso(cx + cw, cy + cd, 0), iso(cx + cw, cy + cd, hpx), iso(cx, cy + cd, hpx)];
    const side = [iso(cx + cw, cy, 0), iso(cx + cw, cy + cd, 0), iso(cx + cw, cy + cd, hpx), iso(cx + cw, cy, hpx)];
    return { top: ptsToStr(top), front: ptsToStr(front), side: ptsToStr(side) };
  };

  const wallHpx = toPx(design.room.height * 0.4);
  const cursorStyle = { display: 'block', cursor: tool === 'pan' ? 'grab' : (tool === 'place-carcass' || tool === 'place-furniture' || tool === 'draw-room' || tool === 'place-opening' || tool === 'place-utility') ? 'crosshair' : 'default', width: '100%', height: '100%' };

  // Canvas box sizing
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
  const availW = Math.max(320, winW - 48);
  const availH = Math.max(240, winH - 72 - 68 - 40);
  const ratio = 1000 / 700;
  let boxW = Math.min(availW, 1360);
  let boxH = boxW / ratio;
  if (boxH > availH) { boxH = availH; boxW = boxH * ratio; }

  // Analysis values for overlay
  const errorCount = analysis ? analysis.issues.filter((i) => i.severity === 'error').length : 0;
  const warningCount = analysis ? analysis.issues.filter((i) => i.severity === 'warning').length : 0;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseUp={onCanvasMouseUp} onMouseLeave={onCanvasMouseUp}>
      <div style={{ width: `${boxW}px`, height: `${boxH}px`, position: 'relative', flexShrink: 0 }}>
        <svg viewBox="0 0 1000 700" width="100%" height="100%" style={cursorStyle}
          onMouseMove={onCanvasMouseMove} onDoubleClick={onDoubleClick} onKeyDown={(e) => { if (e.key === 'Escape' && isDrawingRoom) cancelDrawing(); if (e.key === 'Enter' && isDrawingRoom && drawingVertices.length >= 3) finishDrawingRoom(); }} tabIndex={0}>
          <rect x="-2000" y="-2000" width="6000" height="6000" fill="var(--bg)" onMouseDown={onCanvasBackgroundMouseDown} onClick={onCanvasBackgroundClick} />

          <g transform={groupTransform}>
            {!is3D ? (
              <g>
                {/* Room floor */}
                <rect x="0" y="0" width={roomWpx} height={roomHpx} fill={colours.floor} opacity={0.55} rx={3} />

                {/* Walls from vertices */}
                {(design.room.vertices || []).length >= 2 && (design.room.vertices || []).map((v, i) => {
                  const next = design.room.vertices[(i + 1) % design.room.vertices.length];
                  const wallLen = Math.round(Math.sqrt((next.x - v.x) ** 2 + (next.y - v.y) ** 2));
                  const mx = (toPx(v.x) + toPx(next.x)) / 2;
                  const my = (toPx(v.y) + toPx(next.y)) / 2;
                  const isEditing = editingWallId === `wall-${i}`;
                  return (
                    <g key={`wall-${i}`}>
                      <line x1={toPx(v.x)} y1={toPx(v.y)} x2={toPx(next.x)} y2={toPx(next.y)}
                        stroke={isEditing ? 'var(--accent)' : '#8A7A63'}
                        strokeWidth={isEditing ? 9 : 7} vectorEffect="non-scaling-stroke" strokeLinecap="round"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setEditingWallId(`wall-${i}`); }}
                      />
                      <text x={mx} y={my - 10 * scale} fontSize={10 * scale} fill={isEditing ? 'var(--accent)' : '#9C9186'}
                        textAnchor="middle" fontFamily="Inter,sans-serif" pointerEvents="none"
                        style={{ fontWeight: isEditing ? 600 : 400 }}
                      >{wallLen}mm</text>
                    </g>
                  );
                })}

                {/* Utility Points */}
                {(utilityPoints || []).map((up) => {
                  const isSel = selectedId === up.id;
                  const colors: Record<string, string> = {
                    'water-supply': '#4E7A96', 'waste': '#5B6B7A', 'gas': '#C08A3E',
                    'electric': '#C1602C', 'electric-heavy': '#B94A3B', 'data': '#4C7A5B',
                    'extractor-vent': '#8A7A63', 'radiator': '#9C6B5B',
                  };
                  const color = colors[up.type] || '#888';
                  return (
                    <g key={up.id}
                      transform={`translate(${toPx(up.position.x)} ${toPx(up.position.y)})`}
                      onClick={(e) => { e.stopPropagation(); setSelected(up.id); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle r={10 * scale} fill={color} stroke="#fff" strokeWidth={2 * scale} opacity={0.85} />
                      <circle r={5 * scale} fill="none" stroke="#fff" strokeWidth={1 * scale} opacity={0.5} />
                      <text x={14 * scale} y={4 * scale} fontSize={9 * scale} fill={color} fontFamily="Inter,sans-serif" fontWeight={600}>
                        {up.label}
                      </text>
                      {isSel && <circle r={14 * scale} fill="none" stroke={color} strokeWidth={2 * scale} strokeDasharray={`${3 * scale} ${3 * scale}`} />}
                    </g>
                  );
                })}

                {/* Vertex handles (draggable wall corners) */}
                {tool === 'select' && (design.room.vertices || []).map((v, i) => {
                  const isHovered = hoveredVertex === i;
                  const isDragging = vertexDrag?.index === i;
                  return (
                    <g key={`vh-${i}`}>
                      {/* Hit area */}
                      <circle
                        cx={toPx(v.x)} cy={toPx(v.y)} r={20 * scale}
                        fill="transparent"
                        className="vertex-handle-hit"
                        onMouseEnter={() => setHoveredVertex(i)}
                        onMouseLeave={() => setHoveredVertex(null)}
                        onMouseDown={(e) => startVertexDrag(e, i)}
                      />
                      {/* Visible handle */}
                      <circle
                        cx={toPx(v.x)} cy={toPx(v.y)}
                        r={(isHovered || isDragging ? 8 : 5) * scale}
                        fill={isDragging ? 'var(--accent)' : isHovered ? '#fff' : 'var(--surface)'}
                        stroke="var(--accent)"
                        strokeWidth={2 * scale}
                        className="vertex-handle"
                        pointerEvents="none"
                      />
                    </g>
                  );
                })}

                {/* Wall midpoint indicators (click to insert vertex) */}
                {tool === 'select' && (design.room.vertices || []).map((v, i) => {
                  const next = design.room.vertices[(i + 1) % design.room.vertices.length];
                  const mx = (toPx(v.x) + toPx(next.x)) / 2;
                  const my = (toPx(v.y) + toPx(next.y)) / 2;
                  const isHovered = hoveredWall === i;
                  return (
                    <g key={`wm-${i}`}>
                      <circle
                        cx={mx} cy={my} r={15 * scale}
                        fill="transparent"
                        className="wall-midpoint"
                        onMouseEnter={() => setHoveredWall(i)}
                        onMouseLeave={() => setHoveredWall(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          const midX = (v.x + next.x) / 2;
                          const midY = (v.y + next.y) / 2;
                          addVertexToRoom(i, { x: midX, y: midY });
                        }}
                      />
                      {isHovered && (
                        <g pointerEvents="none">
                          <circle cx={mx} cy={my} r={10 * scale} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.5 * scale} />
                          <line x1={mx - 4 * scale} y1={my} x2={mx + 4 * scale} y2={my} stroke="var(--accent)" strokeWidth={1.5 * scale} />
                          <line x1={mx} y1={my - 4 * scale} x2={mx} y2={my + 4 * scale} stroke="var(--accent)" strokeWidth={1.5 * scale} />
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Openings */}
                {design.room.openings.map((opening) => {
                  const wall = design.room.walls.find((w) => w.id === opening.wallId);
                  if (!wall) return null;
                  const pt = pointOnWall(wall, opening.offset);
                  const wd = { x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y };
                  const wl = Math.sqrt(wd.x ** 2 + wd.y ** 2);
                  const dir = { x: wd.x / wl, y: wd.y / wl };
                  const x1 = toPx(pt.x), y1 = toPx(pt.y);
                  const x2 = toPx(pt.x + dir.x * opening.width), y2 = toPx(pt.y + dir.y * opening.width);
                  if (opening.type === 'window') return <line key={opening.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4E7A96" strokeWidth={5} vectorEffect="non-scaling-stroke" strokeDasharray="9 5" pointerEvents="none" />;
                  if (opening.type === 'door') return <line key={opening.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C08A3E" strokeWidth={5} vectorEffect="non-scaling-stroke" pointerEvents="none" />;
                  return null;
                })}

                {/* Furniture */}
                {design.furniture.map((f) => {
                  const isSel = selectedId === f.id;
                  return (
                    <g key={f.id} transform={`translate(${toPx(f.position.x)} ${toPx(f.position.y)}) rotate(${f.rotation})`}
                      onMouseDown={(e) => startDrag(e, f.id, 'furniture')} onClick={(e) => { e.stopPropagation(); setSelected(f.id); }} style={{ cursor: 'move' }}>
                      <rect width={toPx(f.width)} height={toPx(f.depth)} fill="#C9B79C" opacity={0.5} stroke={isSel ? 'var(--accent)' : '#9C8B6E'} strokeWidth={isSel ? 2.4 : 1.2} vectorEffect="non-scaling-stroke" rx={5} />
                      <text x={toPx(f.width) / 2} y={toPx(f.depth) / 2 + 4} fontSize={11} fill="#6B6058" textAnchor="middle" fontFamily="Inter,sans-serif">{f.label}</text>
                    </g>
                  );
                })}

                {/* Islands */}
                {design.islands.map((island) => {
                  const isSel = selectedId === island.id;
                  return (
                    <g key={island.id} transform={`translate(${toPx(island.position.x)} ${toPx(island.position.y)})`}
                      onMouseDown={(e) => startDrag(e, island.id, 'island')} onClick={(e) => { e.stopPropagation(); setSelected(island.id); }} style={{ cursor: 'move' }}>
                      <rect width={toPx(island.width)} height={toPx(island.depth)} fill="none" stroke={isSel ? 'var(--accent)' : 'var(--blue)'} strokeWidth={isSel ? 2.4 : 1.5} vectorEffect="non-scaling-stroke" strokeDasharray="9 5" rx={4} />
                      <text x={toPx(island.width) / 2} y={toPx(island.depth) / 2 + 4} fontSize={11} fill="var(--blue)" textAnchor="middle">Island</text>
                    </g>
                  );
                })}

                {/* Carcasses */}
                {design.carcasses.map((c) => {
                  const isSel = selectedId === c.id;
                  return (
                    <g key={c.id} transform={`translate(${toPx(c.position.x)} ${toPx(c.position.y)}) rotate(${c.rotation})`}
                      onMouseDown={(e) => startDrag(e, c.id, 'carcass')} onClick={(e) => { e.stopPropagation(); setSelected(c.id); }} style={{ cursor: 'move' }}>
                      <rect width={toPx(c.size)} height={toPx(c.depth)} fill={colours.cabinets} stroke={isSel ? 'var(--accent)' : '#B8A98C'} strokeWidth={isSel ? 2.4 : 1.1} vectorEffect="non-scaling-stroke" rx={3} />
                      <line x1={0} y1={toPx(c.depth)} x2={toPx(c.size)} y2={toPx(c.depth)} stroke={colours.countertops} strokeWidth={4} vectorEffect="non-scaling-stroke" />
                      <text x={6} y={c.appliance ? 25 : Math.max(14, toPx(c.depth) - 6)} fontSize={9.5} fill="#3A322B" opacity={0.75} fontFamily="Inter,sans-serif">{c.label || `${c.size}mm Unit`}</text>
                      {c.appliance && <text x={6} y={14} fontSize={9} fill="#8A3F1E" fontFamily="Inter,sans-serif" fontWeight={600}>{c.appliance.label}</text>}
                    </g>
                  );
                })}

                {/* Work Triangle */}
                {analysis?.flow.workTriangle && tool === 'select' && (() => {
                  const wt = analysis.flow.workTriangle;
                  const s = { x: toPx(wt.sink.x), y: toPx(wt.sink.y) };
                  const h = { x: toPx(wt.hob.x), y: toPx(wt.hob.y) };
                  const f = { x: toPx(wt.fridge.x), y: toPx(wt.fridge.y) };
                  const color = wt.status === 'ok' ? 'var(--success)' : 'var(--warning)';
                  return (
                    <g opacity={0.55} pointerEvents="none">
                      <line x1={s.x} y1={s.y} x2={h.x} y2={h.y} stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeDasharray="7 4" />
                      <line x1={h.x} y1={h.y} x2={f.x} y2={f.y} stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeDasharray="7 4" />
                      <line x1={f.x} y1={f.y} x2={s.x} y2={s.y} stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeDasharray="7 4" />
                    </g>
                  );
                })()}
              </g>
            ) : (
              // ---- 3D ----
              <g>
                {/* Floor from vertices */}
                {design.room.vertices && design.room.vertices.length >= 3 && (
                  <polygon points={ptsToStr(design.room.vertices.map((v) => iso(toPx(v.x), toPx(v.y))))} fill={colours.floor} opacity={0.6} stroke="#D8C9B3" strokeWidth={1} />
                )}

                {/* Walls from vertices */}
                {(design.room.vertices || []).map((v, i) => {
                  const next = design.room.vertices[(i + 1) % design.room.vertices.length];
                  const p1 = iso(toPx(v.x), toPx(v.y));
                  const p2 = iso(toPx(next.x), toPx(next.y));
                  return <polygon key={`3dwall-${i}`} points={ptsToStr([p1, p2, { x: p2.x, y: p2.y - wallHpx }, { x: p1.x, y: p1.y - wallHpx }])} fill={colours.walls} opacity={0.3 + (i % 2) * 0.2} stroke="#D8C9B3" strokeWidth={0.6} />;
                })}

                {/* Carcasses 3D */}
                {design.carcasses.map((c) => {
                  const isSel = selectedId === c.id;
                  const cx = toPx(c.position.x), cy = toPx(c.position.y);
                  const cw = toPx(c.size), cd = toPx(c.depth);
                  const hpx = c.mount === 'tall' ? wallHpx * 0.85 : wallHpx * 0.45;
                  const faces = boxFaces(cx, cy, cw, cd, hpx);
                  return (
                    <g key={c.id} onMouseDown={(e) => startDrag(e, c.id, 'carcass')} onClick={(e) => { e.stopPropagation(); setSelected(c.id); }} style={{ cursor: 'move' }}>
                      <polygon points={faces.top} fill={colours.countertops} stroke={isSel ? 'var(--accent)' : '#9a9080'} strokeWidth={isSel ? 2 : 0.8} />
                      <polygon points={faces.front} fill={colours.cabinets} stroke={isSel ? 'var(--accent)' : '#9a9080'} strokeWidth={0.8} />
                      <polygon points={faces.side} fill={colours.cabinets} opacity={0.78} stroke={isSel ? 'var(--accent)' : '#9a9080'} strokeWidth={0.8} />
                    </g>
                  );
                })}

                {/* Furniture 3D */}
                {design.furniture.map((f) => {
                  const isSel = selectedId === f.id;
                  const faces = boxFaces(toPx(f.position.x), toPx(f.position.y), toPx(f.width), toPx(f.depth), toPx(750) * 0.35);
                  return (
                    <g key={f.id} onMouseDown={(e) => startDrag(e, f.id, 'furniture')} onClick={(e) => { e.stopPropagation(); setSelected(f.id); }} style={{ cursor: 'move' }}>
                      <polygon points={faces.top} fill="#C9B79C" stroke={isSel ? 'var(--accent)' : '#9C8B6E'} strokeWidth={isSel ? 2 : 0.8} />
                      <polygon points={faces.front} fill="#B9A582" stroke={isSel ? 'var(--accent)' : '#9C8B6E'} strokeWidth={0.7} />
                      <polygon points={faces.side} fill="#A6926E" stroke={isSel ? 'var(--accent)' : '#9C8B6E'} strokeWidth={0.7} />
                    </g>
                  );
                })}
              </g>
            )}
          </g>

          {/* Room Drawing Layer */}
          {isDrawingRoom && (
            <g transform={groupTransform}>
              {/* Drawn walls */}
              {drawingVertices.map((v, i) => {
                const next = drawingVertices[(i + 1) % drawingVertices.length];
                if (i === drawingVertices.length - 1) return null;
                const len = Math.round(Math.sqrt((next.x - v.x) ** 2 + (next.y - v.y) ** 2));
                const mx = (v.x + next.x) / 2, my = (v.y + next.y) / 2;
                return (
                  <g key={`dw-${i}`}>
                    <line x1={toPx(v.x)} y1={toPx(v.y)} x2={toPx(next.x)} y2={toPx(next.y)} stroke="var(--accent)" strokeWidth={4 * scale} strokeLinecap="round" />
                    <text x={toPx(mx)} y={toPx(my) - 8 * scale} fontSize={11 * scale} fill="var(--accent)" textAnchor="middle" fontWeight={600}>{len}mm</text>
                  </g>
                );
              })}

              {/* Preview line */}
              {drawingVertices.length > 0 && cursorWorldPos && (() => {
                const last = drawingVertices[drawingVertices.length - 1];
                let cursor = snapToRightAngle(cursorWorldPos, last);
                cursor = { x: Math.round(cursor.x / 200) * 200, y: Math.round(cursor.y / 200) * 200 };
                const len = Math.round(Math.sqrt((cursor.x - last.x) ** 2 + (cursor.y - last.y) ** 2));
                const mx = (last.x + cursor.x) / 2, my = (last.y + cursor.y) / 2;
                const nearFirst = drawingVertices.length >= 3 && dist(cursor, drawingVertices[0]) < 200;
                return (
                  <g pointerEvents="none">
                    <line x1={toPx(last.x)} y1={toPx(last.y)} x2={toPx(cursor.x)} y2={toPx(cursor.y)} stroke={nearFirst ? 'var(--success)' : 'var(--accent)'} strokeWidth={3 * scale} strokeDasharray={`${6 * scale} ${4 * scale}`} />
                    <text x={toPx(mx)} y={toPx(my) - 8 * scale} fontSize={11 * scale} fill={nearFirst ? 'var(--success)' : 'var(--accent)'} textAnchor="middle" fontWeight={600}>{len}mm</text>
                    {nearFirst && <circle cx={toPx(drawingVertices[0].x)} cy={toPx(drawingVertices[0].y)} r={12 * scale} fill="none" stroke="var(--success)" strokeWidth={2 * scale} />}
                  </g>
                );
              })()}

              {/* Vertex markers */}
              {drawingVertices.map((v, i) => (
                <g key={`dv-${i}`}>
                  <circle cx={toPx(v.x)} cy={toPx(v.y)} r={7 * scale} fill={i === 0 ? 'var(--success)' : 'var(--accent)'} stroke="#fff" strokeWidth={2 * scale} />
                  {i === 0 && drawingVertices.length >= 3 && (
                    <text x={toPx(v.x) + 12 * scale} y={toPx(v.y) - 8 * scale} fontSize={10 * scale} fill="var(--success)" fontWeight={600}>Click to close</text>
                  )}
                </g>
              ))}
            </g>
          )}
        </svg>

        {/* Empty state — guide user to draw a room */}
        {design.carcasses.length === 0 && design.furniture.length === 0 && !isDrawingRoom && (
          <div className="canvas-empty-state">
            <h2>Let's design your kitchen</h2>
            <p>Start by drawing your room. Choose how you want to create it:</p>
            <div className="empty-actions">
              <button className="empty-action-btn" onClick={() => useStore.getState().startDrawingRoom()}>
                <span className="action-icon">👆</span>
                <div className="action-info">
                  <div className="action-title">Click corners to draw</div>
                  <div className="action-desc">Place wall corners one by one — best for precise shapes</div>
                </div>
              </button>
              <button className="empty-action-btn" onClick={() => useStore.getState().startFreehandDraw()}>
                <span className="action-icon">✏️</span>
                <div className="action-info">
                  <div className="action-title">Trace by hand</div>
                  <div className="action-desc">Draw the outline freehand with mouse or stylus</div>
                </div>
              </button>
              <button className="empty-action-btn" onClick={() => {
                const input = document.querySelector('.ai-prompt input') as HTMLInputElement;
                if (input) { input.focus(); input.placeholder = 'e.g. "L-shaped kitchen 4m wide, 3.5m deep, 1.5m cutout"'; }
              }}>
                <span className="action-icon">💬</span>
                <div className="action-info">
                  <div className="action-title">Describe with AI</div>
                  <div className="action-desc">Type a description and preview before applying</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Drawing toolbar */}
        {isDrawingRoom && (
          <div className="drawing-toolbar">
            <span className="dt-label">✏️ Drawing room</span>
            <span className="dt-count">{drawingVertices.length} {drawingVertices.length === 1 ? 'corner' : 'corners'}</span>
            <button className="dt-btn dt-finish" disabled={drawingVertices.length < 3} onClick={() => finishDrawingRoom()}>✓ Finish</button>
            <button className="dt-btn dt-cancel" onClick={() => cancelDrawing()}>Cancel</button>
          </div>
        )}

      {/* Overlays */}
        <div className="canvas-overlay-top">
          <div className="overlay-badge">{Math.round(scale * 100)}%</div>
          <div className="overlay-badge">{(design.room.width / 1000).toFixed(1)}m × {(design.room.depth / 1000).toFixed(1)}m</div>
          {(errorCount > 0 || warningCount > 0) && (
            <div className="overlay-badge issues" style={{ color: errorCount > 0 ? 'var(--error)' : 'var(--warning)' }}>
              {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : ''}
              {errorCount > 0 && warningCount > 0 ? ' · ' : ''}
              {warningCount > 0 ? `${warningCount} warning${warningCount > 1 ? 's' : ''}` : ''}
            </div>
          )}
        </div>

        <div className="canvas-hint">
          {tool === 'place-carcass' ? `Click to place a ${selectedCarcassSize}mm cabinet` :
           tool === 'place-furniture' ? 'Click to place furniture' :
           tool === 'place-opening' ? `Click on a wall to place a ${selectedOpeningType || 'opening'}` :
           tool === 'place-utility' ? `Click to place a ${selectedUtilityType || 'utility point'}` :
           tool === 'pan' ? 'Drag to pan · Scroll to zoom' :
           tool === 'draw-room' ? (isFreehandDrawing ? 'Trace the room outline · Release to finish' : 'Click to add corners · Click first point or double-click to close · Esc to cancel') :
           'Click to select · Drag to move · Click a wall to edit its length'}
        </div>
      </div>
    </div>
  );
}
