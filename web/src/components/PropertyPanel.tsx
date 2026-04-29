"use client";

import { useState, useRef } from "react";
import { FONT_CATALOG, getCategoryLabel, loadFont, type FontEntry } from "../lib/fonts";
import type {
  NpngDocument,
  NpngElement,
  ArrowEndType,
  TextSpan,
  FillLayer,
  StrokeLayer,
  FillSpec,
  StrokeSpec,
  Constraints,
  AutoLayoutSpec,
  TransformSpec,
  Layer,
  EffectSpec,
  BlendMode,
  LinearGradient,
  RadialGradient,
} from "../lib/types";
import { getBoundingBox } from "../lib/hitTest";
import { isEditablePathData } from "../lib/pathEditing";
import { getElementDisplayName, getElementTypeLabel } from "../lib/elementLabels";
import type { AlignmentCommand, DistributionCommand, ElementAddress, EditorAction } from "../lib/editorState";

interface PropertyPanelProps {
  element: NpngElement | null;
  address: ElementAddress | null;
  selectionCount?: number;
  doc: NpngDocument | null;
  dispatch: React.Dispatch<EditorAction>;
}

const ARROW_TYPES: ArrowEndType[] = ["none", "arrow", "circle", "diamond"];
const BLEND_MODES: BlendMode[] = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"];
const EFFECT_TYPES: EffectSpec["type"][] = ["drop-shadow", "inner-shadow", "outer-glow", "inner-glow", "blur"];
const IMAGE_FITS = ["fill", "cover", "contain", "none"];
const ALIGN_BUTTONS: { label: string; alignment: AlignmentCommand; title: string }[] = [
  { label: "Left", alignment: "left", title: "Align left" },
  { label: "H Center", alignment: "center", title: "Align horizontal centers" },
  { label: "Right", alignment: "right", title: "Align right" },
  { label: "Top", alignment: "top", title: "Align top" },
  { label: "V Center", alignment: "middle", title: "Align vertical centers" },
  { label: "Bottom", alignment: "bottom", title: "Align bottom" },
];
const DISTRIBUTE_BUTTONS: { label: string; direction: DistributionCommand; title: string }[] = [
  { label: "Distribute H", direction: "horizontal", title: "Distribute horizontal spacing" },
  { label: "Distribute V", direction: "vertical", title: "Distribute vertical spacing" },
];

