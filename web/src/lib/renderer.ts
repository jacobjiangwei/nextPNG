import { parseColor, rgbaString, RGBA } from "./colors";
import { tracePath } from "./pathParser";
import type { NpngDocument, NpngElement, FillSpec, StrokeSpec, TransformSpec, Layer, DefItem, FilterSpec } from "./types";

function applyFill(ctx: CanvasRenderingContext2D, fillSpec: FillSpec): boolean {
  if (fillSpec === null || fillSpec === undefined || fillSpec === "none") return false;
  if (typeof fillSpec === "string") {
    const c = parseColor(fillSpec);
    if (c) {
      ctx.fillStyle = rgbaString(c);
      return true;
    }
    return false;
  }
  if (typeof fillSpec === "object") {
    if (fillSpec.type === "linear-gradient") {
      const grad = ctx.createLinearGradient(fillSpec.x1, fillSpec.y1, fillSpec.x2, fillSpec.y2);
      for (const stop of fillSpec.stops || []) {
        const c = parseColor(stop.color);
        if (c) grad.addColorStop(stop.offset, rgbaString(c));
      }
      ctx.fillStyle = grad;
      return true;
    }
    if (fillSpec.type === "radial-gradient") {
      const grad = ctx.createRadialGradient(fillSpec.cx, fillSpec.cy, 0, fillSpec.cx, fillSpec.cy, fillSpec.r);
      for (const stop of fillSpec.stops || []) {
        const c = parseColor(stop.color);
        if (c) grad.addColorStop(stop.offset, rgbaString(c));
      }
      ctx.fillStyle = grad;
      return true;
    }
  }
  return false;
}

function applyStroke(ctx: CanvasRenderingContext2D, strokeSpec: StrokeSpec): void {
  const c = parseColor(strokeSpec.color ?? "#000000");
  if (c) ctx.strokeStyle = rgbaString(c);
  ctx.lineWidth = strokeSpec.width ?? 1;
  if (strokeSpec.dash) {
    ctx.setLineDash(strokeSpec.dash);
  } else {
    ctx.setLineDash([]);
  }
  const capMap: Record<string, CanvasLineCap> = { butt: "butt", round: "round", square: "square" };
  ctx.lineCap = capMap[strokeSpec.cap ?? "butt"] ?? "butt";
  const joinMap: Record<string, CanvasLineJoin> = { miter: "miter", round: "round", bevel: "bevel" };
  ctx.lineJoin = joinMap[strokeSpec.join ?? "miter"] ?? "miter";
  ctx.stroke();
}

function applyTransform(ctx: CanvasRenderingContext2D, t: TransformSpec): void {
  if (t.translate) ctx.translate(t.translate[0], t.translate[1]);
  if (t.rotate !== undefined) ctx.rotate((t.rotate * Math.PI) / 180);
  if (t.scale !== undefined) {
    if (Array.isArray(t.scale)) ctx.scale(t.scale[0], t.scale[1]);
    else ctx.scale(t.scale, t.scale);
  }
}

