# nextPNG AI Generation Guide

This document is the agent-facing guide for generating editable nextPNG images. It is intentionally detailed: an AI agent should be able to read this file and produce `.npng` YAML that opens in nextPNG Studio, renders on Canvas, remains editable in the layer/source inspector, and exports to PNG from the Studio toolbar.

For the compact baseline format reference, see [`npng-v3.md`](./npng-v3.md). This guide covers the current Studio generation surface: the v0.3 baseline plus Studio-supported extensions such as frames, images, effects, multiple fills/strokes, constraints, auto layout, and component instances.

## Quick Start: Use with Any AI

**Copy the system prompt below and paste it into your AI assistant.** It is designed to work as a portable prompt for ChatGPT, Gemini, Claude, and other general-purpose models. After pasting it, ask for the image you want, such as “Create a modern fintech landing-page hero card” or “Make a minimal owl logo in teal and black”.

### Ready-to-copy system prompt

```text
You generate nextPNG (`.npng`) YAML, a human-readable vector design format. When the user asks for an image, logo, icon, poster, UI, card, diagram, or social graphic, return one complete nextPNG document inside a single ```yaml code block. Do not return SVG, HTML, CSS, JSON, prose-only instructions, or a raster image.

Default to this structure:
- `npng: "0.3"`
- `canvas` with `width`, `height`, `background`
- `defs: []` when empty
- `layers` as an ordered array

Always produce valid YAML with spaces for indentation. Quote hex colors like `"#2563EB"`. Use semantic layer names such as `"Background"`, `"Logo mark"`, `"Text"`, or `"Card"`. Give important objects stable kebab-case `id` values and readable `name` values.

Prefer editable primitives over giant paths:
- use `rect` for panels, cards, buttons, bars, and rounded tiles
- use `ellipse` for circles, glows, or blobs
- use `text` for editable copy
- use `group` or `frame` to organize related objects
- use `path` only when custom geometry is actually needed

Keep text editable. Do not convert ordinary text into outlines unless the user explicitly asks for vector letterforms or a wordmark path. For stroke-only shapes, use `fill: "none"` plus a `stroke` object.

Good default design behavior:
- match the requested aspect ratio
- use a limited, coherent color palette
- build hierarchy with background, main shapes, highlights, and text
- prefer simple geometry that a human can later edit
- use subtle gradients, shadows, and blur only when they help
- keep compositions clean and centered unless the prompt suggests otherwise

Common canvas sizes:
- logo or icon: `512x512`, `800x800`, or `1024x1024`
- poster/card/social: `1080x1350`, `1200x1600`, `1200x800`
- UI/mockup: `1440x900` or `1600x900`

Supported fields commonly used:
- layer fields: `name`, `visible`, `opacity`, `blend_mode`, `elements`
- common element fields: `type`, `id`, `name`, `x/y` or `cx/cy`, `width/height`, `rx/ry`, `fill`, `stroke`, `opacity`, `transform`, `effects`
- gradients: `type: linear-gradient` or `type: radial-gradient` with `stops` from `0` to `1`

Important rules:
- return the full document, not a partial fragment
- keep YAML portable and plain; avoid anchors and aliases
- do not use external image URLs unless the user provided them
- if the request is complex, prefer layered shapes/groups over one huge path
- if editing an existing document, preserve unrelated content and existing IDs, then return the full updated YAML
- if an exact effect is not possible, produce the closest editable nextPNG structure

Your output should be directly pasteable into nextPNG Studio.
```

### Few-shot example 1 — simple logo

**User request:** `Create a simple geometric logo for a company called NorthSeed. Use a transparent background and deep green colors.`

**Assistant output:**

```yaml
npng: "0.3"
canvas:
  width: 800
  height: 800
  background: "transparent"
defs: []
layers:
  - name: "Logo mark"
    elements:
      - type: ellipse
        id: "seed-core"
        name: "Seed core"
        cx: 400
        cy: 420
        rx: 92
        ry: 120
        fill: "#0F766E"
      - type: path
        id: "seed-cut"
        name: "Seed cut"
        d: "M 400 250 C 470 305 508 382 506 468 C 464 438 422 423 368 418 C 372 350 383 301 400 250 Z"
        fill: "#14B8A6"
      - type: rect
        id: "stem"
        name: "Stem"
        x: 388
        y: 194
        width: 24
        height: 96
        rx: 12
        ry: 12
        fill: "#14532D"
        transform:
          rotate: -18
          origin: [400, 242]
```

### Few-shot example 2 — icon

**User request:** `Make a friendly app icon for a spark assistant. Blue-purple gradient tile, white sparkle, modern and minimal.`

**Assistant output:**

```yaml
npng: "0.3"
canvas:
  width: 512
  height: 512
  background: "transparent"
defs: []
layers:
  - name: "Icon"
    elements:
      - type: rect
        id: "app-tile"
        name: "App tile"
        x: 48
        y: 48
        width: 416
        height: 416
        rx: 104
        ry: 104
        fill:
          type: linear-gradient
          x1: 48
          y1: 48
          x2: 464
          y2: 464
          stops:
            - offset: 0
              color: "#60A5FA"
            - offset: 1
              color: "#7C3AED"
      - type: path
        id: "spark-shape"
        name: "Spark shape"
        d: "M 256 126 L 292 220 L 386 256 L 292 292 L 256 386 L 220 292 L 126 256 L 220 220 Z"
        fill: "#FFFFFF"
      - type: ellipse
        id: "spark-glow"
        name: "Spark glow"
        cx: 318
        cy: 188
        rx: 52
        ry: 52
        fill: "#FFFFFF33"
        blend_mode: screen
        effects:
          - type: blur
            radius: 22
```

### Few-shot example 3 — poster/card

**User request:** `Create a dark launch poster card for an AI design tool. Include title, subtitle, and a glowing accent.`

**Assistant output:**

```yaml
npng: "0.3"
canvas:
  width: 1200
  height: 800
  background: "#070B18"
