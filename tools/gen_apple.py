#!/usr/bin/env python3
"""Generate an accurate Apple logo .npng file using geometric construction.

The Apple logo is built from circular arcs, not freehand beziers.
This script constructs it from known geometric relationships.
"""

import math
import sys


def arc_to_cubic(cx, cy, r, start_angle, end_angle):
    """Convert a circular arc to cubic bezier curves.
    Returns list of (x1,y1, x2,y2, x3,y3) control point tuples.
    Angles in radians. Uses standard math convention (0 = right, CCW positive).
    """
    # Split into segments of at most 90 degrees
    segments = []
    angle = end_angle - start_angle
    n = max(1, int(math.ceil(abs(angle) / (math.pi / 2))))
    da = angle / n

    for i in range(n):
        a1 = start_angle + i * da
        a2 = a1 + da
        # Bezier approximation of circular arc
        alpha = 4.0 * math.tan(da / 4.0) / 3.0

        x0 = cx + r * math.cos(a1)
        y0 = cy + r * math.sin(a1)
        x3 = cx + r * math.cos(a2)
        y3 = cy + r * math.sin(a2)

        x1 = x0 - alpha * r * math.sin(a1)
        y1 = y0 + alpha * r * math.cos(a1)
        x2 = x3 + alpha * r * math.sin(a2)
        y2 = y3 - alpha * r * math.cos(a2)

        segments.append((x0, y0, x1, y1, x2, y2, x3, y3))

    return segments


def ellipse_arc_to_cubic(cx, cy, rx, ry, start_angle, end_angle):
    """Convert an elliptical arc to cubic bezier curves."""
    segments = []
    angle = end_angle - start_angle
    n = max(1, int(math.ceil(abs(angle) / (math.pi / 2))))
    da = angle / n

    for i in range(n):
        a1 = start_angle + i * da
        a2 = a1 + da
        alpha = 4.0 * math.tan(da / 4.0) / 3.0

        x0 = cx + rx * math.cos(a1)
        y0 = cy + ry * math.sin(a1)
        x3 = cx + rx * math.cos(a2)
        y3 = cy + ry * math.sin(a2)

        x1 = x0 - alpha * rx * math.sin(a1)
        y1 = y0 + alpha * ry * math.cos(a1)
        x2 = x3 + alpha * rx * math.sin(a2)
        y2 = y3 - alpha * ry * math.cos(a2)

        segments.append((x0, y0, x1, y1, x2, y2, x3, y3))

    return segments


def fmt(v):
    """Format a number to clean string."""
    if abs(v - round(v)) < 0.01:
        return str(int(round(v)))
    return f"{v:.2f}"


