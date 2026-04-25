# NewPNG Iteration Log

## Iteration 1: Hello World
- **Target**: Simple shapes (rect, ellipse, rounded rect) with text
- **Result**: All shapes rendered correctly. Red rect upper-left, blue ellipse upper-right, green rounded rect center-bottom with white centered text.
- **Issues**: None
- **Changes**: None needed

## Iteration 2: Gradients & Strokes
- **Target**: Linear gradient rect, radial gradient ellipse, dashed stroke, text
- **Result**: All features working. Linear gradient diagonal red-to-teal, radial gradient white-to-yellow-to-red, dashed purple stroke rect, green stroke ellipse.
- **Issues**: None
- **Changes**: None needed

## Iteration 3: Layers & Opacity
- **Target**: Multiple layers with different opacity values
- **Result**: Dark navy background, semi-transparent (0.3) red and blue circles visible through a semi-transparent rounded rectangle. Layer compositing working correctly.
- **Issues**: None
- **Changes**: None needed

## Iteration 4: Transforms
- **Target**: Rotated rectangles forming a pinwheel, centered element, scaled text
- **Result**: Four colored bars rotated at 0/45/90/135 degrees forming a pinwheel pattern. Dark center dot. Scaled text at bottom.
- **Issues**: None
- **Changes**: None needed

## Iteration 5: SVG Paths
- **Target**: Complex path shapes — star, triangle, arrow
- **Result**: Gold-to-orange gradient star with dark gold stroke. Red triangle and blue arrow below.
- **Issues**: None
- **Changes**: None needed

## Iteration 6: Microsoft Logo
- **Target**: Four colored squares matching Microsoft brand colors
- **Result**: Accurate reproduction. Red (#F25022) top-left, green (#7FBA00) top-right, blue (#00A4EF) bottom-left, yellow (#FFB900) bottom-right. 20px gap between squares.
- **Issues**: None — logo is pixel-accurate for geometry and colors.
- **Changes**: None needed

## Iteration 7: Apple Logo v1
- **Target**: Apple silhouette with bite mark
- **Result**: General apple shape but too blobby. Bite done as white ellipse overlay (crude).
- **Issues**: Shape too round, bite not part of path, leaf too small
- **Changes**: Need to redo entirely with better bezier paths

## Iteration 8: Apple Logo v2
- **Target**: Improved apple silhouette with better bezier curves
- **Result**: Much better shape. Top indentation visible, leaf improved, body curves smoother.
- **Issues**: Bite mark still not concave enough on right side
- **Changes**: Need to refine right-side concavity for bite

## Iteration 9: Apple Logo v3
- **Target**: Further refined apple shape with better proportions
- **Result**: Good overall silhouette. Two lobes at top, tapered bottom, leaf. Right side has suggestion of bite area.
- **Issues**: Bite could be more pronounced. Overall shape close but not pixel-perfect.
- **Changes**: Could iterate further on bezier control points for the bite region

## Iteration 10: UI Mockup
- **Target**: Material Design-style mobile UI with app bar, cards with avatars, action buttons, and FAB
- **Result**: Clean UI mockup with purple app bar, two cards with circular avatars, text, and action buttons. FAB button in bottom-right corner.
- **Issues**: None
- **Changes**: None needed

## Iteration 11: Blend Modes (v0.2)
- **Target**: Test blend mode compositing — RGB circles with multiply-blended yellow rectangle overlay
- **Result**: Three overlapping circles (red, green, blue) with a yellow rectangle composited in multiply mode. The multiply effect correctly darkens the circles where the yellow overlaps.
- **Issues**: None — blend mode compositing working as expected
- **Changes**: None needed

## Iteration 12: Filters (v0.2)
- **Target**: Test blur and drop-shadow filters
- **Result**: Three elements visible: (1) white rounded card with drop shadow, (2) blurred pink circle with blurred text, (3) sharp blue reference circle. Both blur and drop-shadow filters working correctly.
- **Issues**: None
- **Changes**: None needed

## Iteration 13: Clip + Mask + Defs/Use (v0.3)
- **Target**: Test v0.3 features — clipping paths, masks, and defs/use references
- **Result**: Deep blue-to-pink gradient background. Semi-transparent white horizontal stripes clipped to a circular region (clip_path). Gold star masked by circular mask (defs/use + mask). Label at bottom.
- **Issues**: None — all three v0.3 features working correctly
- **Changes**: None needed

## Iteration 14: Apple Logo v4
- **Target**: Improved apple body with more symmetric shape and white ellipse bite cutout
- **Result**: Symmetric apple body with proper taper. White ellipse on right side creates visible bite mark. Leaf present at top.
- **Issues**: Using a white ellipse overlay for the bite rather than integrating into the path. Acceptable for the format's capabilities.
- **Changes**: Could further refine body proportions; bite approach is pragmatic for text-based format

## Iteration 15: Apple Logo v5
- **Target**: Significantly improved Apple silhouette with proper proportions — wide body, two distinct top lobes with V-notch, rounded bottom, prominent bite mark
- **Result**: After multiple rounds of refinement, the v5 silhouette is substantially closer to the real Apple logo than any previous version. Key improvements over v4: (1) body is much wider with more natural curvature, (2) top lobes are more distinct with a visible V-notch, (3) bite mark is well-positioned and appropriately deep via white ellipse overlay (cx=356, cy=220, rx=68, ry=88), (4) bottom tapers smoothly, (5) leaf is thin and elegantly angled.
- **Issues**: Still uses white ellipse overlay for the bite rather than a true boolean path subtract. Bezier control points could be further tuned for pixel-perfect accuracy. The inherent challenge is hand-writing cubic bezier control points without visual feedback tools.
- **Changes**: Multiple iterations on body width, lobe separation, bite depth/position, bottom taper, and leaf proportions.

## Iteration 16: v0.4 Implementation
- **Target**: Implement all Phase 2 format features — fill rule, SVG arcs, smooth curves (S/s, T/t), per-element opacity, transform origin, boolean operations
- **Result**: All six features implemented and verified in a comprehensive test example (16-v04-features.npng). Boolean ops (union, subtract, intersect, exclude) working via pyclipper. Fill rule evenodd producing correct donut shapes. SVG arcs rendering pac-man correctly. Smooth curves producing continuous bezier paths. Per-element opacity compositing via push_group. Transform origin rotating around specified point.
- **Issues**: None — all features working. Existing examples (01, 06, 15) render without regression.
- **Changes**: Major renderer update (render.py) adding ~200 lines of new code. Boolean op infrastructure (path-to-polygon flattening, pyclipper integration, polygon-to-path conversion). New element type `boolean`. New path commands S/s, T/t, proper A/a. New element properties: `opacity`, `fill_rule`. New transform property: `origin`.