defs: []
layers:
  - name: "Background"
    elements:
      - type: rect
        id: "background"
        name: "Background"
        x: 0
        y: 0
        width: 1200
        height: 800
        fill:
          type: linear-gradient
          x1: 0
          y1: 0
          x2: 1200
          y2: 800
          stops:
            - offset: 0
              color: "#0F172A"
            - offset: 1
              color: "#020617"
      - type: ellipse
        id: "accent-glow"
        name: "Accent glow"
        cx: 930
        cy: 160
        rx: 210
        ry: 160
        fill: "#22D3EE55"
        blend_mode: screen
        effects:
          - type: blur
            radius: 36
  - name: "Card"
    elements:
      - type: rect
        id: "main-card"
        name: "Main card"
        x: 150
        y: 140
        width: 900
        height: 520
        rx: 32
        ry: 32
        fill: "#FFFFFF12"
        stroke:
          color: "#FFFFFF26"
          width: 1
        effects:
          - type: drop-shadow
            dx: 0
            dy: 28
            radius: 48
            color: "#00000070"
      - type: text
        id: "poster-title"
        name: "Poster title"
        x: 220
        y: 250
        width: 560
        content: "Design faster with editable AI vectors"
        font_size: 54
        font_family: "sans-serif"
        font_weight: "bold"
        line_height: 1.08
        fill: "#FFFFFF"
      - type: text
        id: "poster-subtitle"
        name: "Poster subtitle"
        x: 224
        y: 392
        width: 500
        content: "Generate polished graphics, then tweak every shape, layer, and text block by hand."
        font_size: 22
        font_family: "sans-serif"
        line_height: 1.45
        fill: "#B8C7E8"
```

## Portable System Prompt

Use this longer version when you want higher-quality results, better editability, and more reliable nextPNG output across different AI assistants.

```text
You are a nextPNG generator. nextPNG is a YAML-based, human-readable vector graphics format for editable design files. Your job is to produce complete `.npng` documents that can be pasted directly into nextPNG Studio and rendered immediately.

PRIMARY TASK
When the user asks for an image, logo, icon, poster, product card, UI mockup, diagram, illustration, or social graphic, output one complete nextPNG document inside a single ```yaml code block. Do not output SVG, HTML, CSS, JSON, Markdown tables, or prose-only design instructions instead of the file.

DEFAULT FILE SHAPE
Always default to:
- `npng: "0.3"`
- `canvas:` with `width`, `height`, `background`
- `defs: []` when empty
- `layers:` as an ordered array

Example skeleton:
npng: "0.3"
canvas:
  width: 1200
  height: 800
  background: "#FFFFFF"
defs: []
layers:
  - name: "Background"
    elements: []

YAML RULES
- Return valid YAML with spaces, never tabs.
- Quote hex colors like `"#2563EB"`.
- Quote strings with punctuation or special characters when helpful.
- Use plain YAML only: no anchors, aliases, or custom tags.
- Prefer explicit numeric values.
- Use integers for most geometry; one decimal place is fine when needed.

CORE DESIGN MODEL
Think of nextPNG like an editable design file, not a flat bitmap.
- `canvas` = artboard size and background
- `layers` = top-level organization and render order
- `elements` = shapes, text, paths, groups, frames, images, and reusable instances
- `defs` = reusable shapes or masks

MAJOR OUTPUT RULES
- Always return the full document, not a fragment.
- Make the result editable.
- Keep ordinary text as `type: text`.
- Prefer simple primitives and groups over one massive path.
- Use semantic layer names and object names.
- Give major objects stable kebab-case `id` values.
- Match the requested aspect ratio and art direction.

CANVAS GUIDANCE
Choose a canvas size appropriate to the request:
- logo mark: `800x800` or `1024x1024`
- app icon: `512x512` or `1024x1024`
- poster/card/social: `1080x1350`, `1200x1600`, or `1200x800`
- UI/mockup: `1440x900` or `1600x900`
Use `background: "transparent"` for transparent logos/icons, otherwise use a quoted color.

LAYER GUIDANCE
Use clear names such as:
- `Background`
- `Logo mark`
- `Main illustration`
- `Card`
- `Text`
- `Highlights`
Earlier layers render behind later layers.

ELEMENT CHOICES
Prefer these patterns:
- `rect` for cards, panels, buttons, pills, bars, containers
- `ellipse` for circles, glows, shadows, blobs
- `text` for headings, labels, body copy
- `group` for a logical cluster that should move together
- `frame` for UI-like containers or auto-layout groups
- `path` for custom silhouettes, icons, curved strokes, and special logos
Use `path` only when needed. If a rectangle, ellipse, or text object can express the same idea, prefer the simpler object.

COMMON FIELDS
Useful shared fields include:
- `type`, `id`, `name`, `visible`, `locked`, `opacity`
- geometry: `x`, `y`, `width`, `height`, `cx`, `cy`, `rx`, `ry`
- style: `fill`, `fills`, `stroke`, `strokes`, `blend_mode`, `effects`, `filters`
- transform: `translate`, `rotate`, `scale`, `origin`

COLOR AND STYLE RULES
- Use a restrained palette unless the prompt asks for something loud.
- Quote all hex colors.
- Use gradients for depth, not chaos.
- Use subtle blur/glow/shadow effects.
- For stroke-only paths, set `fill: "none"`.
- For gradients, use `type: linear-gradient` or `type: radial-gradient` and provide `stops` with offsets from `0` to `1`.

TEXT RULES
- Keep copy editable as `type: text`.
- Use `content` for normal text.
- Set `font_size`, `font_family`, `font_weight`, and optionally `line_height`, `letter_spacing`, and `align`.
- Give wrapped text a `width` so the layout is predictable.
- Do not convert normal titles or paragraphs into vector outlines.

EDITABILITY RULES
Your goal is not just to make something that looks good; it must also be easy for a human or future AI to revise.
- Break complex artwork into understandable parts.
- Use multiple named elements instead of a single opaque shape whenever practical.
- Group related pieces.
- Keep IDs stable and meaningful.
- Avoid random identifiers.

EDITING EXISTING DOCUMENTS
If the user provides an existing nextPNG document and asks for a change:
- preserve existing `id` values
- preserve unrelated layers and objects
- keep layer order unless asked to change it
- modify only the requested parts
- return the full updated YAML document, not a patch

QUALITY HEURISTICS
Good nextPNG output usually has:
- clear composition and hierarchy
- a small number of well-named layers
- stable IDs on major objects
- editable text
- simple geometry when possible
- paths only where necessary
- subtle lighting and consistent spacing

ANTI-PATTERNS TO AVOID
Do not:
- return prose without YAML
- return SVG/XML instead of nextPNG YAML
- omit `canvas` or `layers`
- use unquoted hex colors
- convert all text to paths
- create one giant path for an entire poster or UI
- invent broken external image URLs
- overuse blur, tiny details, or excessive point counts

FINAL RESPONSE BEHAVIOR
Optionally include one short sentence before the code block. Then provide exactly one complete nextPNG YAML document. If an exact effect is not possible, produce the closest editable structure in nextPNG rather than refusing.
```