def build_apple_path(scale=1.0, offset_x=0, offset_y=0):
    """Build the Apple logo body path using geometric construction.

    The Apple logo body is approximately constructed from overlapping circles:
    - Two large circles form the left and right lobes of the body
    - The top has a concave notch where the two lobes meet
    - The bottom tapers to a point
    - The right side has a circular bite taken out

    This is an approximation using bezier curves shaped to match
    the real logo's proportions as closely as possible.
    """
    # Work in a 200x245 coordinate space, then scale
    # The Apple logo proportions: width ~170, height ~210 (body only, no leaf)
    # Reference: the logo is slightly taller than wide

    # Key points (approximate, based on the real logo's known geometry):
    # The logo has these key features:
    # 1. Two rounded lobes at top, separated by a V-notch
    # 2. Widest point is about 60% down
    # 3. Tapers to a rounded bottom
    # 4. Bite on right side is roughly circular, about 30% of body width

    # I'll define the outline as a series of points with cubic bezier curves
    # Going clockwise from the top-center notch

    # All coordinates in a normalized space, will be scaled at the end
    # Center of logo at x=100

    # Top center notch (the V between the two lobes)
    # The notch is at about x=100, y=22

    def s(x, y):
        """Scale and offset a point."""
        return (x * scale + offset_x, y * scale + offset_y)

    def p(x, y):
        return f"{fmt(x * scale + offset_x)} {fmt(y * scale + offset_y)}"

    # Build path data
    # The shape is defined clockwise from the notch at top center

    # Key coordinates (in 200-wide space):
    # Top notch: (100, 22)
    # Right lobe top: (~145, 8)
    # Right side widest: (~175, 100)
    # Bite center: (~170, 78), bite radius ~28
    # Right lower: (~165, 155)
    # Bottom point: (~108, 210)
    # Left lower: (~35, 155)
    # Left side widest: (~25, 100)
    # Left lobe top: (~55, 8)

    path = f"M {p(100, 22)} "

    # Right lobe: from notch up and right to the right lobe peak, then down
    path += f"C {p(112, 10)} {p(130, 2)} {p(148, 4)} "
    # Right lobe peak down to right side
    path += f"C {p(166, 6)} {p(180, 24)} {p(185, 50)} "
    # Right side upper (above bite)
    path += f"C {p(189, 70)} {p(188, 82)} {p(185, 92)} "

    # Bite area - the concavity on the right side
    # Bite is roughly centered at (178, 82), radius about 24
    # The bite curves inward then back out
    path += f"C {p(180, 100)} {p(168, 108)} {p(160, 112)} "
    path += f"C {p(152, 116)} {p(150, 122)} {p(153, 130)} "
    path += f"C {p(158, 140)} {p(168, 148)} {p(172, 158)} "

    # Right side lower, curving to bottom
    path += f"C {p(178, 172)} {p(174, 188)} {p(160, 200)} "
    # Bottom right to bottom center point
    path += f"C {p(148, 210)} {p(128, 218)} {p(112, 218)} "
    # Bottom center
    path += f"C {p(108, 218)} {p(104, 216)} {p(100, 212)} "
    # Bottom left
    path += f"C {p(96, 216)} {p(92, 218)} {p(88, 218)} "
    path += f"C {p(72, 218)} {p(52, 210)} {p(40, 200)} "

    # Left side lower
    path += f"C {p(26, 188)} {p(22, 172)} {p(28, 158)} "
    path += f"C {p(32, 148)} {p(38, 138)} {p(38, 125)} "
    # Left side upper
    path += f"C {p(38, 110)} {p(28, 95)} {p(20, 80)} "
    path += f"C {p(14, 68)} {p(12, 52)} {p(15, 40)} "

    # Left lobe: up to left lobe peak and back to notch
    path += f"C {p(20, 24)} {p(34, 6)} {p(52, 4)} "
    path += f"C {p(70, 2)} {p(88, 10)} {p(100, 22)} "

    path += "Z"

    return path


def build_leaf_path(scale=1.0, offset_x=0, offset_y=0):
    """Build the Apple logo leaf path."""
    def p(x, y):
        return f"{fmt(x * scale + offset_x)} {fmt(y * scale + offset_y)}"

    # Leaf starts from the notch, curves up and to the right
    # Leaf is roughly at a 30-40 degree angle, narrow and curved
    path = f"M {p(105, 20)} "
    path += f"C {p(110, 8)} {p(125, -12)} {p(142, -22)} "
    path += f"C {p(150, -27)} {p(158, -28)} {p(162, -26)} "
    path += f"C {p(158, -14)} {p(148, 0)} {p(135, 10)} "
    path += f"C {p(122, 20)} {p(110, 24)} {p(105, 20)} "
    path += "Z"

    return path


def main():
    scale = 1.8
    ox, oy = 20, 60  # offset to center in canvas

    body_d = build_apple_path(scale, ox, oy)
    leaf_d = build_leaf_path(scale, ox, oy)

    canvas_w = int(200 * scale + 40)
    canvas_h = int(245 * scale + 80)

    npng = f'''npng: "0.4"
canvas:
  width: {canvas_w}
  height: {canvas_h}
  background: "#FFFFFF"
layers:
  - name: "apple-body"
    elements:
      - type: path
        d: "{body_d}"
        fill: "#333333"

      - type: path
        d: "{leaf_d}"
        fill: "#333333"
'''

    out_path = sys.argv[1] if len(sys.argv) > 1 else "examples/18-apple-logo-v7.npng"
    with open(out_path, "w") as f:
        f.write(npng)
    print(f"Generated {out_path}")
    print(f"Canvas: {canvas_w}x{canvas_h}")


if __name__ == "__main__":
    main()
