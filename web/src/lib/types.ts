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

// Step 7: Multiple fills & strokes
export interface FillLayer {
  fill: FillSpec;
  opacity?: number;
  blend_mode?: string;
}

export interface StrokeLayer extends StrokeSpec {
  opacity?: number;
}

// Step 9: Constraints
export interface Constraints {
  horizontal?: "left" | "right" | "center" | "left-right" | "scale";
  vertical?: "top" | "bottom" | "center" | "top-bottom" | "scale";
}

export interface LayoutItemSpec {
  grow?: number;
  shrink?: number;
  align_self?: "auto" | "start" | "center" | "end" | "stretch";
}

export interface BaseElement {
  type: string;
  id?: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  fill?: FillSpec;
  stroke?: StrokeSpec;
  transform?: TransformSpec;
  opacity?: number;
  fills?: FillLayer[];
  strokes?: StrokeLayer[];
  constraints?: Constraints;
  layout_item?: LayoutItemSpec;
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

export type ArrowEndType = "none" | "arrow" | "circle" | "diamond";

export interface LineElement extends BaseElement {
  type: "line";
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  arrow_start?: ArrowEndType;
  arrow_end?: ArrowEndType;
}

export interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  font_size?: number;
  fill?: string;
}

export interface TextElement extends BaseElement {
  type: "text";
  x?: number;
  y?: number;
  width?: number;
  content?: string;
  font_size?: number;
  font_family?: string;
  font_weight?: string;
  line_height?: number;
  align?: "left" | "center" | "right";
  spans?: TextSpan[];
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

export interface ImageElement extends BaseElement {
  type: "image";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  href?: string;
}

// Step 10: Frame / Auto Layout
export interface AutoLayoutSpec {
  mode: "horizontal" | "vertical";
  gap?: number;
  padding?: number;
  align_items?: "start" | "center" | "end" | "stretch";
  justify_content?: "start" | "center" | "end" | "space-between";
}

export interface FrameElement extends BaseElement {
  type: "frame";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  auto_layout?: AutoLayoutSpec;
  children?: NpngElement[];
}

// Step 11: Components
export interface ComponentDef {
  id: string;
  name: string;
  master: NpngElement;
  properties?: Record<string, unknown>;
}

export interface ComponentInstanceElement extends BaseElement {
  type: "component-instance";
  component_id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  overrides?: Record<string, unknown>;
}

export type NpngElement =
  | RectElement
  | EllipseElement
  | LineElement
  | TextElement
  | PathElement
  | GroupElement
  | BooleanElement
  | UseElement
  | ImageElement
  | FrameElement
  | ComponentInstanceElement;

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
  locked?: boolean;
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
  components?: ComponentDef[];
}
