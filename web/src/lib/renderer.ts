import { parseColor, rgbaString } from "./colors";
import { tracePath } from "./pathParser";
import { computeLayout } from "./autoLayout";
import { resolveInstance } from "./componentSystem";
import { getBoundingBox, mergeBoundingBoxes, type BoundingBox } from "./hitTest";
import { ensureFontsLoaded, isKnownFont } from "./fonts";
import type { NpngDocument, NpngElement, FillSpec, StrokeSpec, TransformSpec, FilterSpec, DefItem, ArrowEndType, ComponentDef, FillLayer, StrokeLayer, EffectSpec } from "./types";

const imageCache = new Map<string, HTMLImageElement>();
const canvasRenderVersions = new WeakMap<HTMLCanvasElement, number>();

interface RenderOptions {
  pixelRatio?: number;
}

type ContainerElement = Extract<NpngElement, { type: "group" }> | Extract<NpngElement, { type: "frame" }>;

function getRenderPixelRatio(options?: RenderOptions): number {
  const ratio = options?.pixelRatio ?? 1;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function configureCanvasContext(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

function isNpngElement(value: unknown): value is NpngElement {
  if (!value || typeof value !== "object") return false;
  const maybeElement = value as { type?: unknown };
  return typeof maybeElement.type === "string";
}

function toCompositeOperation(mode?: string): GlobalCompositeOperation {
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
  return blendMap[mode ?? "normal"] ?? "source-over";
}

function loadImage(href: string, onLoad?: () => void): HTMLImageElement | null {
  if (imageCache.has(href)) {
    const img = imageCache.get(href)!;
    if (!img.complete && onLoad) img.addEventListener("load", onLoad, { once: true });
    return img.complete ? img : null;
  }
  const img = new Image();
  if (onLoad) img.addEventListener("load", onLoad, { once: true });
  img.src = href;
  imageCache.set(href, img);
  return img.complete ? img : null;
}

function preloadImage(href: string): Promise<void> {
  const cached = imageCache.get(href);
  if (cached?.complete && cached.naturalWidth > 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const img = cached ?? new Image();
    const cleanup = () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error(`Could not load image: ${href.slice(0, 80)}`));
    };

    img.addEventListener("load", handleLoad, { once: true });
    img.addEventListener("error", handleError, { once: true });
    if (!cached) {
      imageCache.set(href, img);
      img.src = href;
    } else if (img.complete) {
      cleanup();
      if (img.naturalWidth > 0) resolve();
      else reject(new Error(`Could not load image: ${href.slice(0, 80)}`));
    }
  });
}

function collectElementImageHrefs(
  element: NpngElement,
  hrefs: Set<string>,
  components: ComponentDef[],
  defs: Map<string, DefItem>,
  resolvingComponentIds = new Set<string>()
): void {
  if (element.visible === false) return;
  if (element.type === "image" && element.href) hrefs.add(element.href);
  if (element.type === "group") {
    for (const child of element.elements ?? []) collectElementImageHrefs(child, hrefs, components, defs, resolvingComponentIds);
  }
  if (element.type === "frame") {
    for (const child of element.children ?? []) collectElementImageHrefs(child, hrefs, components, defs, resolvingComponentIds);
  }
  if (element.type === "use" && element.ref) {
    const def = defs.get(element.ref);
    if (def && isNpngElement(def)) collectElementImageHrefs(def, hrefs, components, defs, resolvingComponentIds);
  }
  if (element.type === "component-instance" && element.component_id && !resolvingComponentIds.has(element.component_id)) {
    const nextResolving = new Set(resolvingComponentIds);
    nextResolving.add(element.component_id);
    const resolved = resolveInstance(element, components);
    if (resolved) collectElementImageHrefs(resolved, hrefs, components, defs, nextResolving);
  }
}

function collectMaskImageHrefs(def: DefItem, hrefs: Set<string>, components: ComponentDef[], defs: Map<string, DefItem>): void {
  if (isNpngElement(def)) {
    collectElementImageHrefs(def, hrefs, components, defs);
    return;
  }

  const maybeElementList = def as { elements?: unknown };
  if (Array.isArray(maybeElementList.elements)) {
    for (const item of maybeElementList.elements) {
      if (isNpngElement(item)) collectElementImageHrefs(item, hrefs, components, defs);
    }
  }
}

function collectElementFonts(
  element: NpngElement,
  fonts: Set<string>,
  components: ComponentDef[],
  defs: Map<string, DefItem>,
  resolvingComponentIds = new Set<string>()
): void {
  if (element.visible === false) return;
  if (element.type === "text") {
    const family = element.font_family;
    if (family && isKnownFont(family)) fonts.add(family);
  }
  if (element.type === "group") {
    for (const child of element.elements ?? []) collectElementFonts(child, fonts, components, defs, resolvingComponentIds);
  }
  if (element.type === "frame") {
    for (const child of element.children ?? []) collectElementFonts(child, fonts, components, defs, resolvingComponentIds);
  }
  if (element.type === "use" && element.ref) {
    const def = defs.get(element.ref);
    if (def && isNpngElement(def)) collectElementFonts(def, fonts, components, defs, resolvingComponentIds);
  }
  if (element.type === "component-instance" && element.component_id && !resolvingComponentIds.has(element.component_id)) {
    const nextResolving = new Set(resolvingComponentIds);
    nextResolving.add(element.component_id);
    const resolved = resolveInstance(element, components);
    if (resolved) collectElementFonts(resolved, fonts, components, defs, nextResolving);
  }
}