function renderElement(ctx: CanvasRenderingContext2D, elem: NpngElement, defs?: Map<string, DefItem>): void {
  const fill = (elem as any).fill as FillSpec | undefined;
  const stroke = (elem as any).stroke as StrokeSpec | undefined;
  const transform = (elem as any).transform as TransformSpec | undefined;
  const elemOpacity = (elem as any).opacity ?? 1.0;

  ctx.save();

  if (elemOpacity < 1.0) ctx.globalAlpha *= elemOpacity;

  if (transform) {
    const origin = transform.origin;
    if (origin) {
      ctx.translate(origin[0], origin[1]);
      applyTransform(ctx, transform);
      ctx.translate(-origin[0], -origin[1]);
    } else {
      applyTransform(ctx, transform);
    }
  }

  const etype = elem.type;

  if (etype === "rect") {
    const e = elem as any;
    const x = e.x ?? 0, y = e.y ?? 0, w = e.width ?? 0, h = e.height ?? 0;
    const rx = e.rx ?? 0, ry = e.ry ?? 0;
    ctx.beginPath();
    if (rx > 0 || ry > 0) {
      const r = Math.max(rx, ry);
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    } else {
      ctx.rect(x, y, w, h);
    }
    if (applyFill(ctx, fill ?? null)) ctx.fill();
    if (stroke) applyStroke(ctx, stroke);
  } else if (etype === "ellipse") {
    const e = elem as any;
    const cxE = e.cx ?? 0, cyE = e.cy ?? 0, rxE = e.rx ?? 0, ryE = e.ry ?? 0;
    ctx.beginPath();
    ctx.ellipse(cxE, cyE, rxE, ryE, 0, 0, Math.PI * 2);
    if (applyFill(ctx, fill ?? null)) ctx.fill();
    if (stroke) applyStroke(ctx, stroke);
  } else if (etype === "line") {
    const e = elem as any;
    ctx.beginPath();
    ctx.moveTo(e.x1 ?? 0, e.y1 ?? 0);
    ctx.lineTo(e.x2 ?? 0, e.y2 ?? 0);
    if (stroke) {
      applyStroke(ctx, stroke);
    } else {
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (etype === "text") {
    const e = elem as any;
    const x = e.x ?? 0, y = e.y ?? 0;
    const content = e.content ?? "";
    const fontSize = e.font_size ?? 16;
    const fontFamily = e.font_family ?? "sans-serif";
    const fontWeight = e.font_weight ?? "normal";
    const align = e.align ?? "left";

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = align as CanvasTextAlign;
    ctx.textBaseline = "alphabetic";

    if (applyFill(ctx, fill ?? null)) {
      ctx.fillText(content, x, y);
    } else {
      ctx.fillStyle = "black";
      ctx.fillText(content, x, y);
    }
  } else if (etype === "path") {
    const e = elem as any;
    const d = e.d ?? "";
    const fillRule = e.fill_rule === "evenodd" ? "evenodd" : "nonzero";
    ctx.beginPath();
    tracePath(ctx, d);
    if (applyFill(ctx, fill ?? null)) ctx.fill(fillRule as CanvasFillRule);
    if (stroke) applyStroke(ctx, stroke);
  } else if (etype === "group") {
    const e = elem as any;
    for (const child of e.elements ?? []) {
      renderElement(ctx, child, defs);
    }
  } else if (etype === "use") {
    const e = elem as any;
    const refId = e.ref;
    if (refId && defs?.has(refId)) {
      const refElem = { ...defs.get(refId)! } as any;
      for (const k of ["x", "y", "cx", "cy", "transform"]) {
        if (k in e) refElem[k] = e[k];
      }
      renderElement(ctx, refElem, defs);
    }
  }

  ctx.restore();
}

export function renderNpng(data: NpngDocument, canvas: HTMLCanvasElement): void {
  const canvasSpec = data.canvas ?? {};
  const width = canvasSpec.width ?? 800;
  const height = canvasSpec.height ?? 600;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);

  // Background
  const bg = parseColor(canvasSpec.background);
  if (bg) {
    ctx.fillStyle = rgbaString(bg);
    ctx.fillRect(0, 0, width, height);
  }

  // Build defs map
  const defs = new Map<string, DefItem>();
  for (const d of data.defs ?? []) {
    if (d.id) defs.set(d.id, d);
  }

  // Render layers
  for (const layer of data.layers ?? []) {
    if (layer.visible === false) continue;
    const opacity = layer.opacity ?? 1.0;
    const blendMode = layer.blend_mode ?? "normal";
    const clipPath = layer.clip_path;
    const maskRef = layer.mask;
    const layerFilters = layer.filters;

    // Render layer to offscreen canvas
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const lctx = offscreen.getContext("2d")!;

    // Clip path
    if (clipPath) {
      lctx.beginPath();
      tracePath(lctx, clipPath);
      lctx.clip();
    }

    for (const elem of layer.elements ?? []) {
      renderElement(lctx, elem, defs);
    }

    // Apply filters
    if (layerFilters) {
      applyCanvasFilters(offscreen, layerFilters);
    }

    // Apply mask
    if (maskRef && defs.has(maskRef)) {
      const maskDef = defs.get(maskRef)! as any;
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const mctx = maskCanvas.getContext("2d")!;
      for (const melem of maskDef.elements ?? []) {
        renderElement(mctx, melem, defs);
      }
      // Use mask alpha to modulate layer
      const layerData = lctx.getImageData(0, 0, width, height);
      const maskData = mctx.getImageData(0, 0, width, height);
      for (let i = 0; i < layerData.data.length; i += 4) {
        const ma = maskData.data[i + 3] / 255;
        layerData.data[i] = Math.round(layerData.data[i] * ma);
        layerData.data[i + 1] = Math.round(layerData.data[i + 1] * ma);
        layerData.data[i + 2] = Math.round(layerData.data[i + 2] * ma);
        layerData.data[i + 3] = Math.round(layerData.data[i + 3] * ma);
      }
      lctx.putImageData(layerData, 0, 0);
    }

    // Composite onto main canvas
    ctx.save();
    ctx.globalAlpha = opacity;
    // Map blend modes to Canvas globalCompositeOperation
    const blendMap: Record<string, GlobalCompositeOperation> = {
      normal: "source-over",
      multiply: "multiply",
      screen: "screen",
      overlay: "overlay",
      darken: "darken",
      lighten: "lighten",
      "color-dodge": "color-dodge",
      "color-burn": "color-burn",
      "hard-light": "hard-light",
      "soft-light": "soft-light",
      difference: "difference",
      exclusion: "exclusion",
    };
    ctx.globalCompositeOperation = blendMap[blendMode] ?? "source-over";
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  }
}

function applyCanvasFilters(canvas: HTMLCanvasElement, filters: FilterSpec[]): void {
  const ctx = canvas.getContext("2d")!;
  for (const f of filters) {
    if (f.type === "blur" && f.radius) {
      // Re-draw with CSS filter
      const temp = document.createElement("canvas");
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tctx = temp.getContext("2d")!;
      tctx.filter = `blur(${f.radius}px)`;
      tctx.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(temp, 0, 0);
    } else if (f.type === "drop-shadow") {
      const color = f.color ?? "#00000080";
      const temp = document.createElement("canvas");
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tctx = temp.getContext("2d")!;
      tctx.shadowOffsetX = f.dx ?? 3;
      tctx.shadowOffsetY = f.dy ?? 3;
      tctx.shadowBlur = f.radius ?? 3;
      tctx.shadowColor = color;
      tctx.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(temp, 0, 0);
    }
  }
}
