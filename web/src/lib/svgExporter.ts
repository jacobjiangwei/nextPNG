/**
 * npng → SVG exporter.
 * Converts an NpngDocument to SVG markup string.
 */

import type {
  NpngDocument,
  NpngElement,
  FillSpec,
  StrokeSpec,
  TransformSpec,
  LinearGradient,
  RadialGradient,
  Layer,
  EffectSpec,
} from "./types";

let _defsCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++_defsCounter}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fillToSvg(fill: FillSpec, svgDefs: string[]): string | null {
  if (fill === null || fill === undefined || fill === "none") return "none";
  if (typeof fill === "string") return fill;
  if (typeof fill === "object") {
    if (fill.type === "linear-gradient") return linearGradientDef(fill, svgDefs);
    if (fill.type === "radial-gradient") return radialGradientDef(fill, svgDefs);
  }
  return null;
}

function linearGradientDef(g: LinearGradient, svgDefs: string[]): string {
  const id = nextId("lg");
  const stops = (g.stops || [])
    .map((s) => `<stop offset="${s.offset}" stop-color="${escapeXml(s.color)}" />`)
    .join("");
  svgDefs.push(
    `<linearGradient id="${id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`
  );
  return `url(#${id})`;
}

function radialGradientDef(g: RadialGradient, svgDefs: string[]): string {
  const id = nextId("rg");
  const stops = (g.stops || [])
    .map((s) => `<stop offset="${s.offset}" stop-color="${escapeXml(s.color)}" />`)
    .join("");
  svgDefs.push(
    `<radialGradient id="${id}" cx="${g.cx}" cy="${g.cy}" r="${g.r}" gradientUnits="userSpaceOnUse">${stops}</radialGradient>`
  );
  return `url(#${id})`;
}

function strokeAttrs(stroke: StrokeSpec | undefined): string {
  if (!stroke) return "";
  const parts: string[] = [];
  if (stroke.color) parts.push(`stroke="${escapeXml(stroke.color)}"`);
  if (stroke.width !== undefined) parts.push(`stroke-width="${stroke.width}"`);
  if (stroke.dash && stroke.dash.length) parts.push(`stroke-dasharray="${stroke.dash.join(" ")}"`);
  if (stroke.cap) parts.push(`stroke-linecap="${stroke.cap}"`);
  if (stroke.join) parts.push(`stroke-linejoin="${stroke.join}"`);
  return parts.join(" ");
}

function transformAttr(t: TransformSpec | undefined): string {
  if (!t) return "";
  const parts: string[] = [];
  const ox = t.origin?.[0] ?? 0;
  const oy = t.origin?.[1] ?? 0;

  if (t.translate) parts.push(`translate(${t.translate[0]}, ${t.translate[1]})`);
  if (t.rotate) {
    parts.push(`rotate(${t.rotate}, ${ox}, ${oy})`);
  }
  if (t.scale !== undefined) {
    const sx = Array.isArray(t.scale) ? t.scale[0] : t.scale;
    const sy = Array.isArray(t.scale) ? t.scale[1] : t.scale;
    if (ox || oy) {
      parts.push(`translate(${ox}, ${oy}) scale(${sx}, ${sy}) translate(${-ox}, ${-oy})`);
    } else {
      parts.push(`scale(${sx}, ${sy})`);
    }
  }
  return parts.length ? `transform="${parts.join(" ")}"` : "";
}

function opacityAttr(opacity: number | undefined): string {
  if (opacity !== undefined && opacity < 1) return `opacity="${opacity}"`;
  return "";
}

function blendModeAttr(mode: string | undefined): string {
  if (mode && mode !== "normal") return `style="mix-blend-mode: ${mode}"`;
  return "";
}

function filterDef(effects: EffectSpec[] | undefined, svgDefs: string[]): string {
  if (!effects || effects.length === 0) return "";
  const id = nextId("filter");
  const primitives: string[] = [];
  for (const e of effects) {
    if (e.type === "blur" && e.radius) {
      primitives.push(`<feGaussianBlur stdDeviation="${e.radius}" />`);
    } else if (e.type === "drop-shadow") {
      const dx = e.dx ?? 0, dy = e.dy ?? 0, r = e.radius ?? 0;
      const color = e.color ?? "rgba(0,0,0,0.5)";
      primitives.push(`<feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${r}" flood-color="${escapeXml(color)}" />`);
    }
  }
  if (primitives.length === 0) return "";
  svgDefs.push(`<filter id="${id}">${primitives.join("")}</filter>`);
  return `filter="url(#${id})"`;
}

function commonAttrs(el: NpngElement, svgDefs: string[]): string {
  const parts: string[] = [];

  const fillVal = fillToSvg(el.fill ?? null, svgDefs);
  if (fillVal) parts.push(`fill="${fillVal}"`);
  else parts.push(`fill="none"`);

  const sa = strokeAttrs(el.stroke);
  if (sa) parts.push(sa);
  else parts.push(`stroke="none"`);

  const ta = transformAttr(el.transform);
  if (ta) parts.push(ta);

  const oa = opacityAttr(el.opacity);
  if (oa) parts.push(oa);

  const bm = blendModeAttr(el.blend_mode);
  if (bm) parts.push(bm);

  const fd = filterDef(el.effects ?? el.filters, svgDefs);
  if (fd) parts.push(fd);

  return parts.join(" ");
}

