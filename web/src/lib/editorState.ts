import yaml from "js-yaml";
import { applyMove, getOrigProps } from "./canvasInteraction";
import { getBoundingBox, mergeBoundingBoxes } from "./hitTest";
import type { GroupElement, NpngDocument, NpngElement } from "./types";

export type Tool = "select" | "rect" | "ellipse" | "line" | "text"
  | "pen" | "polyline" | "polygon"
  | "star" | "polygon-shape" | "arrow-shape"
  | "image" | "frame";

export interface ElementAddress {
  layerIndex: number;
  elementIndex: number;
}

export interface DragState {
  type: "move" | "resize" | "rotate";
  handle?: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
  startX: number;
  startY: number;
  origProps: Record<string, number>;
}

export interface ElementUpdate {
  address: ElementAddress;
  props: Record<string, unknown>;
}

export type AlignmentCommand = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type DistributionCommand = "horizontal" | "vertical";

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
  | { type: "SELECT_MANY"; addresses: ElementAddress[]; append?: boolean }
  | { type: "SELECT_ALL" }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "UPDATE_ELEMENT"; address: ElementAddress; props: Record<string, unknown> }
  | { type: "UPDATE_ELEMENTS"; updates: ElementUpdate[] }
  | { type: "ALIGN_SELECTION"; alignment: AlignmentCommand }
  | { type: "DISTRIBUTE_SELECTION"; direction: DistributionCommand }
  | { type: "GROUP_SELECTION" }
  | { type: "UNGROUP_SELECTION" }
  | { type: "MOVE_SELECTION_TO_TOP_LAYER" }
  | { type: "ADD_ELEMENT"; layerIndex: number; element: NpngElement }
  | { type: "DUPLICATE_SELECTION"; offset?: number }
  | { type: "DELETE_ELEMENT"; address: ElementAddress }
  | { type: "TOGGLE_ELEMENT_LOCK"; address: ElementAddress }
  | { type: "SET_DRAG"; dragState: DragState | null }
  | { type: "SET_DRAW"; drawState: DrawState | null }
  | { type: "REORDER_ELEMENT"; from: ElementAddress; toIndex: number }
  | { type: "TOGGLE_LAYER_VISIBILITY"; layerIndex: number }
  | { type: "TOGGLE_LAYER_LOCK"; layerIndex: number }
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
const DEFAULT_DUPLICATE_OFFSET = 16;

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

function sameAddress(a: ElementAddress, b: ElementAddress): boolean {
  return a.layerIndex === b.layerIndex && a.elementIndex === b.elementIndex;
}

function uniqueAddresses(addresses: ElementAddress[]): ElementAddress[] {
  const unique: ElementAddress[] = [];
  for (const address of addresses) {
    if (!unique.some((existing) => sameAddress(existing, address))) unique.push(address);
  }
  return unique;
}

function applyElementProps(element: NpngElement, props: Record<string, unknown>): void {
  const editable = element as NpngElement & Record<string, unknown>;
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) delete editable[k];
    else editable[k] = v;
  }
}

function isEditableAddress(doc: NpngDocument, address: ElementAddress): boolean {
  const layer = doc.layers?.[address.layerIndex];
  const element = layer?.elements?.[address.elementIndex];
  return !!layer && layer.visible !== false && !layer.locked && !!element && !element.locked;
}

function isEditableLayer(layer: NonNullable<NpngDocument["layers"]>[number]): boolean {
  return layer.visible !== false && !layer.locked;
}

function isCleanInsertionLayer(layer: NonNullable<NpngDocument["layers"]>[number]): boolean {
  return isEditableLayer(layer)
    && (layer.opacity === undefined || layer.opacity === 1)
    && (layer.blend_mode === undefined || layer.blend_mode === "normal")
    && !layer.filters?.length
    && !layer.clip_path
    && !layer.mask;
}

function createTopInsertionLayer(doc: NpngDocument): number {
  if (!doc.layers) doc.layers = [];
  const layerNum = doc.layers.length + 1;
  doc.layers.push({ name: `Layer ${layerNum}`, elements: [] });
  return doc.layers.length - 1;
}

