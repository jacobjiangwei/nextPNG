export type RGBA = [number, number, number, number]; // r,g,b,a each 0-1

export function parseColor(colorStr: string | null | undefined): RGBA | null {
  if (!colorStr || colorStr === "none" || colorStr === "transparent") return null;
  const s = colorStr.replace(/^#/, "");
  if (s.length === 6) {
    return [
      parseInt(s.slice(0, 2), 16) / 255,
      parseInt(s.slice(2, 4), 16) / 255,
      parseInt(s.slice(4, 6), 16) / 255,
      1.0,
    ];
  }
  if (s.length === 8) {
    return [
      parseInt(s.slice(0, 2), 16) / 255,
      parseInt(s.slice(2, 4), 16) / 255,
      parseInt(s.slice(4, 6), 16) / 255,
      parseInt(s.slice(6, 8), 16) / 255,
    ];
  }
  if (s.length === 3) {
    return [
      parseInt(s[0] + s[0], 16) / 255,
      parseInt(s[1] + s[1], 16) / 255,
      parseInt(s[2] + s[2], 16) / 255,
      1.0,
    ];
  }
  return null;
}

export function rgbaString(c: RGBA): string {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${c[3]})`;
}
