import type { FrameElement, NpngElement } from "./types";

type LayoutElement = NpngElement & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export function computeLayout(frame: FrameElement): void {
  const layout = frame.auto_layout;
  if (!layout || !frame.children?.length) return;

  const padding = layout.padding ?? 0;
  const gap = layout.gap ?? 0;
  const isHorizontal = layout.mode === "horizontal";
  const frameW = frame.width ?? 0;
  const frameH = frame.height ?? 0;
  const contentStart = padding;
  const contentW = frameW - padding * 2;
  const contentH = frameH - padding * 2;

  let offset = contentStart;
  const children = frame.children;

  // Calculate total size of children for justify
  let totalChildSize = 0;
  for (const child of children) {
    const c = child as LayoutElement;
    totalChildSize += isHorizontal ? (c.width ?? 0) : (c.height ?? 0);
  }
  const totalGap = gap * (children.length - 1);
  const freeSpace = (isHorizontal ? contentW : contentH) - totalChildSize - totalGap;

  let startOffset = contentStart;
  let effectiveGap = gap;
  if (layout.justify_content === "center") {
    startOffset = contentStart + freeSpace / 2;
  } else if (layout.justify_content === "end") {
    startOffset = contentStart + freeSpace;
  } else if (layout.justify_content === "space-between" && children.length > 1) {
    effectiveGap = gap + freeSpace / (children.length - 1);
  }
  offset = startOffset;

  for (const child of children) {
    const c = child as LayoutElement;
    const childW = c.width ?? 0;
    const childH = c.height ?? 0;

    if (isHorizontal) {
      c.x = (frame.x ?? 0) + offset;
      const align = layout.align_items ?? "start";
      if (align === "start") c.y = (frame.y ?? 0) + padding;
      else if (align === "center") c.y = (frame.y ?? 0) + padding + (contentH - childH) / 2;
      else if (align === "end") c.y = (frame.y ?? 0) + padding + contentH - childH;
      else if (align === "stretch") { c.y = (frame.y ?? 0) + padding; c.height = contentH; }
      offset += childW + effectiveGap;
    } else {
      c.y = (frame.y ?? 0) + offset;
      const align = layout.align_items ?? "start";
      if (align === "start") c.x = (frame.x ?? 0) + padding;
      else if (align === "center") c.x = (frame.x ?? 0) + padding + (contentW - childW) / 2;
      else if (align === "end") c.x = (frame.x ?? 0) + padding + contentW - childW;
      else if (align === "stretch") { c.x = (frame.x ?? 0) + padding; c.width = contentW; }
      offset += childH + effectiveGap;
    }
  }
}