function ensureTopInsertionLayerIndex(doc: NpngDocument): number {
  const layers = doc.layers ?? [];
  if (layers.length === 0) return createTopInsertionLayer(doc);
  const topLayer = layers[layers.length - 1];
  return isCleanInsertionLayer(topLayer) ? layers.length - 1 : createTopInsertionLayer(doc);
}

function getInsertionLayerIndex(doc: NpngDocument, preferredIndex: number): number {
  const layers = doc.layers ?? [];
  if (layers.length === 0) return -1;
  const requestedIndex = preferredIndex < 0
    ? layers.length - 1
    : Math.min(Math.max(0, preferredIndex), layers.length - 1);
  if (isEditableLayer(layers[requestedIndex])) return requestedIndex;
  for (let i = requestedIndex; i >= 0; i--) {
    if (isEditableLayer(layers[i])) return i;
  }
  for (let i = requestedIndex + 1; i < layers.length; i++) {
    if (isEditableLayer(layers[i])) return i;
  }
  return -1;
}

function canSafelyUngroup(element: NpngElement): element is GroupElement {
  return element.type === "group" && !element.locked && !element.transform && (element.opacity === undefined || element.opacity === 1);
}

function applyElementUpdates(state: EditorState, updates: ElementUpdate[]): EditorState {
  const doc = state.parsedDoc;
  if (!doc?.layers || updates.length === 0) return state;
  const newDoc = structuredClone(doc);
  let changed = false;
  for (const update of updates) {
    if (!isEditableAddress(newDoc, update.address)) continue;
    const element = newDoc.layers?.[update.address.layerIndex]?.elements?.[update.address.elementIndex];
    if (!element) continue;
    applyElementProps(element, update.props);
    changed = true;
  }
  if (!changed) return state;
  const newYaml = docToYaml(newDoc);
  return { ...state, yamlText: newYaml, parsedDoc: newDoc, ...pushHistory(state, newYaml) };
}