## 1. The core contract

When a user asks for an image, graphic, icon, poster, UI, logo, product card, diagram, or PNG, generate a complete nextPNG document as YAML. Do **not** generate a flat bitmap, JSON object, SVG markup, HTML/CSS, or a prose-only description.

Always wrap the final output in a YAML code fence:

````markdown
```yaml
npng: "0.3"
canvas:
  width: 1200
  height: 800
  background: "#0B1020"
defs: []
layers:
  - name: "Background"
    elements: []
```
````

Short system instruction for another AI agent:

```text
You generate editable nextPNG source. Return one complete `.npng` YAML document in a ```yaml code block. Use `npng: "0.3"` by default. Keep text as `type: text`, use named layers and stable kebab-case object IDs, prefer editable shapes/groups/frames over one giant path, preserve unrelated objects when editing an existing document, and let nextPNG Studio handle PNG export.
```

## 2. Mental model

nextPNG is closer to a Figma document than to a bitmap. The AI is not painting pixels. It is authoring a structured design file:

- **Canvas** defines the artboard size and background.
- **Layers** define top-level render order and organization.
- **Elements** define editable objects: rectangles, ellipses, lines, text, paths, groups, frames, images, reusable defs, and component instances.
- **Styles** define fills, strokes, gradients, opacity, blend modes, filters, and effects.
- **Layout metadata** defines constraints, frame children, auto layout, and component reuse.

The best AI output is not the most visually complicated YAML. The best output is visually strong **and** easy for a human or future AI edit to understand.

## 3. Required output shape

Every document should have:

```yaml
npng: "0.3"
canvas:
  width: 1200
  height: 800
  background: "#FFFFFF"
defs: []
layers:
  - name: "Layer name"
    visible: true
    opacity: 1
    blend_mode: "normal"
    elements: []
```

### Version

Use:

```yaml
npng: "0.3"
```

Some older examples may use `0.1` or `0.4`, but AI agents should default to `0.3` for current compatibility. Studio tolerates additional extension fields documented here, but the stable baseline remains v0.3.

### YAML rules

- Use valid YAML indentation with spaces, not tabs.
- Quote strings when they contain punctuation, colons, leading `#`, or special characters.
- Hex colors must be quoted because `#` starts a YAML comment if unquoted.
- Prefer explicit numbers over formulas.
- Use integers for most geometry; one decimal place is fine for precise curves.
- Use arrays like `[10, 20]` for transform tuples.
- Avoid anchors, aliases, custom YAML tags, and advanced YAML features. Keep output plain and portable.

## 4. Document-level fields

| Field | Type | Required | Description |
|---|---:|---:|---|
| `npng` | string | yes | Format version. Use `"0.3"` by default. |
| `canvas` | object | yes | Artboard size and background. |
| `defs` | array | no | Reusable element or mask definitions referenced by `use` or layer masks. Prefer `[]` when empty. |
| `components` | array | no | Reusable component definitions referenced by `component-instance`. |
| `layers` | array | yes | Top-level render and organization order. |

Minimal valid file:

```yaml
npng: "0.3"
canvas:
  width: 800
  height: 600
  background: "transparent"
defs: []
layers:
  - name: "Empty layer"
    elements: []
```

## 5. Canvas

```yaml
canvas:
  width: 1200
  height: 800
  background: "#0B1020"
```

| Field | Type | Guidance |
|---|---|---|
| `width` | number | Required. Use common sizes: `1024`, `1080`, `1200`, `1600`, `1920`. |
| `height` | number | Required. Match the requested aspect ratio. |
| `background` | string | Hex color or `"transparent"`. Use quoted hex. |

Recommended canvas sizes:

| Use case | Size |
|---|---|
| Square icon/social image | `1024 x 1024` or `1080 x 1080` |
| Hero/product graphic | `1200 x 800` |
| Presentation/desktop mockup | `1600 x 900` |
| Poster | `1080 x 1350` or `1200 x 1600` |
| Logo mark | `800 x 800` with transparent or solid background |

## 6. Layers

Layers are top-level groups that render in document order: earlier layers are painted first, later layers appear above them.

```yaml
layers:
  - name: "Background"
    visible: true
    locked: false
    opacity: 1
    blend_mode: "normal"
    filters: []
    elements: []
```

| Field | Type | Default | Explanation |
|---|---|---:|---|
| `name` | string | `""` | Human-readable layer label. Use semantic names. |
| `visible` | boolean | `true` | Hidden layers do not render. |
| `locked` | boolean | `false` | Locked layers should not be edited by the UI. |
| `opacity` | number | `1` | Layer opacity from `0` to `1`. |
| `blend_mode` | string | `"normal"` | Layer compositing mode. |
| `filters` | array | `[]` | Blur/drop-shadow filters applied to the whole layer. |
| `clip_path` | string | none | SVG path clipping region for the layer. |
| `mask` | string | none | ID of a def used as an alpha mask. |
| `elements` | array | `[]` | Objects in this layer. |

Good layer naming:

```yaml
layers:
  - name: "Background atmosphere"
  - name: "Product card"
  - name: "Illustration"
  - name: "Text and CTA"
  - name: "Decorative highlights"
```

Avoid names like `"Layer 1"` except in tiny examples.

## 7. Common element fields

Every element has a `type` and may use these shared fields:

| Field | Type | Applies to | Guidance |
|---|---|---|---|
| `type` | string | all | Required element type. |
| `id` | string | all | Stable machine-readable ID. Use kebab-case. |
| `name` | string | all | Human-readable name for the layer tree. |
| `visible` | boolean | all | Set `false` to hide. Omit when true. |
| `locked` | boolean | all | Set `true` for background or guide objects that should not move. |
| `opacity` | number | all | `0` to `1`, applied to the element. |
| `fill` | string/object/null | fillable shapes/text/path | Single fill. Use `fill: "none"` for stroke-only paths. |
| `fills` | array | rect/ellipse/path and similar | Multiple fill layers, bottom to top. |
| `stroke` | object | drawable shapes/text/path/line | Single stroke. |
| `strokes` | array | drawable shapes/text/path/line | Multiple strokes. |
| `transform` | object | all | Translate/rotate/scale/origin. |
| `blend_mode` | string | all | Per-object blend mode. |
| `filters` | array | layers/elements | Canvas filters such as blur/drop-shadow. |
| `effects` | array | elements | Design effects: blur, shadow, glow. |
| `clip_path` | string | elements | SVG path clip. Use sparingly. |
| `mask` | string | elements/layers | Def ID used as alpha mask. |
| `constraints` | object | visual editor | Figma-like resizing behavior. |
| `layout_item` | object | frame children | Auto-layout child behavior. |

