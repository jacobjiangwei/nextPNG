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
  const children = frame.children.filter((child) => child.visible !== false);
  if (children.length === 0) return;

  const totalGap = gap * (children.length - 1);
  const containerMainSize = isHorizontal ? contentW : contentH;
  const baseMainSizes = children.map((child) => {
    const c = child as LayoutElement;
    return isHorizontal ? (c.width ?? 0) : (c.height ?? 0);
  });
  const baseTotalChildSize = baseMainSizes.reduce((sum, size) => sum + size, 0);
  let freeSpace = containerMainSize - baseTotalChildSize - totalGap;
  const growTotal = children.reduce((sum, child) => sum + (child.layout_item?.grow ?? 0), 0);
  let mainSizes = [...baseMainSizes];
  if (freeSpace > 0 && growTotal > 0) {
    mainSizes = mainSizes.map((size, index) => {
      const grow = children[index].layout_item?.grow ?? 0;
      return size + freeSpace * (grow / growTotal);
    });
  } else if (freeSpace < 0) {
    let deficit = -freeSpace;
    let shrinkable = children
      .map((child, index) => ({ index, factor: child.layout_item?.shrink ?? 0 }))
      .filter((item) => item.factor > 0 && mainSizes[item.index] > 0);

    while (deficit > 0.001 && shrinkable.length > 0) {
      const weightTotal = shrinkable.reduce((sum, item) => sum + mainSizes[item.index] * item.factor, 0);
      if (weightTotal <= 0) break;
      let consumed = 0;
      for (const item of shrinkable) {
        const size = mainSizes[item.index];
        const reduction = deficit * ((size * item.factor) / weightTotal);
        const applied = Math.min(size, reduction);
        mainSizes[item.index] = size - applied;
        consumed += applied;
      }
      if (consumed <= 0.001) break;
      deficit -= consumed;
      shrinkable = shrinkable.filter((item) => mainSizes[item.index] > 0.001);
    }
  }
  const totalChildSize = mainSizes.reduce((sum, size) => sum + size, 0);
  freeSpace = containerMainSize - totalChildSize - totalGap;

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

  for (const [index, child] of children.entries()) {
    const c = child as LayoutElement;
    if (isHorizontal) c.width = mainSizes[index];
    else c.height = mainSizes[index];
    const childW = c.width ?? 0;
    const childH = c.height ?? 0;
    const align = child.layout_item?.align_self && child.layout_item.align_self !== "auto"
      ? child.layout_item.align_self
      : layout.align_items ?? "start";

    if (isHorizontal) {
      c.x = (frame.x ?? 0) + offset;
      if (align === "start") c.y = (frame.y ?? 0) + padding;
      else if (align === "center") c.y = (frame.y ?? 0) + padding + (contentH - childH) / 2;
      else if (align === "end") c.y = (frame.y ?? 0) + padding + contentH - childH;
      else if (align === "stretch") { c.y = (frame.y ?? 0) + padding; c.height = contentH; }
      offset += childW + effectiveGap;
    } else {
      c.y = (frame.y ?? 0) + offset;
      if (align === "start") c.x = (frame.x ?? 0) + padding;
      else if (align === "center") c.x = (frame.x ?? 0) + padding + (contentW - childW) / 2;
      else if (align === "end") c.x = (frame.x ?? 0) + padding + contentW - childW;
      else if (align === "stretch") { c.x = (frame.x ?? 0) + padding; c.width = contentW; }
      offset += childH + effectiveGap;
    }
  }
}
