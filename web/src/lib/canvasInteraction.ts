import type { BoundingBox } from "./hitTest";
import type { NpngElement, TransformSpec } from "./types";
import { parsePath } from "./pathParser";

type InteractiveElement = NpngElement & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  d?: string;
};

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface HandleRect {
  id: HandleId;
  x: number;
  y: number;
  size: number;
}

const HANDLE_SIZE = 8;

export function getHandles(box: BoundingBox): HandleRect[] {
  const { x, y, width: w, height: h } = box;
  const s = HANDLE_SIZE;
  const hs = s / 2;
  return [
    { id: "nw", x: x - hs, y: y - hs, size: s },
    { id: "n",  x: x + w / 2 - hs, y: y - hs, size: s },
    { id: "ne", x: x + w - hs, y: y - hs, size: s },
    { id: "e",  x: x + w - hs, y: y + h / 2 - hs, size: s },
    { id: "se", x: x + w - hs, y: y + h - hs, size: s },
    { id: "s",  x: x + w / 2 - hs, y: y + h - hs, size: s },
    { id: "sw", x: x - hs, y: y + h - hs, size: s },
    { id: "w",  x: x - hs, y: y + h / 2 - hs, size: s },
  ];
}

export function getHandleAtPoint(box: BoundingBox, px: number, py: number): HandleId | null {
  for (const h of getHandles(box)) {
    if (px >= h.x && px <= h.x + h.size && py >= h.y && py <= h.y + h.size) {
      return h.id;
    }
  }
  return null;
}

export function cursorForHandle(handle: HandleId | null): string {
  if (!handle) return "default";
  const map: Record<HandleId, string> = {
    nw: "nwse-resize", ne: "nesw-resize", se: "nwse-resize", sw: "nesw-resize",
    n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
  };
  return map[handle];
}

const roundCoord = (value: number): number => {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const formatCoord = (value: number): string => String(roundCoord(value));

function moveTransformOrigin(element: NpngElement, dx: number, dy: number): { transform?: TransformSpec } {
  if (!element.transform?.origin) return {};
  return {
    transform: {
      ...element.transform,
      origin: [element.transform.origin[0] + dx, element.transform.origin[1] + dy],
    },
  };
}

function translateAbsolutePairs(args: number[], dx: number, dy: number, start = 0): number[] {
  const next = [...args];
  for (let i = start; i + 1 < next.length; i += 2) {
    next[i] += dx;
    next[i + 1] += dy;
  }
  return next;
}

export function translatePathData(d: string, dx: number, dy: number): string {
  return parsePath(d).map(([cmd, args], commandIndex) => {
    let next = [...args];
    if ("MLT".includes(cmd)) {
      next = translateAbsolutePairs(args, dx, dy);
    } else if (cmd === "m" && commandIndex === 0 && next.length >= 2) {
      next[0] += dx;
      next[1] += dy;
    } else if (cmd === "H") {
      next = args.map((x) => x + dx);
    } else if (cmd === "V") {
      next = args.map((y) => y + dy);
    } else if ("CSQ".includes(cmd)) {
      next = translateAbsolutePairs(args, dx, dy);
    } else if (cmd === "A") {
      next = [...args];
      for (let i = 0; i + 6 < next.length; i += 7) {
        next[i + 5] += dx;
        next[i + 6] += dy;
      }
    }
    return next.length > 0 ? `${cmd} ${next.map(formatCoord).join(" ")}` : cmd;
  }).join(" ");
}

export function applyMove(element: NpngElement, dx: number, dy: number, origProps: Record<string, number>): Record<string, unknown> {
  const e = element as InteractiveElement;
  switch (element.type) {
    case "rect":
    case "text":
    case "image":
    case "frame":
    case "component-instance":
      return { x: (origProps.x ?? e.x ?? 0) + dx, y: (origProps.y ?? e.y ?? 0) + dy, ...moveTransformOrigin(element, dx, dy) };
    case "ellipse":
      return { cx: (origProps.cx ?? e.cx ?? 0) + dx, cy: (origProps.cy ?? e.cy ?? 0) + dy, ...moveTransformOrigin(element, dx, dy) };
    case "line":
      return {
        x1: (origProps.x1 ?? e.x1 ?? 0) + dx, y1: (origProps.y1 ?? e.y1 ?? 0) + dy,
        x2: (origProps.x2 ?? e.x2 ?? 0) + dx, y2: (origProps.y2 ?? e.y2 ?? 0) + dy,
        ...moveTransformOrigin(element, dx, dy),
      };
    case "path":
      return e.d ? { d: translatePathData(e.d, dx, dy), ...moveTransformOrigin(element, dx, dy) } : moveTransformOrigin(element, dx, dy);
    default:
      return {};
  }
}

export function applyResize(
  element: NpngElement, handle: HandleId, dx: number, dy: number, origProps: Record<string, number>
): Record<string, number> {
  switch (element.type) {
    case "rect":
    case "image":
    case "frame":
    case "component-instance": {
      let { x, y, width: w, height: h } = origProps as { x: number; y: number; width: number; height: number };
      if (handle.includes("w")) { x += dx; w -= dx; }
      if (handle.includes("e")) { w += dx; }
      if (handle.includes("n")) { y += dy; h -= dy; }
      if (handle.includes("s")) { h += dy; }
      if (w < 1) w = 1;
      if (h < 1) h = 1;
      return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) };
    }
    case "ellipse": {
      const { cx, cy } = origProps as { cx: number; cy: number; rx: number; ry: number };
      let { rx, ry } = origProps as { cx: number; cy: number; rx: number; ry: number };
      if (handle.includes("e") || handle.includes("w")) rx = Math.max(1, rx + (handle.includes("w") ? -dx / 2 : dx / 2));
      if (handle.includes("s") || handle.includes("n")) ry = Math.max(1, ry + (handle.includes("n") ? -dy / 2 : dy / 2));
      return { cx: Math.round(cx), cy: Math.round(cy), rx: Math.round(rx), ry: Math.round(ry) };
    }
    default:
      return {};
  }
}

export function getOrigProps(element: NpngElement): Record<string, number> {
  const e = element as InteractiveElement;
  switch (element.type) {
    case "rect": return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 0, height: e.height ?? 0 };
    case "ellipse": return { cx: e.cx ?? 0, cy: e.cy ?? 0, rx: e.rx ?? 0, ry: e.ry ?? 0 };
    case "line": return { x1: e.x1 ?? 0, y1: e.y1 ?? 0, x2: e.x2 ?? 0, y2: e.y2 ?? 0 };
    case "path": return {};
    case "text": return { x: e.x ?? 0, y: e.y ?? 0 };
    case "image": return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 100, height: e.height ?? 100 };
    case "frame": return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 0, height: e.height ?? 0 };
    case "component-instance": return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 100, height: e.height ?? 100 };
    default: return {};
  }
}