### IDs and names

Use stable IDs for anything the user might later ask to edit:

```yaml
- type: text
  id: "hero-title"
  name: "Hero title"
```

Good IDs:

- `hero-title`
- `glass-card`
- `primary-cta`
- `seal-eye`
- `background-gradient`

Bad IDs:

- `object1`
- `thing`
- `random-shape-8392`
- `blue` when the object may later change color

`id` is for machines and future edits. `name` is for humans.

## 8. Colors

Use CSS-style hex:

```yaml
fill: "#2563EB"
```

Alpha can be included in the hex string:

```yaml
fill: "#FFFFFF80" # alpha included
```

Accepted forms:

| Form | Meaning |
|---|---|
| `#RGB` | Short RGB |
| `#RRGGBB` | RGB |
| `#RRGGBBAA` | RGB plus alpha |
| `"transparent"` | Transparent background/fill where supported |
| `"none"` | No fill on fillable paths/shapes |

AI guidance:

- Always quote hex strings.
- Use alpha hex for subtle glass/shadow colors: `#FFFFFF14`, `#00000070`.
- Prefer a small, coherent palette.
- Use darker background colors for glowing vector demos; use neutral backgrounds for product/UI mockups.

## 9. Fills

### Solid fill

```yaml
fill: "#FF6B6B"
```

### No fill

For stroke-only paths or lines:

```yaml
fill: "none"
stroke:
  color: "#13D6B5"
  width: 8
  cap: round
```

### Linear gradient

```yaml
fill:
  type: linear-gradient
  x1: 0
  y1: 0
  x2: 400
  y2: 300
  stops:
    - offset: 0
      color: "#12F49C"
    - offset: 0.5
      color: "#0CAAA4"
    - offset: 1
      color: "#005E93"
```

`x1`, `y1`, `x2`, `y2` are canvas coordinates. For object-local looking gradients, use coordinates near the object bounds.

### Radial gradient

```yaml
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
```

Use radial gradients for glows, lighting, glass highlights, vignettes, and soft sculpting.

### Multiple fills

`fills` are layered bottom to top. Each item has `fill`, optional `opacity`, and optional `blend_mode`.

```yaml
fills:
  - fill:
      type: linear-gradient
      x1: 100
      y1: 100
      x2: 100
      y2: 500
      stops:
        - offset: 0
          color: "#12F49C"
        - offset: 1
          color: "#005E93"
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
```

Use multiple fills when one gradient is not enough: base color + highlight + shadow overlay.

## 10. Strokes

Single stroke:

```yaml
stroke:
  color: "#FFFFFF33"
  width: 1.5
  dash: [8, 6]
  cap: round
  join: round
```

| Field | Values | Explanation |
|---|---|---|
| `color` | hex | Stroke color. |
| `width` | number | Stroke width in pixels. |
| `alignment` | `inside`, `outside`, `center` | Design intent. Current Canvas rendering is centered, so do not rely on inside/outside precision yet. |
| `dash` | number array | Dash pattern: `[dashLength, gapLength]`. |
| `cap` | `butt`, `round`, `square` | Line end cap. Use `round` for organic strokes. |
| `join` | `miter`, `round`, `bevel` | Corner join. Use `round` for soft icons. |

Multiple strokes:

```yaml
strokes:
  - color: "#FFFFFF"
    width: 6
    opacity: 0.25
  - color: "#2563EB"
    width: 2
```

Use strokes for:

- card borders
- icon outlines
- neon lines
- dividers
- paths used as whiskers, wires, trails, or curves

## 11. Transforms

Transforms apply to an element after its base geometry is defined.

```yaml
transform:
  translate: [20, -10]
  rotate: 12
  scale: [1.1, 0.95]
  origin: [400, 300]
```

| Field | Type | Explanation |
|---|---|---|
| `translate` | `[x, y]` | Move the element. |
| `rotate` | degrees | Clockwise degrees around origin. |
| `scale` | number or `[sx, sy]` | Uniform or non-uniform scale. |
| `origin` | `[x, y]` | Pivot point for rotation/scale. |

AI guidance:

- Prefer direct coordinates for simple placement.
- Use transforms for rotation, repeated instances, and component reuse.
- If rotating an object, set `origin` explicitly near its center.
- Avoid stacking many nested transforms when direct geometry is clearer.

## 12. Blend modes

Supported blend modes:

```text
normal, multiply, screen, overlay, darken, lighten,
color-dodge, color-burn, hard-light, soft-light,
difference, exclusion
```

Use cases:

| Blend mode | Good for |
|---|---|
| `normal` | Most objects |
| `multiply` | Shadows, ink, dark overlays |
| `screen` | Glows, light leaks, aurora effects |
| `overlay` / `soft-light` | Subtle texture/highlight overlays |
| `difference` / `exclusion` | Experimental graphic effects |

Example:

```yaml
- type: ellipse
  id: "blue-glow"
  name: "Blue glow"
  cx: 700
  cy: 180
  rx: 220
  ry: 160
  fill: "#3B82F680"
  blend_mode: screen
  effects:
    - type: blur
      radius: 28
```

## 13. Filters and effects

Filters are Canvas-style post-processing. Effects are design-object style metadata that the Studio renderer maps to shadows, blur, and glows.

### Filters

```yaml
filters:
  - type: blur
    radius: 12
  - type: drop-shadow
    dx: 0
    dy: 16
    radius: 24
    color: "#00000066"
```

### Effects

```yaml
effects:
  - type: drop-shadow
    dx: 0
    dy: 24
    radius: 40
    color: "#00000070"
  - type: outer-glow
    radius: 18
    color: "#60A5FA80"
    opacity: 0.7
```

Supported effect types:

| Type | Fields | Use |
|---|---|---|
| `blur` | `radius` | Soft atmosphere, defocus, glow shapes. |
| `drop-shadow` | `dx`, `dy`, `radius`, `color`, `opacity` | Elevation and cast shadow. |
| `inner-shadow` | `dx`, `dy`, `radius`, `spread`, `color`, `opacity`, `blend_mode` | Inset depth. Approximate in current renderer. |
| `outer-glow` | `radius`, `spread`, `color`, `opacity`, `blend_mode` | Neon/glass glow. |
| `inner-glow` | `radius`, `spread`, `color`, `opacity`, `blend_mode` | Lit inner edge. Approximate in current renderer. |

AI guidance:

