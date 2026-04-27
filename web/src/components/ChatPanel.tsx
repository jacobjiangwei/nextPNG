"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  onYamlGenerated: (yaml: string) => void;
  currentYaml?: string;
  selectionContext?: {
    label: string;
    element: unknown;
  } | null;
}

const AI_GUIDE_URL = "https://github.com/jacobjiangwei/newPNG/blob/main/spec/AI_GENERATION_GUIDE.md";
const FORMAT_SPEC_URL = "https://github.com/jacobjiangwei/newPNG/blob/main/spec/npng-v3.md";
const INLINE_NEWPNG_AI_INSTRUCTIONS = `You are a NewPNG source generator.

NewPNG is an editable YAML-based vector design format. Generate design source, not pixels.

Output contract:
- Return exactly one complete NewPNG YAML document.
- Wrap the document in one markdown code fence: \`\`\`yaml ... \`\`\`.
- Use npng: "0.3".
- Do not return SVG, JSON, HTML/CSS, PNG/base64 bitmap, or a prose-only description.
- Do not say you cannot create an image. Create editable NewPNG YAML.
- Keep the result visually polished and easy to edit in NewPNG Studio.

Required top-level shape:
npng: "0.3"
canvas:
  width: 1200
  height: 800
  background: "#0B1020"
defs: []
layers:
  - name: "Background"
    elements: []

Canvas:
- width and height are pixel dimensions.
- background is a quoted hex color like "#FFFFFF", "#0B1020", "#FFFFFF80", or "transparent".
- Choose an appropriate aspect ratio: square icons 1024x1024, product/hero graphics 1200x800, widescreen 1600x900, posters 1080x1350.

Layers:
- layers render in order; later layers appear on top.
- Each layer should have a meaningful name and an elements array.
- Optional layer fields: visible, locked, opacity, blend_mode, filters, clip_path, mask.
- Good layer names: "Background", "Main illustration", "Face details", "Text", "Decorations", "UI cards".

Common element fields:
- type: required.
- id: stable kebab-case ID for important objects, e.g. "hero-title", "duck-body", "glass-card".
- name: human-readable object label.
- visible, locked, opacity.
- fill, fills, stroke, strokes.
- transform: { translate: [x, y], rotate: degrees, scale: number or [sx, sy], origin: [x, y] }.
- blend_mode, filters, effects, constraints, layout_item.

Supported element types:
1. rect: cards, panels, buttons, backgrounds, rounded UI blocks.
   Fields: x, y, width, height, rx, ry, fill, stroke.
2. ellipse: circles, eyes, blobs, glows, shadows.
   Fields: cx, cy, rx, ry, fill, stroke.
3. line: dividers, connectors, arrows.
   Fields: x1, y1, x2, y2, arrow_start, arrow_end, stroke.
   Arrow values: none, arrow, circle, diamond.
4. text: editable text. Never outline normal text as paths.
   Fields: x, y, width, content, font_size, font_family, font_weight, line_height, letter_spacing, paragraph_spacing, align, vertical_align, fill, stroke, spans.
   align values: left, center, right.
5. path: icons, organic silhouettes, logos, custom vector curves.
   Fields: d, fill, stroke, fill_rule.
   SVG path commands supported: M/m, L/l, H/h, V/v, C/c, S/s, Q/q, T/t, A/a, Z/z.
   Use fill: "none" for stroke-only paths.
6. group: logical grouping. Field: elements.
7. frame: Figma-like container. Fields: x, y, width, height, children, auto_layout.
8. image: raster image. Fields: x, y, width, height, href, fit, border_radius, adjustments. Avoid external URLs unless user provided one.
9. use: reuse a def. Fields: ref, x, y, cx, cy, transform.
10. component-instance: reuse a component. Fields: component_id, x, y, width, height, overrides.

Fills:
- Solid: fill: "#FF0000"
- Transparent/no fill: fill: "none"
- Linear gradient:
  fill:
    type: linear-gradient
    x1: 0
    y1: 0
    x2: 400
    y2: 300
    stops:
      - offset: 0
        color: "#12F49C"
      - offset: 1
        color: "#005E93"
- Radial gradient:
  fill:
    type: radial-gradient
    cx: 300
    cy: 220
    r: 180
    stops:
      - offset: 0
        color: "#FFFFFF80"
      - offset: 1
        color: "#FFFFFF00"
- Multiple fills:
  fills:
    - fill: "#12F49C"
    - fill:
        type: radial-gradient
        cx: 220
        cy: 140
        r: 220
        stops:
          - offset: 0
            color: "#FFFFFF55"
          - offset: 1
            color: "#FFFFFF00"
      opacity: 0.75

Strokes:
stroke:
  color: "#FFFFFF33"
  width: 1.5
  dash: [8, 6]
  cap: round
  join: round

Effects and filters:
- filters: [{ type: blur, radius }, { type: drop-shadow, dx, dy, radius, color }]
- effects: blur, drop-shadow, inner-shadow, outer-glow, inner-glow.
- Use subtle shadows/glows for visual polish.
- Example:
  effects:
    - type: drop-shadow
      dx: 0
      dy: 24
      radius: 40
      color: "#00000070"

Frames and auto layout:
auto_layout:
  mode: horizontal
  gap: 20
  padding: [24, 24, 24, 24]
  align_items: center
  justify_content: space-between

Constraints:
constraints:
  horizontal: left-right
  vertical: top

Valid horizontal constraints: left, right, center, left-right, scale.
Valid vertical constraints: top, bottom, center, top-bottom, scale.

Design quality rules:
- Prefer editable primitives over one giant opaque path.
- Use semantic layers and stable IDs.
- Keep real text as type: text.
- Use paths only for custom shapes, icons, and organic silhouettes.
- Use separate objects for important details so users can edit them later.
- Use a coherent color palette, gradients, shadows, highlights, and spacing.
- For organic illustrations: main silhouette path + separate highlight/shadow paths + separate face/detail elements.
- For UI: use rects/frames/text/components, with clear spacing and named objects.
- For logos/icons: keep geometry simple, centered, and editable.

Anti-patterns:
- Do not return only a description.
- Do not return SVG/XML.
- Do not return JSON.
- Do not generate a flat bitmap if vector source is possible.
- Do not make all text into paths.
- Do not omit canvas or layers.
- Do not use unquoted hex colors.
- Do not use random IDs that change on every edit.

Preflight before final answer:
- Top-level npng, canvas, and layers exist.
- Every layer has elements.
- Important objects have id and name.
- Text is editable type: text.
- Hex colors are quoted.
- Gradients have stops with offsets from 0 to 1.
- Stroke-only paths use fill: "none".
- The YAML document is complete and can stand alone.`;

