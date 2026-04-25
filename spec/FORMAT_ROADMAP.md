# npng Format Roadmap — Toward Figma + Photoshop Parity

## Goal

npng 格式的终极目标：**覆盖 Figma 和 Photoshop 能做的所有视觉操作**。一个用 YAML 描述的、人类和 AI 都能读写的、完整的设计文件格式。

这是一个独立于 Web App 的 initiative。Web App 是交付载体，npng 格式本身才是核心技术资产。

---

## Current State (v0.4)

已实现：

| 能力 | 状态 |
|------|------|
| 基本图元 (rect, ellipse, line, path, text) | ✅ |
| Fill (solid, linear-gradient, radial-gradient) | ✅ |
| Stroke (color, width, dash, cap, join) | ✅ |
| Transforms (translate, rotate, scale) | ✅ |
| Transform origin | ✅ |
| Per-element opacity | ✅ |
| Layer blend modes | ✅ |
| Filters (blur, drop-shadow) | ✅ |
| Clipping paths | ✅ |
| Masks (alpha channel) | ✅ |
| Defs / Use (reusable components) | ✅ |
| Boolean operations (union, subtract, intersect, exclude) | ✅ |
| Fill rule (evenodd, nonzero) | ✅ |
| SVG path commands (M, L, H, V, C, S, Q, T, A, Z) | ✅ |

---

## Gap Analysis: What Figma + Photoshop Can Do That npng Can't

### Tier 1 — 高频缺失，阻碍大多数设计任务

| # | 能力 | Figma | Photoshop | npng | 优先级 |
|---|------|-------|-----------|------|--------|
| 1 | **Multiple fills per element** | ✅ | ✅ | ❌ | P0 |
| 2 | **Multiple strokes per element** | ✅ | ✅ | ❌ | P0 |
| 3 | **Stroke alignment** (inside / outside / center) | ✅ | ✅ | ❌ | P0 |
| 4 | **Inner shadow** | ✅ | ✅ | ❌ | P0 |
| 5 | **Background blur** (frosted glass) | ✅ | ✅ (lens blur) | ❌ | P0 |
| 6 | **Image / pattern fill** | ✅ | ✅ | ❌ | P0 |
| 7 | **Per-element blend mode** | ✅ | ✅ | ❌ (仅 layer) | P0 |
| 8 | **Element-level clip / mask** | ✅ | ✅ | ❌ (仅 layer) | P0 |
| 9 | **Groups** (嵌套分组) | ✅ | ✅ | ❌ | P0 |
| 10 | **Angular / conic gradient** | ✅ | ✅ | ❌ | P1 |
| 11 | **Diamond gradient** | ❌ | ✅ | ❌ | P2 |

### Tier 2 — 文字排版

| # | 能力 | Figma | Photoshop | npng | 优先级 |
|---|------|-------|-----------|------|--------|
| 12 | **Rich text** (mixed styles in one block) | ✅ | ✅ | ❌ | P0 |
| 13 | **Line height / letter spacing / paragraph spacing** | ✅ | ✅ | ❌ | P0 |
| 14 | **Text decoration** (underline, strikethrough) | ✅ | ✅ | ❌ | P1 |
| 15 | **Text on path** | ❌ | ✅ | ❌ | P2 |
| 16 | **Text auto-resize** (fixed width, auto height) | ✅ | ✅ | ❌ | P1 |
| 17 | **Vertical text** | ✅ | ✅ | ❌ | P2 |
| 18 | **OpenType features** (ligatures, small caps, etc.) | ✅ | ✅ | ❌ | P3 |

### Tier 3 — 高级视觉效果

| # | 能力 | Figma | Photoshop | npng | 优先级 |
|---|------|-------|-----------|------|--------|
| 19 | **Gaussian blur per element** | ✅ | ✅ | ❌ (仅 layer) | P1 |
| 20 | **Layer blur** (background/foreground) | ✅ | ✅ | ❌ | P1 |
| 21 | **Noise / grain** | ❌ (plugin) | ✅ | ❌ | P2 |
| 22 | **Color overlay** | ✅ (via fill) | ✅ | ❌ | P1 |
| 23 | **Gradient overlay** | ❌ | ✅ | ❌ | P2 |
| 24 | **Outer glow / inner glow** | ❌ | ✅ | ❌ | P2 |
| 25 | **Bevel & emboss** | ❌ | ✅ | ❌ | P3 |
| 26 | **Stroke gradient** | ✅ | ✅ | ❌ | P1 |
| 27 | **Gradient transform** (rotate, scale gradients independently) | ✅ | ✅ | ❌ | P1 |
| 28 | **Mesh gradient** | ❌ | ✅ (gradient mesh) | ❌ | P3 |