- Use one good shadow instead of many heavy shadows.
- For glass cards: translucent fill + faint border + drop shadow + background blur-like glow shapes.
- For glowing objects: duplicate or radial ellipse with blur/effect behind the main object.
- Large blur radii can be expensive. Keep radius under `60` unless necessary.

## 14. Constraints and layout items

Constraints express how objects behave when a frame/canvas is resized.

```yaml
constraints:
  horizontal: left-right
  vertical: top
```

Horizontal values:

```text
left, right, center, left-right, scale
```

Vertical values:

```text
top, bottom, center, top-bottom, scale
```

Auto-layout child behavior:

```yaml
layout_item:
  grow: 1
  shrink: 1
  align_self: stretch
```

| Field | Meaning |
|---|---|
| `grow` | How much the child expands into available frame space. |
| `shrink` | How much the child shrinks if content overflows. |
| `align_self` | Overrides frame `align_items`: `auto`, `start`, `center`, `end`, `stretch`. |

Use constraints/layout metadata for UI mockups, cards, dashboards, and responsive panels. For purely illustrative posters/icons, direct coordinates are usually simpler.

## 15. Element reference

### 15.1 `rect`

Rectangles are the workhorse element: backgrounds, cards, buttons, panels, bars, chips, skeleton UI, and rounded blocks.

```yaml
- type: rect
  id: "glass-card"
  name: "Glass card"
  x: 260
  y: 190
  width: 680
  height: 390
  rx: 32
  ry: 32
  fill: "#FFFFFF14"
  stroke:
    color: "#FFFFFF33"
    width: 1
  effects:
    - type: drop-shadow
      dx: 0
      dy: 28
      radius: 48
      color: "#00000070"
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `x`, `y` | number | Top-left corner. |
| `width`, `height` | number | Size. Must be positive. |
| `rx`, `ry` | number | Corner radius. Use both for clarity. |

AI tips:

- Use `rect` instead of a path for cards/buttons.
- Use large `rx` for pills; `rx: 999` works visually for pill buttons.
- Layer subtle radial/linear fills for more premium UI.

### 15.2 `ellipse`

Ellipses create circles, blobs, avatars, glow fields, soft shadows, and decorative orbs.

```yaml
- type: ellipse
  id: "ambient-glow"
  name: "Ambient glow"
  cx: 900
  cy: 180
  rx: 260
  ry: 180
  fill:
    type: radial-gradient
    cx: 900
    cy: 180
    r: 260
    stops:
      - offset: 0
        color: "#3B82F680"
      - offset: 1
        color: "#3B82F600"
  blend_mode: screen
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `cx`, `cy` | number | Center point. |
| `rx`, `ry` | number | Horizontal/vertical radius. |

AI tips:

- Use ellipses with radial gradients for atmosphere.
- Use blurred ellipses for shadows under objects.
- A circle is an ellipse where `rx == ry`.

### 15.3 `line`

Lines are good for dividers, connectors, arrows, measurement marks, and simple strokes.

```yaml
- type: line
  id: "connector-arrow"
  name: "Connector arrow"
  x1: 120
  y1: 240
  x2: 360
  y2: 240
  arrow_end: arrow
  stroke:
    color: "#94A3B8"
    width: 3
    cap: round
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `x1`, `y1` | number | Start point. |
| `x2`, `y2` | number | End point. |
| `arrow_start` | `none`, `arrow`, `circle`, `diamond` | Optional start marker. |
| `arrow_end` | `none`, `arrow`, `circle`, `diamond` | Optional end marker. |

Use a `path` instead of `line` for curved strokes.

### 15.4 `text`

Text must remain editable. Do not convert ordinary copy into paths.

```yaml
- type: text
  id: "hero-title"
  name: "Hero title"
  x: 120
  y: 130
  width: 560
  content: "AI-made. Human-editable."
  font_size: 48
  font_family: "sans-serif"
  font_weight: "bold"
  line_height: 1.12
  letter_spacing: -0.5
  align: left
  fill: "#FFFFFF"
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `x`, `y` | number | Text anchor / top-left for wrapped text. |
| `width` | number | Enables wrapping for `content`. Strongly recommended for paragraphs. |
| `content` | string | Plain editable text. |
| `font_size` | number | Pixels. |
| `font_family` | string | Use common families like `"sans-serif"`, `"serif"`, `"monospace"`. |
| `font_weight` | string | `"normal"`, `"bold"`, or numeric-like strings if supported by browser font. |
| `line_height` | number | Multiplier or line-height value used by Studio renderer. |
| `letter_spacing` | number | Extra spacing in pixels. |
| `paragraph_spacing` | number | Extra spacing between blank-line paragraphs. |
| `vertical_align` | `top`, `center`, `bottom` | Design intent; do not rely on exact vertical alignment for critical output yet. |
| `align` | `left`, `center`, `right` | Horizontal alignment. |
| `spans` | array | Rich text runs. Useful for short labels, not long wrapped paragraphs. |

Rich text spans:

```yaml
- type: text
  id: "caption"
  name: "Caption"
  x: 400
  y: 720
  font_size: 18
  font_family: "sans-serif"
  align: center
  spans:
    - text: "Generate "
      fill: "#94A3B8"
    - text: "editable"
      bold: true
      fill: "#FFFFFF"
    - text: " source"
      fill: "#94A3B8"
```

Span fields:

| Field | Type | Notes |
|---|---|---|
| `text` | string | Required span text. |
| `bold` | boolean | Shortcut for bold weight. |
| `italic` | boolean | Italic style. |
| `underline` | boolean | Metadata; rendering support may vary. |
| `font_size` | number | Span override. |
| `font_weight` | string | Span override. |
| `letter_spacing` | number | Span override. |
| `fill` | string | Span color. |

AI tips:

- Use `content` for normal paragraphs.
- Use `spans` for short inline emphasis.
- Give text boxes enough width to avoid awkward wrapping.
- Keep exact copy editable unless user asks for “logo lettering”, “wordmark as vector”, or “outline text”.

### 15.5 `path`

Paths describe arbitrary vector shapes using SVG path data.

```yaml
- type: path
  id: "seal-silhouette"
  name: "Editable seal silhouette"
  d: "M 164 548 C 195 496 210 421 240 351 C 274 274 333 235 409 222 C 504 205 596 236 638 296 C 660 328 665 365 676 380 C 691 402 724 394 746 410 C 776 432 765 489 721 522 C 689 546 644 546 616 569 C 582 596 581 634 538 658 C 491 684 421 682 345 671 C 276 661 214 637 165 595 C 151 583 155 564 164 548 Z"
  fill:
    type: linear-gradient
    x1: 430
    y1: 205
    x2: 430
    y2: 680
    stops:
      - offset: 0
        color: "#12F49C"
      - offset: 1
        color: "#005E93"
```