export async function preloadNpngImages(data: NpngDocument): Promise<void> {
  const hrefs = new Set<string>();
  const fontFamilies = new Set<string>();
  const components = data.components ?? [];
  const defs = new Map<string, DefItem>();
  for (const def of data.defs ?? []) {
    if (def.id) defs.set(def.id, def);
  }

  for (const layer of data.layers ?? []) {
    if (layer.visible === false) continue;
    for (const element of layer.elements ?? []) {
      collectElementImageHrefs(element, hrefs, components, defs);
      collectElementFonts(element, fontFamilies, components, defs);
    }
    if (layer.mask && defs.has(layer.mask)) {
      collectMaskImageHrefs(defs.get(layer.mask)!, hrefs, components, defs);
    }
  }

  await Promise.all([
    ...([...hrefs].map(preloadImage)),
    ensureFontsLoaded(fontFamilies),
  ]);
}

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

function applyStrokeStyle(ctx: CanvasRenderingContext2D, strokeSpec: StrokeSpec): void {
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
}

function applyStroke(ctx: CanvasRenderingContext2D, strokeSpec: StrokeSpec): void {
  applyStrokeStyle(ctx, strokeSpec);
  ctx.stroke();
}

function colorWithOpacity(color: string, opacity?: number): string {
  const parsed = parseColor(color);
  if (!parsed) return color;
  if (opacity !== undefined) parsed[3] *= Math.max(0, Math.min(1, opacity));
  return rgbaString(parsed);
}