function buildMoveUpdate(address: ElementAddress, element: NpngElement, dx: number, dy: number): ElementUpdate | null {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return null;
  const props = applyMove(element, dx, dy, getOrigProps(element));
  return Object.keys(props).length > 0 ? { address, props } : null;
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
      if (state.parsedDoc && !isEditableAddress(state.parsedDoc, action.address)) return { ...state, selection: [] };
      if (action.append) {
        const exists = state.selection.findIndex(s => sameAddress(s, action.address!));
        if (exists >= 0) {
          return { ...state, selection: state.selection.filter((_, i) => i !== exists) };
        }
        return { ...state, selection: [...state.selection, action.address] };
      }
      return { ...state, selection: [action.address] };
    }

    case "SELECT_MANY": {
      const addresses = state.parsedDoc
        ? action.addresses.filter((address) => isEditableAddress(state.parsedDoc!, address))
        : action.addresses;
      const nextSelection = action.append
        ? uniqueAddresses([...state.selection, ...addresses])
        : uniqueAddresses(addresses);
      return { ...state, selection: nextSelection };
    }

    case "SELECT_ALL": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const addresses: ElementAddress[] = [];
      doc.layers.forEach((layer, layerIndex) => {
        if (layer.visible === false) return;
        if (layer.locked) return;
        (layer.elements ?? []).forEach((_, elementIndex) => {
          const address = { layerIndex, elementIndex };
          if (isEditableAddress(doc, address)) addresses.push(address);
        });
      });
      return { ...state, selection: addresses };
    }

    case "SET_TOOL":
      return { ...state, activeTool: action.tool, selection: action.tool !== "select" ? [] : state.selection, penState: null, polyState: null };

    case "UPDATE_ELEMENT": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const { layerIndex, elementIndex } = action.address;
      const layer = doc.layers[layerIndex];
      if (!layer?.elements?.[elementIndex] || !isEditableAddress(doc, action.address)) return state;
      const newDoc = structuredClone(doc);
      const el = newDoc.layers![layerIndex].elements![elementIndex];
      applyElementProps(el, action.props);
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, ...pushHistory(state, newYaml) };
    }

    case "UPDATE_ELEMENTS": {
      return applyElementUpdates(state, action.updates);
    }

    case "ALIGN_SELECTION": {
      const doc = state.parsedDoc;
      if (!doc?.layers || state.selection.length < 2) return state;
      const items = state.selection.flatMap((address) => {
        const element = doc.layers?.[address.layerIndex]?.elements?.[address.elementIndex];
        return element && isEditableAddress(doc, address) ? [{ address, element, box: getBoundingBox(element) }] : [];
      });
      const selectionBox = mergeBoundingBoxes(items.map((item) => item.box));
      if (!selectionBox) return state;

      const updates = items.flatMap((item) => {
        let dx = 0;
        let dy = 0;
        if (action.alignment === "left") dx = selectionBox.x - item.box.x;
        else if (action.alignment === "center") dx = selectionBox.x + selectionBox.width / 2 - (item.box.x + item.box.width / 2);
        else if (action.alignment === "right") dx = selectionBox.x + selectionBox.width - (item.box.x + item.box.width);
        else if (action.alignment === "top") dy = selectionBox.y - item.box.y;
        else if (action.alignment === "middle") dy = selectionBox.y + selectionBox.height / 2 - (item.box.y + item.box.height / 2);
        else if (action.alignment === "bottom") dy = selectionBox.y + selectionBox.height - (item.box.y + item.box.height);
        const update = buildMoveUpdate(item.address, item.element, dx, dy);
        return update ? [update] : [];
      });
      return applyElementUpdates(state, updates);
    }

    case "DISTRIBUTE_SELECTION": {
      const doc = state.parsedDoc;
      if (!doc?.layers || state.selection.length < 3) return state;
      const items = state.selection.flatMap((address) => {
        const element = doc.layers?.[address.layerIndex]?.elements?.[address.elementIndex];
        return element && isEditableAddress(doc, address) ? [{ address, element, box: getBoundingBox(element) }] : [];
      });
      if (items.length < 3) return state;

      const sorted = [...items].sort((a, b) => action.direction === "horizontal"
        ? a.box.x - b.box.x
        : a.box.y - b.box.y);
      const selectionBox = mergeBoundingBoxes(sorted.map((item) => item.box));
      if (!selectionBox) return state;

      const totalSize = sorted.reduce((sum, item) => sum + (action.direction === "horizontal" ? item.box.width : item.box.height), 0);
      const available = action.direction === "horizontal" ? selectionBox.width : selectionBox.height;
      const gap = (available - totalSize) / (sorted.length - 1);
      let cursor = action.direction === "horizontal" ? selectionBox.x : selectionBox.y;

      const updates = sorted.flatMap((item) => {
        const dx = action.direction === "horizontal" ? cursor - item.box.x : 0;
        const dy = action.direction === "vertical" ? cursor - item.box.y : 0;
        cursor += (action.direction === "horizontal" ? item.box.width : item.box.height) + gap;
        const update = buildMoveUpdate(item.address, item.element, dx, dy);
        return update ? [update] : [];
      });
      return applyElementUpdates(state, updates);
    }

    case "GROUP_SELECTION": {
      const doc = state.parsedDoc;
      if (!doc?.layers || state.selection.length < 2) return state;
      const layerIndex = state.selection[0].layerIndex;
      if (state.selection.some((address) => address.layerIndex !== layerIndex || !isEditableAddress(doc, address))) return state;
      const elements = doc.layers[layerIndex].elements ?? [];
      const sorted = [...state.selection].sort((a, b) => a.elementIndex - b.elementIndex);
      const groupedElements = sorted.flatMap((address) => {
        const element = elements[address.elementIndex];
        return element ? [structuredClone(element)] : [];
      });
      if (groupedElements.length < 2) return state;

      const newDoc = structuredClone(doc);
      const newElements = newDoc.layers![layerIndex].elements ?? [];
      for (const address of [...sorted].sort((a, b) => b.elementIndex - a.elementIndex)) {
        newElements.splice(address.elementIndex, 1);
      }
      const insertIndex = Math.min(...sorted.map((address) => address.elementIndex));
      newElements.splice(insertIndex, 0, { type: "group", name: "Group", elements: groupedElements });
      newDoc.layers![layerIndex].elements = newElements;
      const newYaml = docToYaml(newDoc);
      return {
        ...state,
        yamlText: newYaml,
        parsedDoc: newDoc,
        selection: [{ layerIndex, elementIndex: insertIndex }],
        ...pushHistory(state, newYaml),
      };
    }

    case "UNGROUP_SELECTION": {
      const doc = state.parsedDoc;
      if (!doc?.layers || state.selection.length !== 1) return state;
      const address = state.selection[0];
      if (!isEditableAddress(doc, address)) return state;
      const group = doc.layers[address.layerIndex]?.elements?.[address.elementIndex];
      if (!group || !canSafelyUngroup(group) || !group.elements?.length) return state;

      const newDoc = structuredClone(doc);
      const elements = newDoc.layers![address.layerIndex].elements ?? [];
      const children = structuredClone(group.elements);
      elements.splice(address.elementIndex, 1, ...children);
      newDoc.layers![address.layerIndex].elements = elements;
      const selection = children.map((_, index) => ({ layerIndex: address.layerIndex, elementIndex: address.elementIndex + index }));
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection, ...pushHistory(state, newYaml) };
    }

    case "MOVE_SELECTION_TO_TOP_LAYER": {
      const doc = state.parsedDoc;
      if (!doc?.layers || state.selection.length === 0) return state;
      const movable = uniqueAddresses(state.selection)
        .filter((address) => isEditableAddress(doc, address))
        .sort((a, b) => b.layerIndex - a.layerIndex || b.elementIndex - a.elementIndex);
      if (movable.length === 0) return state;

      const newDoc = structuredClone(doc);
      const targetLayerIndex = ensureTopInsertionLayerIndex(newDoc);
      const moved: NpngElement[] = [];
      for (const address of movable) {
        const elements = newDoc.layers?.[address.layerIndex]?.elements;
        const original = doc.layers[address.layerIndex]?.elements?.[address.elementIndex];
        if (!elements || !original) continue;
        elements.splice(address.elementIndex, 1);
        moved.unshift(structuredClone(original));
      }

      if (moved.length === 0) return state;
      const targetElements = newDoc.layers![targetLayerIndex].elements ?? [];
      const startIndex = targetElements.length;
      targetElements.push(...moved);
      newDoc.layers![targetLayerIndex].elements = targetElements;
      const selection = moved.map((_, index) => ({ layerIndex: targetLayerIndex, elementIndex: startIndex + index }));
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection, ...pushHistory(state, newYaml) };
    }

    case "ADD_ELEMENT": {
      const doc = state.parsedDoc;
      if (!doc) return state;
      const newDoc = structuredClone(doc);
      const li = action.layerIndex < 0 || !newDoc.layers?.length
        ? ensureTopInsertionLayerIndex(newDoc)
        : getInsertionLayerIndex(newDoc, action.layerIndex);
      if (li < 0) return state;
      const targetElements = newDoc.layers![li].elements ?? [];
      targetElements.push(action.element);
      newDoc.layers![li].elements = targetElements;
      const newYaml = docToYaml(newDoc);
      const newAddr: ElementAddress = { layerIndex: li, elementIndex: targetElements.length - 1 };
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [newAddr], activeTool: "select", ...pushHistory(state, newYaml) };
    }

    case "DUPLICATE_SELECTION": {
      const doc = state.parsedDoc;
      if (!doc?.layers || state.selection.length === 0) return state;
      const newDoc = structuredClone(doc);
      const offset = action.offset ?? DEFAULT_DUPLICATE_OFFSET;
      const newSelection: ElementAddress[] = [];
      const orderedSelection = [...state.selection].sort((a, b) => a.layerIndex - b.layerIndex || a.elementIndex - b.elementIndex);

      for (const address of orderedSelection) {
        const elements = newDoc.layers?.[address.layerIndex]?.elements;
        const original = doc.layers[address.layerIndex]?.elements?.[address.elementIndex];
        if (!elements || !original || !isEditableAddress(doc, address)) continue;

        const duplicate = structuredClone(original);
        applyElementProps(duplicate, applyMove(duplicate, offset, offset, getOrigProps(duplicate)));
        elements.push(duplicate);
        newSelection.push({ layerIndex: address.layerIndex, elementIndex: elements.length - 1 });
      }

      if (newSelection.length === 0) return state;
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: newSelection, activeTool: "select", ...pushHistory(state, newYaml) };
    }

    case "DELETE_ELEMENT": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const { layerIndex, elementIndex } = action.address;
      if (!isEditableAddress(doc, action.address)) return state;
      const newDoc = structuredClone(doc);
      newDoc.layers![layerIndex].elements!.splice(elementIndex, 1);
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [], ...pushHistory(state, newYaml) };
    }

    case "TOGGLE_ELEMENT_LOCK": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const element = doc.layers[action.address.layerIndex]?.elements?.[action.address.elementIndex];
      if (!element) return state;
      const newDoc = structuredClone(doc);
      const nextElement = newDoc.layers![action.address.layerIndex].elements![action.address.elementIndex];
      nextElement.locked = !nextElement.locked;
      const newYaml = docToYaml(newDoc);
      const selection = nextElement.locked
        ? state.selection.filter((selected) => !sameAddress(selected, action.address))
        : state.selection;
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection, ...pushHistory(state, newYaml) };
    }

    case "SET_DRAG":
      return { ...state, dragState: action.dragState };

    case "SET_DRAW":
      return { ...state, drawState: action.drawState };

    case "REORDER_ELEMENT": {
      const doc = state.parsedDoc;
      if (!doc?.layers) return state;
      const { from, toIndex } = action;
      if (!isEditableAddress(doc, from)) return state;
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

    case "TOGGLE_LAYER_LOCK": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      const newDoc = structuredClone(doc);
      const layer = newDoc.layers![action.layerIndex];
      layer.locked = !layer.locked;
      const selection = layer.locked
        ? state.selection.filter((address) => address.layerIndex !== action.layerIndex)
        : state.selection;
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection, ...pushHistory(state, newYaml) };
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
      newDoc.layers.push({ name: `Layer ${layerNum}`, elements: [] });
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [], ...pushHistory(state, newYaml) };
    }

    case "DELETE_LAYER": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      if (doc.layers[action.layerIndex].locked) return state;
      const newDoc = structuredClone(doc);
      newDoc.layers!.splice(action.layerIndex, 1);
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [], ...pushHistory(state, newYaml) };
    }

    case "RENAME_LAYER": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      if (doc.layers[action.layerIndex].locked) return state;
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
      if (doc.layers[fromIndex].locked) return state;
      const newDoc = structuredClone(doc);
      const [removed] = newDoc.layers!.splice(fromIndex, 1);
      newDoc.layers!.splice(toIndex, 0, removed);
      const newYaml = docToYaml(newDoc);
      return { ...state, yamlText: newYaml, parsedDoc: newDoc, selection: [], ...pushHistory(state, newYaml) };
    }

    case "UPDATE_LAYER": {
      const doc = state.parsedDoc;
      if (!doc?.layers?.[action.layerIndex]) return state;
      if (doc.layers[action.layerIndex].locked) return state;
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
      const li = ensureTopInsertionLayerIndex(newDoc);
      if (li < 0) return { ...state, penState: null };
      const targetElements = newDoc.layers![li].elements ?? [];
      const element: NpngElement = { type: "path", name: closed ? "Closed Path" : "Pen Path", d, fill: closed ? "#3498DB" : "none" };
      if (!closed) element.stroke = { color: "#333333", width: 2 };
      targetElements.push(element);
      newDoc.layers![li].elements = targetElements;
      const newYaml = docToYaml(newDoc);
      const newAddr: ElementAddress = { layerIndex: li, elementIndex: targetElements.length - 1 };
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
      const li = ensureTopInsertionLayerIndex(newDoc);
      if (li < 0) return { ...state, polyState: null };
      const targetElements = newDoc.layers![li].elements ?? [];
      const element: NpngElement = { type: "path", name: closed ? "Polygon" : "Polyline", d };
      if (closed) {
        element.fill = "#2ECC71";
      } else {
        element.fill = "none";
        element.stroke = { color: "#333333", width: 2 };
      }
      targetElements.push(element);
      newDoc.layers![li].elements = targetElements;
      const newYaml = docToYaml(newDoc);
      const newAddr: ElementAddress = { layerIndex: li, elementIndex: targetElements.length - 1 };
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