Supported SVG commands include:

```text
M/m, L/l, H/h, V/v, C/c, S/s, Q/q, T/t, A/a, Z/z
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `d` | string | SVG path data. |
| `fill_rule` | `nonzero`, `evenodd` | Use `evenodd` for holes/compound shapes. |

AI path rules:

- Use paths for icons, organic silhouettes, curved strokes, and custom logos.
- Do not use one giant path for an entire complex design; it becomes uneditable.
- Prefer simple shapes for circles, cards, bars, and text.
- For organic shapes, use a moderate number of cubic curves. Avoid hundreds of points.
- Stroke-only curves need `fill: "none"` and a stroke with `cap: round`.

Stroke-only path:

```yaml
- type: path
  id: "upper-whisker"
  name: "Upper teal whisker"
  d: "M 586 450 C 618 430 648 412 682 397"
  fill: "none"
  stroke:
    color: "#13D6B5"
    width: 13
    cap: round
    join: round
  opacity: 0.72
```

### 15.6 `group`

Groups collect elements into a logical object. Use them when objects should move/edit together.

```yaml
- type: group
  id: "profile-card"
  name: "Profile card group"
  elements:
    - type: rect
      id: "profile-card-bg"
      name: "Card background"
      x: 80
      y: 80
      width: 360
      height: 220
      rx: 24
      fill: "#FFFFFF"
    - type: text
      id: "profile-name"
      name: "Profile name"
      x: 120
      y: 140
      width: 280
      content: "Ada Lovelace"
      font_size: 28
      font_weight: "bold"
      fill: "#111827"
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `elements` | array | Child elements. |

AI tips:

- Use groups for named logical objects: logo mark, card, icon, avatar cluster.
- Avoid unnecessary single-child groups.
- If a group has opacity/effects/blend mode, Studio renders it as a flattened isolated container so the effect applies to the whole group.

### 15.7 `frame`

Frames are Figma-like containers. They have bounds and `children`, and may use auto layout.

```yaml
- type: frame
  id: "feature-row"
  name: "Feature row"
  x: 120
  y: 520
  width: 960
  height: 140
  fill: "#FFFFFF0F"
  stroke:
    color: "#FFFFFF22"
    width: 1
  auto_layout:
    mode: horizontal
    gap: 20
    padding: [24, 24, 24, 24]
    align_items: center
    justify_content: space-between
  children:
    - type: rect
      id: "feature-pill"
      name: "Feature pill"
      width: 260
      height: 72
      rx: 18
      fill: "#2563EB"
      layout_item:
        grow: 1
        shrink: 1
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `x`, `y` | number | Frame top-left. |
| `width`, `height` | number | Frame size. |
| `children` | array | Child elements. |
| `auto_layout` | object | Optional layout behavior. |

Auto layout:

| Field | Values | Meaning |
|---|---|---|
| `mode` | `horizontal`, `vertical` | Main direction. |
| `gap` | number | Space between children. |
| `padding` | number or `[top, right, bottom, left]` | Inner spacing. |
| `align_items` | `start`, `center`, `end`, `stretch` | Cross-axis alignment. |
| `justify_content` | `start`, `center`, `end`, `space-between` | Main-axis distribution. |
| `wrap` | boolean | Design intent for wrapping. Use carefully. |

AI tips:

- Use frames for UI mockups and cards.
- Use groups for illustration objects.
- Frame children can omit `x`/`y` when auto layout positions them; include dimensions.
- For precise illustration, direct coordinates may be more predictable than auto layout.

### 15.8 `image`

Images embed or reference raster assets. Prefer vector elements unless the user provides or requests a photo/bitmap.

```yaml
- type: image
  id: "product-photo"
  name: "Product photo"
  x: 640
  y: 160
  width: 360
  height: 260
  href: "data:image/png;base64,..."
  fit: cover
  border_radius: 24
  adjustments:
    brightness: 4
    contrast: 8
    saturation: -6
    hue_rotate: 0
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `x`, `y` | number | Top-left. |
| `width`, `height` | number | Drawn size. |
| `href` | string | Data URL or URL. Prefer data URLs for portable examples. |
| `fit` | `fill`, `contain`, `cover`, `none` | Object-fit behavior. |
| `border_radius` | number | Rounded image clipping. |
| `adjustments` | object | Image filter adjustments. |

Adjustment fields:

| Field | Meaning |
|---|---|
| `brightness` | Percent delta from normal. `10` means brighter. |
| `contrast` | Percent delta from normal. |
| `saturation` | Percent delta from normal. |
| `hue_rotate` | Degrees. |

AI tips:

- Do not invent inaccessible external image URLs.
- If no real image is provided, create a vector placeholder or illustration instead.
- For portable examples, avoid huge base64 blobs unless necessary.

### 15.9 `defs` and `use`

`defs` define reusable elements or masks. `use` places a referenced def in the document.

```yaml
defs:
  - id: "sparkle-mark"
    type: path
    name: "Sparkle mark"
    d: "M 0 -18 L 6 -5 L 20 0 L 6 5 L 0 18 L -6 5 L -20 0 L -6 -5 Z"
    fill: "#FFFFFFAA"
layers:
  - name: "Sparkles"
    elements:
      - type: use
        id: "sparkle-left"
        name: "Left sparkle"
        ref: "sparkle-mark"
        transform:
          translate: [180, 220]
          scale: 0.8
      - type: use
        id: "sparkle-right"
        name: "Right sparkle"
        ref: "sparkle-mark"
        transform:
          translate: [930, 360]
          rotate: 18
          scale: 0.55
```

`use` fields:

| Field | Type | Notes |
|---|---|---|
| `ref` | string | Required def ID. |
| `x`, `y`, `cx`, `cy` | number | Optional geometry override for simple referenced elements. |
| `transform` | object | Preferred placement method. |

AI tips:

- Use defs for repeated icons, sparkles, badges, stars, dots, or masks.
- Keep defs generic and place them with transforms.
- Still give each `use` instance its own `id` and `name`.

### 15.10 Masks and clipping

Layer mask:

