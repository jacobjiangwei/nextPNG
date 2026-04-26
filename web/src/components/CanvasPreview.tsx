"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import yaml from "js-yaml";
import { renderNpng } from "../lib/renderer";
import { hitTestAll, getBoundingBox } from "../lib/hitTest";
import { getHandles, getHandleAtPoint, cursorForHandle, applyMove, applyResize, getOrigProps } from "../lib/canvasInteraction";
import { generateShapeForTool } from "../lib/presetShapes";
import type { NpngDocument, NpngElement } from "../lib/types";
import type { ElementAddress, EditorAction, Tool, DragState, DrawState, PenState, PolyState } from "../lib/editorState";

interface CanvasPreviewProps {
  yamlText: string;
  parsedDoc: NpngDocument | null;
  selection: ElementAddress[];
  activeTool: Tool;
  dragState: DragState | null;
  drawState: DrawState | null;
  penState: PenState | null;
  polyState: PolyState | null;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  gridSize: number;
  dispatch: React.Dispatch<EditorAction>;
}

export default function CanvasPreview({
  yamlText, parsedDoc, selection, activeTool, dragState, drawState, penState, polyState,
  zoom, panX, panY, showGrid, gridSize, dispatch,
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const clickCycleRef = useRef<{ x: number; y: number; index: number }>({ x: -1, y: -1, index: 0 });

  // Space key tracking
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "Escape") {
        if (penState) dispatch({ type: "CANCEL_PEN" });
        if (polyState) dispatch({ type: "CANCEL_POLY" });
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [penState, polyState, dispatch]);

  // Render main canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const data = yaml.load(yamlText) as NpngDocument;
      if (data && typeof data === "object") {
        renderNpng(data, canvasRef.current);
      }
    } catch { /* parse error */ }
  }, [yamlText]);

  // Render selection overlay + grid + pen/poly preview
  useEffect(() => {
    const overlay = overlayRef.current;
    const main = canvasRef.current;
    if (!overlay || !main) return;
    overlay.width = main.width;
    overlay.height = main.height;
    const ctx = overlay.getContext("2d")!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= overlay.width; x += gridSize) {
        if (x % 50 === 0) { ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 0.5; }
        else { ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.5; }
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, overlay.height); ctx.stroke();
      }
      for (let y = 0; y <= overlay.height; y += gridSize) {
        if (y % 50 === 0) { ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 0.5; }
        else { ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.5; }
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(overlay.width, y); ctx.stroke();
      }
    }

    // Pen tool overlay
    if (penState && penState.points.length > 0) {
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      const pts = penState.points;

      // Draw completed segments
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const cp1 = prev.cp2 ?? prev;
        const cp2 = cur.cp1 ?? cur;
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, cur.x, cur.y);
      }
      ctx.stroke();

      // Preview line to cursor
      if (penState.preview) {
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const last = pts[pts.length - 1];
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(penState.preview.x, penState.preview.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Anchor dots
      for (const pt of pts) {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Control handles
        if (pt.cp2) {
          ctx.strokeStyle = "#888";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.cp2.x, pt.cp2.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#3B82F6";
          ctx.beginPath();
          ctx.arc(pt.cp2.x, pt.cp2.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Polyline/polygon overlay
    if (polyState && polyState.points.length > 0) {
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      const pts = polyState.points;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      if (polyState.preview) {
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const last = pts[pts.length - 1];
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(polyState.preview.x, polyState.preview.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const pt of pts) {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    if (!selection.length || !parsedDoc?.layers) return;
    for (const sel of selection) {
      const layer = parsedDoc.layers[sel.layerIndex];
      if (!layer?.elements?.[sel.elementIndex]) continue;
      const elem = layer.elements[sel.elementIndex];
      const box = getBoundingBox(elem);

      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);

      if (selection.length === 1) {
        for (const h of getHandles(box)) {
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 1.5;
          ctx.fillRect(h.x, h.y, h.size, h.size);
          ctx.strokeRect(h.x, h.y, h.size, h.size);
        }
      }
    }
  }, [selection, parsedDoc, showGrid, gridSize, penState, polyState]);

  // Draw rubber-band preview for drawing tools
  useEffect(() => {
    const overlay = overlayRef.current;
    const main = canvasRef.current;
    if (!overlay || !main || !drawState) return;
    overlay.width = main.width;
    overlay.height = main.height;
    const ctx = overlay.getContext("2d")!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const x = Math.min(drawState.startX, drawState.currentX);
    const y = Math.min(drawState.startY, drawState.currentY);
    const w = Math.abs(drawState.currentX - drawState.startX);
    const h = Math.abs(drawState.currentY - drawState.startY);

    if (drawState.tool === "rect" || drawState.tool === "frame") {
      ctx.strokeRect(x, y, w, h);
    } else if (drawState.tool === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (drawState.tool === "line") {
      ctx.beginPath();
      ctx.moveTo(drawState.startX, drawState.startY);
      ctx.lineTo(drawState.currentX, drawState.currentY);
      ctx.stroke();
    } else if (drawState.tool === "star" || drawState.tool === "polygon-shape" || drawState.tool === "arrow-shape") {
      if (w > 2 && h > 2) {
        const d = generateShapeForTool(drawState.tool, x, y, w, h);
        const path = new Path2D(d);
        ctx.stroke(path);
      }
    }
  }, [drawState]);

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;
    const wrapperDiv = canvas.parentElement;
    if (!wrapperDiv) return null;
    const rect = wrapperDiv.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  // Wheel handler for zoom/pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.max(0.1, Math.min(10, zoom * (1 + delta)));
        dispatch({ type: "SET_ZOOM", zoom: newZoom });
      } else if (e.shiftKey) {
        dispatch({ type: "SET_PAN", panX: panX - e.deltaY, panY });
      } else {
        dispatch({ type: "SET_PAN", panX: panX - e.deltaX, panY: panY - e.deltaY });
      }
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [zoom, panX, panY, dispatch]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse or space+click = start pan
    if (e.button === 1 || (spaceHeld && e.button === 0)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
      return;
    }

    const pt = getCanvasCoords(e);
    if (!pt || !parsedDoc) return;

    // Pen tool
    if (activeTool === "pen") {
      if (penState && penState.points.length > 0) {
        const first = penState.points[0];
        const dist = Math.hypot(pt.x - first.x, pt.y - first.y);
        if (dist < 8 && penState.points.length >= 3) {
          dispatch({ type: "FINISH_PEN" });
          return;
        }
      }
      dispatch({ type: "ADD_PEN_POINT", point: { x: Math.round(pt.x), y: Math.round(pt.y) } });
      dispatch({ type: "START_PEN_DRAG", x: pt.x, y: pt.y });
      return;
    }

    // Polyline/Polygon
    if (activeTool === "polyline" || activeTool === "polygon") {
      dispatch({ type: "ADD_POLY_POINT", point: { x: Math.round(pt.x), y: Math.round(pt.y) } });
      return;
    }

    // Drawing tools (rect, ellipse, line, text, shapes, frame)
    if (activeTool !== "select") {
      dispatch({ type: "SET_DRAW", drawState: { tool: activeTool, startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y } });
      return;
    }

    // Check if clicking on a resize handle of selected element (single select only)
    if (selection.length === 1 && parsedDoc.layers) {
      const sel = selection[0];
      const layer = parsedDoc.layers[sel.layerIndex];
      const elem = layer?.elements?.[sel.elementIndex];
      if (elem) {
        const box = getBoundingBox(elem);
        const handle = getHandleAtPoint(box, pt.x, pt.y);
        if (handle) {
          dispatch({
            type: "SET_DRAG",
            dragState: { type: "resize", handle, startX: pt.x, startY: pt.y, origProps: getOrigProps(elem) },
          });
          return;
        }
      }
    }

    // Hit test with click-cycling for overlapping elements
    const allHits = hitTestAll(parsedDoc, pt.x, pt.y);
    let hit: ElementAddress | null = null;
    if (allHits.length > 0) {
      const cc = clickCycleRef.current;
      const sameSpot = Math.abs(pt.x - cc.x) < 3 && Math.abs(pt.y - cc.y) < 3;
      if (sameSpot && allHits.length > 1) {
        cc.index = (cc.index + 1) % allHits.length;
      } else {
        cc.index = 0;
      }
      cc.x = pt.x;
      cc.y = pt.y;
      hit = allHits[cc.index];
    } else {
      clickCycleRef.current = { x: pt.x, y: pt.y, index: 0 };
    }

    if (e.shiftKey) {
      dispatch({ type: "SELECT", address: hit, append: true });
    } else {
      dispatch({ type: "SELECT", address: hit });
    }

    if (hit && parsedDoc.layers) {
      const elem = parsedDoc.layers[hit.layerIndex]?.elements?.[hit.elementIndex];
      if (elem) {
        dispatch({
          type: "SET_DRAG",
          dragState: { type: "move", startX: pt.x, startY: pt.y, origProps: getOrigProps(elem) },
        });
      }
    }
  }, [parsedDoc, selection, activeTool, penState, dispatch, getCanvasCoords, spaceHeld, panX, panY]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pt = getCanvasCoords(e);
    if (!pt) return;

    // Double-click finishes pen/poly
    if (penState && penState.points.length >= 2) {
      dispatch({ type: "FINISH_PEN" });
      return;
    }
    if (polyState && polyState.points.length >= 2) {
      dispatch({ type: "FINISH_POLY" });
      return;
    }
  }, [penState, polyState, dispatch, getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Panning
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      dispatch({ type: "SET_PAN", panX: panStartRef.current.panX + dx, panY: panStartRef.current.panY + dy });
      return;
    }

    const pt = getCanvasCoords(e);
    if (!pt) return;

    // Pen drag (bezier handle)
    if (penState?.draggingHandle) {
      dispatch({ type: "UPDATE_PEN_DRAG", cp2: { x: Math.round(pt.x), y: Math.round(pt.y) } });
      return;
    }

    // Pen preview
    if (activeTool === "pen" && penState && penState.points.length > 0) {
      dispatch({ type: "UPDATE_PEN_PREVIEW", x: pt.x, y: pt.y });
      return;
    }

    // Poly preview
    if ((activeTool === "polyline" || activeTool === "polygon") && polyState && polyState.points.length > 0) {
      dispatch({ type: "UPDATE_POLY_PREVIEW", x: pt.x, y: pt.y });
      return;
    }

    // Drawing
    if (drawState) {
      dispatch({ type: "SET_DRAW", drawState: { ...drawState, currentX: pt.x, currentY: pt.y } });
      return;
    }

    // Dragging
    if (dragState && selection.length > 0 && parsedDoc?.layers) {
      const sel = selection[0];
      const dx = pt.x - dragState.startX;
      const dy = pt.y - dragState.startY;
      const elem = parsedDoc.layers[sel.layerIndex]?.elements?.[sel.elementIndex];
      if (!elem) return;

      const overlay = overlayRef.current;
      const main = canvasRef.current;
      if (!overlay || !main) return;
      overlay.width = main.width;
      overlay.height = main.height;
      const ctx = overlay.getContext("2d")!;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      let tempBox;
      if (dragState.type === "move") {
        const moved = applyMove(elem, dx, dy, dragState.origProps);
        const tempElem = { ...elem, ...moved } as NpngElement;
        tempBox = getBoundingBox(tempElem);
      } else if (dragState.handle) {
        const resized = applyResize(elem, dragState.handle, dx, dy, dragState.origProps);
        const tempElem = { ...elem, ...resized } as NpngElement;
        tempBox = getBoundingBox(tempElem);
      }

      if (tempBox) {
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(tempBox.x, tempBox.y, tempBox.width, tempBox.height);
        ctx.setLineDash([]);
        for (const h of getHandles(tempBox)) {
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 1.5;
          ctx.fillRect(h.x, h.y, h.size, h.size);
          ctx.strokeRect(h.x, h.y, h.size, h.size);
        }
      }
      return;
    }

    // Cursor
    if (spaceHeld) {
      const canvas = overlayRef.current ?? canvasRef.current;
      if (canvas) canvas.style.cursor = "grab";
    } else if (activeTool === "pen" || activeTool === "polyline" || activeTool === "polygon") {
      const canvas = overlayRef.current ?? canvasRef.current;
      if (canvas) canvas.style.cursor = "crosshair";
    } else if (activeTool === "select" && selection.length === 1 && parsedDoc?.layers) {
      const sel = selection[0];
      const layer = parsedDoc.layers[sel.layerIndex];
      const elem = layer?.elements?.[sel.elementIndex];
      if (elem) {
        const box = getBoundingBox(elem);
        const handle = getHandleAtPoint(box, pt.x, pt.y);
        const canvas = overlayRef.current ?? canvasRef.current;
        if (canvas) canvas.style.cursor = handle ? cursorForHandle(handle) : "default";
      }
    } else if (activeTool !== "select") {
      const canvas = overlayRef.current ?? canvasRef.current;
      if (canvas) canvas.style.cursor = "crosshair";
    }
  }, [dragState, drawState, selection, parsedDoc, activeTool, penState, polyState, dispatch, getCanvasCoords, isPanning, spaceHeld]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }

    // End pen drag
    if (penState?.draggingHandle) {
      dispatch({ type: "END_PEN_DRAG" });
      return;
    }

    const pt = getCanvasCoords(e);
    if (!pt) return;

    // Finish drawing
    if (drawState) {
      const x = Math.min(drawState.startX, pt.x);
      const y = Math.min(drawState.startY, pt.y);
      const w = Math.abs(pt.x - drawState.startX);
      const h = Math.abs(pt.y - drawState.startY);

      if (w > 2 || h > 2) {
        const layerIndex = 0;
        let element: NpngElement;
        if (drawState.tool === "rect") {
          element = { type: "rect", x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h), fill: "#3498DB" };
        } else if (drawState.tool === "ellipse") {
          element = { type: "ellipse", cx: Math.round(x + w / 2), cy: Math.round(y + h / 2), rx: Math.round(w / 2), ry: Math.round(h / 2), fill: "#2ECC71" };
        } else if (drawState.tool === "line") {
          element = { type: "line", x1: Math.round(drawState.startX), y1: Math.round(drawState.startY), x2: Math.round(pt.x), y2: Math.round(pt.y), stroke: { color: "#333333", width: 2 } };
        } else if (drawState.tool === "text") {
          element = { type: "text", x: Math.round(x), y: Math.round(y + h / 2), content: "Text", font_size: 16, fill: "#333333" };
        } else if (drawState.tool === "star" || drawState.tool === "polygon-shape" || drawState.tool === "arrow-shape") {
          const d = generateShapeForTool(drawState.tool, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
          element = { type: "path", d, fill: "#E67E22" };
        } else if (drawState.tool === "frame") {
          element = { type: "frame", x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h), fill: "#FFFFFF10", children: [] };
        } else {
          dispatch({ type: "SET_DRAW", drawState: null });
          return;
        }
        dispatch({ type: "ADD_ELEMENT", layerIndex, element });
      }
      dispatch({ type: "SET_DRAW", drawState: null });
      return;
    }

    // Finish drag
    if (dragState && selection.length > 0 && parsedDoc?.layers) {
      const dx = pt.x - dragState.startX;
      const dy = pt.y - dragState.startY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        for (const sel of selection) {
          const elem = parsedDoc.layers[sel.layerIndex]?.elements?.[sel.elementIndex];
          if (elem) {
            let props: Record<string, unknown>;
            if (dragState.type === "move") {
              props = applyMove(elem, dx, dy, getOrigProps(elem));
            } else {
              props = applyResize(elem, dragState.handle!, dx, dy, dragState.origProps);
            }
            dispatch({ type: "UPDATE_ELEMENT", address: sel, props });
          }
        }
      }
      dispatch({ type: "SET_DRAG", dragState: null });
    }
  }, [dragState, drawState, selection, parsedDoc, penState, dispatch, getCanvasCoords, isPanning]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full items-center justify-center overflow-hidden bg-[#1e1e1e] relative"
    >
      <div
        className="relative inline-block"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <canvas
          ref={canvasRef}
          className="border border-zinc-700"
          style={{ imageRendering: "auto" }}
        />
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0"
          style={{ imageRendering: "auto", width: "100%", height: "100%" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      {/* Zoom indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
