import yaml from "js-yaml";
import type { NpngDocument, NpngElement } from "./types";

export type Tool = "select" | "rect" | "ellipse" | "line" | "text"
  | "pen" | "polyline" | "polygon"
  | "star" | "polygon-shape" | "arrow-shape"
  | "image" | "frame";

export interface ElementAddress {
  layerIndex: number;
  elementIndex: number;
}

export interface DragState {
  type: "move" | "resize";
  handle?: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
  startX: number;
  startY: number;
  origProps: Record<string, number>;
}

export interface DrawState {
  tool: Tool;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface PenPoint {
  x: number;
  y: number;
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
}

export interface PenState {
  points: PenPoint[];
  preview?: { x: number; y: number };
  draggingHandle?: boolean;
  dragStart?: { x: number; y: number };
}

export interface PolyState {
  tool: "polyline" | "polygon";
  points: { x: number; y: number }[];
  preview?: { x: number; y: number };
}

export interface EditorState {
  yamlText: string;
  parsedDoc: NpngDocument | null;
  selection: ElementAddress[];
  activeTool: Tool;
  dragState: DragState | null;
  drawState: DrawState | null;
  penState: PenState | null;
  polyState: PolyState | null;
  history: string[];
  historyIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  gridSize: number;
}

export type EditorAction =
  | { type: "SET_YAML"; yaml: string; pushHistory?: boolean }
  | { type: "SELECT"; address: ElementAddress | null; append?: boolean }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "UPDATE_ELEMENT"; address: ElementAddress; props: Record<string, unknown> }
  | { type: "ADD_ELEMENT"; layerIndex: number; element: NpngElement }
  | { type: "DELETE_ELEMENT"; address: ElementAddress }
  | { type: "SET_DRAG"; dragState: DragState | null }
  | { type: "SET_DRAW"; drawState: DrawState | null }
  | { type: "REORDER_ELEMENT"; from: ElementAddress; toIndex: number }
  | { type: "TOGGLE_LAYER_VISIBILITY"; layerIndex: number }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; panX: number; panY: number }
  | { type: "TOGGLE_GRID" }
  | { type: "ADD_LAYER" }
  | { type: "DELETE_LAYER"; layerIndex: number }
  | { type: "RENAME_LAYER"; layerIndex: number; name: string }
  | { type: "REORDER_LAYER"; fromIndex: number; toIndex: number }
  | { type: "UPDATE_LAYER"; layerIndex: number; props: Record<string, unknown> }
  | { type: "UNDO" }
  | { type: "REDO" }
  // Pen tool actions
  | { type: "ADD_PEN_POINT"; point: PenPoint }
  | { type: "UPDATE_PEN_PREVIEW"; x: number; y: number }
  | { type: "UPDATE_PEN_DRAG"; cp2: { x: number; y: number } }
  | { type: "FINISH_PEN" }
  | { type: "CANCEL_PEN" }
  | { type: "START_PEN_DRAG"; x: number; y: number }
  | { type: "END_PEN_DRAG" }
  // Polyline/Polygon actions
  | { type: "ADD_POLY_POINT"; point: { x: number; y: number } }
  | { type: "UPDATE_POLY_PREVIEW"; x: number; y: number }
  | { type: "FINISH_POLY" }
  | { type: "CANCEL_POLY" }
  // Layer clip
  | { type: "SET_LAYER_CLIP"; layerIndex: number; clipPath: string | null };

const MAX_HISTORY = 100;

function tryParse(text: string): NpngDocument | null {
  try {
    const doc = yaml.load(text) as NpngDocument;
    if (doc && typeof doc === "object") return doc;
  } catch { /* ignore */ }
  return null;
}

