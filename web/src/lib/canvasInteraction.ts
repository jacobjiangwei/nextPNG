import type { BoundingBox } from "./hitTest";
import type { NpngElement, TransformSpec } from "./types";
import { parsePath } from "./pathParser";
import { applyConstraints } from "./constraints";

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
const ROTATION_HANDLE_OFFSET = 28;
const ROTATION_HANDLE_RADIUS = 6;

function viewportScaled(value: number, viewportScale = 1): number {
  return value / Math.max(0.1, viewportScale);
}

export function getHandles(box: BoundingBox, viewportScale = 1): HandleRect[] {
  const { x, y, width: w, height: h } = box;
  const s = viewportScaled(HANDLE_SIZE, viewportScale);
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

export function getHandleAtPoint(box: BoundingBox, px: number, py: number, viewportScale = 1): HandleId | null {
  for (const h of getHandles(box, viewportScale)) {
    if (px >= h.x && px <= h.x + h.size && py >= h.y && py <= h.y + h.size) {
      return h.id;
    }
  }
  return null;
}

export function getRotationHandle(box: BoundingBox, viewportScale = 1): { x: number; y: number; radius: number } {
  return {
    x: box.x + box.width / 2,
    y: box.y - viewportScaled(ROTATION_HANDLE_OFFSET, viewportScale),
    radius: viewportScaled(ROTATION_HANDLE_RADIUS, viewportScale),
  };
}

export function getRotationHandleAtPoint(box: BoundingBox, px: number, py: number, viewportScale = 1): boolean {
  const handle = getRotationHandle(box, viewportScale);
  return Math.hypot(px - handle.x, py - handle.y) <= handle.radius + viewportScaled(4, viewportScale);
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

function boxCenter(box: BoundingBox): [number, number] {
  return [box.x + box.width / 2, box.y + box.height / 2];
}

function angleDegrees(cx: number, cy: number, x: number, y: number): number {
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
}

export function getRotationOrigProps(
  element: NpngElement,
  untransformedBox: BoundingBox,
  startX: number,
  startY: number
): Record<string, number> {
  const [defaultOriginX, defaultOriginY] = boxCenter(untransformedBox);
  const hasExplicitOrigin = !!element.transform?.origin;
  const preserveMissingOrigin =
    !!element.transform &&
    !hasExplicitOrigin &&
    (element.transform.rotate !== undefined || element.transform.scale !== undefined);
  const [originX, originY] = preserveMissingOrigin ? [0, 0] : element.transform?.origin ?? [defaultOriginX, defaultOriginY];
  const [translateX, translateY] = element.transform?.translate ?? [0, 0];
  const visualOriginX = originX + translateX;
  const visualOriginY = originY + translateY;
  return {
    originX,
    originY,
    visualOriginX,
    visualOriginY,
    rotate: element.transform?.rotate ?? 0,
    preserveMissingOrigin: preserveMissingOrigin ? 1 : 0,
    startAngle: angleDegrees(visualOriginX, visualOriginY, startX, startY),
  };
}

export function applyRotation(element: NpngElement, x: number, y: number, origProps: Record<string, number>, snapDegrees = 0): Record<string, unknown> {
  const originX = origProps.originX ?? 0;
  const originY = origProps.originY ?? 0;
  const visualOriginX = origProps.visualOriginX ?? originX;
  const visualOriginY = origProps.visualOriginY ?? originY;
  const startAngle = origProps.startAngle ?? 0;
  const initialRotate = origProps.rotate ?? 0;
  let nextRotate = roundCoord(initialRotate + angleDegrees(visualOriginX, visualOriginY, x, y) - startAngle);
  if (snapDegrees > 0) {
    nextRotate = roundCoord(Math.round(nextRotate / snapDegrees) * snapDegrees);
  }
  if (origProps.preserveMissingOrigin) {
    const transform: TransformSpec = {
      ...element.transform,
      rotate: nextRotate,
    };
    delete transform.origin;
    return { transform };
  }
  return {
    transform: {
      ...element.transform,
      rotate: nextRotate,
      origin: [roundCoord(originX), roundCoord(originY)] as [number, number],
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
    case "group":
      if (element.transform) {
        const currentTranslate = element.transform.translate ?? [0, 0];
        return {
          transform: {
            ...element.transform,
            translate: [
              (origProps.translateX ?? currentTranslate[0]) + dx,
              (origProps.translateY ?? currentTranslate[1]) + dy,
            ],
          },
        };
      }
      return {
        elements: (element.elements ?? []).map((child) => {
          const movedChild = structuredClone(child);
          const props = applyMove(child, dx, dy, getOrigProps(child));
          Object.assign(movedChild, props);
          return movedChild;
        }),
        ...moveTransformOrigin(element, dx, dy),
      };
    default:
      return {};
  }
}

export function applyResize(
  element: NpngElement, handle: HandleId, dx: number, dy: number, origProps: Record<string, number>
): Record<string, unknown> {
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
      const nextFrame = { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) };
      if (element.type === "frame" && element.children?.length) {
        const oldParent = {
          x: origProps.x ?? element.x ?? 0,
          y: origProps.y ?? element.y ?? 0,
          width: origProps.width ?? element.width ?? 0,
          height: origProps.height ?? element.height ?? 0,
        };
        const children = element.children.map((child) => {
          if (
            child.constraints &&
            "x" in child &&
            "y" in child &&
            "width" in child &&
            "height" in child &&
            typeof child.x === "number" &&
            typeof child.y === "number" &&
            typeof child.width === "number" &&
            typeof child.height === "number"
          ) {
            const childBounds = {
              x: child.x,
              y: child.y,
              width: child.width,
              height: child.height,
            };
            return {
              ...child,
              ...applyConstraints(childBounds, oldParent, nextFrame, child.constraints),
            };
          }
          return child;
        });
        return { ...nextFrame, children };
      }
      return nextFrame;
    }
    case "ellipse": {
      const { cx, cy } = origProps as { cx: number; cy: number; rx: number; ry: number };
      let { rx, ry } = origProps as { cx: number; cy: number; rx: number; ry: number };
      if (handle.includes("e") || handle.includes("w")) rx = Math.max(1, rx + (handle.includes("w") ? -dx / 2 : dx / 2));
      if (handle.includes("s") || handle.includes("n")) ry = Math.max(1, ry + (handle.includes("n") ? -dy / 2 : dy / 2));
      return { cx: Math.round(cx), cy: Math.round(cy), rx: Math.round(rx), ry: Math.round(ry) };
    }
    case "text": {
      if (element.spans?.length) return {};
      let { x, width } = origProps as { x: number; width: number };
      if (!width || width <= 0) return {};
      if (handle.includes("w")) { x += dx; width -= dx; }
      if (handle.includes("e")) { width += dx; }
      return { x: Math.round(x), width: Math.max(1, Math.round(width)) };
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
    case "group": return { translateX: element.transform?.translate?.[0] ?? 0, translateY: element.transform?.translate?.[1] ?? 0 };
    case "text": return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 0 };
    case "image": return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 100, height: e.height ?? 100 };
    case "frame": return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 0, height: e.height ?? 0 };
    case "component-instance": return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 100, height: e.height ?? 100 };
    default: return {};
  }
}
