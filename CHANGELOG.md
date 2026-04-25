# NewPNG Changelog

## v0.1 (Initial Release)

### Format Features
- YAML-based format with `npng` version key
- Canvas definition: width, height, background color
- Layers with z-order, name, opacity, visibility
- Elements: rect, ellipse, line, text, path, group
- Fill types: solid color (hex), linear-gradient, radial-gradient
- Stroke: color, width, dash pattern, line cap, line join
- Transforms: translate, rotate, scale (per-element)
- Rounded rectangles via rx/ry
- SVG-compatible path data (M, L, H, V, C, Q, Z and lowercase variants)

### Renderer
- Python + pycairo renderer
- Full support for all v0.1 format features
- Anti-aliased rendering
- Proper layer compositing with opacity
- Gradient support (linear and radial)
- Path parsing with bezier curves (cubic and quadratic)
- Output to PNG

### Examples Created
1. `01-hello-world.npng` — Basic shapes and text
2. `02-gradients-strokes.npng` — Gradient fills and stroke styles
3. `03-layers-opacity.npng` — Layer compositing with opacity
4. `04-transforms.npng` — Rotate, translate, scale transforms
5. `05-paths.npng` — SVG path data (star, triangle, arrow)
6. `06-microsoft-logo.npng` — Microsoft logo (4 colored squares)
7. `07-apple-logo-v1.npng` — Apple logo attempt 1 (rough)
8. `08-apple-logo-v2.npng` — Apple logo attempt 2 (improved curves)
9. `09-apple-logo-v3.npng` — Apple logo attempt 3 (refined shape)

## v0.2

### Format Features
- Layer blend modes: normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion
- Layer filters: blur (gaussian approximation via box blur), drop-shadow (offset, blur, color)
- Per-pixel blend mode compositing for non-normal blend modes

### Renderer
- Pixel-level blend mode implementation for all 12 standard modes
- Box-blur approximation (3-pass) for gaussian blur filter
- Drop-shadow filter: alpha mask extraction, colorization, blur, and compositing
- All layers now rendered to individual surfaces for proper blend/filter support

### Examples Created
10. `10-ui-mockup.npng` — Material Design UI mockup (app bar, cards, FAB)
11. `11-blend-modes.npng` — RGB circles with multiply-blended yellow overlay
12. `12-filters.npng` — Drop shadow card, blurred circle, sharp reference

## v0.3

### Format Features
- Top-level `defs` array for reusable element definitions and masks
- `use` element type: reference a def by ID with optional position/transform overrides
- Layer `clip_path`: SVG path data as clipping region
- Layer `mask`: reference a def ID whose alpha channel masks the layer

### Renderer
- Defs resolution at render time
- Use element instantiation from defs with property overrides
- Clip path support via cairo clipping
- Alpha mask compositing (pixel-level mask alpha multiplication)

### Examples Created
13. `13-clip-mask-defs.npng` — Gradient background, circular clip on stripes, masked star via defs/use
14. `14-apple-logo-v4.npng` — Apple logo v4 with improved body shape and white ellipse bite cutout

## v0.4

### Format Features
- Fill rule: `fill_rule` property on path elements (`evenodd` / `nonzero`) for compound paths with holes
- SVG arc command (A/a): Full endpoint-to-center parameterization implementation
- Smooth curve commands (S/s, T/t): Smooth cubic and quadratic bezier continuity via reflected control points
- Per-element opacity: `opacity` property on any element (rendered via push_group/pop_group/paint_with_alpha)
- Transform origin: `origin` property in transform dict for rotation/scale around a specified point
- Boolean operations: `boolean` element type with `op` (union/subtract/intersect/exclude), `subjects`, and `clips`

### Renderer
- Fill rule support via cairo `FILL_RULE_EVEN_ODD` / `FILL_RULE_WINDING`
- Full SVG arc implementation (endpoint-to-center conversion, radius correction, sweep direction)
- S/s and T/t path commands with last control point tracking
- Per-element opacity via cairo group compositing
- Transform origin via translate-transform-untranslate pattern
- Boolean operations via pyclipper library (polygon clipping with bezier flattening)

### Examples Created
15. `15-apple-logo-v5.npng` — Apple logo v5 with refined bezier curves
16. `16-v04-features.npng` — Comprehensive v0.4 feature test (boolean ops, fill rule, arcs, smooth curves, opacity, transform origin)
