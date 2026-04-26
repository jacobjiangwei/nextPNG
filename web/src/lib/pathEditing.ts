import { parsePath } from "./pathParser";

export interface Point {
  x: number;
  y: number;
}

export type EditablePathCommand =
  | { type: "M"; point: Point }
  | { type: "L"; point: Point }
  | { type: "C"; c1: Point; c2: Point; point: Point }
  | { type: "Q"; c: Point; point: Point }
  | { type: "Z" };

export interface PathHandleRef {
  commandIndex: number;
  role: "anchor" | "c1" | "c2" | "q" | "segment";
}

export interface PathHandle extends PathHandleRef, Point {}

export interface PathControlLine {
  from: Point;
  to: Point;
}

const LINE_TO_CURVE_MIN_DRAG = 1;

const roundCoord = (value: number): number => {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const clonePoint = (point: Point): Point => ({ x: point.x, y: point.y });

const reflectPoint = (origin: Point, point: Point): Point => ({
  x: origin.x * 2 - point.x,
  y: origin.y * 2 - point.y,
});

const movePoint = (point: Point, dx: number, dy: number): void => {
  point.x += dx;
  point.y += dy;
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const midpoint = (a: Point, b: Point): Point => ({
  x: lerp(a.x, b.x, 0.5),
  y: lerp(a.y, b.y, 0.5),
});

const quadraticPoint = (start: Point, control: Point, end: Point, t: number): Point => {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
};

const cubicPoint = (start: Point, c1: Point, c2: Point, end: Point, t: number): Point => {
  const mt = 1 - t;
  return {
    x: mt ** 3 * start.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * end.x,
    y: mt ** 3 * start.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * end.y,
  };
};

const handlePriority: Record<PathHandleRef["role"], number> = {
  anchor: 3,
  c1: 2,
  c2: 2,
  q: 2,
  segment: 1,
};

export function isEditablePathData(d: string): boolean {
  return parsePath(d).every(([cmd]) => "MmLlHhVvCcSsQqTtZz".includes(cmd));
}

function hasAnchor(command: EditablePathCommand): command is Exclude<EditablePathCommand, { type: "Z" }> {
  return command.type !== "Z";
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function getSegmentGeometry(commands: EditablePathCommand[], commandIndex: number): { start: Point; end: Point } | null {
  let current: Point | null = null;
  let subpathStart: Point | null = null;

  for (let i = 0; i <= commandIndex; i++) {
    const command = commands[i];
    if (!command) return null;

    if (i === commandIndex) {
      if (!current || command.type === "M") return null;
      const end = command.type === "Z" ? subpathStart : command.point;
      if (!end || samePoint(current, end)) return null;
      return { start: current, end };
    }

    if (command.type === "M") {
      current = command.point;
      subpathStart = command.point;
    } else if (command.type === "Z") {
      current = subpathStart;
    } else {
      current = command.point;
    }
  }

  return null;
}

function getSegmentHandlePoint(commands: EditablePathCommand[], commandIndex: number): Point | null {
  const command = commands[commandIndex];
  const segment = getSegmentGeometry(commands, commandIndex);
  if (!command || !segment) return null;

  if (command.type === "L" || command.type === "Z") return midpoint(segment.start, segment.end);
  if (command.type === "Q") return quadraticPoint(segment.start, command.c, command.point, 0.5);
  if (command.type === "C") return cubicPoint(segment.start, command.c1, command.c2, command.point, 0.5);
  return null;
}

function getPerpendicularDragDistance(segment: { start: Point; end: Point }, dx: number, dy: number): number {
  const segmentX = segment.end.x - segment.start.x;
  const segmentY = segment.end.y - segment.start.y;
  const length = Math.hypot(segmentX, segmentY);
  if (length === 0) return Math.hypot(dx, dy);
  return Math.abs(segmentX * dy - segmentY * dx) / length;
}

function moveIncomingHandle(command: EditablePathCommand, dx: number, dy: number): void {
  if (command.type === "C") movePoint(command.c2, dx, dy);
  if (command.type === "Q") movePoint(command.c, dx, dy);
}

function moveClosingEndpointForSubpathStart(
  commands: EditablePathCommand[],
  moveIndex: number,
  oldStart: Point,
  dx: number,
  dy: number,
): void {
  for (let i = moveIndex + 1; i < commands.length; i++) {
    const command = commands[i];
    if (command.type === "M") return;
    if (command.type !== "Z") continue;

    const closingCommand = commands[i - 1];
    if (closingCommand && hasAnchor(closingCommand) && samePoint(closingCommand.point, oldStart)) {
      movePoint(closingCommand.point, dx, dy);
      moveIncomingHandle(closingCommand, dx, dy);
    }
    return;
  }
}

export function parseEditablePath(d: string): EditablePathCommand[] {
  const commands = parsePath(d);
  const editable: EditablePathCommand[] = [];
  let current: Point = { x: 0, y: 0 };
  let subpathStart: Point = { x: 0, y: 0 };
  let lastCommand = "";
  let lastCubicControl: Point | null = null;
  let lastQuadraticControl: Point | null = null;

  const pushMove = (point: Point) => {
    editable.push({ type: "M", point });
    current = clonePoint(point);
    subpathStart = clonePoint(point);
    lastCubicControl = null;
    lastQuadraticControl = null;
  };

  const pushLine = (point: Point) => {
    editable.push({ type: "L", point });
    current = clonePoint(point);
    lastCubicControl = null;
    lastQuadraticControl = null;
  };

  for (const [cmd, args] of commands) {
    if (cmd === "M" || cmd === "m") {
      for (let j = 0; j + 1 < args.length; j += 2) {
        const point = cmd === "M"
          ? { x: args[j], y: args[j + 1] }
          : { x: current.x + args[j], y: current.y + args[j + 1] };
        if (j === 0) pushMove(point);
        else pushLine(point);
      }
    } else if (cmd === "L" || cmd === "l") {
      for (let j = 0; j + 1 < args.length; j += 2) {
        pushLine(cmd === "L"
          ? { x: args[j], y: args[j + 1] }
          : { x: current.x + args[j], y: current.y + args[j + 1] });
      }
    } else if (cmd === "H" || cmd === "h") {
      for (const x of args) {
        pushLine({ x: cmd === "H" ? x : current.x + x, y: current.y });
      }
    } else if (cmd === "V" || cmd === "v") {
      for (const y of args) {
        pushLine({ x: current.x, y: cmd === "V" ? y : current.y + y });
      }
    } else if (cmd === "C" || cmd === "c") {
      for (let j = 0; j + 5 < args.length; j += 6) {
        const c1 = cmd === "C" ? { x: args[j], y: args[j + 1] } : { x: current.x + args[j], y: current.y + args[j + 1] };
        const c2 = cmd === "C" ? { x: args[j + 2], y: args[j + 3] } : { x: current.x + args[j + 2], y: current.y + args[j + 3] };
        const point = cmd === "C" ? { x: args[j + 4], y: args[j + 5] } : { x: current.x + args[j + 4], y: current.y + args[j + 5] };
        editable.push({ type: "C", c1, c2, point });
        current = clonePoint(point);
        lastCubicControl = clonePoint(c2);
        lastQuadraticControl = null;
      }
    } else if (cmd === "S" || cmd === "s") {
      for (let j = 0; j + 3 < args.length; j += 4) {
        const c1 = lastCubicControl && "CcSs".includes(lastCommand)
          ? reflectPoint(current, lastCubicControl)
          : clonePoint(current);
        const c2 = cmd === "S" ? { x: args[j], y: args[j + 1] } : { x: current.x + args[j], y: current.y + args[j + 1] };
        const point = cmd === "S" ? { x: args[j + 2], y: args[j + 3] } : { x: current.x + args[j + 2], y: current.y + args[j + 3] };
        editable.push({ type: "C", c1, c2, point });
        current = clonePoint(point);
        lastCubicControl = clonePoint(c2);
        lastQuadraticControl = null;
      }
    } else if (cmd === "Q" || cmd === "q") {
      for (let j = 0; j + 3 < args.length; j += 4) {
        const c = cmd === "Q" ? { x: args[j], y: args[j + 1] } : { x: current.x + args[j], y: current.y + args[j + 1] };
        const point = cmd === "Q" ? { x: args[j + 2], y: args[j + 3] } : { x: current.x + args[j + 2], y: current.y + args[j + 3] };
        editable.push({ type: "Q", c, point });
        current = clonePoint(point);
        lastQuadraticControl = clonePoint(c);
        lastCubicControl = null;
      }
    } else if (cmd === "T" || cmd === "t") {
      for (let j = 0; j + 1 < args.length; j += 2) {
        const c = lastQuadraticControl && "QqTt".includes(lastCommand)
          ? reflectPoint(current, lastQuadraticControl)
          : clonePoint(current);
        const point = cmd === "T" ? { x: args[j], y: args[j + 1] } : { x: current.x + args[j], y: current.y + args[j + 1] };
        editable.push({ type: "Q", c, point });
        current = clonePoint(point);
        lastQuadraticControl = clonePoint(c);
        lastCubicControl = null;
      }
    } else if (cmd === "A" || cmd === "a") {
      for (let j = 0; j + 6 < args.length; j += 7) {
        pushLine(cmd === "A"
          ? { x: args[j + 5], y: args[j + 6] }
          : { x: current.x + args[j + 5], y: current.y + args[j + 6] });
      }
    } else if (cmd === "Z" || cmd === "z") {
      editable.push({ type: "Z" });
      current = clonePoint(subpathStart);
      lastCubicControl = null;
      lastQuadraticControl = null;
    }
    lastCommand = cmd;
  }

  return editable;
}

export function serializeEditablePath(commands: EditablePathCommand[]): string {
  return commands.map((command) => {
    if (command.type === "M" || command.type === "L") {
      return `${command.type} ${roundCoord(command.point.x)} ${roundCoord(command.point.y)}`;
    }
    if (command.type === "C") {
      return `C ${roundCoord(command.c1.x)} ${roundCoord(command.c1.y)} ${roundCoord(command.c2.x)} ${roundCoord(command.c2.y)} ${roundCoord(command.point.x)} ${roundCoord(command.point.y)}`;
    }
    if (command.type === "Q") {
      return `Q ${roundCoord(command.c.x)} ${roundCoord(command.c.y)} ${roundCoord(command.point.x)} ${roundCoord(command.point.y)}`;
    }
    return "Z";
  }).join(" ");
}

export function getPathHandles(d: string): PathHandle[] {
  const commands = parseEditablePath(d);
  const handles: PathHandle[] = [];
  commands.forEach((command, commandIndex) => {
    const segmentPoint = getSegmentHandlePoint(commands, commandIndex);
    if (segmentPoint) {
      handles.push({ commandIndex, role: "segment", x: segmentPoint.x, y: segmentPoint.y });
    }
    if (command.type === "C") {
      handles.push({ commandIndex, role: "c1", x: command.c1.x, y: command.c1.y });
      handles.push({ commandIndex, role: "c2", x: command.c2.x, y: command.c2.y });
    } else if (command.type === "Q") {
      handles.push({ commandIndex, role: "q", x: command.c.x, y: command.c.y });
    }
    if (hasAnchor(command)) {
      handles.push({ commandIndex, role: "anchor", x: command.point.x, y: command.point.y });
    }
  });
  return handles;
}

export function getPathControlLines(d: string): PathControlLine[] {
  const commands = parseEditablePath(d);
  const lines: PathControlLine[] = [];
  let current: Point | null = null;
  let subpathStart: Point | null = null;
  for (const command of commands) {
    if (command.type === "M") {
      current = command.point;
      subpathStart = command.point;
    } else if (command.type === "L") {
      current = command.point;
    } else if (command.type === "C") {
      if (current) lines.push({ from: current, to: command.c1 });
      lines.push({ from: command.point, to: command.c2 });
      current = command.point;
    } else if (command.type === "Q") {
      if (current) lines.push({ from: current, to: command.c });
      lines.push({ from: command.point, to: command.c });
      current = command.point;
    } else if (command.type === "Z") {
      current = subpathStart;
    }
  }
  return lines;
}

export function getPathHandleAtPoint(d: string, x: number, y: number, tolerance = 8): PathHandleRef | null {
  const handles = getPathHandles(d);
  let closest: PathHandle | null = null;
  let closestDistance = Infinity;
  for (const handle of handles) {
    const distance = Math.hypot(handle.x - x, handle.y - y);
    const isCloser = distance < closestDistance;
    const hasPriority = Math.abs(distance - closestDistance) < 0.001
      && closest
      && handlePriority[handle.role] > handlePriority[closest.role];
    if (distance <= tolerance && (isCloser || hasPriority)) {
      closest = handle;
      closestDistance = distance;
    }
  }
  return closest ? { commandIndex: closest.commandIndex, role: closest.role } : null;
}

export function updatePathHandle(d: string, handle: PathHandleRef, dx: number, dy: number): string {
  const commands = parseEditablePath(d);
  const command = commands[handle.commandIndex];
  if (!command) return d;

  if (handle.role === "anchor" && hasAnchor(command)) {
    const oldPoint = clonePoint(command.point);
    movePoint(command.point, dx, dy);
    if (command.type === "C") movePoint(command.c2, dx, dy);
    if (command.type === "Q") movePoint(command.c, dx, dy);
    if (command.type === "M") moveClosingEndpointForSubpathStart(commands, handle.commandIndex, oldPoint, dx, dy);

    const next = commands[handle.commandIndex + 1];
    if (next?.type === "C") movePoint(next.c1, dx, dy);
    if (next?.type === "Q") movePoint(next.c, dx, dy);
  } else if (handle.role === "c1" && command.type === "C") {
    movePoint(command.c1, dx, dy);
  } else if (handle.role === "c2" && command.type === "C") {
    movePoint(command.c2, dx, dy);
  } else if (handle.role === "q" && command.type === "Q") {
    movePoint(command.c, dx, dy);
  } else if (handle.role === "segment") {
    const segment = getSegmentGeometry(commands, handle.commandIndex);
    if (!segment || command.type === "M") return d;

    if (command.type === "L" || command.type === "Z") {
      if (getPerpendicularDragDistance(segment, dx, dy) < LINE_TO_CURVE_MIN_DRAG) return d;
      const originalMid = midpoint(segment.start, segment.end);
      const targetMid = { x: originalMid.x + dx, y: originalMid.y + dy };
      const curve: EditablePathCommand = {
        type: "Q",
        c: {
          x: 2 * targetMid.x - (segment.start.x + segment.end.x) / 2,
          y: 2 * targetMid.y - (segment.start.y + segment.end.y) / 2,
        },
        point: clonePoint(segment.end),
      };
      if (command.type === "L") commands[handle.commandIndex] = curve;
      else commands.splice(handle.commandIndex, 0, curve);
    } else if (command.type === "Q") {
      movePoint(command.c, dx * 2, dy * 2);
    } else if (command.type === "C") {
      movePoint(command.c1, (dx * 4) / 3, (dy * 4) / 3);
      movePoint(command.c2, (dx * 4) / 3, (dy * 4) / 3);
    }
  }

  return serializeEditablePath(commands);
}

function countAnchors(commands: EditablePathCommand[]): number {
  return commands.filter(hasAnchor).length;
}

export function insertPathAnchor(d: string, handle: PathHandleRef): string {
  if (handle.role !== "segment") return d;
  const commands = parseEditablePath(d);
  const command = commands[handle.commandIndex];
  const segment = getSegmentGeometry(commands, handle.commandIndex);
  if (!command || !segment || command.type === "M") return d;

  if (command.type === "L" || command.type === "Z") {
    const inserted: EditablePathCommand = { type: "L", point: getSegmentHandlePoint(commands, handle.commandIndex) ?? midpoint(segment.start, segment.end) };
    commands.splice(handle.commandIndex, 0, inserted);
  } else if (command.type === "Q") {
    const p01 = midpoint(segment.start, command.c);
    const p12 = midpoint(command.c, command.point);
    const p012 = midpoint(p01, p12);
    commands.splice(
      handle.commandIndex,
      1,
      { type: "Q", c: p01, point: p012 },
      { type: "Q", c: p12, point: clonePoint(command.point) },
    );
  } else if (command.type === "C") {
    const p01 = midpoint(segment.start, command.c1);
    const p12 = midpoint(command.c1, command.c2);
    const p23 = midpoint(command.c2, command.point);
    const p012 = midpoint(p01, p12);
    const p123 = midpoint(p12, p23);
    const p0123 = midpoint(p012, p123);
    commands.splice(
      handle.commandIndex,
      1,
      { type: "C", c1: p01, c2: p012, point: p0123 },
      { type: "C", c1: p123, c2: p23, point: clonePoint(command.point) },
    );
  }

  return serializeEditablePath(commands);
}

export function deletePathAnchor(d: string, handle: PathHandleRef): string {
  if (handle.role !== "anchor") return d;
  const commands = parseEditablePath(d);
  const command = commands[handle.commandIndex];
  if (!command || !hasAnchor(command) || countAnchors(commands) <= 2) return d;

  if (command.type === "M") {
    const nextIndex = commands.findIndex((candidate, index) => index > handle.commandIndex && hasAnchor(candidate));
    if (nextIndex < 0) return d;
    const next = commands[nextIndex];
    if (!hasAnchor(next)) return d;
    commands[nextIndex] = { type: "M", point: clonePoint(next.point) };
    commands.splice(handle.commandIndex, 1);
  } else {
    commands.splice(handle.commandIndex, 1);
  }

  return serializeEditablePath(commands);
}
