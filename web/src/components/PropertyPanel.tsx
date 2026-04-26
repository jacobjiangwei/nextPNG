"use client";

import { useState, useRef } from "react";
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
} from "../lib/types";
import { getBoundingBox } from "../lib/hitTest";
import { isEditablePathData } from "../lib/pathEditing";
import type { AlignmentCommand, DistributionCommand, ElementAddress, EditorAction } from "../lib/editorState";

interface PropertyPanelProps {
  element: NpngElement | null;
  address: ElementAddress | null;
  selectionCount?: number;
  doc: NpngDocument | null;
  dispatch: React.Dispatch<EditorAction>;
}

const ARROW_TYPES: ArrowEndType[] = ["none", "arrow", "circle", "diamond"];
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
  font_weight?: string;
  align?: "left" | "center" | "right";
  spans?: TextSpan[];
  fill?: FillSpec;
  stroke?: StrokeSpec;
  fills?: FillLayer[];
  strokes?: StrokeLayer[];
  opacity?: number;
  href?: string;
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
          <div className="text-zinc-500">
            Drag on canvas to move together. Cmd/Ctrl+D duplicates, arrow keys nudge, Cmd/Ctrl+A selects all.
          </div>
        </div>
      );
    }
    return <div className="p-3 text-xs text-zinc-500">No selection</div>;
  }

  const e = element as EditableElement;

  const update = (props: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_ELEMENT", address, props });
  };

  const fillStr = typeof e.fill === "string" ? e.fill : (e.fill === null || e.fill === undefined ? "" : "gradient");
  const strokeColor = e.stroke?.color ?? "";
  const strokeWidth = e.stroke?.width ?? 1;

  return (
    <div className="p-3 flex flex-col gap-1 text-xs overflow-auto">
      <div className="text-zinc-400 font-medium mb-1 capitalize">{e.type}</div>

      {e.type === "path" && (
        <Section title="Path Edit">
          {e.d && isEditablePathData(e.d) && !e.transform ? (
            <div className="text-zinc-400 leading-relaxed">
              Drag orange segment points to bend curves. White anchors move points; blue handles fine-tune bezier controls.
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
          </div>
          <label className="flex items-center gap-2 text-xs">
            <span className="w-12 text-zinc-500">Text</span>
            <input
              type="text"
              value={e.content ?? ""}
              onChange={ev => update({ content: ev.target.value })}
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs"
            />
          </label>
          <NumberInput label="Size" value={e.font_size ?? 16} onChange={v => update({ font_size: v })} />
          <SelectInput label="Align" value={e.align ?? "left"} options={["left", "center", "right"]} onChange={v => update({ align: v })} />
          <SelectInput label="Weight" value={e.font_weight ?? "normal"} options={["normal", "bold"]} onChange={v => update({ font_weight: v })} />
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
      {e.type !== "line" && e.type !== "component-instance" && (
        <Section title="Fill">
          {fillStr !== "gradient" ? (
            <ColorInput label="Color" value={fillStr || "#000000"} onChange={v => update({ fill: v })} />
          ) : (
            <div className="text-zinc-500 text-xs">Gradient (edit in YAML)</div>
          )}
        </Section>
      )}

      {/* Multiple Fills */}
      {e.type !== "line" && (
        <FillsEditor
          fills={e.fills as FillLayer[] | undefined}
          singleFill={e.fill}
          onChange={(fills) => update({ fills: fills.length > 0 ? fills : null })}
        />
      )}

      {/* Stroke */}
      <Section title="Stroke">
        <ColorInput label="Color" value={strokeColor} onChange={v => update({ stroke: { ...e.stroke, color: v } })} />
        <NumberInput label="Width" value={strokeWidth} onChange={v => update({ stroke: { ...e.stroke, width: v } })} />
      </Section>

      {/* Multiple Strokes */}
      <StrokesEditor
        strokes={e.strokes as StrokeLayer[] | undefined}
        onChange={(strokes) => update({ strokes: strokes.length > 0 ? strokes : null })}
      />

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
      </Section>

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
          </div>
        </div>
      ))}
      <button onClick={addSpan} className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400">+ Add Span</button>
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
          <button onClick={() => removeStroke(i)} className="text-red-400 text-xs px-1">-</button>
        </div>
      ))}
      <button onClick={addStroke} className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400">+ Stroke</button>
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
      <NumberInput label="Pad" value={autoLayout.padding ?? 0} onChange={v => onChange({ ...autoLayout, padding: v })} />
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