function buildCanvasFilter(
  filters?: FilterSpec[],
  effects?: EffectSpec[],
  pixelRatio = 1,
  adjustments?: Extract<NpngElement, { type: "image" }>["adjustments"]
): string {
  const parts: string[] = [];

  if (adjustments) {
    if (adjustments.brightness !== undefined) parts.push(`brightness(${100 + adjustments.brightness}%)`);
    if (adjustments.contrast !== undefined) parts.push(`contrast(${100 + adjustments.contrast}%)`);
    if (adjustments.saturation !== undefined) parts.push(`saturate(${100 + adjustments.saturation}%)`);
    if (adjustments.hue_rotate !== undefined) parts.push(`hue-rotate(${adjustments.hue_rotate}deg)`);
  }

  for (const filter of filters ?? []) {
    if (filter.type === "blur" && filter.radius) {
      parts.push(`blur(${filter.radius * pixelRatio}px)`);
    } else if (filter.type === "drop-shadow") {
      parts.push(`drop-shadow(${(filter.dx ?? 3) * pixelRatio}px ${(filter.dy ?? 3) * pixelRatio}px ${(filter.radius ?? 3) * pixelRatio}px ${filter.color ?? "#00000080"})`);
    }
  }

  for (const effect of effects ?? []) {
    if (effect.type === "blur" && effect.radius) {
      parts.push(`blur(${effect.radius * pixelRatio}px)`);
    } else if (effect.type === "drop-shadow") {
      parts.push(`drop-shadow(${(effect.dx ?? 0) * pixelRatio}px ${(effect.dy ?? 4) * pixelRatio}px ${(effect.radius ?? 8) * pixelRatio}px ${colorWithOpacity(effect.color ?? "#00000066", effect.opacity)})`);
    } else if (effect.type === "outer-glow") {
      parts.push(`drop-shadow(0px 0px ${(effect.radius ?? 8) * pixelRatio}px ${colorWithOpacity(effect.color ?? "#FFFFFF80", effect.opacity)})`);
    }
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

function applyInnerEffects(
  ctx: CanvasRenderingContext2D,
  effects: EffectSpec[] | undefined,
  buildPath: () => void
): void {
  const innerEffects = (effects ?? []).filter((effect) => effect.type === "inner-shadow" || effect.type === "inner-glow");
  for (const effect of innerEffects) {
    ctx.save();
    buildPath();
    ctx.clip();
    ctx.globalAlpha *= effect.opacity ?? 1;
    ctx.globalCompositeOperation = toCompositeOperation(effect.blend_mode ?? "normal");
    ctx.shadowColor = colorWithOpacity(effect.color ?? (effect.type === "inner-glow" ? "#FFFFFF80" : "#00000066"));
    ctx.shadowBlur = effect.radius ?? 8;
    ctx.shadowOffsetX = effect.type === "inner-glow" ? 0 : effect.dx ?? 0;
    ctx.shadowOffsetY = effect.type === "inner-glow" ? 0 : effect.dy ?? 2;
    ctx.strokeStyle = colorWithOpacity(effect.color ?? (effect.type === "inner-glow" ? "#FFFFFF66" : "#00000055"), effect.opacity);
    ctx.lineWidth = Math.max(1, ((effect.radius ?? 8) + (effect.spread ?? 0)) * 1.6);
    buildPath();
    ctx.stroke();
    ctx.restore();
  }
}

function applyTransform(ctx: CanvasRenderingContext2D, t: TransformSpec): void {
  if (t.translate) ctx.translate(t.translate[0], t.translate[1]);
  if (t.rotate !== undefined) ctx.rotate((t.rotate * Math.PI) / 180);
  if (t.scale !== undefined) {
    if (Array.isArray(t.scale)) ctx.scale(t.scale[0], t.scale[1]);
    else ctx.scale(t.scale, t.scale);
  }
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  arrowType: ArrowEndType, color: string, size: number
): void {
  if (!arrowType || arrowType === "none") return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const c = parseColor(color);
  if (c) {
    ctx.fillStyle = rgbaString(c);
    ctx.strokeStyle = rgbaString(c);
  }
  ctx.lineWidth = 1;

  if (arrowType === "arrow") {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.fill();
  } else if (arrowType === "circle") {
    ctx.beginPath();
    ctx.arc(-size / 2, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (arrowType === "diamond") {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size / 2, -size / 3);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size / 2, size / 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function renderFillsAndStrokes(
  ctx: CanvasRenderingContext2D,
  elem: {
    fill?: FillSpec;
    stroke?: StrokeSpec;
    fills?: FillLayer[];
    strokes?: StrokeLayer[];
  },
  fillFn: () => void,
  strokeFn: () => void
): void {
  const fills: FillLayer[] | undefined = elem.fills;
  const strokes: StrokeLayer[] | undefined = elem.strokes;

  if (fills && fills.length > 0) {
    for (const fl of fills) {
      ctx.save();
      if (fl.opacity !== undefined) ctx.globalAlpha *= fl.opacity;
      if (fl.blend_mode) {
        const blendMap: Record<string, GlobalCompositeOperation> = {
          normal: "source-over", multiply: "multiply", screen: "screen", overlay: "overlay",
        };
        ctx.globalCompositeOperation = blendMap[fl.blend_mode] ?? "source-over";
      }
      if (applyFill(ctx, fl.fill)) fillFn();
      ctx.restore();
    }
  } else {
    const fill = elem.fill as FillSpec | undefined;
    if (applyFill(ctx, fill ?? null)) fillFn();
  }

  if (strokes && strokes.length > 0) {
    for (const sl of strokes) {
      ctx.save();
      if (sl.opacity !== undefined) ctx.globalAlpha *= sl.opacity;
      applyStrokeStyle(ctx, sl);
      strokeFn();
      ctx.restore();
    }
  } else {
    const stroke = elem.stroke as StrokeSpec | undefined;
    if (stroke) {
      applyStrokeStyle(ctx, stroke);
      strokeFn();
    }
  }
}

function getTextLineHeight(fontSize: number, lineHeight?: number): number {
  return fontSize * (lineHeight && lineHeight > 0 ? lineHeight : 1.2);
}

function expandBox(box: BoundingBox, padding: number): BoundingBox {
  return {
    x: box.x - padding,
    y: box.y - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  };
}

function transformBounds(box: BoundingBox, transform?: TransformSpec): BoundingBox {
  if (!transform) return box;
  const transformPoint = (x: number, y: number) => {
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
  };

  const points = [
    transformPoint(box.x, box.y),
    transformPoint(box.x + box.width, box.y),
    transformPoint(box.x + box.width, box.y + box.height),
    transformPoint(box.x, box.y + box.height),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function getMaxStrokePadding(elem: NpngElement): number {
  const widths = [
    elem.stroke?.width,
    ...(elem.strokes ?? []).map((stroke) => stroke.width),
  ].filter((width): width is number => typeof width === "number" && width > 0);
  return widths.length > 0 ? Math.max(...widths) / 2 : 0;
}

function getMaxStrokeWidth(elem: NpngElement): number {
  const widths = [
    elem.stroke?.width,
    ...(elem.strokes ?? []).map((stroke) => stroke.width),
  ].filter((width): width is number => typeof width === "number" && width > 0);
  return widths.length > 0 ? Math.max(...widths) : 1;
}

function getTransformScalePaddingMultiplier(transform?: TransformSpec): number {
  if (!transform?.scale) return 1;
  if (Array.isArray(transform.scale)) {
    return Math.max(Math.abs(transform.scale[0]), Math.abs(transform.scale[1]));
  }
  return Math.abs(transform.scale);
}

function getArrowPadding(elem: NpngElement): number {
  if (elem.type !== "line") return 0;
  const hasArrowStart = elem.arrow_start && elem.arrow_start !== "none";
  const hasArrowEnd = elem.arrow_end && elem.arrow_end !== "none";
  if (!hasArrowStart && !hasArrowEnd) return 0;
  return Math.max(8, getMaxStrokeWidth(elem) * 4);
}

function getEffectPadding(filters?: FilterSpec[], effects?: EffectSpec[]): number {
  let padding = 0;
  for (const filter of filters ?? []) {
    if (filter.type === "blur") padding = Math.max(padding, (filter.radius ?? 0) * 2);
    if (filter.type === "drop-shadow") {
      padding = Math.max(padding, Math.abs(filter.dx ?? 3) + Math.abs(filter.dy ?? 3) + (filter.radius ?? 3) * 2);
    }
  }
  for (const effect of effects ?? []) {
    if (effect.type === "blur" || effect.type === "outer-glow") {
      padding = Math.max(padding, (effect.radius ?? 0) * 2 + (effect.spread ?? 0));
    }
    if (effect.type === "drop-shadow") {
      padding = Math.max(padding, Math.abs(effect.dx ?? 0) + Math.abs(effect.dy ?? 4) + (effect.radius ?? 8) * 2 + (effect.spread ?? 0));
    }
  }
  return padding;
}

function getImagePaintBounds(elem: Extract<NpngElement, { type: "image" }>): BoundingBox {
  const cachedImage = elem.href ? imageCache.get(elem.href) : null;
  const fallbackWidth = cachedImage?.complete && cachedImage.naturalWidth > 0 ? cachedImage.naturalWidth : 100;
  const fallbackHeight = cachedImage?.complete && cachedImage.naturalHeight > 0 ? cachedImage.naturalHeight : 100;
  return getBoundingBox({ ...elem, width: elem.width ?? fallbackWidth, height: elem.height ?? fallbackHeight });
}

function getElementPaintBounds(
  elem: NpngElement,
  defs?: Map<string, DefItem>,
  components?: ComponentDef[]
): BoundingBox | null {
  if (elem.visible === false) return null;
  if (elem.type === "group") {
    const boxes = (elem.elements ?? [])
      .flatMap((child) => {
        const box = getElementPaintBounds(child, defs, components);
        return box ? [box] : [];
      });
    const merged = mergeBoundingBoxes(boxes);
    return merged ? transformBounds(merged, elem.transform) : null;
  }
  if (elem.type === "use") {
    const def = elem.ref ? defs?.get(elem.ref) : null;
    if (!def || !isNpngElement(def)) return null;
    const refElem: NpngElement & Partial<Pick<typeof elem, "x" | "y" | "cx" | "cy" | "transform">> = { ...def };
    if (elem.x !== undefined) refElem.x = elem.x;
    if (elem.y !== undefined) refElem.y = elem.y;
    if (elem.cx !== undefined) refElem.cx = elem.cx;
    if (elem.cy !== undefined) refElem.cy = elem.cy;
    if (elem.transform !== undefined) refElem.transform = elem.transform;
    return getElementPaintBounds(refElem, defs, components);
  }
  if (elem.type === "component-instance") {
    const resolved = components ? resolveInstance(elem, components) : null;
    const resolvedBounds = resolved ? getElementPaintBounds(resolved, defs, components) : null;
    return resolvedBounds ? transformBounds(resolvedBounds, elem.transform) : null;
  }
  if (elem.type === "image") {
    return getImagePaintBounds(elem);
  }

  const bounds = getBoundingBox(elem);
  const scaleMultiplier = getTransformScalePaddingMultiplier(elem.transform);
  const paintPadding = (getMaxStrokePadding(elem) + getArrowPadding(elem)) * scaleMultiplier;
  return paintPadding > 0 ? expandBox(bounds, paintPadding) : bounds;
}

function getContainerIsolationBounds(
  elem: NpngElement,
  defs?: Map<string, DefItem>,
  components?: ComponentDef[]
): BoundingBox | null {
  if (elem.type === "group") {
    const boxes = (elem.elements ?? [])
      .filter((child) => child.visible !== false)
      .flatMap((child) => {
        const box = getElementPaintBounds(child, defs, components);
        return box ? [box] : [];
      });
    return mergeBoundingBoxes(boxes);
  }
  if (elem.type === "frame") {
    const bounds = {
      x: elem.x ?? 0,
      y: elem.y ?? 0,
      width: elem.width ?? 0,
      height: elem.height ?? 0,
    };
    const strokePadding = getMaxStrokePadding(elem);
    return strokePadding > 0 ? expandBox(bounds, strokePadding) : bounds;
  }
  return null;
}

function isContainerElement(elem: NpngElement): elem is ContainerElement {
  return elem.type === "group" || elem.type === "frame";
}

function shouldIsolateContainer(elem: ContainerElement): boolean {
  return (elem.opacity !== undefined && elem.opacity < 1)
    || !!elem.blend_mode
    || !!elem.filters?.length
    || !!elem.effects?.length;
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  const safeMaxWidth = Math.max(1, maxWidth);

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

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      if (ctx.measureText(word).width > safeMaxWidth) {
        if (line) {
          lines.push(line);
          line = "";
        }
        const chunks = splitLongWord(word);
        lines.push(...chunks.slice(0, -1));
        line = chunks[chunks.length - 1] ?? "";
        continue;
      }

      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > safeMaxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }

  return lines.length > 0 ? lines : [""];
}

function renderGroupContents(
  ctx: CanvasRenderingContext2D,
  elem: Extract<NpngElement, { type: "group" }>,
  defs?: Map<string, DefItem>,
  components?: ComponentDef[],
  onAsyncResourceLoaded?: () => void,
  pixelRatio = 1
): void {
  for (const child of elem.elements ?? []) {
    renderElement(ctx, child, defs, components, onAsyncResourceLoaded, pixelRatio);
  }
}

function renderFrameContents(
  ctx: CanvasRenderingContext2D,
  elem: Extract<NpngElement, { type: "frame" }>,
  defs?: Map<string, DefItem>,
  components?: ComponentDef[],
  onAsyncResourceLoaded?: () => void,
  pixelRatio = 1
): void {
  if (elem.auto_layout && elem.children) {
    computeLayout(elem);
  }

  const x = elem.x ?? 0, y = elem.y ?? 0, w = elem.width ?? 0, h = elem.height ?? 0;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  if (applyFill(ctx, elem.fill ?? null)) ctx.fill();
  if (elem.stroke) applyStroke(ctx, elem.stroke);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (const child of elem.children ?? []) {
    renderElement(ctx, child, defs, components, onAsyncResourceLoaded, pixelRatio);
  }
  ctx.restore();
}

function renderIsolatedContainer(
  ctx: CanvasRenderingContext2D,
  elem: ContainerElement,
  defs?: Map<string, DefItem>,
  components?: ComponentDef[],
  onAsyncResourceLoaded?: () => void,
  pixelRatio = 1
): void {
  const bounds = getContainerIsolationBounds(elem, defs, components);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
  const paddedBounds = expandBox(bounds, Math.max(2, getEffectPadding(elem.filters, elem.effects)));
  const offscreen = document.createElement("canvas");
  offscreen.width = Math.max(1, Math.ceil(paddedBounds.width * pixelRatio));
  offscreen.height = Math.max(1, Math.ceil(paddedBounds.height * pixelRatio));
  const offscreenCtx = offscreen.getContext("2d");
  if (!offscreenCtx) return;

  configureCanvasContext(offscreenCtx);
  offscreenCtx.scale(pixelRatio, pixelRatio);
  offscreenCtx.translate(-paddedBounds.x, -paddedBounds.y);

  if (elem.type === "group") {
    renderGroupContents(offscreenCtx, elem, defs, components, onAsyncResourceLoaded, pixelRatio);
  } else {
    renderFrameContents(offscreenCtx, elem, defs, components, onAsyncResourceLoaded, pixelRatio);
  }

  ctx.save();
  ctx.globalAlpha *= elem.opacity ?? 1;
  if (elem.blend_mode) ctx.globalCompositeOperation = toCompositeOperation(elem.blend_mode);
  const elementFilter = buildCanvasFilter(elem.filters, elem.effects, pixelRatio);
  if (elementFilter !== "none") ctx.filter = elementFilter;
  ctx.drawImage(offscreen, paddedBounds.x, paddedBounds.y, paddedBounds.width, paddedBounds.height);
  ctx.restore();
}

function renderElement(
  ctx: CanvasRenderingContext2D,
  elem: NpngElement,
  defs?: Map<string, DefItem>,
  components?: ComponentDef[],
  onAsyncResourceLoaded?: () => void,
  pixelRatio = 1
): void {
  if (elem.visible === false) return;
  const transform = elem.transform as TransformSpec | undefined;
  const elemOpacity = elem.opacity ?? 1.0;

  ctx.save();

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

  if (isContainerElement(elem) && shouldIsolateContainer(elem)) {
    renderIsolatedContainer(ctx, elem, defs, components, onAsyncResourceLoaded, pixelRatio);
    ctx.restore();
    return;
  }

  if (elemOpacity < 1.0) ctx.globalAlpha *= elemOpacity;
  if (elem.blend_mode) ctx.globalCompositeOperation = toCompositeOperation(elem.blend_mode);

  if (elem.clip_path) {
    ctx.beginPath();
    tracePath(ctx, elem.clip_path);
    ctx.clip();
  }

  const elementFilter = buildCanvasFilter(
    elem.filters,
    elem.effects,
    pixelRatio,
    elem.type === "image" ? elem.adjustments : undefined
  );
  if (elementFilter !== "none") ctx.filter = elementFilter;

  if (elem.type === "rect") {
    const e = elem;
    const x = e.x ?? 0, y = e.y ?? 0, w = e.width ?? 0, h = e.height ?? 0;
    const rx = e.rx ?? 0, ry = e.ry ?? 0;
    const buildPath = () => {
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
    };
    buildPath();
    renderFillsAndStrokes(ctx, e, () => { buildPath(); ctx.fill(); }, () => { buildPath(); ctx.stroke(); });
    applyInnerEffects(ctx, e.effects, buildPath);
    // If no fills/strokes arrays, fallback was already handled
    if (!e.fills && !e.strokes) {
      // already handled by renderFillsAndStrokes fallback
    }
  } else if (elem.type === "ellipse") {
    const e = elem;
    const cxE = e.cx ?? 0, cyE = e.cy ?? 0, rxE = e.rx ?? 0, ryE = e.ry ?? 0;
    const buildPath = () => {
      ctx.beginPath();
      ctx.ellipse(cxE, cyE, rxE, ryE, 0, 0, Math.PI * 2);
    };
    buildPath();
    renderFillsAndStrokes(ctx, e, () => { buildPath(); ctx.fill(); }, () => { buildPath(); ctx.stroke(); });
    applyInnerEffects(ctx, e.effects, buildPath);
  } else if (elem.type === "line") {
    const e = elem;
    ctx.beginPath();
    ctx.moveTo(e.x1 ?? 0, e.y1 ?? 0);
    ctx.lineTo(e.x2 ?? 0, e.y2 ?? 0);
    if (e.stroke) {
      applyStroke(ctx, e.stroke);
    } else {
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Arrow endpoints
    const strokeColor = e.stroke?.color ?? "#000000";
    const strokeW = e.stroke?.width ?? 1;
    const arrowSize = Math.max(8, strokeW * 4);
    if (e.arrow_end && e.arrow_end !== "none") {
      const angle = Math.atan2((e.y2 ?? 0) - (e.y1 ?? 0), (e.x2 ?? 0) - (e.x1 ?? 0));
      drawArrowHead(ctx, e.x2 ?? 0, e.y2 ?? 0, angle, e.arrow_end, strokeColor, arrowSize);
    }
    if (e.arrow_start && e.arrow_start !== "none") {
      const angle = Math.atan2((e.y1 ?? 0) - (e.y2 ?? 0), (e.x1 ?? 0) - (e.x2 ?? 0));
      drawArrowHead(ctx, e.x1 ?? 0, e.y1 ?? 0, angle, e.arrow_start, strokeColor, arrowSize);
    }
  } else if (elem.type === "text") {
    const e = elem;
    const x = e.x ?? 0, y = e.y ?? 0;
    const fontSize = e.font_size ?? 16;
    const fontFamily = e.font_family ?? "sans-serif";
    const fontWeight = e.font_weight ?? "normal";
    const align = e.align ?? "left";
    const strokeText = (text: string, textX: number, textY: number) => {
      if (e.strokes && e.strokes.length > 0) {
        for (const stroke of e.strokes) {
          ctx.save();
          if (stroke.opacity !== undefined) ctx.globalAlpha *= stroke.opacity;
          applyStrokeStyle(ctx, stroke);
          ctx.strokeText(text, textX, textY);
          ctx.restore();
        }
      } else if (e.stroke) {
        applyStrokeStyle(ctx, e.stroke);
        ctx.strokeText(text, textX, textY);
      }
    };

    if (e.spans && Array.isArray(e.spans) && e.spans.length > 0) {
      // Rich text rendering
      ctx.textBaseline = "alphabetic";
      let curX = x;
      // For alignment, we need total width first
      let totalWidth = 0;
      for (const span of e.spans) {
        const sFontSize = span.font_size ?? fontSize;
        const sWeight = span.bold ? "bold" : fontWeight;
        const sStyle = span.italic ? "italic" : "normal";
        ctx.font = `${sStyle} ${sWeight} ${sFontSize}px ${fontFamily}`;
        totalWidth += ctx.measureText(span.text).width;
      }
      if (align === "center") curX = x - totalWidth / 2;
      else if (align === "right") curX = x - totalWidth;

      for (const span of e.spans) {
        const sFontSize = span.font_size ?? fontSize;
        const sWeight = span.bold ? "bold" : fontWeight;
        const sStyle = span.italic ? "italic" : "normal";
        ctx.font = `${sStyle} ${sWeight} ${sFontSize}px ${fontFamily}`;
        const spanFill = span.fill ?? (typeof e.fill === "string" || e.fill === null ? e.fill : undefined);
        let shouldFillSpan = true;
        if (spanFill === undefined) {
          ctx.fillStyle = "black";
        } else if (spanFill === null || spanFill === "none") {
          shouldFillSpan = false;
        } else {
          const c = parseColor(spanFill);
          ctx.fillStyle = c ? rgbaString(c) : "black";
        }
        strokeText(span.text, curX, y);
        if (shouldFillSpan) ctx.fillText(span.text, curX, y);
        const w = ctx.measureText(span.text).width;
        if (span.underline && shouldFillSpan) {
          ctx.beginPath();
          ctx.moveTo(curX, y + 2);
          ctx.lineTo(curX + w, y + 2);
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.stroke();
        }
        curX += w;
      }
      } else {
        const content = e.content ?? "";
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const fill = e.fill as FillSpec | undefined;
      let shouldFillText = true;
      if (fill === undefined) {
        ctx.fillStyle = "black";
      } else if (fill === null || fill === "none") {
        shouldFillText = false;
      } else if (!applyFill(ctx, fill)) {
        ctx.fillStyle = "black";
      }
        const letterSpacing = e.letter_spacing ?? 0;
        const measureLine = (line: string) => ctx.measureText(line).width + Math.max(0, Array.from(line).length - 1) * letterSpacing;
        const paintText = (line: string, lineX: number, lineY: number, mode: "fill" | "stroke") => {
          if (!letterSpacing) {
            if (mode === "fill") ctx.fillText(line, lineX, lineY);
            else ctx.strokeText(line, lineX, lineY);
            return;
          }
          let cursor = lineX;
          const chars = Array.from(line);
          for (const char of chars) {
            if (mode === "fill") ctx.fillText(char, cursor, lineY);
            else ctx.strokeText(char, cursor, lineY);
            cursor += ctx.measureText(char).width + letterSpacing;
          }
        };
        const drawText = (line: string, lineX: number, lineY: number) => {
          const alignedX = letterSpacing && align !== "left"
            ? lineX - (align === "center" ? measureLine(line) / 2 : measureLine(line))
            : lineX;
          const oldAlign = ctx.textAlign;
          if (letterSpacing) ctx.textAlign = "left";
          if (e.strokes && e.strokes.length > 0) {
            for (const stroke of e.strokes) {
              ctx.save();
              if (stroke.opacity !== undefined) ctx.globalAlpha *= stroke.opacity;
              applyStrokeStyle(ctx, stroke);
              paintText(line, alignedX, lineY, "stroke");
              ctx.restore();
            }
          } else if (e.stroke) {
            applyStrokeStyle(ctx, e.stroke);
            paintText(line, alignedX, lineY, "stroke");
          }
          if (shouldFillText) paintText(line, alignedX, lineY, "fill");
          ctx.textAlign = oldAlign;
        };

        if (e.width && e.width > 0) {
          const lineHeight = getTextLineHeight(fontSize, e.line_height);
          const paragraphSpacing = e.paragraph_spacing ?? 0;
          const lines = wrapTextLines(ctx, content, e.width);
          ctx.textAlign = align as CanvasTextAlign;
          ctx.textBaseline = "top";
          const lineX = align === "center" ? x + e.width / 2 : align === "right" ? x + e.width : x;
          let offsetY = 0;
          lines.forEach((line, index) => {
            drawText(line, lineX, y + offsetY);
            offsetY += lineHeight;
            if (line === "" && index < lines.length - 1) offsetY += paragraphSpacing;
          });
        } else {
        ctx.textAlign = align as CanvasTextAlign;
        ctx.textBaseline = "alphabetic";
        drawText(content, x, y);
      }
    }
  } else if (elem.type === "path") {
    const e = elem;
    const d = e.d ?? "";
    const fillRule = e.fill_rule === "evenodd" ? "evenodd" : "nonzero";
    ctx.beginPath();
    tracePath(ctx, d);
    renderFillsAndStrokes(
      ctx, e,
      () => { ctx.beginPath(); tracePath(ctx, d); ctx.fill(fillRule as CanvasFillRule); },
      () => { ctx.beginPath(); tracePath(ctx, d); ctx.stroke(); }
    );
    applyInnerEffects(ctx, e.effects, () => { ctx.beginPath(); tracePath(ctx, d); });
  } else if (elem.type === "group") {
    renderGroupContents(ctx, elem, defs, components, onAsyncResourceLoaded, pixelRatio);
  } else if (elem.type === "use") {
    const e = elem;
    const refId = e.ref;
    if (refId && defs?.has(refId)) {
      const def = defs.get(refId)!;
      if (!isNpngElement(def)) {
        ctx.restore();
        return;
      }
      const refElem: NpngElement & Partial<Pick<typeof e, "x" | "y" | "cx" | "cy" | "transform">> = { ...def };
      if (e.x !== undefined) refElem.x = e.x;
      if (e.y !== undefined) refElem.y = e.y;
      if (e.cx !== undefined) refElem.cx = e.cx;
      if (e.cy !== undefined) refElem.cy = e.cy;
      if (e.transform !== undefined) refElem.transform = e.transform;
      renderElement(ctx, refElem, defs, components, onAsyncResourceLoaded, pixelRatio);
    }
  } else if (elem.type === "image") {
    const e = elem;
    const href = e.href;
    if (href) {
      const img = loadImage(href, onAsyncResourceLoaded);
      if (img) {
        drawImageElement(ctx, e, img);
      }
    }
  } else if (elem.type === "frame") {
    renderFrameContents(ctx, elem, defs, components, onAsyncResourceLoaded, pixelRatio);
  } else if (elem.type === "component-instance") {
    const e = elem;
    if (components) {
      const resolved = resolveInstance(e, components);
      if (resolved) {
        renderElement(ctx, resolved, defs, components, onAsyncResourceLoaded, pixelRatio);
      }
    }
  }

  ctx.restore();
}

function buildRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
  const r = Math.min(Math.max(0, radius), Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawImageElement(
  ctx: CanvasRenderingContext2D,
  e: Extract<NpngElement, { type: "image" }>,
  img: HTMLImageElement
): void {
  const x = e.x ?? 0;
  const y = e.y ?? 0;
  const w = e.width ?? img.naturalWidth;
  const h = e.height ?? img.naturalHeight;
  const fit = e.fit ?? "fill";
  const iw = img.naturalWidth || w;
  const ih = img.naturalHeight || h;

  let dx = x;
  let dy = y;
  let dw = w;
  let dh = h;
  if (fit === "contain" || fit === "cover") {
    const scale = fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    dw = iw * scale;
    dh = ih * scale;
    dx = x + (w - dw) / 2;
    dy = y + (h - dh) / 2;
  } else if (fit === "none") {
    dw = iw;
    dh = ih;
  }

  ctx.save();
  buildRoundedRectPath(ctx, x, y, w, h, e.border_radius ?? 0);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export function renderNpng(data: NpngDocument, canvas: HTMLCanvasElement, options?: RenderOptions): void {
  const renderVersion = (canvasRenderVersions.get(canvas) ?? 0) + 1;
  canvasRenderVersions.set(canvas, renderVersion);

  const canvasSpec = data.canvas ?? {};
  const width = canvasSpec.width ?? 800;
  const height = canvasSpec.height ?? 600;
  const pixelRatio = getRenderPixelRatio(options);
  const physicalWidth = Math.max(1, Math.round(width * pixelRatio));
  const physicalHeight = Math.max(1, Math.round(height * pixelRatio));
  canvas.width = physicalWidth;
  canvas.height = physicalHeight;

  const ctx = canvas.getContext("2d")!;
  configureCanvasContext(ctx);
  ctx.clearRect(0, 0, physicalWidth, physicalHeight);
  ctx.scale(pixelRatio, pixelRatio);

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

  const components = data.components ?? [];
  let redrawScheduled = false;
  const scheduleRedraw = () => {
    if (redrawScheduled) return;
    redrawScheduled = true;
    requestAnimationFrame(() => {
      if (canvasRenderVersions.get(canvas) === renderVersion) {
        renderNpng(data, canvas, options);
      }
    });
  };

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
    offscreen.width = physicalWidth;
    offscreen.height = physicalHeight;
    const lctx = offscreen.getContext("2d")!;
    configureCanvasContext(lctx);
    lctx.scale(pixelRatio, pixelRatio);

    // Clip path
    if (clipPath) {
      lctx.beginPath();
      tracePath(lctx, clipPath);
      lctx.clip();
    }

    for (const elem of layer.elements ?? []) {
      renderElement(lctx, elem, defs, components, scheduleRedraw, pixelRatio);
    }

    // Apply filters
    if (layerFilters) {
      applyCanvasFilters(offscreen, layerFilters, pixelRatio);
    }

    // Apply mask
    if (maskRef && defs.has(maskRef)) {
      const maskDef = defs.get(maskRef)! as DefItem & { elements?: NpngElement[] };
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = physicalWidth;
      maskCanvas.height = physicalHeight;
      const mctx = maskCanvas.getContext("2d")!;
      configureCanvasContext(mctx);
      mctx.scale(pixelRatio, pixelRatio);
      for (const melem of maskDef.elements ?? []) {
        renderElement(mctx, melem, defs, components, scheduleRedraw, pixelRatio);
      }
      const layerData = lctx.getImageData(0, 0, physicalWidth, physicalHeight);
      const maskData = mctx.getImageData(0, 0, physicalWidth, physicalHeight);
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
    ctx.globalCompositeOperation = toCompositeOperation(blendMode);
    ctx.drawImage(offscreen, 0, 0, width, height);
    ctx.restore();
  }
}

function applyCanvasFilters(canvas: HTMLCanvasElement, filters: FilterSpec[], pixelRatio: number): void {
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  configureCanvasContext(ctx);
  try {
    for (const f of filters) {
      if (f.type === "blur" && f.radius) {
        const temp = document.createElement("canvas");
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tctx = temp.getContext("2d")!;
        configureCanvasContext(tctx);
        tctx.filter = `blur(${f.radius * pixelRatio}px)`;
        tctx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(temp, 0, 0);
      } else if (f.type === "drop-shadow") {
        const color = f.color ?? "#00000080";
        const temp = document.createElement("canvas");
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tctx = temp.getContext("2d")!;
        configureCanvasContext(tctx);
        tctx.shadowOffsetX = (f.dx ?? 3) * pixelRatio;
        tctx.shadowOffsetY = (f.dy ?? 3) * pixelRatio;
        tctx.shadowBlur = (f.radius ?? 3) * pixelRatio;
        tctx.shadowColor = color;
        tctx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(temp, 0, 0);
      }
    }
  } finally {
    ctx.restore();
  }
}