function buildExternalAiPrompt(imageRequest: string) {
  const request = imageRequest.trim() || "[describe what you want here]";
  return `${INLINE_NEWPNG_AI_INSTRUCTIONS}

Image request:
${request}`;
}

function extractNpngYaml(text: string): string | null {
  const fencedYaml = text.match(/```(?:yaml|npng)?\s*\n([\s\S]*?)\n```/);
  const candidate = (fencedYaml?.[1] ?? text).trim();
  if (!candidate) return null;
  if (!/(^|\n)\s*npng\s*:/.test(candidate)) return null;
  if (!/(^|\n)\s*canvas\s*:/.test(candidate)) return null;
  if (!/(^|\n)\s*layers\s*:/.test(candidate)) return null;
  return candidate;
}

export default function ChatPanel({ onYamlGenerated, currentYaml, selectionContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [externalImageRequest, setExternalImageRequest] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || loading) return;

      const userMsg: Message = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            currentYaml,
            selectionContext,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${err}` },
          ]);
          setLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let assistantText = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: assistantText };
            return copy;
          });
        }

        // Extract YAML from response
        const yaml = extractNpngYaml(assistantText);
        if (yaml) {
          onYamlGenerated(yaml);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${message}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, onYamlGenerated, currentYaml, selectionContext]
  );

  const handleCopyPrompt = useCallback(async () => {
    setCopyError(null);
    if (!externalImageRequest.trim()) {
      setCopyError("Describe what you want to generate first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildExternalAiPrompt(externalImageRequest));
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCopyError(`Copy failed: ${message}`);
    }
  }, [externalImageRequest]);

  const handlePasteGeneratedYaml = useCallback(async () => {
    setCopyError(null);
    setPasteStatus(null);
    try {
      const clipboardText = await navigator.clipboard.readText();
      const yaml = extractNpngYaml(clipboardText);
      if (!yaml) {
        setCopyError("Clipboard does not look like a complete npng YAML document.");
        return;
      }
      onYamlGenerated(yaml);
      setPasteStatus("Pasted into Source and updated the canvas.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCopyError(`Paste failed: ${message}`);
    }
  }, [onYamlGenerated]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-700 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-zinc-300">Text-to-Design AI</div>
          <div className="text-[10px] text-zinc-500">Generates editable npng source</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium">
          <a
            href={AI_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 hover:text-blue-200"
          >
            AI guide
          </a>
          <span className="text-zinc-600">/</span>
          <a
            href={FORMAT_SPEC_URL}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-zinc-200"
          >
            Spec
          </a>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2 text-sm">
            {selectionContext ? (
              <>
                <p className="font-medium text-zinc-300">Edit the selected object with AI.</p>
                <p className="text-zinc-500">
                  Selected: {selectionContext.label}. Ask for a local change like &quot;make it glassy&quot; or
                  &quot;turn this into a blue gradient button&quot;.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-zinc-300">AI onboarding: go out, generate, come back.</p>
                <p className="text-zinc-500">
                  First describe what you want. NewPNG will package your request with the generation rules so you
                  can paste it into ChatGPT, Claude, Gemini, or any AI tool.
                </p>
                <label className="block rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-2">
                  <span className="mb-1 block text-xs font-semibold text-zinc-300">What do you want to generate?</span>
                  <textarea
                    value={externalImageRequest}
                    onChange={(e) => {
                      setExternalImageRequest(e.target.value);
                      setCopiedPrompt(false);
                      setCopyError(null);
                      setPasteStatus(null);
                    }}
                    placeholder="Example: a cute yellow duck icon, vector style, soft gradient, editable layers"
                    className="h-20 w-full resize-none rounded border border-zinc-700 bg-zinc-950/80 p-2 text-xs leading-relaxed text-zinc-200 outline-none focus:border-blue-500"
                  />
                </label>
                <div className="grid gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-2 text-xs">
                  <div className="flex gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      1
                    </div>
                    <div>
                      <div className="font-medium text-zinc-300">Describe</div>
                      <div className="text-[11px] text-zinc-500">Write what you want to generate above.</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      2
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-zinc-300">Go out</div>
                      <div className="text-[11px] text-zinc-500">Paste it into your favorite AI tool.</div>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        disabled={!externalImageRequest.trim()}
                        className="mt-2 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copiedPrompt ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      3
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-zinc-300">Come back</div>
                      <div className="text-[11px] text-zinc-500">
                        Copy the AI&apos;s YAML response, then paste it here. Source updates automatically.
                      </div>
                      <button
                        type="button"
                        onClick={handlePasteGeneratedYaml}
                        className="mt-2 rounded bg-zinc-700 px-2.5 py-1 text-[11px] font-semibold text-zinc-100 hover:bg-zinc-600"
                      >
                        Paste generated YAML
                      </button>
                      {pasteStatus && <div className="mt-1 text-[11px] text-emerald-300">{pasteStatus}</div>}
                    </div>
                  </div>
                  {copyError && <div className="text-[11px] text-red-300">{copyError}</div>}
                </div>
                <p className="text-xs text-zinc-600">
                  Short version: generate editable NewPNG source, not pixels.
                </p>
              </>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm whitespace-pre-wrap ${
              msg.role === "user" ? "text-blue-300" : "text-zinc-300"
            }`}
          >
            <span className="font-bold text-xs text-zinc-500">
              {msg.role === "user" ? "You" : "Claude"}:{" "}
            </span>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="text-zinc-500 text-sm animate-pulse">Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectionContext ? "Describe how to change the selection..." : "Describe the design you want..."}
          className="flex-1 bg-zinc-800 text-zinc-200 px-3 py-2 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-blue-500"
        >
          Send
        </button>
      </form>
    </div>
  );
}
