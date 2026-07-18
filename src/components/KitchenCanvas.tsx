// ============================================================================
// KitchenPlan — Canvas Renderer (SVG, full-bleed, 2D/3D toggle)
// ============================================================================

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { snapToWall, pointOnWall, snapToRightAngle, dist, wallsFromVertices } from '../engine/geometry';
import type { Carcass, Furniture, Vec2 } from '../domain/types';
import type { ViewMode } from '../App';

const MM_TO_PX = 0.2; // slightly bigger for visibility
const GRID_SIZE = 200;

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
  const isDrawingRoom = useStore((s) => s.isDrawingRoom);
  const drawingVertices = useStore((s) => s.drawingVertices);
  const cursorWorldPos = useStore((s) => s.cursorWorldPos);
  const startDrawingRoom = useStore((s) => s.startDrawingRoom);
  const addDrawingVertex = useStore((s) => s.addDrawingVertex);
  const updateDrawingCursor = useStore((s) => s.updateDrawingCursor);
  const cancelDrawing = useStore((s) => s.cancelDrawing);
  const finishDrawingRoom = useStore((s) => s.finishDrawingRoom);
  const colours = useStore((s) => s.design.colours);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [dragState, setDragState] = useState<{ id: string; type: string; startWorld: Vec2; startPos: Vec2 } | null>(null);
  const [panState, setPanState] = useState<{ sx: number; sy: number; startPos: Vec2 } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current)
        setContainerSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const toPx = useCallback((mm: number) => mm * MM_TO_PX * scale, [scale]);
  const screenToWorld = useCallback((sx: number, sy: number): Vec2 => ({
    x: (sx - position.x) / (MM_TO_PX * scale),
    y: (sy - position.y) / (MM_TO_PX * scale),
  }), [position, scale]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    if (tool === 'place-carcass') {
      const snap = snapToWall(wp, design.room.walls, selectedCarcassSize);
      const nc: Carcass = {
        id: `carcass-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        size: selectedCarcassSize, depth: 600, height: 720, mount: 'floor',
        position: snap ? snap.position : wp,
        rotation: snap ? snap.rotation : 0,
        wallId: snap?.wallId,
        fittings: [{ id: `fitting-${Date.now()}`, type: 'plain', label: 'Plain Cupboard', quantity: 1 }],
        label: `${selectedCarcassSize}mm Unit`,
      };
      addCarcass(nc); setSelected(nc.id); setTool('select');
    } else if (tool === 'draw-room') {
    // Check if clicking near first vertex to close polygon
    if (drawingVertices.length >= 3) {
      const first = drawingVertices[0];
      if (dist(wp, first) < 200) {
        finishDrawingRoom();
        return;
      }
    }
    // Snap to right angle relative to last vertex if we have one
    let vertex = wp;
    if (drawingVertices.length >= 1) {
      vertex = snapToRightAngle(wp, drawingVertices[drawingVertices.length - 1]);
    }
    // Snap to grid (200mm)
    vertex = { x: Math.round(vertex.x / 200) * 200, y: Math.round(vertex.y / 200) * 200 };
    addDrawingVertex(vertex);
  } else if (tool === 'place-furniture') {
      const nf: Furniture = {
        id: `furniture-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'dining-table', label: 'Dining Table', position: wp,
        width: 1200, depth: 800, rotation: 0, seats: 6,
      };
      useStore.getState().addFurniture(nf); setSelected(nf.id); setTool('select');
    } else {
      setSelected(null);
    }
  }, [tool, selectedCarcassSize, design, addCarcass, setSelected, setTool, screenToWorld]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (isDrawingRoom) {
      const rect = containerRef.current!.getBoundingClientRect();
      updateDrawingCursor(screenToWorld(e.clientX - rect.left, e.clientY - rect.top));
    }
    const rect = containerRef.current!.getBoundingClientRect();
    const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (dragState) {
      const delta = { x: wp.x - dragState.startWorld.x, y: wp.y - dragState.startWorld.y };
      const np = { x: dragState.startPos.x + delta.x, y: dragState.startPos.y + delta.y };
      if (dragState.type === 'carcass') updateCarcass(dragState.id, { position: np });
      else if (dragState.type === 'furniture') updateFurniture(dragState.id, { position: np });
      else if (dragState.type === 'island') updateIsland(dragState.id, { position: np });
    }
    if (panState) {
      setPosition({ x: panState.startPos.x + (e.clientX - panState.sx), y: panState.startPos.y + (e.clientY - panState.sy) });
    }
  }, [dragState, panState, screenToWorld, updateCarcass, updateFurniture, updateIsland, setPosition]);

  const startDrag = useCallback((e: React.MouseEvent, id: string, type: string, startPos: Vec2) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    const rect = containerRef.current!.getBoundingClientRect();
    setSelected(id);
    setDragState({ id, type, startWorld: screenToWorld(e.clientX - rect.left, e.clientY - rect.top), startPos });
  }, [tool, screenToWorld, setSelected]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGElement>) => {
    const scaleBy = 1.05;
    const oldScale = scale;
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const mp = { x: (mx - position.x) / oldScale, y: (my - position.y) / oldScale };
    const ns = Math.max(0.3, Math.min(5, e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy));
    setScale(ns);
    setPosition({ x: mx - mp.x * ns, y: my - mp.y * ns });
  }, [scale, position, setScale, setPosition]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (isDrawingRoom && drawingVertices.length >= 3) {
      finishDrawingRoom();
    }
  }, [isDrawingRoom, drawingVertices, finishDrawingRoom]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isDrawingRoom) {
      cancelDrawing();
    }
    if (e.key === 'Enter' && isDrawingRoom && drawingVertices.length >= 3) {
      finishDrawingRoom();
    }
  }, [isDrawingRoom, drawingVertices, cancelDrawing, finishDrawingRoom]);

  const roomW = toPx(design.room.width);
  const roomH = toPx(design.room.depth);

  // Grid
  const grid: React.ReactElement[] = [];
  for (let i = 0; i <= Math.ceil(design.room.width / GRID_SIZE); i++)
    grid.push(<line key={`v${i}`} x1={toPx(i*GRID_SIZE)} y1={0} x2={toPx(i*GRID_SIZE)} y2={roomH} stroke="#e8e4df" strokeWidth={0.5/scale} />);
  for (let i = 0; i <= Math.ceil(design.room.depth / GRID_SIZE); i++)
    grid.push(<line key={`h${i}`} x1={0} y1={toPx(i*GRID_SIZE)} x2={roomW} y2={toPx(i*GRID_SIZE)} stroke="#e8e4df" strokeWidth={0.5/scale} />);

  // 3D isometric transform helper
  const iso = (x: number, y: number, z = 0): { x: number; y: number } => {
    // simple isometric projection
    const angle = Math.PI / 6; // 30 degrees
    return {
      x: (x - y) * Math.cos(angle),
      y: (x + y) * Math.sin(angle) - z,
    };
  };

  const is3D = viewMode === '3d';
  const wallH = toPx(design.room.height * 0.3); // visual wall height in 3D

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      onMouseUp={() => { setDragState(null); setPanState(null); }}
      onMouseLeave={() => { setDragState(null); setPanState(null); }}
    >
      <svg width={containerSize.width} height={containerSize.height}
        style={{ display: 'block', cursor: tool === 'pan' ? 'grab' : (tool === 'place-carcass' || tool === 'place-furniture') ? 'crosshair' : 'default' }}
        onWheel={handleWheel} onMouseMove={handleMouseMove} onDoubleClick={handleDoubleClick} onKeyDown={handleKeyDown} tabIndex={0}>

        <g transform={`translate(${position.x}, ${position.y}) scale(${scale})`}>
          {is3D ? (
            // ---- 3D ISOMETRIC VIEW ----
            <g>
              {/* Floor (from vertices) */}
              <polygon
                points={design.room.vertices.map(v => {
                  const p = iso(toPx(v.x), toPx(v.y));
                  return `${p.x},${p.y}`;
                }).join(' ')}
                fill={colours.floor} opacity={0.7} stroke="#ccc" strokeWidth={1/scale}
              />

              {/* Walls (from vertices) */}
              {design.room.vertices.map((v, i) => {
                const next = design.room.vertices[(i + 1) % design.room.vertices.length];
                const p1 = iso(toPx(v.x), toPx(v.y));
                const p2 = iso(toPx(next.x), toPx(next.y));
                return (
                  <polygon
                    key={`3dwall-${i}`}
                    points={[
                      `${p1.x},${p1.y}`,
                      `${p2.x},${p2.y}`,
                      `${p2.x},${p2.y - wallH}`,
                      `${p1.x},${p1.y - wallH}`,
                    ].join(' ')}
                    fill={colours.walls}
                    opacity={0.3 + (i % 2) * 0.15}
                    stroke="#ccc"
                    strokeWidth={0.5/scale}
                  />
                );
              })}

              {/* Carcasses as 3D boxes */}
              {design.carcasses.map((c) => {
                const cx = toPx(c.position.x), cy = toPx(c.position.y);
                const cw = toPx(c.size), ch = toPx(c.depth);
                const ch_height = c.mount === 'tall' ? wallH * 0.85 : wallH * 0.45;
                const isSel = selectedId === c.id;
                const front = iso(cx, cy + ch);
                const right = iso(cx + cw, cy + ch);
                const rightTop = iso(cx + cw, cy + ch, ch_height);
                const frontTop = iso(cx, cy + ch, ch_height);
                const topLeft = iso(cx, cy, ch_height);
                const topRight = iso(cx + cw, cy, ch_height);
                const topFront = iso(cx, cy + ch, ch_height);

                return (
                  <g key={c.id}
                    style={{ cursor: tool === 'select' ? 'move' : 'default' }}
                    onMouseDown={(e) => startDrag(e, c.id, 'carcass', c.position)}
                    onClick={(e) => { e.stopPropagation(); setSelected(c.id); }}
                  >
                    {/* Top face */}
                    <polygon
                      points={[
                        `${iso(cx, cy).x},${iso(cx, cy).y - ch_height}`,
                        `${iso(cx + cw, cy).x},${iso(cx + cw, cy).y - ch_height}`,
                        `${iso(cx + cw, cy + ch).x},${iso(cx + cw, cy + ch).y - ch_height}`,
                        `${iso(cx, cy + ch).x},${iso(cx, cy + ch).y - ch_height}`,
                      ].join(' ')}
                      fill={colours.countertops} stroke={isSel ? '#e85d3a' : '#aaa'} strokeWidth={(isSel ? 2 : 0.8)/scale}
                    />
                    {/* Front face */}
                    <polygon
                      points={[
                        `${front.x},${front.y}`,
                        `${right.x},${right.y}`,
                        `${rightTop.x},${rightTop.y}`,
                        `${frontTop.x},${frontTop.y}`,
                      ].join(' ')}
                      fill={colours.cabinets} stroke={isSel ? '#e85d3a' : '#aaa'} strokeWidth={(isSel ? 1.5 : 0.5)/scale}
                    />
                    {/* Right face */}
                    <polygon
                      points={[
                        `${right.x},${right.y}`,
                        `${iso(cx + cw, cy).x},${iso(cx + cw, cy).y}`,
                        `${topRight.x},${topRight.y}`,
                        `${rightTop.x},${rightTop.y}`,
                      ].join(' ')}
                      fill={colours.cabinets} opacity={0.75} stroke={isSel ? '#e85d3a' : '#aaa'} strokeWidth={0.5/scale}
                    />
                    {c.appliance && (
                      <text
                        x={front.x + (right.x - front.x) / 2}
                        y={front.y - 4}
                        fontSize={9 / scale}
                        fill="#d9883a"
                        textAnchor="middle"
                      >{c.appliance.label}</text>
                    )}
                  </g>
                );
              })}

              {/* Furniture in 3D */}
              {design.furniture.map((f) => {
                const fx = toPx(f.position.x), fy = toPx(f.position.y);
                const fw = toPx(f.width), fd = toPx(f.depth);
                const fh = toPx(750) * 0.3;
                const isSel = selectedId === f.id;
                return (
                  <g key={f.id}
                    style={{ cursor: tool === 'select' ? 'move' : 'default' }}
                    onMouseDown={(e) => startDrag(e, f.id, 'furniture', f.position)}
                    onClick={(e) => { e.stopPropagation(); setSelected(f.id); }}
                  >
                    <polygon
                      points={[
                        `${iso(fx, fy).x},${iso(fx, fy).y - fh}`,
                        `${iso(fx + fw, fy).x},${iso(fx + fw, fy).y - fh}`,
                        `${iso(fx + fw, fy + fd).x},${iso(fx + fw, fy + fd).y - fh}`,
                        `${iso(fx, fy + fd).x},${iso(fx, fy + fd).y - fh}`,
                      ].join(' ')}
                      fill="#a08060" opacity={0.6} stroke={isSel ? '#e85d3a' : '#999'} strokeWidth={(isSel ? 2 : 0.8)/scale}
                    />
                  </g>
                );
              })}
            </g>
          ) : (
            // ---- 2D TOP-DOWN VIEW ----
            <g>
              {/* Background click catcher */}
              <rect x={-5000} y={-5000} width={roomW + 10000} height={roomH + 10000}
                fill="transparent" onClick={handleBackgroundClick}
                onMouseDown={(e) => { if (tool === 'pan') setPanState({ sx: e.clientX, sy: e.clientY, startPos: position }); }}
                style={{ cursor: tool === 'pan' ? 'grabbing' : 'inherit' }}
              />

              {/* Grid */}
              <g pointerEvents="none">{grid}</g>

              {/* Room floor */}
              <rect x={0} y={0} width={roomW} height={roomH} fill={colours.floor} opacity={0.12} rx={2} />

              {/* Walls */}
              {design.room.walls.map((wall) => (
                <line key={wall.id}
                  x1={toPx(wall.start.x)} y1={toPx(wall.start.y)}
                  x2={toPx(wall.end.x)} y2={toPx(wall.end.y)}
                  stroke="#8a8478" strokeWidth={8/scale} strokeLinecap="round" pointerEvents="none"
                />
              ))}

              {/* Wall labels */}
              {design.room.walls.map((wall) => {
                const mx = (toPx(wall.start.x) + toPx(wall.end.x)) / 2;
                const my = (toPx(wall.start.y) + toPx(wall.end.y)) / 2;
                const label = wall.id.includes('n') ? 'N' : wall.id.includes('s') ? 'S' : wall.id.includes('e') ? 'E' : 'W';
                return (
                  <text key={`lbl-${wall.id}`} x={mx} y={my} fontSize={12/scale}
                    fill="#bbb" textAnchor="middle" pointerEvents="none"
                    transform={`translate(0, -${10/scale})`}
                  >{label}</text>
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
                if (opening.type === 'window') {
                  return (
                    <g key={opening.id} pointerEvents="none">
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b7dd8" strokeWidth={5/scale} strokeDasharray={`${8/scale} ${4/scale}`} />
                    </g>
                  );
                } else if (opening.type === 'door') {
                  return <g key={opening.id} pointerEvents="none"><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d9883a" strokeWidth={5/scale} /></g>;
                }
                return null;
              })}

              {/* Furniture */}
              {design.furniture.map((f) => {
                const isSel = selectedId === f.id;
                return (
                  <g key={f.id}
                    transform={`translate(${toPx(f.position.x)}, ${toPx(f.position.y)}) rotate(${f.rotation})`}
                    style={{ cursor: tool === 'select' ? 'move' : 'default' }}
                    onMouseDown={(e) => startDrag(e, f.id, 'furniture', f.position)}
                    onClick={(e) => { e.stopPropagation(); setSelected(f.id); }}
                  >
                    <rect width={toPx(f.width)} height={toPx(f.depth)}
                      fill="#c4a888" stroke={isSel ? '#e85d3a' : '#9a8a70'} strokeWidth={(isSel ? 2.5 : 1.2)/scale}
                      rx={6/scale} opacity={0.55}
                    />
                    <text x={toPx(f.width)/2} y={toPx(f.depth)/2} fontSize={11/scale}
                      fill="#666" textAnchor="middle">{f.label}</text>
                  </g>
                );
              })}

              {/* Islands */}
              {design.islands.map((island) => {
                const isSel = selectedId === island.id;
                return (
                  <g key={island.id}
                    transform={`translate(${toPx(island.position.x)}, ${toPx(island.position.y)})`}
                    style={{ cursor: tool === 'select' ? 'move' : 'default' }}
                    onMouseDown={(e) => startDrag(e, island.id, 'island', island.position)}
                    onClick={(e) => { e.stopPropagation(); setSelected(island.id); }}
                  >
                    <rect width={toPx(island.width)} height={toPx(island.depth)}
                      fill="none" stroke={isSel ? '#e85d3a' : '#3b7dd8'}
                      strokeWidth={(isSel ? 2.5 : 1.5)/scale} strokeDasharray={`${8/scale} ${4/scale}`} rx={4/scale}
                    />
                    <text x={toPx(island.width)/2} y={toPx(island.depth)/2} fontSize={11/scale} fill="#3b7dd8" textAnchor="middle">Island</text>
                  </g>
                );
              })}

              {/* Carcasses */}
              {design.carcasses.map((c) => {
                const isSel = selectedId === c.id;
                const w = toPx(c.size), h = toPx(c.depth);
                return (
                  <g key={c.id}
                    transform={`translate(${toPx(c.position.x)}, ${toPx(c.position.y)}) rotate(${c.rotation})`}
                    style={{ cursor: tool === 'select' ? 'move' : 'default' }}
                    onMouseDown={(e) => startDrag(e, c.id, 'carcass', c.position)}
                    onClick={(e) => { e.stopPropagation(); setSelected(c.id); }}
                  >
                    {/* Body */}
                    <rect width={w} height={h}
                      fill={colours.cabinets}
                      stroke={isSel ? '#e85d3a' : '#9a9080'} strokeWidth={(isSel ? 2.5 : 1.2)/scale} rx={3/scale}
                    />
                    {/* Countertop edge */}
                    <line x1={0} y1={h} x2={w} y2={h} stroke={colours.countertops} strokeWidth={5/scale} />
                    {/* Door line */}
                    <line x1={w/2} y1={0} x2={w/2} y2={h} stroke="rgba(255,255,255,0.2)" strokeWidth={0.8/scale} strokeDasharray={`${4/scale} ${3/scale}`} />
                    {/* Label */}
                    <text x={4/scale} y={h/2 + 2} fontSize={10/scale} fill="rgba(255,255,255,0.85)">{c.label || `${c.size}mm`}</text>
                    {/* Appliance badge */}
                    {c.appliance && (
                      <>
                        <rect x={3/scale} y={3/scale} width={w - 6/scale} height={h - 6/scale} fill="none"
                          stroke="#d9883a" strokeWidth={1.5/scale} strokeDasharray={`${5/scale} ${3/scale}`} rx={2/scale} />
                        <text x={5/scale} y={14/scale} fontSize={9/scale} fill="#d9883a">{c.appliance.label}</text>
                      </>
                    )}
                    {/* Fitting label */}
                    {c.fittings[0]?.type !== 'plain' && (
                      <text x={5/scale} y={h - 4/scale} fontSize={8/scale} fill="rgba(255,255,255,0.5)">{c.fittings[0].label}</text>
                    )}
                  </g>
                );
              })}

              {/* Work Triangle */}
              {analysis?.flow.workTriangle && tool === 'select' && (() => {
                const wt = analysis.flow.workTriangle;
                const s = toPx(wt.sink.x), sy = toPx(wt.sink.y);
                const f = toPx(wt.fridge.x), fy = toPx(wt.fridge.y);
                const hb = toPx(wt.hob.x), hy = toPx(wt.hob.y);
                const color = wt.status === 'ok' ? '#2d8659' : '#d9883a';
                return (
                  <g pointerEvents="none" opacity={0.5}>
                    <line x1={s} y1={sy} x2={f} y2={fy} stroke={color} strokeWidth={1.5/scale} strokeDasharray={`${6/scale} ${4/scale}`} />
                    <line x1={f} y1={fy} x2={hb} y2={hy} stroke={color} strokeWidth={1.5/scale} strokeDasharray={`${6/scale} ${4/scale}`} />
                    <line x1={hb} y1={hy} x2={s} y2={sy} stroke={color} strokeWidth={1.5/scale} strokeDasharray={`${6/scale} ${4/scale}`} />
                    <circle cx={s} cy={sy} r={8/scale} fill={color} />
                    <circle cx={f} cy={fy} r={8/scale} fill={color} />
                    <circle cx={hb} cy={hy} r={8/scale} fill={color} />
                    <text x={s} y={sy - 14/scale} fontSize={10/scale} fill={color} textAnchor="middle">Sink</text>
                    <text x={f} y={fy - 14/scale} fontSize={10/scale} fill={color} textAnchor="middle">Fridge</text>
                    <text x={hb} y={hy - 14/scale} fontSize={10/scale} fill={color} textAnchor="middle">Hob</text>
                  </g>
                );
              })()}
            </g>
          )}
        </g>

        {/* Room Drawing Layer */}
        {isDrawingRoom && (
          <g transform={`translate(${position.x}, ${position.y}) scale(${scale})`}>
            {/* Grid for reference */}
            <g pointerEvents="none">
              {(() => {
                const lines: React.ReactElement[] = [];
                for (let x = -2000; x <= 6000; x += 200) {
                  lines.push(<line key={`dg-v${x}`} x1={x * MM_TO_PX} y1={-2000 * MM_TO_PX} x2={x * MM_TO_PX} y2={6000 * MM_TO_PX} stroke="#e8e4df" strokeWidth={0.5/scale} />);
                }
                for (let y = -2000; y <= 6000; y += 200) {
                  lines.push(<line key={`dg-h${y}`} x1={-2000 * MM_TO_PX} y1={y * MM_TO_PX} x2={6000 * MM_TO_PX} y2={y * MM_TO_PX} stroke="#e8e4df" strokeWidth={0.5/scale} />);
                }
                return lines;
              })()}
            </g>

            {/* Drawn walls (between placed vertices) */}
            {drawingVertices.map((v, i) => {
              const next = drawingVertices[(i + 1) % drawingVertices.length];
              const isLast = i === drawingVertices.length - 1;
              if (isLast && drawingVertices.length >= 3) return null; // don't close until user does
              if (isLast) return null; // don't draw line from last vertex to first
              const len = Math.round(Math.sqrt((next.x - v.x)**2 + (next.y - v.y)**2));
              const mx = (v.x + next.x) / 2;
              const my = (v.y + next.y) / 2;
              return (
                <g key={`dw-${i}`}>
                  <line
                    x1={v.x * MM_TO_PX} y1={v.y * MM_TO_PX}
                    x2={next.x * MM_TO_PX} y2={next.y * MM_TO_PX}
                    stroke="#e85d3a" strokeWidth={4/scale} strokeLinecap="round"
                  />
                  <text
                    x={mx * MM_TO_PX} y={my * MM_TO_PX - 8/scale}
                    fontSize={11/scale} fill="#e85d3a" textAnchor="middle"
                    fontWeight={600}
                  >{len}mm</text>
                </g>
              );
            })}

            {/* Preview line from last vertex to cursor */}
            {drawingVertices.length > 0 && cursorWorldPos && (() => {
              const last = drawingVertices[drawingVertices.length - 1];
              let cursor = cursorWorldPos;
              // Snap to right angle
              cursor = snapToRightAngle(cursor, last);
              // Snap to grid
              cursor = { x: Math.round(cursor.x / 200) * 200, y: Math.round(cursor.y / 200) * 200 };
              const len = Math.round(Math.sqrt((cursor.x - last.x)**2 + (cursor.y - last.y)**2));
              const mx = (last.x + cursor.x) / 2;
              const my = (last.y + cursor.y) / 2;
              // Check if near first vertex (closing)
              const nearFirst = drawingVertices.length >= 3 && dist(cursor, drawingVertices[0]) < 200;
              return (
                <g pointerEvents="none">
                  <line
                    x1={last.x * MM_TO_PX} y1={last.y * MM_TO_PX}
                    x2={cursor.x * MM_TO_PX} y2={cursor.y * MM_TO_PX}
                    stroke={nearFirst ? '#2d8659' : '#e85d3a'}
                    strokeWidth={3/scale} strokeDasharray={`${6/scale} ${4/scale}`}
                  />
                  <text
                    x={mx * MM_TO_PX} y={my * MM_TO_PX - 8/scale}
                    fontSize={11/scale} fill={nearFirst ? '#2d8659' : '#e85d3a'}
                    textAnchor="middle" fontWeight={600}
                  >{len}mm</text>
                  {nearFirst && (
                    <circle
                      cx={drawingVertices[0].x * MM_TO_PX}
                      cy={drawingVertices[0].y * MM_TO_PX}
                      r={12/scale}
                      fill="none"
                      stroke="#2d8659"
                      strokeWidth={2/scale}
                    />
                  )}
                </g>
              );
            })()}

            {/* Vertex markers */}
            {drawingVertices.map((v, i) => (
              <g key={`dv-${i}`}>
                <circle
                  cx={v.x * MM_TO_PX} cy={v.y * MM_TO_PX}
                  r={7/scale}
                  fill={i === 0 ? '#2d8659' : '#e85d3a'}
                  stroke="#fff"
                  strokeWidth={2/scale}
                />
                {i === 0 && drawingVertices.length >= 3 && (
                  <text
                    x={v.x * MM_TO_PX + 12/scale}
                    y={v.y * MM_TO_PX - 8/scale}
                    fontSize={10/scale} fill="#2d8659" fontWeight={600}
                  >Click to close</text>
                )}
              </g>
            ))}

            {/* Cursor snap indicator */}
            {cursorWorldPos && drawingVertices.length > 0 && (() => {
              const last = drawingVertices[drawingVertices.length - 1];
              let cursor = snapToRightAngle(cursorWorldPos, last);
              cursor = { x: Math.round(cursor.x / 200) * 200, y: Math.round(cursor.y / 200) * 200 };
              return (
                <circle
                  cx={cursor.x * MM_TO_PX} cy={cursor.y * MM_TO_PX}
                  r={5/scale}
                  fill="none"
                  stroke="#e85d3a"
                  strokeWidth={1.5/scale}
                  pointerEvents="none"
                />
              );
            })()}
          </g>
        )}
      </svg>

      {/* Canvas overlays */}
      <div className="canvas-overlay-top">
        <div className="overlay-badge">{Math.round(scale * 100)}%</div>
        <div className="overlay-badge">
          {(design.room.width/1000).toFixed(1)}m × {(design.room.depth/1000).toFixed(1)}m
        </div>
        {analysis && analysis.issues.length > 0 && (
          <div className="overlay-badge">
            {analysis.issues.filter(i => i.severity === 'error').length > 0 && (
              <span style={{ color: 'var(--red)' }}>● {analysis.issues.filter(i => i.severity === 'error').length} errors</span>
            )}
            {analysis.issues.filter(i => i.severity === 'warning').length > 0 && (
              <span style={{ color: 'var(--amber)' }}> ● {analysis.issues.filter(i => i.severity === 'warning').length} warnings</span>
            )}
          </div>
        )}
      </div>

      <div className="canvas-hint">
        {tool === 'place-carcass' && `Click to place a ${selectedCarcassSize}mm carcass — snaps to walls`}
        {tool === 'place-furniture' && 'Click to place furniture'}
        {tool === 'pan' && 'Drag to pan • Scroll to zoom'}
        {tool === 'select' && 'Click to select • Drag to move • Scroll to zoom'}
        {tool === 'draw-room' && 'Click to add wall corners • Click first point (green) or double-click to close • Esc to cancel'}
        {is3D && ' • 3D isometric view'}
      </div>
    </div>
  );
}
