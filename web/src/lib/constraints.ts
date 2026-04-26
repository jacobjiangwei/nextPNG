import type { Constraints } from "./types";

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function applyConstraints(
  child: { x: number; y: number; width: number; height: number },
  oldParent: Bounds,
  newParent: Bounds,
  constraints?: Constraints
): { x: number; y: number; width: number; height: number } {
  if (!constraints) return child;

  let { x, y, width, height } = child;
  const h = constraints.horizontal;
  const v = constraints.vertical;

  if (h === "left") {
    // keep distance from left
  } else if (h === "right") {
    const distRight = oldParent.width - (x - oldParent.x + width);
    x = newParent.x + newParent.width - width - distRight;
  } else if (h === "center") {
    const relCenter = (x - oldParent.x + width / 2) / oldParent.width;
    x = newParent.x + relCenter * newParent.width - width / 2;
  } else if (h === "left-right") {
    const distLeft = x - oldParent.x;
    const distRight = oldParent.width - (x - oldParent.x + width);
    x = newParent.x + distLeft;
    width = newParent.width - distLeft - distRight;
  } else if (h === "scale") {
    const relX = (x - oldParent.x) / oldParent.width;
    const relW = width / oldParent.width;
    x = newParent.x + relX * newParent.width;
    width = relW * newParent.width;
  }

  if (v === "top") {
    // keep distance from top
  } else if (v === "bottom") {
    const distBottom = oldParent.height - (y - oldParent.y + height);
    y = newParent.y + newParent.height - height - distBottom;
  } else if (v === "center") {
    const relCenter = (y - oldParent.y + height / 2) / oldParent.height;
    y = newParent.y + relCenter * newParent.height - height / 2;
  } else if (v === "top-bottom") {
    const distTop = y - oldParent.y;
    const distBottom = oldParent.height - (y - oldParent.y + height);
    y = newParent.y + distTop;
    height = newParent.height - distTop - distBottom;
  } else if (v === "scale") {
    const relY = (y - oldParent.y) / oldParent.height;
    const relH = height / oldParent.height;
    y = newParent.y + relY * newParent.height;
    height = relH * newParent.height;
  }

  return { x, y, width: Math.max(1, width), height: Math.max(1, height) };
}
