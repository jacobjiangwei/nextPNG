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
  role: "anchor" | "c1" | "c2" | "q";
}

export interface PathHandle extends PathHandleRef, Point {}

export interface PathControlLine {
  from: Point;
  to: Point;
}

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

export function isEditablePathData(d: string): boolean {
  return parsePath(d).every(([cmd]) => "MmLlHhVvCcSsQqTtZz".includes(cmd));
}

function hasAnchor(command: EditablePathCommand): command is Exclude<EditablePathCommand, { type: "Z" }> {
  return command.type !== "Z";
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
  let previousAnchor: Point | null = null;
  for (const command of commands) {
    if (command.type === "M") {
      previousAnchor = command.point;
    } else if (command.type === "L") {
      previousAnchor = command.point;
    } else if (command.type === "C") {
      if (previousAnchor) lines.push({ from: previousAnchor, to: command.c1 });
      lines.push({ from: command.point, to: command.c2 });
      previousAnchor = command.point;
    } else if (command.type === "Q") {
      if (previousAnchor) lines.push({ from: previousAnchor, to: command.c });
      lines.push({ from: command.point, to: command.c });
      previousAnchor = command.point;
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
    if (distance <= tolerance && distance < closestDistance) {
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
    movePoint(command.point, dx, dy);
    if (command.type === "C") movePoint(command.c2, dx, dy);
    if (command.type === "Q") movePoint(command.c, dx, dy);

    const next = commands[handle.commandIndex + 1];
    if (next?.type === "C") movePoint(next.c1, dx, dy);
    if (next?.type === "Q") movePoint(next.c, dx, dy);
  } else if (handle.role === "c1" && command.type === "C") {
    movePoint(command.c1, dx, dy);
  } else if (handle.role === "c2" && command.type === "C") {
    movePoint(command.c2, dx, dy);
  } else if (handle.role === "q" && command.type === "Q") {
    movePoint(command.c, dx, dy);
  }

  return serializeEditablePath(commands);
}