function docToYaml(doc: NpngDocument): string {
  return yaml.dump(doc, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

function pushHistory(state: EditorState, newYaml: string): Pick<EditorState, "history" | "historyIndex"> {
  const truncated = state.history.slice(0, state.historyIndex + 1);
  truncated.push(newYaml);
  if (truncated.length > MAX_HISTORY) truncated.shift();
  return { history: truncated, historyIndex: truncated.length - 1 };
}

function penPointsToPathD(points: PenPoint[], closed: boolean): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const cp1 = prev.cp2 ?? prev;
    const cp2 = cur.cp1 ?? cur;
    if ((cp1.x === prev.x && cp1.y === prev.y) && (cp2.x === cur.x && cp2.y === cur.y)) {
      d += ` L ${cur.x} ${cur.y}`;
    } else {
      d += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${cur.x} ${cur.y}`;
    }
  }
  if (closed) d += " Z";
  return d;
}

function polyPointsToPathD(points: { x: number; y: number }[], closed: boolean): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  if (closed) d += " Z";
  return d;
}

export function createInitialState(yamlText: string): EditorState {
  const parsedDoc = tryParse(yamlText);
  return {
    yamlText,
    parsedDoc,
    selection: [],
    activeTool: "select",
    dragState: null,
    drawState: null,
    penState: null,
    polyState: null,
    history: [yamlText],
    historyIndex: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: false,
    gridSize: 10,
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_YAML": {
      const parsedDoc = tryParse(action.yaml);
      const hist = action.pushHistory !== false ? pushHistory(state, action.yaml) : { history: state.history, historyIndex: state.historyIndex };
      return { ...state, yamlText: action.yaml, parsedDoc, ...hist };
    }

    case "SELECT": {
      if (!action.address) return { ...state, selection: [] };
      if (action.append) {
        const exists = state.selection.findIndex(s => s.layerIndex === action.address!.layerIndex && s.elementIndex === action.address!.elementIndex);
        if (exists >= 0) {
          return { ...state, selection: state.selection.filter((_, i) => i !== exists) };
        }
        return { ...state, selection: [...state.selection, action.address] };
      }
      return { ...state, selection: [action.address] };
    }

    case "SET_TOOL":
      return { ...state, activeTool: action.tool, selection: action.tool !== "select" ? [] : state.selection, penState: null, polyState: null };

    case "UPDATE_ELEMENT": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const { layerIndex, elementIndex } = action.address;
      const layer = doc.layers[layerIndex];
      if (!layer?.elements?.[elementIndex]) return state;
      const newDoc = structuredClone(doc);
      const el = newDoc.layers![layerIndex].elements![elementIndex] as NpngElement & Record<string, unknown>;
      for (const [k, v] of Object.entries(action.props)) {
        if (v === undefined || v === null) delete el[k];
        else el[k] = v;
      }
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, ...pushHistory(state, newYaml) };
    }

    case "ADD_ELEMENT": {
      const doc = state.parsedDoc;
      if (!doc) return state;
      const newDoc = structuredClone(doc);
      if (!newDoc.layers || newDoc.layers.length === 0) {
        newDoc.layers = [{ name: "default", elements: [] }];
      }
      const li = Math.min(action.layerIndex, newDoc.layers.length - 1);
      if (!newDoc.layers[li].elements) newDoc.layers[li].elements = [];
      newDoc.layers[li].elements!.push(action.element);
      const newYaml = docToYaml(newDoc);
      const newAddr: ElementAddress = { layerIndex: li, elementIndex: newDoc.layers[li].elements!.length - 1 };
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [newAddr], activeTool: "select", ...pushHistory(state, newYaml) };
    }

    case "DELETE_ELEMENT": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const { layerIndex, elementIndex } = action.address;
      const newDoc = structuredClone(doc);
      newDoc.layers![layerIndex].elements!.splice(elementIndex, 1);
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [], ...pushHistory(state, newYaml) };
    }

    case "SET_DRAG":
      return { ...state, dragState: action.dragState };

    case "SET_DRAW":
      return { ...state, drawState: action.drawState };

    case "REORDER_ELEMENT": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const { from, toIndex } = action;
      const newDoc = structuredClone(doc);
      const elements = newDoc.layers![from.layerIndex].elements!;
      const [removed] = elements.splice(from.elementIndex, 1);
      elements.splice(toIndex, 0, removed);
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [{ layerIndex: from.layerIndex, elementIndex: toIndex }], ...pushHistory(state, newYaml) };
    }

    case "TOGGLE_LAYER_VISIBILITY": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      const newDoc = structuredClone(doc);
      const layer = newDoc.layers![action.layerIndex];
      layer.visible = layer.visible === false ? true : false;
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, ...pushHistory(state, newYaml) };
    }

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(0.1, Math.min(10, action.zoom)) };

    case "SET_PAN":
      return { ...state, panX: action.panX, panY: action.panY };

    case "TOGGLE_GRID":
      return { ...state, showGrid: !state.showGrid };

    case "ADD_LAYER": {
      const doc = state.parsedDoc;
      if (!doc) return state;
      const newDoc = structuredClone(doc);
      if (!newDoc.layers) newDoc.layers = [];
      const layerNum = newDoc.layers.length + 1;
      newDoc.layers.unshift({ name: `Layer ${layerNum}`, elements: [] });
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [], ...pushHistory(state, newYaml) };
    }

    case "DELETE_LAYER": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      const newDoc = structuredClone(doc);
      newDoc.layers!.splice(action.layerIndex, 1);
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [], ...pushHistory(state, newYaml) };
    }

    case "RENAME_LAYER": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      const newDoc = structuredClone(doc);
      newDoc.layers![action.layerIndex].name = action.name;
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, ...pushHistory(state, newYaml) };
    }

    case "REORDER_LAYER": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const { fromIndex, toIndex } = action;
      if (fromIndex < 0 || fromIndex >= doc.layers.length || toIndex < 0 || toIndex >= doc.layers.length) return state;
      const newDoc = structuredClone(doc);
      const [removed] = newDoc.layers!.splice(fromIndex, 1);
      newDoc.layers!.splice(toIndex, 0, removed);
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [], ...pushHistory(state, newYaml) };
    }

    case "UPDATE_LAYER": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      const newDoc = structuredClone(doc);
      const layer = newDoc.layers![action.layerIndex] as Record<string, unknown>;
      for (const [k, v] of Object.entries(action.props)) {
        if (v === undefined || v === null) delete layer[k];
        else layer[k] = v;
      }
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, ...pushHistory(state, newYaml) };
    }

    // Pen tool
    case "ADD_PEN_POINT": {
      const penState = state.penState ?? { points: [] };
      return { ...state, penState: { ...penState, points: [...penState.points, action.point] } };
    }

    case "UPDATE_PEN_PREVIEW": {
      if (!state.penState) return state;
      return { ...state, penState: { ...state.penState, preview: { x: action.x, y: action.y } } };
    }

    case "START_PEN_DRAG": {
      if (!state.penState) return state;
      return { ...state, penState: { ...state.penState, draggingHandle: true, dragStart: { x: action.x, y: action.y } } };
    }

    case "UPDATE_PEN_DRAG": {
      if (!state.penState || !state.penState.draggingHandle) return state;
      const pts = [...state.penState.points];
      if (pts.length > 0) {
        const last = { ...pts[pts.length - 1] };
        last.cp2 = action.cp2;
        pts[pts.length - 1] = last;
      }
      return { ...state, penState: { ...state.penState, points: pts } };
    }

    case "END_PEN_DRAG": {
      if (!state.penState) return state;
      return { ...state, penState: { ...state.penState, draggingHandle: false, dragStart: undefined } };
    }

    case "FINISH_PEN": {
      if (!state.penState || state.penState.points.length < 2) {
        return { ...state, penState: null };
      }
      const pts = state.penState.points;
      const closed = pts.length >= 3;
      const d = penPointsToPathD(pts, closed);
      const doc = state.parsedDoc;
      if (!doc || !d) return { ...state, penState: null };
      const newDoc = structuredClone(doc);
      if (!newDoc.layers || newDoc.layers.length === 0) {
        newDoc.layers = [{ name: "default", elements: [] }];
      }
      const li = 0;
      if (!newDoc.layers[li].elements) newDoc.layers[li].elements = [];
      const element: NpngElement = { type: "path", d, fill: closed ? "#3498DB" : "none" };
      if (!closed) element.stroke = { color: "#333333", width: 2 };
      newDoc.layers[li].elements!.push(element);
      const newYaml = docToYaml(newDoc);
      const newAddr: ElementAddress = { layerIndex: li, elementIndex: newDoc.layers[li].elements!.length - 1 };
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [newAddr], activeTool: "select", penState: null, ...pushHistory(state, newYaml) };
    }

    case "CANCEL_PEN":
      return { ...state, penState: null };

    // Polyline/Polygon
    case "ADD_POLY_POINT": {
      const polyState = state.polyState ?? { tool: state.activeTool as "polyline" | "polygon", points: [] };
      return { ...state, polyState: { ...polyState, points: [...polyState.points, action.point] } };
    }

    case "UPDATE_POLY_PREVIEW": {
      if (!state.polyState) return state;
      return { ...state, polyState: { ...state.polyState, preview: { x: action.x, y: action.y } } };
    }

    case "FINISH_POLY": {
      if (!state.polyState || state.polyState.points.length < 2) {
        return { ...state, polyState: null };
      }
      const closed = state.polyState.tool === "polygon";
      const d = polyPointsToPathD(state.polyState.points, closed);
      const doc = state.parsedDoc;
      if (!doc || !d) return { ...state, polyState: null };
      const newDoc = structuredClone(doc);
      if (!newDoc.layers || newDoc.layers.length === 0) {
        newDoc.layers = [{ name: "default", elements: [] }];
      }
      const li = 0;
      if (!newDoc.layers[li].elements) newDoc.layers[li].elements = [];
      const element: NpngElement = { type: "path", d };
      if (closed) {
        element.fill = "#2ECC71";
      } else {
        element.fill = "none";
        element.stroke = { color: "#333333", width: 2 };
      }
      newDoc.layers[li].elements!.push(element);
      const newYaml = docToYaml(newDoc);
      const newAddr: ElementAddress = { layerIndex: li, elementIndex: newDoc.layers[li].elements!.length - 1 };
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [newAddr], activeTool: "select", polyState: null, ...pushHistory(state, newYaml) };
    }

    case "CANCEL_POLY":
      return { ...state, polyState: null };

    case "SET_LAYER_CLIP": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      const newDoc = structuredClone(doc);
      if (action.clipPath) {
        newDoc.layers![action.layerIndex].clip_path = action.clipPath;
      } else {
        delete newDoc.layers![action.layerIndex].clip_path;
      }
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, ...pushHistory(state, newYaml) };
    }

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const newYaml = state.history[newIndex];
      return { ...state, yamlText: newYaml, parsedDoc: tryParse(newYaml), historyIndex: newIndex, selection: [] };
    }

    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const newYaml = state.history[newIndex];
      return { ...state, yamlText: newYaml, parsedDoc: tryParse(newYaml), historyIndex: newIndex, selection: [] };
    }

    default:
      return state;
  }
}
