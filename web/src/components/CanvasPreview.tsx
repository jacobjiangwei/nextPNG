"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import yaml from "js-yaml";
import { renderNpng } from "../lib/renderer";
import { hitTestAll, hitTestBox, getBoundingBox, getSelectionBoundingBox, mergeBoundingBoxes, type BoundingBox } from "../lib/hitTest";
import {
  getHandles,
  getHandleAtPoint,
  getRotationHandle,
  getRotationHandleAtPoint,
  getRotationOrigProps,
  cursorForHandle,
  applyMove,
  applyResize,
  applyRotation,
  getOrigProps,
} from "../lib/canvasInteraction";
import { getElementDisplayName } from "../lib/elementLabels";
import { generateShapeForTool } from "../lib/presetShapes";
import { deletePathAnchor, getPathControlLines, getPathHandleAtPoint, getPathHandles, insertPathAnchor, isEditablePathData, updatePathHandle } from "../lib/pathEditing";
import type { NpngDocument, NpngElement } from "../lib/types";
import type { ElementAddress, EditorAction, Tool, DragState, DrawState, PenState, PolyState } from "../lib/editorState";
import type { PathHandleRef } from "../lib/pathEditing";

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

interface PathDragState {
  address: ElementAddress;
  handle: PathHandleRef;
  startX: number;
  startY: number;
  origD: string;
  currentD: string;
}

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  append: boolean;
}

interface HoverState {
  x: number;
  y: number;
  hits: ElementAddress[];
}

interface HitMenuState {
  left: number;
  top: number;
  hits: ElementAddress[];
  append: boolean;
}

const DRAG_THRESHOLD = 3;

function getElementResizeHandles(element: NpngElement, box: BoundingBox) {
  const handles = getHandles(box);
  if (element.type === "text") {
    if (!element.width || element.width <= 0) return [];
    return handles.filter((handle) => handle.id === "e" || handle.id === "w");
  }
  return handles;
}

function getElementResizeHandleAtPoint(element: NpngElement, box: BoundingBox, x: number, y: number) {
  if (element.type === "text" && (!element.width || element.width <= 0)) return null;
  const handle = getHandleAtPoint(box, x, y);
  if (element.type === "text" && handle !== "e" && handle !== "w") return null;
  return handle;
}

function normalizeBox(startX: number, startY: number, currentX: number, currentY: number): BoundingBox {
  return {
    x: Math.min(startX, currentX),
    y: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  };
}

function addressEquals(a: ElementAddress, b: ElementAddress): boolean {
  return a.layerIndex === b.layerIndex && a.elementIndex === b.elementIndex;
}

function drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tone: "blue" | "amber" = "blue"): void {
  ctx.save();
  ctx.font = "12px sans-serif";
  const paddingX = 6;
  const width = ctx.measureText(text).width + paddingX * 2;
  const height = 20;
  const drawX = Math.max(4, Math.min(x, ctx.canvas.width - width - 4));
  const drawY = Math.max(height + 4, Math.min(y, ctx.canvas.height - 4));
  ctx.fillStyle = tone === "amber" ? "rgba(69, 26, 3, 0.9)" : "rgba(15, 23, 42, 0.9)";
  ctx.strokeStyle = tone === "amber" ? "rgba(251, 191, 36, 0.9)" : "rgba(96, 165, 250, 0.9)";
  ctx.lineWidth = 1;
  ctx.fillRect(drawX, drawY - height, width, height);
  ctx.strokeRect(drawX, drawY - height, width, height);
  ctx.fillStyle = tone === "amber" ? "#FEF3C7" : "#DBEAFE";
  ctx.fillText(text, drawX + paddingX, drawY - 6);
  ctx.restore();
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
  const [pathDrag, setPathDrag] = useState<PathDragState | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [hitMenu, setHitMenu] = useState<HitMenuState | null>(null);
  const [pendingHitMenu, setPendingHitMenu] = useState<HitMenuState | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Space key tracking
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "Escape") {
        setHitMenu(null);
        setPendingHitMenu(null);
        setHoverState(null);
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

    if (marquee) {
      const box = normalizeBox(marquee.startX, marquee.startY, marquee.currentX, marquee.currentY);
      ctx.fillStyle = "rgba(59, 130, 246, 0.14)";
      ctx.strokeStyle = "#60A5FA";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);
    }

    if (
      activeTool === "select" &&
      hoverState &&
      !dragState &&
      !pathDrag &&
      !marquee &&
      parsedDoc?.layers
    ) {
      const topHit = hoverState.hits[0];
      const elem = parsedDoc.layers[topHit.layerIndex]?.elements?.[topHit.elementIndex];
      if (elem) {
        const box = getBoundingBox(elem);
        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.setLineDash([]);
        const label = hoverState.hits.length > 1
          ? `${hoverState.hits.length} objects here - click to choose`
          : getElementDisplayName(parsedDoc, topHit);
        drawBadge(ctx, label, hoverState.x + 12, hoverState.y - 10, hoverState.hits.length > 1 ? "amber" : "blue");
      }
    }

    if (!selection.length || !parsedDoc?.layers) return;
    const selectionBox = getSelectionBoundingBox(parsedDoc, selection);
    for (const sel of selection) {
      const layer = parsedDoc.layers[sel.layerIndex];
      if (!layer?.elements?.[sel.elementIndex]) continue;
      const elem = layer.elements[sel.elementIndex];
      const box = getBoundingBox(elem);

      ctx.strokeStyle = selection.length > 1 ? "rgba(96, 165, 250, 0.45)" : "#3B82F6";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);
      drawBadge(ctx, getElementDisplayName(parsedDoc, sel), box.x, box.y - 8);

      if (selection.length === 1) {
        const isEditablePath = elem.type === "path" && typeof elem.d === "string" && isEditablePathData(elem.d) && !elem.transform;
        const isRichText = elem.type === "text" && !!elem.spans?.length;

        if (!isEditablePath && !isRichText) {
          for (const h of getElementResizeHandles(elem, box)) {
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#3B82F6";
            ctx.lineWidth = 1.5;
            ctx.fillRect(h.x, h.y, h.size, h.size);
            ctx.strokeRect(h.x, h.y, h.size, h.size);
          }
        }

        const rotateHandle = getRotationHandle(box);
        ctx.beginPath();
        ctx.moveTo(box.x + box.width / 2, box.y);
        ctx.lineTo(rotateHandle.x, rotateHandle.y);
        ctx.strokeStyle = "#60A5FA";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rotateHandle.x, rotateHandle.y, rotateHandle.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#111827";
        ctx.strokeStyle = "#60A5FA";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        if (isEditablePath) {
          const baseD = elem.d ?? "";
          const editingD =
            pathDrag &&
            pathDrag.address.layerIndex === sel.layerIndex &&
            pathDrag.address.elementIndex === sel.elementIndex
              ? pathDrag.currentD
              : baseD;

          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "#FDE68A";
          ctx.lineWidth = 1.5;
          for (const line of getPathControlLines(editingD)) {
            ctx.beginPath();
            ctx.moveTo(line.from.x, line.from.y);
            ctx.lineTo(line.to.x, line.to.y);
            ctx.stroke();
          }
          ctx.setLineDash([]);

          for (const handle of getPathHandles(editingD)) {
            const isAnchor = handle.role === "anchor";
            const isSegment = handle.role === "segment";
            if (isSegment) {
              ctx.save();
              ctx.translate(handle.x, handle.y);
              ctx.rotate(Math.PI / 4);
              ctx.fillStyle = "#F97316";
              ctx.strokeStyle = "#FFEDD5";
              ctx.lineWidth = 2;
              ctx.fillRect(-5, -5, 10, 10);
              ctx.strokeRect(-5, -5, 10, 10);
              ctx.restore();
              continue;
            }

            ctx.beginPath();
            ctx.arc(handle.x, handle.y, isAnchor ? 7 : 5, 0, Math.PI * 2);
            ctx.fillStyle = isAnchor ? "#FFFFFF" : "#60A5FA";
            ctx.strokeStyle = isAnchor ? "#2563EB" : "#EFF6FF";
            ctx.lineWidth = isAnchor ? 2.5 : 2;
            ctx.fill();
            ctx.stroke();

            if (isAnchor) {
              ctx.beginPath();
              ctx.arc(handle.x, handle.y, 2, 0, Math.PI * 2);
              ctx.fillStyle = "#2563EB";
              ctx.fill();
            }
          }

          drawBadge(ctx, "Path edit: Shift-click orange inserts; Option-click white deletes; drag points to edit", box.x, box.y - 30);
          ctx.restore();
        }
      }
    }

    if (selection.length > 1 && selectionBox) {
      ctx.strokeStyle = "#60A5FA";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      drawBadge(ctx, `${selection.length} selected`, selectionBox.x, selectionBox.y - 8);
    }
  }, [selection, parsedDoc, showGrid, gridSize, penState, polyState, pathDrag, marquee, hoverState, activeTool, dragState]);

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

  const snapMoveDelta = useCallback((dx: number, dy: number, referenceBox: BoundingBox | null) => {
    if (!showGrid || gridSize <= 0 || !referenceBox) return { dx, dy };
    return {
      dx: Math.round((referenceBox.x + dx) / gridSize) * gridSize - referenceBox.x,
      dy: Math.round((referenceBox.y + dy) / gridSize) * gridSize - referenceBox.y,
    };
  }, [showGrid, gridSize]);

  const getMenuPosition = useCallback((e: React.MouseEvent): { left: number; top: number } => {
    const container = containerRef.current;
    if (!container) return { left: e.clientX, top: e.clientY };
    const rect = container.getBoundingClientRect();
    return {
      left: Math.min(Math.max(8, e.clientX - rect.left + 12), Math.max(8, rect.width - 240)),
      top: Math.min(Math.max(8, e.clientY - rect.top + 12), Math.max(8, rect.height - 220)),
    };
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
    setHitMenu(null);
    setPendingHitMenu(null);
    setHoverState(null);

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
        if (elem.type === "path" && elem.d && isEditablePathData(elem.d) && !elem.transform) {
          const pathHandle = getPathHandleAtPoint(elem.d, pt.x, pt.y, Math.max(8, 14 / zoom));
          if (pathHandle) {
            if (e.shiftKey && pathHandle.role === "segment") {
              const d = insertPathAnchor(elem.d, pathHandle);
              if (d !== elem.d) dispatch({ type: "UPDATE_ELEMENT", address: sel, props: { d } });
              return;
            }
            if (e.altKey && pathHandle.role === "anchor") {
              const d = deletePathAnchor(elem.d, pathHandle);
              if (d !== elem.d) dispatch({ type: "UPDATE_ELEMENT", address: sel, props: { d } });
              return;
            }
            setPathDrag({
              address: sel,
              handle: pathHandle,
              startX: pt.x,
              startY: pt.y,
              origD: elem.d,
              currentD: elem.d,
            });
            return;
          }
        }

        const box = getBoundingBox(elem);
        if (getRotationHandleAtPoint(box, pt.x, pt.y)) {
          const untransformedBox = getBoundingBox({ ...elem, transform: undefined } as NpngElement);
          dispatch({
            type: "SET_DRAG",
            dragState: { type: "rotate", startX: pt.x, startY: pt.y, origProps: getRotationOrigProps(elem, untransformedBox, pt.x, pt.y) },
          });
          return;
        }
        const handle = elem.type === "text" && elem.spans?.length ? null : getElementResizeHandleAtPoint(elem, box, pt.x, pt.y);
        if (handle) {
          dispatch({
            type: "SET_DRAG",
            dragState: { type: "resize", handle, startX: pt.x, startY: pt.y, origProps: getOrigProps(elem) },
          });
          return;
        }
      }
    }

    // Hit test; show an explicit chooser when overlapping objects are under the pointer.
    const allHits = hitTestAll(parsedDoc, pt.x, pt.y);
    let hit: ElementAddress | null = null;
    if (allHits.length > 1) {
      const modifier = e.shiftKey || e.metaKey || e.ctrlKey;
      const selectedHit = allHits.find((candidate) => selection.some((selected) => addressEquals(selected, candidate)));
      if (selectedHit && !modifier) {
        setPendingHitMenu({
          ...getMenuPosition(e),
          hits: allHits,
          append: false,
        });
        hit = selectedHit;
      } else {
        const menuPosition = getMenuPosition(e);
        setHitMenu({
          ...menuPosition,
          hits: allHits,
          append: modifier,
        });
        return;
      }
    }
    if (allHits.length === 1) {
      hit = allHits[0];
    }

    if (!hit) {
      setMarquee({
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
        append: e.shiftKey,
      });
      return;
    }

    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      dispatch({ type: "SELECT", address: hit, append: true });
      return;
    }

    const hitSelected = selection.some((selected) => addressEquals(selected, hit!));
    if (!hitSelected) {
      dispatch({ type: "SELECT", address: hit });
    }

    if (parsedDoc.layers) {
      const elem = parsedDoc.layers[hit.layerIndex]?.elements?.[hit.elementIndex];
      if (elem) {
        dispatch({
          type: "SET_DRAG",
          dragState: { type: "move", startX: pt.x, startY: pt.y, origProps: getOrigProps(elem) },
        });
      }
    }
  }, [parsedDoc, selection, activeTool, penState, dispatch, getCanvasCoords, spaceHeld, panX, panY, zoom, getMenuPosition]);

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

    if (marquee) {
      setHoverState(null);
      setMarquee({ ...marquee, currentX: pt.x, currentY: pt.y });
      return;
    }

    if (pathDrag) {
      setHoverState(null);
      const dx = pt.x - pathDrag.startX;
      const dy = pt.y - pathDrag.startY;
      const currentD = updatePathHandle(pathDrag.origD, pathDrag.handle, dx, dy);
      setPathDrag({ ...pathDrag, currentD });
      return;
    }

    // Pen drag (bezier handle)
    if (penState?.draggingHandle) {
      setHoverState(null);
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
      setHoverState(null);
      dispatch({ type: "SET_DRAW", drawState: { ...drawState, currentX: pt.x, currentY: pt.y } });
      return;
    }

    // Dragging
    if (dragState && selection.length > 0 && parsedDoc?.layers) {
      setHoverState(null);
      const selectionBox = getSelectionBoundingBox(parsedDoc, selection);
      const rawDx = pt.x - dragState.startX;
      const rawDy = pt.y - dragState.startY;
      if (Math.abs(rawDx) > DRAG_THRESHOLD || Math.abs(rawDy) > DRAG_THRESHOLD) {
        setPendingHitMenu(null);
      }
      const snapped = dragState.type === "move" ? snapMoveDelta(rawDx, rawDy, selectionBox) : { dx: rawDx, dy: rawDy };

      const overlay = overlayRef.current;
      const main = canvasRef.current;
      if (!overlay || !main) return;
      overlay.width = main.width;
      overlay.height = main.height;
      const ctx = overlay.getContext("2d")!;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      let tempBox: BoundingBox | null = null;
      const previewBoxes: BoundingBox[] = [];
      if (dragState.type === "move") {
        for (const sel of selection) {
          const elem = parsedDoc.layers[sel.layerIndex]?.elements?.[sel.elementIndex];
          if (!elem) continue;
          const moved = applyMove(elem, snapped.dx, snapped.dy, getOrigProps(elem));
          const tempElem = { ...elem, ...moved } as NpngElement;
          previewBoxes.push(getBoundingBox(tempElem));
        }
        tempBox = mergeBoundingBoxes(previewBoxes);
      } else if (dragState.type === "rotate") {
        const sel = selection[0];
        const elem = parsedDoc.layers[sel.layerIndex]?.elements?.[sel.elementIndex];
        if (!elem) return;
        const rotated = applyRotation(elem, pt.x, pt.y, dragState.origProps);
        const tempElem = { ...elem, ...rotated } as NpngElement;
        tempBox = getBoundingBox(tempElem);
        previewBoxes.push(tempBox);
      } else if (dragState.handle) {
        const sel = selection[0];
        const elem = parsedDoc.layers[sel.layerIndex]?.elements?.[sel.elementIndex];
        if (!elem) return;
        const resized = applyResize(elem, dragState.handle, rawDx, rawDy, dragState.origProps);
        const tempElem = { ...elem, ...resized } as NpngElement;
        tempBox = getBoundingBox(tempElem);
        previewBoxes.push(tempBox);
      }

      if (previewBoxes.length > 1) {
        ctx.strokeStyle = "rgba(96, 165, 250, 0.45)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (const box of previewBoxes) {
          ctx.strokeRect(box.x, box.y, box.width, box.height);
        }
      }

      if (tempBox) {
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = previewBoxes.length > 1 ? 1.5 : 1;
        ctx.setLineDash(previewBoxes.length > 1 ? [] : [4, 4]);
        ctx.strokeRect(tempBox.x, tempBox.y, tempBox.width, tempBox.height);
        ctx.setLineDash([]);
        if (previewBoxes.length === 1) {
          for (const h of getHandles(tempBox)) {
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#3B82F6";
            ctx.lineWidth = 1.5;
            ctx.fillRect(h.x, h.y, h.size, h.size);
            ctx.strokeRect(h.x, h.y, h.size, h.size);
          }
        }
      }
      return;
    }

    if (activeTool === "select" && parsedDoc) {
      const hits = hitTestAll(parsedDoc, pt.x, pt.y);
      setHoverState(hits.length > 0 ? { x: pt.x, y: pt.y, hits } : null);
    } else {
      setHoverState(null);
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
        if (elem.type === "path" && elem.d && isEditablePathData(elem.d) && !elem.transform) {
          const pathHandle = getPathHandleAtPoint(elem.d, pt.x, pt.y, Math.max(8, 14 / zoom));
          if (pathHandle) {
            const canvas = overlayRef.current ?? canvasRef.current;
            if (canvas) canvas.style.cursor = "pointer";
            return;
          }
        }

        const box = getBoundingBox(elem);
        if (getRotationHandleAtPoint(box, pt.x, pt.y)) {
          const canvas = overlayRef.current ?? canvasRef.current;
          if (canvas) canvas.style.cursor = "grab";
          return;
        }
        const handle = elem.type === "text" && elem.spans?.length ? null : getElementResizeHandleAtPoint(elem, box, pt.x, pt.y);
        const canvas = overlayRef.current ?? canvasRef.current;
        if (canvas) canvas.style.cursor = handle ? cursorForHandle(handle) : "default";
      }
    } else if (activeTool !== "select") {
      const canvas = overlayRef.current ?? canvasRef.current;
      if (canvas) canvas.style.cursor = "crosshair";
    }
  }, [dragState, drawState, selection, parsedDoc, activeTool, penState, polyState, dispatch, getCanvasCoords, isPanning, spaceHeld, pathDrag, zoom, marquee, snapMoveDelta]);

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

    if (pathDrag) {
      if (pathDrag.currentD !== pathDrag.origD) {
        dispatch({ type: "UPDATE_ELEMENT", address: pathDrag.address, props: { d: pathDrag.currentD } });
      }
      setPathDrag(null);
      return;
    }

    const pt = getCanvasCoords(e);
    if (!pt) return;

    if (marquee) {
      const box = normalizeBox(marquee.startX, marquee.startY, pt.x, pt.y);
      if (box.width > DRAG_THRESHOLD || box.height > DRAG_THRESHOLD) {
        const addresses = parsedDoc ? hitTestBox(parsedDoc, box) : [];
        dispatch({ type: "SELECT_MANY", addresses, append: marquee.append });
      } else if (!marquee.append) {
        dispatch({ type: "SELECT", address: null });
      }
      setMarquee(null);
      return;
    }

    // Finish drawing
    if (drawState) {
      const x = Math.min(drawState.startX, pt.x);
      const y = Math.min(drawState.startY, pt.y);
      const w = Math.abs(pt.x - drawState.startX);
      const h = Math.abs(pt.y - drawState.startY);

      if (w > 2 || h > 2) {
        const layerIndex = -1;
        let element: NpngElement;
        if (drawState.tool === "rect") {
          element = { type: "rect", x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h), fill: "#3498DB" };
        } else if (drawState.tool === "ellipse") {
          element = { type: "ellipse", cx: Math.round(x + w / 2), cy: Math.round(y + h / 2), rx: Math.round(w / 2), ry: Math.round(h / 2), fill: "#2ECC71" };
        } else if (drawState.tool === "line") {
          element = { type: "line", x1: Math.round(drawState.startX), y1: Math.round(drawState.startY), x2: Math.round(pt.x), y2: Math.round(pt.y), stroke: { color: "#333333", width: 2 } };
        } else if (drawState.tool === "text") {
          element = { type: "text", x: Math.round(x), y: Math.round(y), width: Math.round(w), content: "Text", font_size: 16, line_height: 1.2, fill: "#333333" };
        } else if (drawState.tool === "star" || drawState.tool === "polygon-shape" || drawState.tool === "arrow-shape") {
          const d = generateShapeForTool(drawState.tool, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
          const name = drawState.tool === "star" ? "Star" : drawState.tool === "polygon-shape" ? "Polygon" : "Arrow";
          element = { type: "path", name, d, fill: "#E67E22" };
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
      const selectionBox = getSelectionBoundingBox(parsedDoc, selection);
      const rawDx = pt.x - dragState.startX;
      const rawDy = pt.y - dragState.startY;
      if (pendingHitMenu && Math.abs(rawDx) <= DRAG_THRESHOLD && Math.abs(rawDy) <= DRAG_THRESHOLD) {
        setHitMenu(pendingHitMenu);
        setPendingHitMenu(null);
        dispatch({ type: "SET_DRAG", dragState: null });
        return;
      }
      setPendingHitMenu(null);
      const snapped = dragState.type === "move" ? snapMoveDelta(rawDx, rawDy, selectionBox) : { dx: rawDx, dy: rawDy };
      if (Math.abs(rawDx) > 1 || Math.abs(rawDy) > 1) {
        if (dragState.type === "move") {
          const updates = selection.flatMap((sel) => {
            const elem = parsedDoc.layers?.[sel.layerIndex]?.elements?.[sel.elementIndex];
            if (!elem) return [];
            const props = applyMove(elem, snapped.dx, snapped.dy, getOrigProps(elem));
            return Object.keys(props).length > 0 ? [{ address: sel, props }] : [];
          });
          if (updates.length > 0) {
            dispatch({ type: "UPDATE_ELEMENTS", updates });
          }
        } else if (dragState.type === "rotate") {
          const sel = selection[0];
          const elem = parsedDoc.layers[sel.layerIndex]?.elements?.[sel.elementIndex];
          if (elem) {
            const props = applyRotation(elem, pt.x, pt.y, dragState.origProps);
            dispatch({ type: "UPDATE_ELEMENT", address: sel, props });
          }
        } else {
          const sel = selection[0];
          const elem = parsedDoc.layers[sel.layerIndex]?.elements?.[sel.elementIndex];
          if (elem) {
            const props = applyResize(elem, dragState.handle!, rawDx, rawDy, dragState.origProps);
            if (Object.keys(props).length > 0) {
              dispatch({ type: "UPDATE_ELEMENT", address: sel, props });
            }
          }
        }
      }
      dispatch({ type: "SET_DRAG", dragState: null });
    }
  }, [dragState, drawState, selection, parsedDoc, penState, dispatch, getCanvasCoords, isPanning, pathDrag, marquee, snapMoveDelta, pendingHitMenu]);

  const selectFromHitMenu = useCallback((address: ElementAddress, append: boolean) => {
    dispatch({ type: "SELECT", address, append });
    setHitMenu(null);
    setPendingHitMenu(null);
    setHoverState(null);
  }, [dispatch]);

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
          onMouseLeave={() => setHoverState(null)}
        />
      </div>
      {hitMenu && parsedDoc && (
        <div
          className="absolute z-20 w-56 rounded-lg border border-amber-400/60 bg-zinc-950/95 shadow-xl shadow-black/40 backdrop-blur-sm overflow-hidden"
          style={{ left: hitMenu.left, top: hitMenu.top }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-2 border-b border-zinc-800">
            <div className="text-xs font-semibold text-amber-200">Choose object</div>
            <div className="text-[11px] text-zinc-500">
              {hitMenu.hits.length} overlapping objects under cursor
            </div>
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {hitMenu.hits.map((hit, index) => (
              <button
                key={`${hit.layerIndex}-${hit.elementIndex}`}
                onClick={() => selectFromHitMenu(hit, hitMenu.append)}
                className="w-full px-2.5 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2"
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${index === 0 ? "bg-amber-500/20 text-amber-200" : "bg-zinc-800 text-zinc-400"}`}>
                  {index === 0 ? "top" : index + 1}
                </span>
                <span className="min-w-0 flex-1 text-xs text-zinc-200 truncate">
                  {getElementDisplayName(parsedDoc, hit)}
                </span>
              </button>
            ))}
          </div>
          <div className="px-2.5 py-1.5 border-t border-zinc-800 text-[11px] text-zinc-500">
            Shift/Cmd/Ctrl-click canvas to add/remove selection.
          </div>
        </div>
      )}
      {/* Zoom indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