function elementToSvg(el: NpngElement, svgDefs: string[]): string {
  if (el.visible === false) return "";
  const attrs = commonAttrs(el, svgDefs);

  switch (el.type) {
    case "rect": {
      const x = el.x ?? 0, y = el.y ?? 0;
      const w = el.width ?? 0, h = el.height ?? 0;
      const rx = el.rx ?? 0, ry = el.ry ?? rx;
      const rxAttr = rx ? ` rx="${rx}" ry="${ry}"` : "";
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rxAttr} ${attrs} />`;
    }
    case "ellipse": {
      const cx = el.cx ?? 0, cy = el.cy ?? 0;
      const rx = el.rx ?? 0, ry = el.ry ?? rx;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs} />`;
    }
    case "line": {
      const x1 = el.x1 ?? 0, y1 = el.y1 ?? 0;
      const x2 = el.x2 ?? 0, y2 = el.y2 ?? 0;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs} />`;
    }
    case "path": {
      const d = el.d ?? "";
      const fillRule = el.fill_rule ? ` fill-rule="${el.fill_rule}"` : "";
      return `<path d="${escapeXml(d)}"${fillRule} ${attrs} />`;
    }
    case "text": {
      const x = el.x ?? 0, y = el.y ?? 0;
      const fontSize = el.font_size ?? 16;
      const fontFamily = el.font_family ?? "sans-serif";
      const fontWeight = el.font_weight ?? "normal";
      const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
      const textAttrs = `x="${x}" y="${y}" font-size="${fontSize}" font-family="${escapeXml(fontFamily)}" font-weight="${fontWeight}" text-anchor="${anchor}"`;

      if (el.spans && el.spans.length > 0) {
        const tspans = el.spans
          .map((s) => {
            const sw = s.bold ? ' font-weight="bold"' : "";
            const si = s.italic ? ' font-style="italic"' : "";
            const sf = s.fill ? ` fill="${escapeXml(s.fill)}"` : "";
            const ss = s.font_size ? ` font-size="${s.font_size}"` : "";
            return `<tspan${sw}${si}${sf}${ss}>${escapeXml(s.text)}</tspan>`;
          })
          .join("");
        return `<text ${textAttrs} ${attrs}>${tspans}</text>`;
      }
      const content = el.content ?? "";
      return `<text ${textAttrs} ${attrs}>${escapeXml(content)}</text>`;
    }
    case "group": {
      const children = (el.elements ?? []).map((c) => elementToSvg(c, svgDefs)).join("\n");
      return `<g ${attrs}>\n${children}\n</g>`;
    }
    case "frame": {
      const x = el.x ?? 0, y = el.y ?? 0;
      const w = el.width ?? 0, h = el.height ?? 0;
      const clipId = nextId("clip");
      svgDefs.push(`<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${h}" /></clipPath>`);
      const children = (el.children ?? []).map((c) => elementToSvg(c, svgDefs)).join("\n");
      return `<g clip-path="url(#${clipId})" ${attrs}>\n${children}\n</g>`;
    }
    case "image": {
      const x = el.x ?? 0, y = el.y ?? 0;
      const w = el.width ?? 0, h = el.height ?? 0;
      const href = el.href ?? "";
      return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${escapeXml(href)}" ${attrs} />`;
    }
    default:
      return `<!-- unsupported element type: ${el.type} -->`;
  }
}

function layerToSvg(layer: Layer, svgDefs: string[]): string {
  if (layer.visible === false) return "";
  const elements = (layer.elements ?? []).map((el) => elementToSvg(el, svgDefs)).join("\n");
  const parts: string[] = [];
  const oa = opacityAttr(layer.opacity);
  if (oa) parts.push(oa);
  const bm = blendModeAttr(layer.blend_mode);
  if (bm) parts.push(bm);
  const gAttrs = parts.join(" ");
  const name = layer.name ? ` data-name="${escapeXml(layer.name)}"` : "";
  return `<g${name} ${gAttrs}>\n${elements}\n</g>`;
}

/**
 * Convert an NpngDocument to an SVG string.
 */
export function npngToSvg(doc: NpngDocument): string {
  _defsCounter = 0;
  const width = doc.canvas?.width ?? 800;
  const height = doc.canvas?.height ?? 600;
  const bg = doc.canvas?.background;

  const svgDefs: string[] = [];
  const layers = (doc.layers ?? []).map((l) => layerToSvg(l, svgDefs)).join("\n");

  const bgRect = bg && bg !== "transparent"
    ? `<rect width="${width}" height="${height}" fill="${escapeXml(bg)}" />\n`
    : "";

  const defsBlock = svgDefs.length > 0 ? `<defs>\n${svgDefs.join("\n")}\n</defs>\n` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defsBlock}${bgRect}${layers}
</svg>`;
}
