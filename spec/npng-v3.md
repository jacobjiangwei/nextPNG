# NewPNG Format Specification — v0.3

## Overview

NewPNG (`.npng`) is a YAML-based, human-readable image format for describing vector and compositing graphics.

## File Structure

A `.npng` file is valid YAML with the following top-level keys:

```yaml
npng: "0.3"          # format version (required)
canvas:               # canvas definition (required)
  width: 800
  height: 600
  background: "#FFFFFF"  # CSS-style hex color, or "transparent"
layers:               # ordered list of layers (required)
  - name: "Layer 1"
    opacity: 1.0       # 0.0 to 1.0
    elements: [...]     # list of elements
```

## Canvas

| Field       | Type   | Default       | Description                |
|-------------|--------|---------------|----------------------------|
| width       | int    | required      | Width in pixels            |
| height      | int    | required      | Height in pixels           |
| background  | string | "transparent" | Background color (hex)     |

## Layers

| Field      | Type   | Default  | Description                                |
|------------|--------|----------|--------------------------------------------|
| name       | string | ""       | Layer name                                 |
| opacity    | float  | 1.0      | Layer opacity (0.0-1.0)                    |
| visible    | bool   | true     | Whether layer is rendered                  |
| elements   | list   | []       | Elements in this layer                     |
| blend_mode | string | "normal" | Blend mode (v0.2+, see Blend Modes)        |
| filters    | list   | []       | Filters applied to layer (v0.2+)           |
| clip_path  | string | none     | SVG path data used as clipping region (v0.3+) |
| mask       | string | none     | ID of a def used as alpha mask (v0.3+)     |

## Elements

All elements share these common fields:

| Field       | Type          | Default  | Description |
|-------------|---------------|----------|-------------|
| type        | string        | required | Element type |
| id          | string        | none     | Stable machine-readable object ID for AI edits, overrides, and references |
| name        | string        | ""       | Human-readable object name shown in layer panels |
| visible     | bool          | true     | Whether this object is rendered and hit-tested |
| locked      | bool          | false    | Whether this object can be selected or edited |
| opacity     | float         | 1.0      | Per-object opacity |
| transform   | object        | none     | Translate/rotate/scale/origin transform |
| fill        | string/object | none     | Fill color or spec |
| fills       | list          | none     | Multiple fill layers, bottom to top |
| stroke      | object        | none     | Stroke specification |
| strokes     | list          | none     | Multiple stroke layers |
| constraints | object        | none     | Figma-like resize constraints |
| layout_item | object        | none     | Auto-layout child behavior |

### Rect

```yaml
- type: rect
  x: 10
  y: 10
  width: 100
  height: 50
  rx: 0          # corner radius x
  ry: 0          # corner radius y
  fill: "#FF0000"
```

### Ellipse

```yaml
- type: ellipse
  cx: 100
  cy: 100
  rx: 50
  ry: 30
  fill: "#00FF00"
```

### Line

```yaml
- type: line
  x1: 0
  y1: 0
  x2: 100
  y2: 100
  stroke:
    color: "#000000"
    width: 2
```

### Text

```yaml
- type: text
  x: 50
  y: 50
  content: "Hello World"
  font_size: 24
  font_family: "sans-serif"
  font_weight: "bold"    # normal, bold
  fill: "#000000"
  align: "left"          # left, center, right
```

### Path

SVG-compatible path data:

```yaml
- type: path
  d: "M 10 10 L 100 10 L 100 100 Z"
  fill: "#0000FF"
  stroke:
    color: "#000000"
    width: 1
```

### Stroke Specification

```yaml
stroke:
  color: "#000000"
  width: 2
  dash: [5, 3]        # dash pattern
  cap: "round"         # butt, round, square
  join: "miter"        # miter, round, bevel
```

### Fill Types

Solid color:
```yaml
fill: "#FF0000"
```

Linear gradient:
```yaml
fill:
  type: linear-gradient
  x1: 0
  y1: 0
  x2: 100
  y2: 0
  stops:
    - offset: 0
      color: "#FF0000"
    - offset: 1
      color: "#0000FF"
```

Radial gradient:
```yaml
fill:
  type: radial-gradient
  cx: 50
  cy: 50
  r: 50
  stops:
    - offset: 0
      color: "#FF0000"
    - offset: 1
      color: "#0000FF"
```

## Transforms

Any element can have a `transform` field:

```yaml
transform:
  translate: [10, 20]
  rotate: 45             # degrees, around element center
  scale: [1.5, 1.5]
```

## Blend Modes (v0.2+)

Layers support `blend_mode`: normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion.

## Filters (v0.2+)

```yaml
filters:
  - type: blur
    radius: 5
  - type: drop-shadow
    dx: 3
    dy: 3
    radius: 5
    color: "#00000080"
```

## Definitions / Reusable Components (v0.3+)

Top-level `defs` array allows defining reusable elements and masks:

```yaml
defs:
  - id: "my-shape"
    type: path
    d: "M 10 10 L 100 100 Z"
    fill: "#FF0000"
  - id: "my-mask"
    elements:
      - type: ellipse
        cx: 100
        cy: 100
        rx: 80
        ry: 80
        fill: "#FFFFFF"
```

### Use Element (v0.3+)

Reference a def by ID:

```yaml
- type: use
  ref: "my-shape"
  # Optionally override x, y, cx, cy, or transform
```

### Masks (v0.3+)

A layer can reference a def as its mask. The mask's alpha channel determines visibility:

```yaml
layers:
  - name: "masked-layer"
    mask: "my-mask"
    elements:
      - type: use
        ref: "my-shape"
```

### Clipping Paths (v0.3+)

A layer can specify an SVG path as a clipping region:

```yaml
layers:
  - name: "clipped-layer"
    clip_path: "M 50 50 L 150 50 L 150 150 L 50 150 Z"
    elements:
      - type: rect
        x: 0
        y: 0
        width: 200
        height: 200
        fill: "#0000FF"
```
