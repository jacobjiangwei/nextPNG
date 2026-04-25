export interface GradientStop {
  offset: number;
  color: string;
}

export interface LinearGradient {
  type: "linear-gradient";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: GradientStop[];
}

export interface RadialGradient {
  type: "radial-gradient";
  cx: number;
  cy: number;
  r: number;
  stops: GradientStop[];
}

export type FillSpec = string | LinearGradient | RadialGradient | null;

export interface StrokeSpec {
  color?: string;
  width?: number;
  dash?: number[];
  cap?: "butt" | "round" | "square";
  join?: "miter" | "round" | "bevel";
}

export interface TransformSpec {
  translate?: [number, number];
  rotate?: number;
  scale?: number | [number, number];
  origin?: [number, number];
}

export interface BaseElement {
  type: string;
  fill?: FillSpec;
  stroke?: StrokeSpec;
  transform?: TransformSpec;
  opacity?: number;
}

export interface RectElement extends BaseElement {
  type: "rect";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  ry?: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
}

export interface LineElement extends BaseElement {
  type: "line";
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  x?: number;
  y?: number;
  content?: string;
  font_size?: number;
  font_family?: string;
  font_weight?: string;
  align?: "left" | "center" | "right";
}

export interface PathElement extends BaseElement {
  type: "path";
  d?: string;
  fill_rule?: "nonzero" | "evenodd";
}

export interface GroupElement extends BaseElement {
  type: "group";
  elements?: NpngElement[];
}

export interface BooleanElement extends BaseElement {
  type: "boolean";
  op?: "union" | "subtract" | "intersect" | "exclude";
  subjects?: Record<string, unknown>[];
  clips?: Record<string, unknown>[];
  fill_rule?: "nonzero" | "evenodd";
}

export interface UseElement extends BaseElement {
  type: "use";
  ref?: string;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
}

export type NpngElement =
  | RectElement
  | EllipseElement
  | LineElement
  | TextElement
  | PathElement
  | GroupElement
  | BooleanElement
  | UseElement;

export interface FilterSpec {
  type: "blur" | "drop-shadow";
  radius?: number;
  dx?: number;
  dy?: number;
  color?: string;
}

export interface Layer {
  name?: string;
  visible?: boolean;
  opacity?: number;
  blend_mode?: string;
  filters?: FilterSpec[];
  clip_path?: string;
  mask?: string;
  elements?: NpngElement[];
}

export interface DefItem {
  id: string;
  [key: string]: unknown;
}

export interface NpngCanvas {
  width?: number;
  height?: number;
  background?: string;
}

export interface NpngDocument {
  npng?: string;
  canvas?: NpngCanvas;
  defs?: DefItem[];
  layers?: Layer[];
}