### Tier 4 — 布局与约束

| # | 能力 | Figma | Photoshop | npng | 优先级 |
|---|------|-------|-----------|------|--------|
| 29 | **Auto Layout** (flex-like) | ✅ | ❌ | ❌ | P1 |
| 30 | **Constraints** (pin to edges, stretch) | ✅ | ❌ | ❌ | P2 |
| 31 | **Grid / column layout** | ✅ | ✅ (guides) | ❌ | P2 |
| 32 | **Component / instance** (reusable with overrides) | ✅ | ✅ (smart object) | 部分 (defs/use) | P1 |
| 33 | **Variants** (component states) | ✅ | ❌ | ❌ | P2 |

### Tier 5 — 像素与图像操作 (Photoshop 特有)

| # | 能力 | Figma | Photoshop | npng | 优先级 |
|---|------|-------|-----------|------|--------|
| 34 | **Raster image embedding** (base64 / URL) | ✅ | ✅ | ❌ | P0 |
| 35 | **Image adjustments** (brightness, contrast, hue/saturation, curves) | ❌ | ✅ | ❌ | P2 |
| 36 | **Color channels** (CMYK, Lab) | ❌ | ✅ | ❌ | P3 |
| 37 | **Layer styles** (composable effect stack) | ❌ | ✅ | ❌ | P1 |
| 38 | **Smart filters** (non-destructive filter stack) | ❌ | ✅ | ❌ | P2 |
| 39 | **Pixel masks** (painted alpha masks) | ❌ | ✅ | ❌ | P2 |

### Tier 6 — 动画与交互 (Figma 特有)

| # | 能力 | Figma | Photoshop | npng | 优先级 |
|---|------|-------|-----------|------|--------|
| 40 | **Prototype / interactions** | ✅ | ❌ | ❌ | P3 |
| 41 | **Smart animate** (tween between states) | ✅ | ❌ | ❌ | P3 |
| 42 | **Keyframe animation** | ❌ | ✅ (timeline) | ❌ | P3 |

---

## Format Evolution Roadmap

### v0.5 — Groups & Element-Level Effects

```yaml
# Groups
- type: group
  name: "button"
  opacity: 0.9
  blend_mode: multiply
  clip: true           # clip children to group bounds
  elements:
    - type: rect
      ...
    - type: text
      ...

# Per-element blend mode
- type: rect
  blend_mode: screen

# Per-element clip / mask
- type: rect
  clip_path: "M ..."
  mask: "mask-id"

# Per-element blur
- type: rect
  filters:
    - type: blur
      radius: 4
    - type: inner-shadow
      dx: 0
      dy: 2
      radius: 4
      color: "#00000040"
```

### v0.6 — Advanced Fills & Strokes

```yaml
# Multiple fills (bottom to top)
fills:
  - "#FF0000"
  - type: linear-gradient
    ...
    opacity: 0.5

# Multiple strokes
strokes:
  - color: "#000000"
    width: 2
    alignment: outside    # inside / outside / center
  - color: "#FFFFFF"
    width: 1
    alignment: inside

# Stroke gradient
stroke:
  fill:
    type: linear-gradient
    ...
  width: 3

# Image fill
fill:
  type: image
  src: "data:image/png;base64,..."   # or URL
  mode: fill                          # fill / fit / tile / crop

# Angular gradient
fill:
  type: angular-gradient
  cx: 100
  cy: 100
  stops:
    - offset: 0
      color: "#FF0000"
    - offset: 0.5
      color: "#00FF00"
    - offset: 1
      color: "#0000FF"

# Gradient transform
fill:
  type: linear-gradient
  ...
  transform:
    rotate: 45
    scale: [1.2, 1.0]
```

### v0.7 — Rich Text

