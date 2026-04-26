export function generateStar(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const steps = points * 2;
  let d = "";
  for (let i = 0; i < steps; i++) {
    const angle = (Math.PI * 2 * i) / steps - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    d += (i === 0 ? "M " : " L ") + `${x} ${y}`;
  }
  return d + " Z";
}

export function generatePolygon(cx: number, cy: number, r: number, sides: number): string {
  let d = "";
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    d += (i === 0 ? "M " : " L ") + `${x} ${y}`;
  }
  return d + " Z";
}

export function generateArrowShape(x: number, y: number, w: number, h: number): string {
  const headW = w * 0.4;
  const shaftH = h * 0.35;
  const midY = y + h / 2;
  return `M ${x} ${midY - shaftH} L ${x + w - headW} ${midY - shaftH} L ${x + w - headW} ${y} L ${x + w} ${midY} L ${x + w - headW} ${y + h} L ${x + w - headW} ${midY + shaftH} L ${x} ${midY + shaftH} Z`;
}

export function generateShapeForTool(
  tool: "star" | "polygon-shape" | "arrow-shape",
  x: number, y: number, w: number, h: number,
  sides?: number
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  switch (tool) {
    case "star":
      return generateStar(cx, cy, r, r * 0.4, sides ?? 5);
    case "polygon-shape":
      return generatePolygon(cx, cy, r, sides ?? 6);
    case "arrow-shape":
      return generateArrowShape(x, y, w, h);
  }
}