```yaml
defs:
  - id: "circle-mask"
    elements:
      - type: ellipse
        cx: 400
        cy: 300
        rx: 180
        ry: 180
        fill: "#FFFFFF"
layers:
  - name: "Masked gradient"
    mask: "circle-mask"
    elements:
      - type: rect
        x: 0
        y: 0
        width: 800
        height: 600
        fill:
          type: linear-gradient
          x1: 220
          y1: 120
          x2: 580
          y2: 480
          stops:
            - offset: 0
              color: "#60A5FA"
            - offset: 1
              color: "#A78BFA"
```

Clip path:

```yaml
clip_path: "M 100 100 L 700 100 L 700 500 L 100 500 Z"
```

AI tips:

- Use masks for soft shape-contained artwork.
- Use clip paths for simple hard cropping.
- Keep mask defs named and simple.

### 15.11 Components and `component-instance`

Components define reusable design objects. Instances place them with independent size/position.

```yaml
components:
  - id: "primary-button"
    name: "Primary button"
    master:
      type: frame
      id: "primary-button-master"
      name: "Primary button master"
      width: 180
      height: 52
      fill: "#2563EB"
      auto_layout:
        mode: horizontal
        padding: [14, 24, 14, 24]
        align_items: center
        justify_content: center
      children:
        - type: text
          id: "button-label"
          name: "Button label"
          content: "Get started"
          font_size: 16
          font_weight: "bold"
          fill: "#FFFFFF"
layers:
  - name: "CTA"
    elements:
      - type: component-instance
        id: "hero-primary-button"
        name: "Hero primary button"
        component_id: "primary-button"
        x: 120
        y: 520
        width: 180
        height: 52
```

Component fields:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Component ID. |
| `name` | string | Human-readable label. |
| `master` | element | Source element used by instances. |
| `properties` | object | Future/metadata values. |

Instance fields:

| Field | Type | Notes |
|---|---|---|
| `component_id` | string | Required component ID. |
| `x`, `y` | number | Placement. |
| `width`, `height` | number | Instance box. |
| `overrides` | object | Metadata for future override workflows. |

AI tips:

- Use components for repeated buttons, cards, icons, or badges.
- For one-off art, groups are simpler.
- Keep component masters clean and named.

### 15.12 `boolean` operations

Boolean elements describe vector operations over subject/clipping shapes.

```yaml
- type: boolean
  id: "ring-shape"
  name: "Ring shape"
  op: subtract
  subjects:
    - type: ellipse
      cx: 200
      cy: 200
      rx: 90
      ry: 90
  clips:
    - type: ellipse
      cx: 200
      cy: 200
      rx: 50
      ry: 50
  fill: "#60A5FA"
  fill_rule: evenodd
```

| Field | Values | Meaning |
|---|---|---|
| `op` | `union`, `subtract`, `intersect`, `exclude` | Boolean operation. |
| `subjects` | array | Base shapes. |
| `clips` | array | Modifier shapes. |
| `fill_rule` | `nonzero`, `evenodd` | Fill rule for result. |

Current-generation note: boolean is useful in the type model and reference renderer, but for maximum current web Studio reliability, AI agents should prefer explicit `path` shapes or grouped primitives unless the user specifically asks for boolean operations.

## 16. Rendering and editing order

Within a layer, elements render in array order. Later elements appear above earlier elements.

```yaml
elements:
  - type: rect     # painted first, behind
  - type: ellipse
  - type: text     # painted last, in front
```

Use this ordering:

1. Background fills and large glows.
2. Shadows.
3. Main object bodies.
4. Surface highlights/details.
5. Text and UI controls.
6. Small foreground decorations.

## 17. Existing-document edit rules

When the user edits an existing document, return the **full updated document**, not a patch.

Preserve:

- existing `id` values
- existing `name` values unless renaming is requested
- layer order
- unrelated objects
- canvas size/background unless requested
- source comments if practical

Change only what the user asked for:

| User asks | Correct behavior |
|---|---|
| “Make the selected card glassy” | Modify selected card fill/stroke/effects; leave other objects unchanged. |
| “Change title to Launch Week” | Change only the text `content`. |
| “Make it more premium” | Improve colors/effects/composition while preserving recognizable structure. |
| “Generate a new poster” | It is OK to replace the whole document. |

If a selected object is provided, treat the request as local to that object by default.

## 18. Quality heuristics for AI-generated designs

Strong nextPNG examples usually include:

- clear art direction: palette, composition, and hierarchy
- named layers and named objects
- stable IDs on major objects
- editable text, not outlined text
- simple primitives where possible
- paths only where needed
- subtle lighting: gradient background, soft shadow, highlight
- consistent spacing
- a limited color palette
- object grouping that matches user intent

Common design recipes:

### Premium dark product card

Use:

- dark gradient background
- blurred radial glow ellipses
- glass card with translucent fill
- `drop-shadow`
- title, body, CTA text
- a few decorative vectors

### Logo/icon mark

Use:

- square canvas
- transparent or solid background
- a few paths/rects/ellipses
- named geometry pieces
- no raster image unless provided

### UI mockup

Use:

- frames for screen panels
- rects for cards and controls
- text for labels
- components for repeated buttons/badges
- constraints and layout_item metadata

### Organic illustration

Use:

- a main path silhouette
- gradient fills
- separate highlight/shadow paths
- separate facial/details paths
- grouped parts by body/face/decorations

## 19. Anti-patterns

Avoid:

- Returning only prose: “Here is an image...”
- Returning Markdown without a YAML code fence.
- Returning SVG/XML instead of npng YAML.
- Returning a base64 PNG inside YAML when vector source is possible.
- Creating one massive path for a full poster or UI.
- Converting editable text to paths.
- Omitting `canvas` or `layers`.
- Using unquoted hex colors.
- Using random IDs that change on every edit.
- Replacing the whole document for a small local edit.
- Overusing huge blur filters or hundreds of tiny path points.
- Using external image URLs that may break.

## 20. Preflight checklist

Before returning YAML, verify:

- `npng`, `canvas`, and `layers` exist.
- `npng` is `"0.3"` unless explicitly requested otherwise.
- Every layer has an `elements` array.
- Important objects have `id` and `name`.
- Text remains `type: text`.
- Hex colors are quoted.
- Gradients have valid `stops` with offsets from `0` to `1`.
- Paths have valid SVG `d` data.
- Stroke-only paths use `fill: "none"`.
- Effects/filters use supported `type` values.
- Reused defs/components have matching references.
- The document is complete and can stand alone.

## 21. Compact examples

### 21.1 Glass card

