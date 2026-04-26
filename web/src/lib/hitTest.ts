import type { NpngDocument, NpngElement, TransformSpec } from "./types";
import type { ElementAddress } from "./editorState";
import { parsePath } from "./pathParser";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

let textMeasureContext: CanvasRenderingContext2D | null = null;

function getTextMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (textMeasureContext) return textMeasureContext;
  const canvas = document.createElement("canvas");
  textMeasureContext = canvas.getContext("2d");
  return textMeasureContext;
}

function countMeasuredWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number {
  const safeMaxWidth = Math.max(1, maxWidth);
  let lineCount = 0;

  const splitLongWord = (word: string): string[] => {
    const chunks: string[] = [];
    let chunk = "";
    for (const char of Array.from(word)) {
      const candidate = `${chunk}${char}`;
      if (chunk && ctx.measureText(candidate).width > safeMaxWidth) {
        chunks.push(chunk);
        chunk = char;
      } else {
        chunk = candidate;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  };

  for (const paragraph of text.split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lineCount += 1;
      continue;
    }

    let line = "";
    for (const word of words) {
      if (ctx.measureText(word).width > safeMaxWidth) {
        if (line) {
          lineCount += 1;
          line = "";
        }
        const chunks = splitLongWord(word);
        lineCount += Math.max(0, chunks.length - 1);
        line = chunks[chunks.length - 1] ?? "";
        continue;
      }

      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > safeMaxWidth) {
        lineCount += 1;
        line = word;
      } else {
        line = candidate;
      }
    }
    lineCount += 1;
  }

  return Math.max(1, lineCount);
}

function emptyBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function addPoint(bounds: ReturnType<typeof emptyBounds>, x: number, y: number): void {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function pathBoundingBox(d?: string): BoundingBox {
  if (!d) return { x: 0, y: 0, width: 0, height: 0 };
  const bounds = emptyBounds();
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;

  for (const [cmd, args] of parsePath(d)) {
    if (cmd === "M" || cmd === "L" || cmd === "T") {
      for (let j = 0; j + 1 < args.length; j += 2) {
        cx = args[j];
        cy = args[j + 1];
        if (cmd === "M" && j === 0) {
          sx = cx;
          sy = cy;
        }
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "m" || cmd === "l" || cmd === "t") {
      for (let j = 0; j + 1 < args.length; j += 2) {
        cx += args[j];
        cy += args[j + 1];
        if (cmd === "m" && j === 0) {
          sx = cx;
          sy = cy;
        }
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "H") {
      for (const x of args) {
        cx = x;
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "h") {
      for (const x of args) {
        cx += x;
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "V") {
      for (const y of args) {
        cy = y;
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "v") {
      for (const y of args) {
        cy += y;
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "C") {
      for (let j = 0; j + 5 < args.length; j += 6) {
        addPoint(bounds, args[j], args[j + 1]);
        addPoint(bounds, args[j + 2], args[j + 3]);
        cx = args[j + 4];
        cy = args[j + 5];
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "c") {
      for (let j = 0; j + 5 < args.length; j += 6) {
        addPoint(bounds, cx + args[j], cy + args[j + 1]);
        addPoint(bounds, cx + args[j + 2], cy + args[j + 3]);
        cx += args[j + 4];
        cy += args[j + 5];
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "S" || cmd === "Q") {
      const step = cmd === "S" ? 4 : 4;
      for (let j = 0; j + step - 1 < args.length; j += step) {
        addPoint(bounds, args[j], args[j + 1]);
        cx = args[j + step - 2];
        cy = args[j + step - 1];
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "s" || cmd === "q") {
      const step = cmd === "s" ? 4 : 4;
      for (let j = 0; j + step - 1 < args.length; j += step) {
        addPoint(bounds, cx + args[j], cy + args[j + 1]);
        cx += args[j + step - 2];
        cy += args[j + step - 1];
        addPoint(bounds, cx, cy);
      }
    } else if (cmd === "A" || cmd === "a") {
      for (let j = 0; j + 6 < args.length; j += 7) {
        const rx = Math.abs(args[j]);
        const ry = Math.abs(args[j + 1]);
        const ex = cmd === "A" ? args[j + 5] : cx + args[j + 5];
        const ey = cmd === "A" ? args[j + 6] : cy + args[j + 6];
        addPoint(bounds, cx - rx, cy - ry);
        addPoint(bounds, cx + rx, cy + ry);
        addPoint(bounds, ex - rx, ey - ry);
        addPoint(bounds, ex + rx, ey + ry);
        cx = ex;
        cy = ey;
      }
    } else if (cmd === "Z" || cmd === "z") {
      cx = sx;
      cy = sy;
      addPoint(bounds, cx, cy);
    }
  }

  if (!Number.isFinite(bounds.minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: Math.max(1, bounds.maxX - bounds.minX),
    height: Math.max(1, bounds.maxY - bounds.minY),
  };
}

function transformPoint(x: number, y: number, transform: TransformSpec): { x: number; y: number } {
  let px = x;
  let py = y;
  const origin = transform.origin;
  if (origin) {
    px -= origin[0];
    py -= origin[1];
  }

  if (transform.scale !== undefined) {
    const sx = Array.isArray(transform.scale) ? transform.scale[0] : transform.scale;
    const sy = Array.isArray(transform.scale) ? transform.scale[1] : transform.scale;
    px *= sx;
    py *= sy;
  }

  if (transform.rotate !== undefined) {
    const angle = (transform.rotate * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    px = rx;
    py = ry;
  }

  if (transform.translate) {
    px += transform.translate[0];
    py += transform.translate[1];
  }

  if (origin) {
    px += origin[0];
    py += origin[1];
  }

  return { x: px, y: py };
}

function applyTransformToBox(box: BoundingBox, transform?: TransformSpec): BoundingBox {
  if (!transform) return box;
  const points = [
    transformPoint(box.x, box.y, transform),
    transformPoint(box.x + box.width, box.y, transform),
    transformPoint(box.x + box.width, box.y + box.height, transform),
    transformPoint(box.x, box.y + box.height, transform),
  ];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function getRawBoundingBox(element: NpngElement): BoundingBox {
  switch (element.type) {
    case "rect":
      return { x: element.x ?? 0, y: element.y ?? 0, width: element.width ?? 0, height: element.height ?? 0 };
    case "ellipse": {
      const cx = element.cx ?? 0, cy = element.cy ?? 0, rx = element.rx ?? 0, ry = element.ry ?? 0;
      return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
    }
    case "line": {
      const x1 = element.x1 ?? 0, y1 = element.y1 ?? 0, x2 = element.x2 ?? 0, y2 = element.y2 ?? 0;
      const minX = Math.min(x1, x2), minY = Math.min(y1, y2);
      return { x: minX, y: minY, width: Math.abs(x2 - x1) || 2, height: Math.abs(y2 - y1) || 2 };
    }
    case "text": {
      const fontSize = element.font_size ?? 16;
      const content = element.content ?? "";
      const lineHeight = fontSize * (element.line_height && element.line_height > 0 ? element.line_height : 1.2);
      // Account for spans if present
      let approxWidth: number;
      if (element.spans && Array.isArray(element.spans) && element.spans.length > 0) {
        approxWidth = 0;
        for (const span of element.spans) {
          const sFontSize = span.font_size ?? fontSize;
          approxWidth += (span.text?.length ?? 0) * sFontSize * 0.6;
        }
      } else {
        approxWidth = content.length * fontSize * 0.6;
      }
      const x = element.x ?? 0, y = element.y ?? 0;
      const align = element.align ?? "left";
      if (!element.spans?.length && element.width && element.width > 0) {
        const measureContext = getTextMeasureContext();
        let wrappedLineCount: number;
        if (measureContext) {
          measureContext.font = `${element.font_weight ?? "normal"} ${fontSize}px ${element.font_family ?? "sans-serif"}`;
          wrappedLineCount = countMeasuredWrappedLines(measureContext, content, element.width);
        } else {
          const avgCharsPerLine = Math.max(1, Math.floor(element.width / Math.max(1, fontSize * 0.45)));
          wrappedLineCount = content
            .split("\n")
            .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / avgCharsPerLine)), 0);
        }
        return { x, y, width: element.width, height: Math.max(lineHeight, wrappedLineCount * lineHeight) };
      }
      let bx = x;
      if (align === "center") bx = x - approxWidth / 2;
      else if (align === "right") bx = x - approxWidth;
      return { x: bx, y: y - fontSize, width: approxWidth, height: lineHeight };
    }
    case "path": {
      const box = pathBoundingBox(element.d);
      const padding = (element.stroke?.width ?? 0) / 2;
      return {
        x: box.x - padding,
        y: box.y - padding,
        width: box.width + padding * 2,
        height: box.height + padding * 2,
      };
    }
    case "group": {
      const boxes = (element.elements ?? []).map(getBoundingBox);
      return mergeBoundingBoxes(boxes) ?? { x: 0, y: 0, width: 0, height: 0 };
    }
    case "image":
      return { x: element.x ?? 0, y: element.y ?? 0, width: element.width ?? 100, height: element.height ?? 100 };
    case "frame":
      return { x: element.x ?? 0, y: element.y ?? 0, width: element.width ?? 0, height: element.height ?? 0 };
    case "component-instance":
      return { x: element.x ?? 0, y: element.y ?? 0, width: element.width ?? 100, height: element.height ?? 100 };
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

export function getBoundingBox(element: NpngElement): BoundingBox {
  return applyTransformToBox(getRawBoundingBox(element), element.transform);
}

export function pointInBox(px: number, py: number, box: BoundingBox, padding = 4): boolean {
  return px >= box.x - padding && px <= box.x + box.width + padding &&
         py >= box.y - padding && py <= box.y + box.height + padding;
}

export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y;
}

export function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox | null {
  if (boxes.length === 0) return null;
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getSelectionBoundingBox(doc: NpngDocument, selection: ElementAddress[]): BoundingBox | null {
  const boxes = selection.flatMap((address) => {
    const element = doc.layers?.[address.layerIndex]?.elements?.[address.elementIndex];
    return element ? [getBoundingBox(element)] : [];
  });
  return mergeBoundingBoxes(boxes);
}

export function hitTest(doc: NpngDocument, px: number, py: number): ElementAddress | null {
  const all = hitTestAll(doc, px, py);
  return all.length > 0 ? all[0] : null;
}

export function hitTestAll(doc: NpngDocument, px: number, py: number): ElementAddress[] {
  if (!doc.layers) return [];
  const results: ElementAddress[] = [];
  for (let li = doc.layers.length - 1; li >= 0; li--) {
    const layer = doc.layers[li];
    if (layer.visible === false || layer.locked) continue;
    const elements = layer.elements ?? [];
    for (let ei = elements.length - 1; ei >= 0; ei--) {
      if (elements[ei].locked) continue;
      const box = getBoundingBox(elements[ei]);
      if (pointInBox(px, py, box)) {
        results.push({ layerIndex: li, elementIndex: ei });
      }
    }
  }
  return results;
}

export function hitTestBox(doc: NpngDocument, box: BoundingBox): ElementAddress[] {
  if (!doc.layers) return [];
  const results: ElementAddress[] = [];
  for (let li = 0; li < doc.layers.length; li++) {
    const layer = doc.layers[li];
    if (layer.visible === false || layer.locked) continue;
    const elements = layer.elements ?? [];
    for (let ei = 0; ei < elements.length; ei++) {
      if (elements[ei].locked) continue;
      if (boxesIntersect(getBoundingBox(elements[ei]), box)) {
        results.push({ layerIndex: li, elementIndex: ei });
      }
    }
  }
  return results;
}