type EditableElement = NpngElement & {
  name?: string;
  locked?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  content?: string;
  font_size?: number;
  font_family?: string;
  line_height?: number;
  font_weight?: string;
  align?: "left" | "center" | "right";
  spans?: TextSpan[];
  fill?: FillSpec;
  stroke?: StrokeSpec;
  fills?: FillLayer[];
  strokes?: StrokeLayer[];
  blend_mode?: BlendMode;
  filters?: EffectSpec[];
  effects?: EffectSpec[];
  opacity?: number;
  href?: string;
  fit?: "fill" | "cover" | "contain" | "none";
  border_radius?: number;
  adjustments?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hue_rotate?: number;
  };
  arrow_start?: ArrowEndType;
  arrow_end?: ArrowEndType;
  constraints?: Constraints;
  auto_layout?: AutoLayoutSpec;
  component_id?: string;
  transform?: TransformSpec;
};

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-12 text-zinc-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs w-16"
      />
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-12 text-zinc-500">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-zinc-600 bg-transparent cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs"
      />
    </label>
  );
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-12 text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200 text-xs"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-700/50 pb-2 mb-2">
      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function InspectorButton({ children, onClick, disabled, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-2 py-1 text-[11px] bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:text-zinc-600 disabled:hover:bg-zinc-800 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export default function PropertyPanel({ element, address, selectionCount = 0, doc, dispatch }: PropertyPanelProps) {
  const [editingSpans, setEditingSpans] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!element || !address) {
    if (selectionCount > 1) {
      return (
        <div className="p-3 text-xs text-zinc-400 leading-relaxed">
          <div className="font-medium text-zinc-300 mb-1">{selectionCount} elements selected</div>
          <Section title="Align">
            <div className="grid grid-cols-3 gap-1">
              {ALIGN_BUTTONS.map((button) => (
                <InspectorButton
                  key={button.alignment}
                  title={button.title}
                  onClick={() => dispatch({ type: "ALIGN_SELECTION", alignment: button.alignment })}
                >
                  {button.label}
                </InspectorButton>
              ))}
            </div>
          </Section>
          <Section title="Distribute">
            <div className="grid grid-cols-2 gap-1">
              {DISTRIBUTE_BUTTONS.map((button) => (
                <InspectorButton
                  key={button.direction}
                  title={selectionCount >= 3 ? button.title : "Select at least 3 elements"}
                  disabled={selectionCount < 3}
                  onClick={() => dispatch({ type: "DISTRIBUTE_SELECTION", direction: button.direction })}
                >
                  {button.label}
                </InspectorButton>
              ))}
            </div>
          </Section>
          <Section title="Structure">
            <InspectorButton
              title="Group selected objects (Cmd/Ctrl+G)"
              onClick={() => dispatch({ type: "GROUP_SELECTION" })}
            >
              Group Selection
            </InspectorButton>
            <InspectorButton
              title="Move selected objects to the top visible layer"
              onClick={() => dispatch({ type: "MOVE_SELECTION_TO_TOP_LAYER" })}
            >
              Move to Top Layer
            </InspectorButton>
          </Section>
          <div className="text-zinc-500">
            Drag on canvas to move together. If objects overlap, click the stack and choose the exact object.
            Cmd/Ctrl+G groups, Cmd/Ctrl+D duplicates, arrow keys nudge, Cmd/Ctrl+A selects all.
          </div>
        </div>
      );
    }
    return (
      <div className="p-3 text-xs text-zinc-500 leading-relaxed">
        <div className="text-zinc-400 font-medium mb-1">No selection</div>
        Hover an object to see its layer/name label. If multiple objects overlap, click once to open the chooser, then pick the exact object.
      </div>
    );
  }

  const e = element as EditableElement;
  const selectedName = doc ? getElementDisplayName(doc, address) : `${e.type} #${address.elementIndex + 1}`;
  const selectedType = getElementTypeLabel(element);

  const update = (props: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_ELEMENT", address, props });
  };

  const fillStr = typeof e.fill === "string" ? e.fill : (e.fill === null || e.fill === undefined ? "" : "gradient");
  const strokeColor = e.stroke?.color ?? "";
  const strokeWidth = e.stroke?.width ?? 1;
  const isRichText = e.type === "text" && !!e.spans?.length;

  return (
    <div className="p-3 flex flex-col gap-1 text-xs overflow-auto">
      <div className="text-zinc-400 font-medium mb-1">{selectedType}</div>

      <Section title="Selected">
        <div className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 text-blue-100 leading-snug">
          {selectedName}
        </div>
        <label className="flex items-center gap-2 text-xs">
          <span className="w-12 text-zinc-500">Name</span>
          <input
            type="text"
            value={e.name ?? ""}
            placeholder={`${selectedType} #${address.elementIndex + 1}`}
            onChange={(ev) => update({ name: ev.target.value.trim() ? ev.target.value : null })}
            className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs"
          />
        </label>
        <div className="text-zinc-500 leading-relaxed">
          Type is the internal drawing primitive; name is what you recognize in the canvas, chooser, and layer list.
          {e.type === "path" ? " Vector objects come from Vector Pen, Polyline/Polygon, or Vector Shapes." : ""}
        </div>
        <div className="flex gap-1">
          <InspectorButton
            title={e.locked ? "Unlock object" : "Lock object"}
            onClick={() => dispatch({ type: "TOGGLE_ELEMENT_LOCK", address })}
          >
            {e.locked ? "Unlock" : "Lock"}
          </InspectorButton>
          <InspectorButton
            title="Move this object to the top visible layer"
            onClick={() => dispatch({ type: "MOVE_SELECTION_TO_TOP_LAYER" })}
          >
            Move to Top
          </InspectorButton>
          {e.type !== "component-instance" && (
            <InspectorButton
              title="Create a reusable component definition from this object"
              onClick={() => dispatch({ type: "CREATE_COMPONENT_FROM_SELECTION" })}
            >
              Create Component
            </InspectorButton>
          )}
          {e.type === "group" && (
            <InspectorButton
              title={!e.transform && (e.opacity === undefined || e.opacity === 1)
                ? "Ungroup selected group (Cmd/Ctrl+Shift+G)"
                : "Clear group transform/opacity before ungrouping"}
              disabled={!!e.transform || (e.opacity !== undefined && e.opacity !== 1)}
              onClick={() => dispatch({ type: "UNGROUP_SELECTION" })}
            >
              Ungroup
            </InspectorButton>
          )}
        </div>
      </Section>

      {!!doc?.components?.length && (
        <Section title="Component Library">
          <div className="text-zinc-500 leading-relaxed">
            Insert an instance of a saved component into the top editable layer.
          </div>
          {doc.components.map((component) => (
            <InspectorButton
              key={component.id}
              title={`Insert ${component.name}`}
              onClick={() => dispatch({ type: "INSERT_COMPONENT_INSTANCE", componentId: component.id })}
            >
              Insert {component.name}
            </InspectorButton>
          ))}
        </Section>
      )}

      {e.type === "path" && (
        <Section title="Path Edit">
          {e.d && isEditablePathData(e.d) && !e.transform ? (
            <div className="text-zinc-400 leading-relaxed">
              Drag orange segment points to bend curves. Shift-click orange points to insert anchors; Option/Alt-click white anchors to delete. Blue handles fine-tune bezier controls.
            </div>
          ) : (
            <div className="text-zinc-500 leading-relaxed">
              Node editing is available for untransformed M/L/C/Q paths. Clear rotation/transform first to edit nodes.
            </div>
          )}
        </Section>
      )}

      {/* Position/size for rect-like elements */}
      {(e.type === "rect" || e.type === "image" || e.type === "frame" || e.type === "component-instance") && (
        <Section title="Position & Size">
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="X" value={e.x ?? 0} onChange={v => update({ x: v })} />
            <NumberInput label="Y" value={e.y ?? 0} onChange={v => update({ y: v })} />
            <NumberInput label="W" value={e.width ?? 0} onChange={v => update({ width: v })} />
            <NumberInput label="H" value={e.height ?? 0} onChange={v => update({ height: v })} />
          </div>
          {e.type === "rect" && (
            <NumberInput label="Radius" value={e.rx ?? 0} onChange={v => update({ rx: v, ry: v })} />
          )}
        </Section>
      )}

      {e.type === "ellipse" && (
        <Section title="Position & Size">
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="CX" value={e.cx ?? 0} onChange={v => update({ cx: v })} />
            <NumberInput label="CY" value={e.cy ?? 0} onChange={v => update({ cy: v })} />
            <NumberInput label="RX" value={e.rx ?? 0} onChange={v => update({ rx: v })} />
            <NumberInput label="RY" value={e.ry ?? 0} onChange={v => update({ ry: v })} />
          </div>
        </Section>
      )}

      {e.type === "line" && (
        <Section title="Position">
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="X1" value={e.x1 ?? 0} onChange={v => update({ x1: v })} />
            <NumberInput label="Y1" value={e.y1 ?? 0} onChange={v => update({ y1: v })} />
            <NumberInput label="X2" value={e.x2 ?? 0} onChange={v => update({ x2: v })} />
            <NumberInput label="Y2" value={e.y2 ?? 0} onChange={v => update({ y2: v })} />
          </div>
        </Section>
      )}

      {e.type === "text" && (
        <Section title="Text">
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="X" value={e.x ?? 0} onChange={v => update({ x: v })} />
            <NumberInput label="Y" value={e.y ?? 0} onChange={v => update({ y: v })} />
            {!isRichText && (
              <>
                <NumberInput label="W" value={e.width ?? 0} onChange={v => update({ width: v > 0 ? v : null })} />
                <NumberInput label="Line H" value={e.line_height ?? 1.2} onChange={v => update({ line_height: v > 0 ? v : null })} />
              </>
            )}
          </div>
          {isRichText && (
            <div className="text-zinc-500 leading-relaxed">
              Rich text wrapping is not supported yet; use plain Text for resizable text boxes.
            </div>
          )}
          <label className="flex items-center gap-2 text-xs">
            <span className="w-12 text-zinc-500">Text</span>
            <input
              type="text"
              value={e.content ?? ""}
              onChange={ev => update({ content: ev.target.value })}
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span className="w-12 text-zinc-500">Font</span>
            <select
              value={e.font_family ?? "sans-serif"}
              onChange={ev => {
                const family = ev.target.value;
                loadFont(family);
                update({ font_family: family });
              }}
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs"
            >
              <option value="sans-serif">System Sans-serif</option>
              <option value="serif">System Serif</option>
              <option value="monospace">System Monospace</option>
              {(["sans-serif", "serif", "display", "handwriting", "monospace"] as FontEntry["category"][]).map(cat => (
                <optgroup key={cat} label={getCategoryLabel(cat)}>
                  {FONT_CATALOG.filter(f => f.category === cat).map(f => (
                    <option key={f.family} value={f.family}>{f.family}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <NumberInput label="Size" value={e.font_size ?? 16} onChange={v => update({ font_size: v })} />
          <NumberInput label="Letter" value={e.letter_spacing ?? 0} onChange={v => update({ letter_spacing: v || null })} />
          <NumberInput label="Para" value={e.paragraph_spacing ?? 0} onChange={v => update({ paragraph_spacing: v || null })} />
          <SelectInput label="Align" value={e.align ?? "left"} options={["left", "center", "right"]} onChange={v => update({ align: v })} />
          <SelectInput label="V Align" value={e.vertical_align ?? "top"} options={["top", "center", "bottom"]} onChange={v => update({ vertical_align: v })} />
          <SelectInput label="Weight" value={e.font_weight ?? "normal"} options={["100", "200", "300", "normal", "500", "600", "bold", "800", "900"]} onChange={v => update({ font_weight: v })} />
        </Section>
      )}

      {/* Rich text spans editor */}
      {e.type === "text" && (
        <Section title="Rich Text">
          <button
            onClick={() => setEditingSpans(!editingSpans)}
            className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
          >
            {editingSpans ? "Close Span Editor" : "Edit Spans"}
          </button>
          {editingSpans && (
            <SpansEditor
              spans={e.spans ?? []}
              onChange={(spans) => update({ spans: spans.length > 0 ? spans : null })}
            />
          )}
        </Section>
      )}

      {/* Fill */}
      {e.type !== "line" && e.type !== "component-instance" && e.type !== "group" && (
        <Section title="Fill">
          {fillStr !== "gradient" ? (
            <ColorInput label="Color" value={fillStr || "#000000"} onChange={v => update({ fill: v })} />
          ) : (
            <GradientFillEditor
              fill={e.fill}
              onChange={(fill) => update({ fill })}
            />
          )}
        </Section>
      )}

      {/* Multiple Fills */}
      {e.type !== "line" && e.type !== "group" && (
        <FillsEditor
          fills={e.fills as FillLayer[] | undefined}
          singleFill={e.fill}
          onChange={(fills) => update({ fills: fills.length > 0 ? fills : null })}
        />
      )}

      {/* Stroke */}
      {e.type !== "group" && (
        <>
          <Section title="Stroke">
            <ColorInput label="Color" value={strokeColor} onChange={v => update({ stroke: { ...e.stroke, color: v } })} />
            <NumberInput label="Width" value={strokeWidth} onChange={v => update({ stroke: { ...e.stroke, width: v } })} />
          </Section>

          <StrokesEditor
            strokes={e.strokes as StrokeLayer[] | undefined}
            onChange={(strokes) => update({ strokes: strokes.length > 0 ? strokes : null })}
          />
        </>
      )}

      {/* Arrow endpoints for lines */}
      {e.type === "line" && (
        <Section title="Arrow Endpoints">
          <SelectInput label="Start" value={e.arrow_start ?? "none"} options={ARROW_TYPES} onChange={v => update({ arrow_start: v })} />
          <SelectInput label="End" value={e.arrow_end ?? "none"} options={ARROW_TYPES} onChange={v => update({ arrow_end: v })} />
        </Section>
      )}

      {/* Image controls */}
      {e.type === "image" && (
        <Section title="Image">
          <SelectInput label="Fit" value={e.fit ?? "fill"} options={IMAGE_FITS} onChange={v => update({ fit: v })} />
          <NumberInput label="Radius" value={e.border_radius ?? 0} onChange={v => update({ border_radius: v || null })} />
          <NumberInput label="Bright" value={e.adjustments?.brightness ?? 0} onChange={v => update({ adjustments: { ...e.adjustments, brightness: v || undefined } })} />
          <NumberInput label="Contrast" value={e.adjustments?.contrast ?? 0} onChange={v => update({ adjustments: { ...e.adjustments, contrast: v || undefined } })} />
          <NumberInput label="Sat" value={e.adjustments?.saturation ?? 0} onChange={v => update({ adjustments: { ...e.adjustments, saturation: v || undefined } })} />
          <NumberInput label="Hue" value={e.adjustments?.hue_rotate ?? 0} onChange={v => update({ adjustments: { ...e.adjustments, hue_rotate: v || undefined } })} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
          >
            Replace Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(ev) => {
              const file = ev.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => update({ href: reader.result as string });
              reader.readAsDataURL(file);
              ev.target.value = "";
            }}
          />
        </Section>
      )}

      {/* Opacity */}
      <Section title="Appearance">
        <NumberInput label="Opacity" value={e.opacity ?? 1} onChange={v => update({ opacity: Math.max(0, Math.min(1, v)) })} />
        <SelectInput label="Blend" value={e.blend_mode ?? "normal"} options={BLEND_MODES} onChange={v => update({ blend_mode: v === "normal" ? null : v })} />
      </Section>

      <EffectsEditor
        effects={e.effects}
        onChange={(effects) => update({ effects: effects.length > 0 ? effects : null })}
      />

      <TransformEditor
        element={e}
        onChange={(transform) => update({ transform })}
      />

      {/* Constraints */}
      <ConstraintsEditor
        constraints={e.constraints}
        onChange={(c) => update({ constraints: c })}
      />

      {/* Auto Layout for frames */}
      {e.type === "frame" && (
        <AutoLayoutEditor
          autoLayout={e.auto_layout}
          onChange={(al) => update({ auto_layout: al || null })}
        />
      )}

      {/* Component instance controls */}
      {e.type === "component-instance" && (
        <Section title="Component">
          <div className="text-zinc-500 text-xs">ID: {e.component_id ?? "none"}</div>
          <button
            onClick={() => {
              const comps = doc?.components ?? [];
                const comp = comps.find((c) => c.id === e.component_id);
                if (comp) {
                const master = structuredClone(comp.master) as EditableElement;
                if (e.x !== undefined) master.x = e.x;
                if (e.y !== undefined) master.y = e.y;
                update({ ...master } as Record<string, unknown>);
              }
            }}
            className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
          >
            Detach Instance
          </button>
        </Section>
      )}

      {/* Layer clip/mask */}
      {doc?.layers && address && (
        <LayerClipEditor
          layerIndex={address.layerIndex}
          layer={doc.layers[address.layerIndex]}
          dispatch={dispatch}
        />
      )}
    </div>
  );
}

function TransformEditor({ element, onChange }: { element: EditableElement; onChange: (transform: TransformSpec) => void }) {
  const transform = element.transform ?? {};
  const box = getBoundingBox({ ...element, transform: undefined } as NpngElement);
  const defaultOrigin: [number, number] = [
    Math.round(box.x + box.width / 2),
    Math.round(box.y + box.height / 2),
  ];
  const origin = transform.origin ?? defaultOrigin;

  const updateTransform = (patch: Partial<TransformSpec>) => {
    onChange({ ...transform, ...patch });
  };

  return (
    <Section title="Transform">
      <NumberInput
        label="Rotate"
        value={transform.rotate ?? 0}
        onChange={(v) => updateTransform({ rotate: v, origin })}
      />
      <div className="grid grid-cols-2 gap-1">
        <NumberInput
          label="OX"
          value={origin[0]}
          onChange={(v) => updateTransform({ origin: [v, origin[1]] })}
        />
        <NumberInput
          label="OY"
          value={origin[1]}
          onChange={(v) => updateTransform({ origin: [origin[0], v] })}
        />
      </div>
    </Section>
  );
}

function SpansEditor({ spans, onChange }: { spans: TextSpan[]; onChange: (spans: TextSpan[]) => void }) {
  const addSpan = () => onChange([...spans, { text: "text" }]);
  const removeSpan = (i: number) => onChange(spans.filter((_, idx) => idx !== i));
  const updateSpan = (i: number, patch: Partial<TextSpan>) => {
    const newSpans = [...spans];
    newSpans[i] = { ...newSpans[i], ...patch };
    onChange(newSpans);
  };

  return (
    <div className="flex flex-col gap-1 mt-1">
      {spans.map((span, i) => (
        <div key={i} className="flex flex-col gap-0.5 p-1 bg-zinc-800 rounded">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={span.text}
              onChange={(e) => updateSpan(i, { text: e.target.value })}
              className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200 text-xs"
            />
            <button onClick={() => removeSpan(i)} className="text-red-400 text-xs px-1">-</button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateSpan(i, { bold: !span.bold })}
              className={`px-1.5 py-0.5 text-xs rounded ${span.bold ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-400"}`}
            >B</button>
            <button
              onClick={() => updateSpan(i, { italic: !span.italic })}
              className={`px-1.5 py-0.5 text-xs rounded ${span.italic ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-400"}`}
            >I</button>
            <button
              onClick={() => updateSpan(i, { underline: !span.underline })}
              className={`px-1.5 py-0.5 text-xs rounded ${span.underline ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-400"}`}
            >U</button>
            <input
              type="number"
              value={span.font_size ?? ""}
              placeholder="size"
              onChange={(e) => updateSpan(i, { font_size: e.target.value ? Number(e.target.value) : undefined })}
              className="w-10 bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200 text-xs"
            />
            <input
              type="number"
              value={span.letter_spacing ?? ""}
              placeholder="ls"
              onChange={(e) => updateSpan(i, { letter_spacing: e.target.value ? Number(e.target.value) : undefined })}
              className="w-10 bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200 text-xs"
            />
          </div>
        </div>
      ))}
      <button onClick={addSpan} className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400">+ Add Span</button>
    </div>
  );
}

function isLinearGradient(fill: FillSpec | undefined): fill is LinearGradient {
  return !!fill && typeof fill === "object" && fill.type === "linear-gradient";
}

function isRadialGradient(fill: FillSpec | undefined): fill is RadialGradient {
  return !!fill && typeof fill === "object" && fill.type === "radial-gradient";
}

function GradientFillEditor({ fill, onChange }: { fill?: FillSpec; onChange: (fill: FillSpec) => void }) {
  if (!isLinearGradient(fill) && !isRadialGradient(fill)) {
    return <div className="text-zinc-500 text-xs">Unsupported gradient shape. Edit in YAML.</div>;
  }

  const updateStop = (index: number, patch: Partial<{ offset: number; color: string }>) => {
    const stops = [...fill.stops];
    stops[index] = { ...stops[index], ...patch };
    onChange({ ...fill, stops });
  };
  const addStop = () => onChange({ ...fill, stops: [...fill.stops, { offset: 1, color: "#FFFFFF" }] });
  const removeStop = (index: number) => onChange({ ...fill, stops: fill.stops.filter((_, i) => i !== index) });

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-2 gap-1">
        {isLinearGradient(fill) ? (
          <>
            <NumberInput label="X1" value={fill.x1} onChange={v => onChange({ ...fill, x1: v })} />
            <NumberInput label="Y1" value={fill.y1} onChange={v => onChange({ ...fill, y1: v })} />
            <NumberInput label="X2" value={fill.x2} onChange={v => onChange({ ...fill, x2: v })} />
            <NumberInput label="Y2" value={fill.y2} onChange={v => onChange({ ...fill, y2: v })} />
          </>
        ) : (
          <>
            <NumberInput label="CX" value={fill.cx} onChange={v => onChange({ ...fill, cx: v })} />
            <NumberInput label="CY" value={fill.cy} onChange={v => onChange({ ...fill, cy: v })} />
            <NumberInput label="R" value={fill.r} onChange={v => onChange({ ...fill, r: v })} />
          </>
        )}
      </div>
      {fill.stops.map((stop, index) => (
        <div key={index} className="flex items-center gap-1">
          <input
            type="color"
            value={stop.color.length >= 7 ? stop.color.slice(0, 7) : "#000000"}
            onChange={(e) => updateStop(index, { color: e.target.value })}
            className="w-5 h-5 rounded border border-zinc-600 bg-transparent cursor-pointer"
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={stop.offset}
            onChange={(e) => updateStop(index, { offset: Number(e.target.value) })}
            className="w-16 bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200 text-xs"
          />
          <span className="flex-1 text-zinc-500 text-[11px] truncate">{stop.color}</span>
          <button onClick={() => removeStop(index)} className="text-red-400 text-xs px-1">-</button>
        </div>
      ))}
      <button onClick={addStop} className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400">+ Stop</button>
    </div>
  );
}

function FillsEditor({ fills, singleFill, onChange }: { fills?: FillLayer[]; singleFill?: FillSpec; onChange: (fills: FillLayer[]) => void }) {
  const currentFills = fills ?? (singleFill && typeof singleFill === "string" ? [{ fill: singleFill }] : []);
  const addFill = () => onChange([...currentFills, { fill: "#888888" }]);
  const removeFill = (i: number) => onChange(currentFills.filter((_, idx) => idx !== i));
  const updateFill = (i: number, fill: string) => {
    const nf = [...currentFills];
    nf[i] = { ...nf[i], fill };
    onChange(nf);
  };

  return (
    <Section title="Fills (multi)">
      {currentFills.map((fl, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            type="color"
            value={typeof fl.fill === "string" ? fl.fill : "#000000"}
            onChange={(ev) => updateFill(i, ev.target.value)}
            className="w-5 h-5 rounded border border-zinc-600 bg-transparent cursor-pointer"
          />
          <span className="text-zinc-400 text-xs flex-1">{typeof fl.fill === "string" ? fl.fill : "gradient"}</span>
          <button onClick={() => removeFill(i)} className="text-red-400 text-xs px-1">-</button>
        </div>
      ))}
      <button onClick={addFill} className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400">+ Fill</button>
    </Section>
  );
}

function StrokesEditor({ strokes, onChange }: { strokes?: StrokeLayer[]; onChange: (strokes: StrokeLayer[]) => void }) {
  const current = strokes ?? [];
  const addStroke = () => onChange([...current, { color: "#000000", width: 1 }]);
  const removeStroke = (i: number) => onChange(current.filter((_, idx) => idx !== i));
  const updateStroke = (i: number, patch: Partial<StrokeLayer>) => {
    const ns = [...current];
    ns[i] = { ...ns[i], ...patch };
    onChange(ns);
  };

  return (
    <Section title="Strokes (multi)">
      {current.map((sl, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            type="color"
            value={sl.color ?? "#000000"}
            onChange={(ev) => updateStroke(i, { color: ev.target.value })}
            className="w-5 h-5 rounded border border-zinc-600 bg-transparent cursor-pointer"
          />
          <input
            type="number"
            value={sl.width ?? 1}
            onChange={(ev) => updateStroke(i, { width: Number(ev.target.value) })}
            className="w-10 bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200 text-xs"
          />
          <select
            value={sl.alignment ?? "center"}
            onChange={(ev) => updateStroke(i, { alignment: ev.target.value as StrokeLayer["alignment"] })}
            className="w-20 bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200 text-xs"
          >
            <option value="inside">inside</option>
            <option value="center">center</option>
            <option value="outside">outside</option>
          </select>
          <button onClick={() => removeStroke(i)} className="text-red-400 text-xs px-1">-</button>
        </div>
      ))}
      <button onClick={addStroke} className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400">+ Stroke</button>
    </Section>
  );
}

function EffectsEditor({ effects, onChange }: { effects?: EffectSpec[]; onChange: (effects: EffectSpec[]) => void }) {
  const current = effects ?? [];
  const addEffect = () => onChange([...current, { type: "drop-shadow", dx: 0, dy: 8, radius: 16, color: "#00000055" }]);
  const removeEffect = (index: number) => onChange(current.filter((_, i) => i !== index));
  const updateEffect = (index: number, patch: Partial<EffectSpec>) => {
    const next = [...current];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <Section title="Effects">
      {current.length === 0 && <div className="text-zinc-500 text-xs">No element effects</div>}
      {current.map((effect, index) => (
        <div key={index} className="flex flex-col gap-1 rounded bg-zinc-800/70 p-1">
          <div className="flex items-center gap-1">
            <select
              value={effect.type}
              onChange={(e) => updateEffect(index, { type: e.target.value as EffectSpec["type"] })}
              className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200 text-xs"
            >
              {EFFECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <button onClick={() => removeEffect(index)} className="text-red-400 text-xs px-1">-</button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="DX" value={effect.dx ?? 0} onChange={v => updateEffect(index, { dx: v })} />
            <NumberInput label="DY" value={effect.dy ?? 0} onChange={v => updateEffect(index, { dy: v })} />
            <NumberInput label="Blur" value={effect.radius ?? 8} onChange={v => updateEffect(index, { radius: v })} />
            <NumberInput label="Spread" value={effect.spread ?? 0} onChange={v => updateEffect(index, { spread: v || undefined })} />
          </div>
          <ColorInput label="Color" value={effect.color?.slice(0, 7) ?? "#000000"} onChange={v => updateEffect(index, { color: v })} />
          <NumberInput label="Opacity" value={effect.opacity ?? 1} onChange={v => updateEffect(index, { opacity: Math.max(0, Math.min(1, v)) })} />
        </div>
      ))}
      <button onClick={addEffect} className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400">+ Effect</button>
    </Section>
  );
}

function ConstraintsEditor({ constraints, onChange }: { constraints?: Constraints; onChange: (c: Constraints | undefined) => void }) {
  const h = constraints?.horizontal ?? "left";
  const v = constraints?.vertical ?? "top";
  const hOpts = ["left", "right", "center", "left-right", "scale"];
  const vOpts = ["top", "bottom", "center", "top-bottom", "scale"];

  return (
    <Section title="Constraints">
      <SelectInput label="H" value={h} options={hOpts} onChange={val => onChange({ ...constraints, horizontal: val as Constraints["horizontal"] })} />
      <SelectInput label="V" value={v} options={vOpts} onChange={val => onChange({ ...constraints, vertical: val as Constraints["vertical"] })} />
    </Section>
  );
}

function AutoLayoutEditor({ autoLayout, onChange }: { autoLayout?: AutoLayoutSpec; onChange: (al: AutoLayoutSpec | null) => void }) {
  if (!autoLayout) {
    return (
      <Section title="Auto Layout">
        <button
          onClick={() => onChange({ mode: "horizontal", gap: 8, padding: 8 })}
          className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
        >
          Enable Auto Layout
        </button>
      </Section>
    );
  }

  return (
    <Section title="Auto Layout">
      <SelectInput label="Mode" value={autoLayout.mode ?? "horizontal"} options={["horizontal", "vertical"]} onChange={v => onChange({ ...autoLayout, mode: v as AutoLayoutSpec["mode"] })} />
      <NumberInput label="Gap" value={autoLayout.gap ?? 0} onChange={v => onChange({ ...autoLayout, gap: v })} />
      <NumberInput label="Pad" value={Array.isArray(autoLayout.padding) ? autoLayout.padding[0] : autoLayout.padding ?? 0} onChange={v => onChange({ ...autoLayout, padding: v })} />
      <SelectInput label="Align" value={autoLayout.align_items ?? "start"} options={["start", "center", "end", "stretch"]} onChange={v => onChange({ ...autoLayout, align_items: v as AutoLayoutSpec["align_items"] })} />
      <SelectInput label="Justify" value={autoLayout.justify_content ?? "start"} options={["start", "center", "end", "space-between"]} onChange={v => onChange({ ...autoLayout, justify_content: v as AutoLayoutSpec["justify_content"] })} />
      <button
        onClick={() => onChange(null)}
        className="text-xs px-2 py-1 bg-red-900/40 hover:bg-red-900/60 rounded text-red-300"
      >
        Remove Auto Layout
      </button>
    </Section>
  );
}

function LayerClipEditor({ layerIndex, layer, dispatch }: { layerIndex: number; layer?: Layer; dispatch: React.Dispatch<EditorAction> }) {
  const hasClip = !!layer?.clip_path;

  return (
    <Section title="Layer Clip">
      {hasClip ? (
        <>
          <div className="text-zinc-400 text-xs truncate" title={layer.clip_path}>{layer.clip_path?.substring(0, 40)}...</div>
          <button
            onClick={() => dispatch({ type: "SET_LAYER_CLIP", layerIndex, clipPath: null })}
            className="text-xs px-2 py-1 bg-red-900/40 hover:bg-red-900/60 rounded text-red-300"
          >
            Clear Clip
          </button>
        </>
      ) : (
        <button
          onClick={() => {
            const path = prompt("Enter SVG clip path (e.g. M 0 0 L 100 0 L 100 100 L 0 100 Z):");
            if (path) dispatch({ type: "SET_LAYER_CLIP", layerIndex, clipPath: path });
          }}
          className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
        >
          Set Clip Path
        </button>
      )}
    </Section>
  );
}