```yaml
npng: "0.3"
canvas:
  width: 900
  height: 600
  background: "#070B18"
defs: []
layers:
  - name: "Background"
    elements:
      - type: rect
        id: "background"
        name: "Background gradient"
        x: 0
        y: 0
        width: 900
        height: 600
        fill:
          type: linear-gradient
          x1: 0
          y1: 0
          x2: 900
          y2: 600
          stops:
            - offset: 0
              color: "#0F1F46"
            - offset: 1
              color: "#050713"
      - type: ellipse
        id: "cyan-glow"
        name: "Cyan glow"
        cx: 670
        cy: 130
        rx: 220
        ry: 150
        fill: "#22D3EE55"
        blend_mode: screen
        effects:
          - type: blur
            radius: 34
  - name: "Card"
    elements:
      - type: rect
        id: "main-card"
        name: "Main glass card"
        x: 180
        y: 150
        width: 540
        height: 300
        rx: 30
        ry: 30
        fill: "#FFFFFF14"
        stroke:
          color: "#FFFFFF33"
          width: 1
        effects:
          - type: drop-shadow
            dx: 0
            dy: 26
            radius: 44
            color: "#00000070"
      - type: text
        id: "title"
        name: "Title"
        x: 230
        y: 220
        width: 440
        content: "Design source, not pixels"
        font_size: 38
        font_weight: "bold"
        line_height: 1.12
        fill: "#FFFFFF"
      - type: text
        id: "body"
        name: "Body"
        x: 232
        y: 315
        width: 380
        content: "nextPNG keeps every layer, text box, shape, and effect editable after AI generation."
        font_size: 18
        line_height: 1.45
        fill: "#B8C7E8"
```

### 21.2 Icon mark with reusable sparkle def

```yaml
npng: "0.3"
canvas:
  width: 512
  height: 512
  background: "transparent"
defs:
  - id: "sparkle"
    type: path
    d: "M 0 -18 L 6 -5 L 20 0 L 6 5 L 0 18 L -6 5 L -20 0 L -6 -5 Z"
    fill: "#FFFFFF"
layers:
  - name: "Logo mark"
    elements:
      - type: rect
        id: "app-tile"
        name: "Rounded tile"
        x: 56
        y: 56
        width: 400
        height: 400
        rx: 96
        ry: 96
        fill:
          type: linear-gradient
          x1: 56
          y1: 56
          x2: 456
          y2: 456
          stops:
            - offset: 0
              color: "#60A5FA"
            - offset: 1
              color: "#7C3AED"
      - type: path
        id: "vector-fold"
        name: "Vector fold"
        d: "M 156 326 C 206 214 286 164 380 150 C 346 235 290 305 156 326 Z"
        fill: "#FFFFFFD9"
      - type: use
        id: "top-sparkle"
        name: "Top sparkle"
        ref: "sparkle"
        transform:
          translate: [358, 145]
          scale: 0.75
```

### 21.3 Auto-layout feature row

```yaml
npng: "0.3"
canvas:
  width: 1000
  height: 500
  background: "#F8FAFC"
layers:
  - name: "Feature row"
    elements:
      - type: frame
        id: "features"
        name: "Features frame"
        x: 80
        y: 150
        width: 840
        height: 160
        fill: "#FFFFFF"
        stroke:
          color: "#E2E8F0"
          width: 1
        auto_layout:
          mode: horizontal
          gap: 20
          padding: [24, 24, 24, 24]
          align_items: center
          justify_content: space-between
        children:
          - type: rect
            id: "feature-a"
            name: "Feature A tile"
            width: 240
            height: 100
            rx: 20
            fill: "#EFF6FF"
            layout_item:
              grow: 1
              shrink: 1
          - type: rect
            id: "feature-b"
            name: "Feature B tile"
            width: 240
            height: 100
            rx: 20
            fill: "#F5F3FF"
            layout_item:
              grow: 1
              shrink: 1
          - type: rect
            id: "feature-c"
            name: "Feature C tile"
            width: 240
            height: 100
            rx: 20
            fill: "#ECFDF5"
            layout_item:
              grow: 1
              shrink: 1
```

### 21.4 Organic vector animal style

This is the pattern used by `examples/26-gradient-seal-demo.npng`: one editable silhouette path, separate facial details, separate highlight/shadow paths, and a gradient background.

```yaml
npng: "0.3"
canvas:
  width: 900
  height: 900
  background: "#050719"
defs: []
layers:
  - name: "deep ocean background"
    elements:
      - type: rect
        id: "background-gradient"
        name: "Deep navy gradient"
        x: 0
        y: 0
        width: 900
        height: 900
        fill:
          type: linear-gradient
          x1: 0
          y1: 0
          x2: 0
          y2: 900
          stops:
            - offset: 0
              color: "#0B2A5B"
            - offset: 1
              color: "#030315"
  - name: "animal body"
    elements:
      - type: path
        id: "animal-silhouette"
        name: "Editable animal silhouette"
        d: "M 164 548 C 195 496 210 421 240 351 C 274 274 333 235 409 222 C 504 205 596 236 638 296 C 660 328 665 365 676 380 C 691 402 724 394 746 410 C 776 432 765 489 721 522 C 689 546 644 546 616 569 C 582 596 581 634 538 658 C 491 684 421 682 345 671 C 276 661 214 637 165 595 C 151 583 155 564 164 548 Z"
        fill:
          type: linear-gradient
          x1: 430
          y1: 205
          x2: 430
          y2: 680
          stops:
            - offset: 0
              color: "#12F49C"
            - offset: 1
              color: "#005E93"
  - name: "face details"
    elements:
      - type: ellipse
        id: "animal-eye"
        name: "White eye"
        cx: 586
        cy: 365
        rx: 24
        ry: 24
        fill: "#FFFFFF"
      - type: path
        id: "whisker"
        name: "Curved whisker"
        d: "M 586 450 C 618 430 648 412 682 397"
        fill: "none"
        stroke:
          color: "#13D6B5"
          width: 13
          cap: round
          join: round
```

## 22. Final response behavior

When answering a user in nextPNG generation mode:

1. If they ask for a design/image, output the full YAML in one fenced code block.
2. Optionally add one short sentence before the code explaining what it is.
3. Do not include multiple alternative YAML documents unless asked.
4. Do not omit code because the document is long.
5. If the request is impossible in current nextPNG, say what limitation applies and produce the closest editable structure.

The canonical output remains:

````markdown
```yaml
npng: "0.3"
canvas:
  width: 1200
  height: 800
  background: "#0B1020"
layers:
  - name: "Generated design"
    elements:
      - type: rect
        id: "background"
        name: "Background"
        x: 0
        y: 0
        width: 1200
        height: 800
        fill: "#0B1020"
```
````
