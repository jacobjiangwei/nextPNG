type PathCommand = [string, number[]];

export function parsePath(d: string): PathCommand[] {
  const tokens = d.match(
    /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g
  );
  if (!tokens) return [];
  const commands: PathCommand[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) {
      const cmd = tokens[i];
      i++;
      const args: number[] = [];
      while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
        args.push(parseFloat(tokens[i]));
        i++;
      }
      commands.push([cmd, args]);
    } else {
      i++;
    }
  }
  return commands;
}

export function tracePath(ctx: CanvasRenderingContext2D, d: string): void {
  const commands = parsePath(d);
  let cx = 0,
    cy = 0;
  let lastCmd: string | null = null;
  let lastCp: [number, number] | null = null;
  let lastQp: [number, number] | null = null;

  for (const [cmd, args] of commands) {
    if (cmd === "M") {
      for (let j = 0; j < args.length; j += 2) {
        if (j === 0) ctx.moveTo(args[j], args[j + 1]);
        else ctx.lineTo(args[j], args[j + 1]);
        cx = args[j];
        cy = args[j + 1];
      }
    } else if (cmd === "m") {
      for (let j = 0; j < args.length; j += 2) {
        cx += args[j];
        cy += args[j + 1];
        if (j === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
    } else if (cmd === "L") {
      for (let j = 0; j < args.length; j += 2) {
        ctx.lineTo(args[j], args[j + 1]);
        cx = args[j];
        cy = args[j + 1];
      }
    } else if (cmd === "l") {
      for (let j = 0; j < args.length; j += 2) {
        cx += args[j];
        cy += args[j + 1];
        ctx.lineTo(cx, cy);
      }
    } else if (cmd === "H") {
      for (let j = 0; j < args.length; j++) {
        cx = args[j];
        ctx.lineTo(cx, cy);
      }
    } else if (cmd === "h") {
      for (let j = 0; j < args.length; j++) {
        cx += args[j];
        ctx.lineTo(cx, cy);
      }
    } else if (cmd === "V") {
      for (let j = 0; j < args.length; j++) {
        cy = args[j];
        ctx.lineTo(cx, cy);
      }
    } else if (cmd === "v") {
      for (let j = 0; j < args.length; j++) {
        cy += args[j];
        ctx.lineTo(cx, cy);
      }
    } else if (cmd === "C") {
      for (let j = 0; j + 5 < args.length; j += 6) {
        ctx.bezierCurveTo(args[j], args[j + 1], args[j + 2], args[j + 3], args[j + 4], args[j + 5]);
        lastCp = [args[j + 2], args[j + 3]];
        cx = args[j + 4];
        cy = args[j + 5];
      }
    } else if (cmd === "c") {
      for (let j = 0; j + 5 < args.length; j += 6) {
        ctx.bezierCurveTo(
          cx + args[j], cy + args[j + 1],
          cx + args[j + 2], cy + args[j + 3],
          cx + args[j + 4], cy + args[j + 5]
        );
        lastCp = [cx + args[j + 2], cy + args[j + 3]];
        cx += args[j + 4];
        cy += args[j + 5];
      }
    } else if (cmd === "S" || cmd === "s") {
      for (let j = 0; j + 3 < args.length; j += 4) {
        let cp1x: number, cp1y: number;
        if (lastCmd && "CcSs".includes(lastCmd) && lastCp) {
          cp1x = 2 * cx - lastCp[0];
          cp1y = 2 * cy - lastCp[1];
        } else {
          cp1x = cx;
          cp1y = cy;
        }
        let cp2x: number, cp2y: number, ex: number, ey: number;
        if (cmd === "S") {
          cp2x = args[j]; cp2y = args[j + 1];
          ex = args[j + 2]; ey = args[j + 3];
        } else {
          cp2x = cx + args[j]; cp2y = cy + args[j + 1];
          ex = cx + args[j + 2]; ey = cy + args[j + 3];
        }
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
        lastCp = [cp2x, cp2y];
        cx = ex; cy = ey;
      }
      lastCmd = cmd;
      continue;
    } else if (cmd === "Q") {
      for (let j = 0; j + 3 < args.length; j += 4) {
        ctx.quadraticCurveTo(args[j], args[j + 1], args[j + 2], args[j + 3]);
        lastQp = [args[j], args[j + 1]];
        cx = args[j + 2];
        cy = args[j + 3];
      }
    } else if (cmd === "q") {
      for (let j = 0; j + 3 < args.length; j += 4) {
        const qx = cx + args[j], qy = cy + args[j + 1];
        const ex = cx + args[j + 2], ey = cy + args[j + 3];
        ctx.quadraticCurveTo(qx, qy, ex, ey);
        lastQp = [qx, qy];
        cx = ex; cy = ey;
      }
    } else if (cmd === "T" || cmd === "t") {
      for (let j = 0; j + 1 < args.length; j += 2) {
        let qx: number, qy: number;
        if (lastCmd && "QqTt".includes(lastCmd) && lastQp) {
          qx = 2 * cx - lastQp[0];
          qy = 2 * cy - lastQp[1];
        } else {
          qx = cx; qy = cy;
        }
        let ex: number, ey: number;
        if (cmd === "T") { ex = args[j]; ey = args[j + 1]; }
        else { ex = cx + args[j]; ey = cy + args[j + 1]; }
        ctx.quadraticCurveTo(qx, qy, ex, ey);
        lastQp = [qx, qy];
        cx = ex; cy = ey;
      }
      lastCmd = cmd;
      continue;
    } else if (cmd === "A" || cmd === "a") {
      let j = 0;
      while (j + 6 < args.length) {
        let rxA = Math.abs(args[j]), ryA = Math.abs(args[j + 1]);
        const phi = (args[j + 2] * Math.PI) / 180;
        const largeArc = args[j + 3];
        const sweep = args[j + 4];
        let ex = args[j + 5], ey = args[j + 6];
        if (cmd === "a") { ex += cx; ey += cy; }

        if (rxA === 0 || ryA === 0) {
          ctx.lineTo(ex, ey);
          cx = ex; cy = ey;
          j += 7; continue;
        }

        const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
        const dx2 = (cx - ex) / 2, dy2 = (cy - ey) / 2;
        const x1p = cosPhi * dx2 + sinPhi * dy2;
        const y1p = -sinPhi * dx2 + cosPhi * dy2;

        let rx2 = rxA * rxA, ry2 = ryA * ryA;
        const x1p2 = x1p * x1p, y1p2 = y1p * y1p;
        const lam = x1p2 / rx2 + y1p2 / ry2;
        if (lam > 1) {
          const s = Math.sqrt(lam);
          rxA *= s; ryA *= s;
          rx2 = rxA * rxA; ry2 = ryA * ryA;
        }

        const num = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2);
        const den = rx2 * y1p2 + ry2 * x1p2;
        let sq = den > 0 ? Math.sqrt(num / den) : 0;
        if (largeArc === sweep) sq = -sq;
        const cxp = (sq * rxA * y1p) / ryA;
        const cyp = (-sq * ryA * x1p) / rxA;
        const cxArc = cosPhi * cxp - sinPhi * cyp + (cx + ex) / 2;
        const cyArc = sinPhi * cxp + cosPhi * cyp + (cy + ey) / 2;

        const angleVec = (ux: number, uy: number, vx: number, vy: number) => {
          const n = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
          if (n === 0) return 0;
          const c = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / n));
          let a = Math.acos(c);
          if (ux * vy - uy * vx < 0) a = -a;
          return a;
        };

        const theta1 = angleVec(1, 0, (x1p - cxp) / rxA, (y1p - cyp) / ryA);
        let dtheta = angleVec(
          (x1p - cxp) / rxA, (y1p - cyp) / ryA,
          (-x1p - cxp) / rxA, (-y1p - cyp) / ryA
        );
        if (sweep === 0 && dtheta > 0) dtheta -= 2 * Math.PI;
        else if (sweep === 1 && dtheta < 0) dtheta += 2 * Math.PI;

        // Approximate arc with bezier segments
        const segments = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI / 2)));
        const segAngle = dtheta / segments;
        for (let s = 0; s < segments; s++) {
          const a1 = theta1 + s * segAngle;
          const a2 = theta1 + (s + 1) * segAngle;
          const alpha = (4 / 3) * Math.tan(segAngle / 4);
          const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
          const cos2 = Math.cos(a2), sin2 = Math.sin(a2);

          const ep1x = rxA * cos1, ep1y = ryA * sin1;
          const ep2x = rxA * cos2, ep2y = ryA * sin2;
          const cp1x = ep1x - alpha * rxA * sin1;
          const cp1y = ep1y + alpha * ryA * cos1;
          const cp2x = ep2x + alpha * rxA * sin2;
          const cp2y = ep2y - alpha * ryA * cos2;

          const transform = (px: number, py: number): [number, number] => [
            cosPhi * px - sinPhi * py + cxArc,
            sinPhi * px + cosPhi * py + cyArc,
          ];

          const [tc1x, tc1y] = transform(cp1x, cp1y);
          const [tc2x, tc2y] = transform(cp2x, cp2y);
          const [tex, tey] = transform(ep2x, ep2y);
          ctx.bezierCurveTo(tc1x, tc1y, tc2x, tc2y, tex, tey);
        }

        cx = ex; cy = ey;
        j += 7;
      }
    } else if (cmd === "Z" || cmd === "z") {
      ctx.closePath();
    }
    lastCmd = cmd;
  }
}