```yaml
- type: text
  x: 50
  y: 50
  width: 300                # text box width (auto-wrap)
  height: auto              # auto / fixed number
  line_height: 1.4
  letter_spacing: 0.5
  paragraph_spacing: 12
  vertical_align: top       # top / center / bottom
  runs:                     # rich text runs (replaces simple content)
    - text: "Hello "
      font_size: 24
      font_weight: bold
      fill: "#000000"
    - text: "World"
      font_size: 24
      font_style: italic
      fill: "#FF0000"
      text_decoration: underline
```

### v0.8 — Image & Raster Support

```yaml
# Embedded image
- type: image
  x: 10
  y: 10
  width: 200
  height: 150
  src: "data:image/png;base64,..."
  fit: cover                # cover / contain / fill / none
  border_radius: 8

# Image adjustments
- type: image
  src: "..."
  adjustments:
    brightness: 10          # -100 to 100
    contrast: 20
    saturation: -30
    hue_rotate: 0           # degrees

# Background blur (frosted glass effect)
- type: rect
  fill: "#FFFFFF40"         # semi-transparent
  backdrop_filter:
    type: blur
    radius: 20
```

### v0.9 — Layer Styles & Effects Stack

```yaml
# Composable effect stack (Photoshop-style layer effects)
- type: rect
  effects:
    - type: drop-shadow
      dx: 0
      dy: 4
      radius: 8
      spread: 0
      color: "#00000040"
    - type: inner-shadow
      dx: 0
      dy: 2
      radius: 4
      color: "#00000020"
    - type: outer-glow
      radius: 10
      color: "#FFFFFF80"
    - type: inner-glow
      radius: 5
      color: "#FFFFFF40"
    - type: color-overlay
      color: "#FF000080"
      blend_mode: multiply
```

### v1.0 — Layout & Components

```yaml
# Auto Layout (flex)
- type: frame
  layout:
    direction: horizontal    # horizontal / vertical
    gap: 12
    padding: [16, 16, 16, 16]  # top, right, bottom, left
    align: center            # start / center / end / stretch
    wrap: false
  elements:
    - type: rect
      layout_item:
        grow: 1              # flex-grow
        align_self: stretch
    - type: text
      content: "Label"

# Components with overrides
defs:
  - id: "button"
    type: frame
    layout: { direction: horizontal, gap: 8, padding: [8, 16, 8, 16] }
    elements:
      - type: text
        id: "label"
        content: "Click me"
        font_size: 14

# Instance with override
- type: use
  ref: "button"
  overrides:
    label:
      content: "Submit"
      fill: "#FFFFFF"

# Constraints
- type: rect
  constraints:
    horizontal: left-right   # left / right / left-right / center / scale
    vertical: top            # top / bottom / top-bottom / center / scale
```

---

## Principles for Format Design

1. **YAML-first**：所有内容必须可以用纯文本 YAML 表达，不需要二进制
2. **SVG-compatible where possible**：path data、color 值、blend mode 名称尽量与 SVG/CSS 兼容
3. **Declarative**：描述"是什么"，不是"怎么画"。渲染器决定怎么实现
4. **LLM-friendly**：属性名直观、结构扁平、避免隐式行为。AI 能直接生成有效的 npng
5. **Incrementally renderable**：渲染器可以忽略不认识的属性，向前兼容
6. **No pixel operations in format**：格式描述矢量/声明式效果，像素操作（blur、shadow）由渲染器实现
7. **Backward compatible**：新版本只加字段，不改已有字段的语义

---

## Measuring Progress

覆盖率目标（可以做的操作数 / Figma+PS 总操作数）：

| 版本 | 预计覆盖率 | 里程碑 |
|------|-----------|--------|
| v0.4 (现在) | ~25% | 基本矢量 + 布尔运算 |
| v0.5 | ~35% | Groups + element effects |
| v0.6 | ~50% | 多重 fill/stroke + image fill |
| v0.7 | ~60% | Rich text |
| v0.8 | ~70% | 图像嵌入 + 调整 |
| v0.9 | ~80% | 完整效果栈 |
| v1.0 | ~90% | 布局 + 组件系统 |

剩余 10% 是高度专业化的功能（CMYK、动画、mesh gradient 等），按需实现。
