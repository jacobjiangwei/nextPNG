#!/usr/bin/env python3
"""NewPNG renderer — reads .npng (YAML) files and renders to PNG via pycairo."""

import sys
import os
import math
import yaml
import cairo
import re
import ctypes
import struct

try:
    import pyclipper
    HAS_PYCLIPPER = True
except ImportError:
    HAS_PYCLIPPER = False


# --- Boolean operation helpers ---

CLIPPER_SCALE = 1000  # pyclipper uses integers; scale floats

def _path_to_polygons(d):
    """Convert SVG path data to list of polygon point lists for pyclipper."""
    commands = parse_path(d)
    polygons = []
    current = []
    cx, cy = 0, 0
    for cmd, args in commands:
        if cmd == 'M':
            if current:
                polygons.append(current)
            current = []
            for j in range(0, len(args), 2):
                cx, cy = args[j], args[j+1]
                current.append((int(cx * CLIPPER_SCALE), int(cy * CLIPPER_SCALE)))
        elif cmd == 'm':
            if current:
                polygons.append(current)
            current = []
            for j in range(0, len(args), 2):
                cx += args[j]; cy += args[j+1]
                current.append((int(cx * CLIPPER_SCALE), int(cy * CLIPPER_SCALE)))
        elif cmd == 'L':
            for j in range(0, len(args), 2):
                cx, cy = args[j], args[j+1]
                current.append((int(cx * CLIPPER_SCALE), int(cy * CLIPPER_SCALE)))
        elif cmd == 'l':
            for j in range(0, len(args), 2):
                cx += args[j]; cy += args[j+1]
                current.append((int(cx * CLIPPER_SCALE), int(cy * CLIPPER_SCALE)))
        elif cmd == 'H':
            for j in range(len(args)):
                cx = args[j]
                current.append((int(cx * CLIPPER_SCALE), int(cy * CLIPPER_SCALE)))
        elif cmd == 'h':
            for j in range(len(args)):
                cx += args[j]
                current.append((int(cx * CLIPPER_SCALE), int(cy * CLIPPER_SCALE)))
        elif cmd == 'V':
            for j in range(len(args)):
                cy = args[j]
                current.append((int(cx * CLIPPER_SCALE), int(cy * CLIPPER_SCALE)))
        elif cmd == 'v':
            for j in range(len(args)):
                cy += args[j]
                current.append((int(cx * CLIPPER_SCALE), int(cy * CLIPPER_SCALE)))
        elif cmd == 'C':
            for j in range(0, len(args), 6):
                # Flatten cubic bezier to line segments
                _flatten_cubic(current, cx, cy, args[j], args[j+1], args[j+2], args[j+3], args[j+4], args[j+5])
                cx, cy = args[j+4], args[j+5]
        elif cmd == 'c':
            for j in range(0, len(args), 6):
                _flatten_cubic(current, cx, cy, cx+args[j], cy+args[j+1], cx+args[j+2], cy+args[j+3], cx+args[j+4], cy+args[j+5])
                cx += args[j+4]; cy += args[j+5]
        elif cmd == 'Q':
            for j in range(0, len(args), 4):
                _flatten_quad(current, cx, cy, args[j], args[j+1], args[j+2], args[j+3])
                cx, cy = args[j+2], args[j+3]
        elif cmd == 'q':
            for j in range(0, len(args), 4):
                _flatten_quad(current, cx, cy, cx+args[j], cy+args[j+1], cx+args[j+2], cy+args[j+3])
                cx += args[j+2]; cy += args[j+3]
        elif cmd in ('Z', 'z'):
            if current:
                polygons.append(current)
                current = []
    if current:
        polygons.append(current)
    return polygons


def _flatten_cubic(pts, x0, y0, x1, y1, x2, y2, x3, y3, depth=0):
    """Flatten a cubic bezier into line segments."""
    if depth > 6:
        pts.append((int(x3 * CLIPPER_SCALE), int(y3 * CLIPPER_SCALE)))
        return
    # Check flatness
    dx = x3 - x0; dy = y3 - y0
    d = math.sqrt(dx*dx + dy*dy) if (dx*dx + dy*dy) > 0 else 1
    d1 = abs((x1 - x3) * dy - (y1 - y3) * dx) / d
    d2 = abs((x2 - x3) * dy - (y2 - y3) * dx) / d
    if d1 + d2 < 0.5:
        pts.append((int(x3 * CLIPPER_SCALE), int(y3 * CLIPPER_SCALE)))
        return
    # Subdivide
    mx01 = (x0+x1)/2; my01 = (y0+y1)/2
    mx12 = (x1+x2)/2; my12 = (y1+y2)/2
    mx23 = (x2+x3)/2; my23 = (y2+y3)/2
    mx012 = (mx01+mx12)/2; my012 = (my01+my12)/2
    mx123 = (mx12+mx23)/2; my123 = (my12+my23)/2
    mx0123 = (mx012+mx123)/2; my0123 = (my012+my123)/2
    _flatten_cubic(pts, x0, y0, mx01, my01, mx012, my012, mx0123, my0123, depth+1)
    _flatten_cubic(pts, mx0123, my0123, mx123, my123, mx23, my23, x3, y3, depth+1)


def _flatten_quad(pts, x0, y0, x1, y1, x2, y2, depth=0):
    """Flatten a quadratic bezier into line segments."""
    if depth > 6:
        pts.append((int(x2 * CLIPPER_SCALE), int(y2 * CLIPPER_SCALE)))
        return
    dx = x2 - x0; dy = y2 - y0
    d = math.sqrt(dx*dx + dy*dy) if (dx*dx + dy*dy) > 0 else 1
    dd = abs((x1 - x2) * dy - (y1 - y2) * dx) / d
    if dd < 0.5:
        pts.append((int(x2 * CLIPPER_SCALE), int(y2 * CLIPPER_SCALE)))
        return
    mx01 = (x0+x1)/2; my01 = (y0+y1)/2
    mx12 = (x1+x2)/2; my12 = (y1+y2)/2
    mx012 = (mx01+mx12)/2; my012 = (my01+my12)/2
    _flatten_quad(pts, x0, y0, mx01, my01, mx012, my012, depth+1)
    _flatten_quad(pts, mx012, my012, mx12, my12, x2, y2, depth+1)


def _shape_to_polygons(shape):
    """Convert a shape element dict to polygons for boolean ops."""
    stype = shape.get("type", "path")
    if stype == "path":
        return _path_to_polygons(shape.get("d", ""))
    elif stype == "rect":
        x, y = shape.get("x", 0), shape.get("y", 0)
        w, h = shape.get("width", 0), shape.get("height", 0)
        s = CLIPPER_SCALE
        return [[(int(x*s), int(y*s)), (int((x+w)*s), int(y*s)),
                 (int((x+w)*s), int((y+h)*s)), (int(x*s), int((y+h)*s))]]
    elif stype == "ellipse":
        cx_e = shape.get("cx", 0)
        cy_e = shape.get("cy", 0)
        rx_e = shape.get("rx", 0)
        ry_e = shape.get("ry", 0)
        n = 64
        pts = []
        for i in range(n):
            a = 2 * math.pi * i / n
            px = cx_e + rx_e * math.cos(a)
            py = cy_e + ry_e * math.sin(a)
            pts.append((int(px * CLIPPER_SCALE), int(py * CLIPPER_SCALE)))
        return [pts]
    return []


def _polygons_to_path_d(polygons):
    """Convert polygon point lists back to SVG path data string."""
    parts = []
    s = CLIPPER_SCALE
    for poly in polygons:
        if not poly:
            continue
        p0 = poly[0]
        parts.append(f"M {p0[0]/s:.2f} {p0[1]/s:.2f}")
        for pt in poly[1:]:
            parts.append(f"L {pt[0]/s:.2f} {pt[1]/s:.2f}")
        parts.append("Z")
    return " ".join(parts)


def boolean_op(op, subject_shapes, clip_shapes):
    """Perform a boolean operation. Returns SVG path data string."""
    if not HAS_PYCLIPPER:
        print("Warning: pyclipper not installed, boolean ops unavailable")
        return ""

    pc = pyclipper.Pyclipper()
    for shape in subject_shapes:
        polys = _shape_to_polygons(shape)
        for p in polys:
            if len(p) >= 3:
                pc.AddPath(p, pyclipper.PT_SUBJECT, True)

    for shape in clip_shapes:
        polys = _shape_to_polygons(shape)
        for p in polys:
            if len(p) >= 3:
                pc.AddPath(p, pyclipper.PT_CLIP, True)

    op_map = {
        "union": pyclipper.CT_UNION,
        "subtract": pyclipper.CT_DIFFERENCE,
        "intersect": pyclipper.CT_INTERSECTION,
        "exclude": pyclipper.CT_XOR,
    }
    ct = op_map.get(op, pyclipper.CT_UNION)
    result = pc.Execute(ct, pyclipper.PFT_NONZERO, pyclipper.PFT_NONZERO)
    return _polygons_to_path_d(result)


# --- Blend mode helpers (pixel-level compositing) ---

BLEND_MODES = {
    "normal", "multiply", "screen", "overlay", "darken", "lighten",
    "color-dodge", "color-burn", "hard-light", "soft-light",
    "difference", "exclusion",
}


def _blend_pixel(bc, fc, mode):
    """Blend a single channel (0-1 float). bc=base, fc=foreground."""
    if mode == "multiply":
        return bc * fc
    elif mode == "screen":
        return 1 - (1 - bc) * (1 - fc)
    elif mode == "overlay":
        if bc < 0.5:
            return 2 * bc * fc
        else:
            return 1 - 2 * (1 - bc) * (1 - fc)
    elif mode == "darken":
        return min(bc, fc)
    elif mode == "lighten":
        return max(bc, fc)
    elif mode == "color-dodge":
        if fc >= 1.0:
            return 1.0
        return min(1.0, bc / (1 - fc))
    elif mode == "color-burn":
        if fc <= 0.0:
            return 0.0
        return max(0.0, 1 - (1 - bc) / fc)
    elif mode == "hard-light":
        if fc < 0.5:
            return 2 * bc * fc
        else:
            return 1 - 2 * (1 - bc) * (1 - fc)
    elif mode == "soft-light":
        if fc <= 0.5:
            return bc - (1 - 2 * fc) * bc * (1 - bc)
        else:
            d = math.sqrt(bc) if bc > 0.25 else ((16 * bc - 12) * bc + 4) * bc
            return bc + (2 * fc - 1) * (d - bc)
    elif mode == "difference":
        return abs(bc - fc)
    elif mode == "exclusion":
        return bc + fc - 2 * bc * fc
    return fc  # normal


def blend_surfaces(base_surface, fg_surface, mode, opacity):
    """Blend fg_surface onto base_surface using the given blend mode and opacity."""
    w = base_surface.get_width()
    h = base_surface.get_height()
    base_surface.flush()
    fg_surface.flush()

    base_data = bytearray(base_surface.get_data())
    fg_data = bytes(fg_surface.get_data())
    stride = base_surface.get_stride()

    for y in range(h):
        for x in range(w):
            i = y * stride + x * 4
            # Cairo ARGB32 is stored as BGRA in memory on little-endian
            bb, bg, br, ba = base_data[i], base_data[i+1], base_data[i+2], base_data[i+3]
            fb, fg_b, fr, fa = fg_data[i], fg_data[i+1], fg_data[i+2], fg_data[i+3]

            if fa == 0:
                continue

            fa_f = (fa / 255.0) * opacity
            ba_f = ba / 255.0

            # Unpremultiply
            if fa > 0:
                fr_f = fr / fa if fa > 0 else 0
                fg_f = fg_b / fa if fa > 0 else 0
                fb_f = fb / fa if fa > 0 else 0
            else:
                fr_f = fg_f = fb_f = 0.0

            if ba > 0:
                br_f = br / ba if ba > 0 else 0
                bg_f = bg / ba if ba > 0 else 0
                bb_f = bb / ba if ba > 0 else 0
            else:
                br_f = bg_f = bb_f = 0.0

            # Blend
            cr = _blend_pixel(br_f, fr_f, mode)
            cg = _blend_pixel(bg_f, fg_f, mode)
            cb = _blend_pixel(bb_f, fb_f, mode)

            # Composite with alpha
            out_a = fa_f + ba_f * (1 - fa_f)
            if out_a > 0:
                out_r = (cr * fa_f + br_f * ba_f * (1 - fa_f)) / out_a
                out_g = (cg * fa_f + bg_f * ba_f * (1 - fa_f)) / out_a
                out_b = (cb * fa_f + bb_f * ba_f * (1 - fa_f)) / out_a
            else:
                out_r = out_g = out_b = 0.0

            oa = int(min(255, out_a * 255))
            # Re-premultiply for Cairo
            base_data[i] = int(min(255, out_b * oa))
            base_data[i+1] = int(min(255, out_g * oa))
            base_data[i+2] = int(min(255, out_r * oa))
            base_data[i+3] = oa

    # Write back
    ct = cairo.Context(base_surface)
    new_surf = cairo.ImageSurface.create_for_data(base_data, cairo.FORMAT_ARGB32, w, h, stride)
    ct.set_source_surface(new_surf, 0, 0)
    ct.set_operator(cairo.OPERATOR_SOURCE)
    ct.paint()


# --- Filter helpers ---

def apply_gaussian_blur(surface, radius):
    """Apply a simple box-blur approximation of gaussian blur (3 passes)."""
    if radius <= 0:
        return surface
    w = surface.get_width()
    h = surface.get_height()
    surface.flush()
    stride = surface.get_stride()
    src = bytearray(surface.get_data())

    r = max(1, int(radius))
    # 3-pass box blur approximation
    for _ in range(3):
        dst = bytearray(len(src))
        # Horizontal pass
        for y in range(h):
            for x in range(w):
                rr = gg = bb = aa = 0
                count = 0
                for dx in range(-r, r + 1):
                    nx = x + dx
                    if 0 <= nx < w:
                        idx = y * stride + nx * 4
                        bb += src[idx]
                        gg += src[idx + 1]
                        rr += src[idx + 2]
                        aa += src[idx + 3]
                        count += 1
                idx = y * stride + x * 4
                dst[idx] = bb // count
                dst[idx + 1] = gg // count
                dst[idx + 2] = rr // count
                dst[idx + 3] = aa // count
        src2 = bytearray(len(dst))
        # Vertical pass
        for y in range(h):
            for x in range(w):
                rr = gg = bb = aa = 0
                count = 0
                for dy in range(-r, r + 1):
                    ny = y + dy
                    if 0 <= ny < h:
                        idx = ny * stride + x * 4
                        bb += dst[idx]
                        gg += dst[idx + 1]
                        rr += dst[idx + 2]
                        aa += dst[idx + 3]
                        count += 1
                idx = y * stride + x * 4
                src2[idx] = bb // count
                src2[idx + 1] = gg // count
                src2[idx + 2] = rr // count
                src2[idx + 3] = aa // count
        src = src2

    result = cairo.ImageSurface.create_for_data(src, cairo.FORMAT_ARGB32, w, h, stride)
    return result


def apply_drop_shadow(surface, dx, dy, radius, color_str):
    """Create a drop shadow: offset copy with color, blurred, then composite original on top."""
    w = surface.get_width()
    h = surface.get_height()
    color = parse_color(color_str) if color_str else (0, 0, 0, 0.5)

    # Create shadow surface
    shadow = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h)
    sctx = cairo.Context(shadow)

    # Draw the original surface alpha as a solid-color shape, offset
    sctx.set_source_rgba(color[0], color[1], color[2], color[3])
    sctx.mask_surface(surface, dx, dy)

    # Blur the shadow
    if radius > 0:
        shadow = apply_gaussian_blur(shadow, radius)

    # Composite: shadow behind original
    result = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h)
    rctx = cairo.Context(result)
    rctx.set_source_surface(shadow, 0, 0)
    rctx.paint()
    rctx.set_source_surface(surface, 0, 0)
    rctx.paint()
    return result


def apply_filters(surface, filters):
    """Apply a list of filters to a surface."""
    for f in (filters or []):
        ftype = f.get("type", "")
        if ftype == "blur":
            surface = apply_gaussian_blur(surface, f.get("radius", 3))
        elif ftype == "drop-shadow":
            surface = apply_drop_shadow(
                surface,
                f.get("dx", 3), f.get("dy", 3),
                f.get("radius", 3), f.get("color", "#00000080")
            )
    return surface


def parse_color(color_str):
    """Parse hex color string to (r, g, b, a) floats 0-1."""
    if not color_str or color_str == "none" or color_str == "transparent":
        return None
    s = color_str.lstrip("#")
    if len(s) == 6:
        r, g, b = int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)
        return (r / 255.0, g / 255.0, b / 255.0, 1.0)
    elif len(s) == 8:
        r, g, b, a = int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), int(s[6:8], 16)
        return (r / 255.0, g / 255.0, b / 255.0, a / 255.0)
    elif len(s) == 3:
        r, g, b = int(s[0]*2, 16), int(s[1]*2, 16), int(s[2]*2, 16)
        return (r / 255.0, g / 255.0, b / 255.0, 1.0)
    return None


def apply_fill(ctx, fill_spec, elem=None):
    """Apply fill to current path. Returns True if fill was applied."""
    if fill_spec is None or fill_spec == "none":
        return False
    if isinstance(fill_spec, str):
        c = parse_color(fill_spec)
        if c:
            ctx.set_source_rgba(*c)
            return True
        return False
    if isinstance(fill_spec, dict):
        ftype = fill_spec.get("type", "")
        if ftype == "linear-gradient":
            x1 = fill_spec.get("x1", 0)
            y1 = fill_spec.get("y1", 0)
            x2 = fill_spec.get("x2", 0)
            y2 = fill_spec.get("y2", 0)
            pat = cairo.LinearGradient(x1, y1, x2, y2)
            for stop in fill_spec.get("stops", []):
                c = parse_color(stop["color"])
                if c:
                    pat.add_color_stop_rgba(stop["offset"], *c)
            ctx.set_source(pat)
            return True
        elif ftype == "radial-gradient":
            cx = fill_spec.get("cx", 0)
            cy = fill_spec.get("cy", 0)
            r = fill_spec.get("r", 50)
            pat = cairo.RadialGradient(cx, cy, 0, cx, cy, r)
            for stop in fill_spec.get("stops", []):
                c = parse_color(stop["color"])
                if c:
                    pat.add_color_stop_rgba(stop["offset"], *c)
            ctx.set_source(pat)
            return True
    return False


def apply_stroke(ctx, stroke_spec):
    """Apply stroke to current path."""
    if not stroke_spec:
        return
    color = parse_color(stroke_spec.get("color", "#000000"))
    if color:
        ctx.set_source_rgba(*color)
    ctx.set_line_width(stroke_spec.get("width", 1))
    dash = stroke_spec.get("dash")
    if dash:
        ctx.set_dash(dash)
    else:
        ctx.set_dash([])
    cap = stroke_spec.get("cap", "butt")
    cap_map = {"butt": cairo.LINE_CAP_BUTT, "round": cairo.LINE_CAP_ROUND, "square": cairo.LINE_CAP_SQUARE}
    ctx.set_line_cap(cap_map.get(cap, cairo.LINE_CAP_BUTT))
    join = stroke_spec.get("join", "miter")
    join_map = {"miter": cairo.LINE_JOIN_MITER, "round": cairo.LINE_JOIN_ROUND, "bevel": cairo.LINE_JOIN_BEVEL}
    ctx.set_line_join(join_map.get(join, cairo.LINE_JOIN_MITER))
    ctx.stroke()


def apply_transform(ctx, transform):
    """Apply transform dict to context."""
    if not transform:
        return
    if "translate" in transform:
        tx, ty = transform["translate"]
        ctx.translate(tx, ty)
    if "rotate" in transform:
        deg = transform["rotate"]
        ctx.rotate(deg * math.pi / 180.0)
    if "scale" in transform:
        s = transform["scale"]
        if isinstance(s, (list, tuple)):
            ctx.scale(s[0], s[1])
        else:
            ctx.scale(s, s)


def parse_path(d):
    """Parse SVG path data string into a list of commands."""
    tokens = re.findall(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)
    commands = []
    i = 0
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            args = []
            while i < len(tokens) and not tokens[i].isalpha():
                args.append(float(tokens[i]))
                i += 1
            commands.append((cmd, args))
        else:
            i += 1
    return commands


def trace_path(ctx, d):
    """Trace an SVG path onto the cairo context."""
    commands = parse_path(d)
    cx, cy = 0, 0
    last_cmd = None
    last_cp = None   # last cubic control point (for S/s)
    last_qp = None   # last quadratic control point (for T/t)
    for cmd, args in commands:
        if cmd == 'M':
            for j in range(0, len(args), 2):
                if j == 0:
                    ctx.move_to(args[j], args[j+1])
                else:
                    ctx.line_to(args[j], args[j+1])
                cx, cy = args[j], args[j+1]
        elif cmd == 'm':
            for j in range(0, len(args), 2):
                cx += args[j]
                cy += args[j+1]
                if j == 0:
                    ctx.move_to(cx, cy)
                else:
                    ctx.line_to(cx, cy)
        elif cmd == 'L':
            for j in range(0, len(args), 2):
                ctx.line_to(args[j], args[j+1])
                cx, cy = args[j], args[j+1]
        elif cmd == 'l':
            for j in range(0, len(args), 2):
                cx += args[j]
                cy += args[j+1]
                ctx.line_to(cx, cy)
        elif cmd == 'H':
            for j in range(len(args)):
                cx = args[j]
                ctx.line_to(cx, cy)
        elif cmd == 'h':
            for j in range(len(args)):
                cx += args[j]
                ctx.line_to(cx, cy)
        elif cmd == 'V':
            for j in range(len(args)):
                cy = args[j]
                ctx.line_to(cx, cy)
        elif cmd == 'v':
            for j in range(len(args)):
                cy += args[j]
                ctx.line_to(cx, cy)
        elif cmd == 'C':
            for j in range(0, len(args), 6):
                ctx.curve_to(args[j], args[j+1], args[j+2], args[j+3], args[j+4], args[j+5])
                last_cp = (args[j+2], args[j+3])
                cx, cy = args[j+4], args[j+5]
        elif cmd == 'c':
            for j in range(0, len(args), 6):
                ctx.curve_to(cx+args[j], cy+args[j+1], cx+args[j+2], cy+args[j+3], cx+args[j+4], cy+args[j+5])
                last_cp = (cx+args[j+2], cy+args[j+3])
                cx += args[j+4]
                cy += args[j+5]
        elif cmd == 'Q':
            # Quadratic bezier — convert to cubic
            for j in range(0, len(args), 4):
                qx1, qy1, qx2, qy2 = args[j], args[j+1], args[j+2], args[j+3]
                cp1x = cx + 2.0/3.0 * (qx1 - cx)
                cp1y = cy + 2.0/3.0 * (qy1 - cy)
                cp2x = qx2 + 2.0/3.0 * (qx1 - qx2)
                cp2y = qy2 + 2.0/3.0 * (qy1 - qy2)
                ctx.curve_to(cp1x, cp1y, cp2x, cp2y, qx2, qy2)
                last_qp = (qx1, qy1)
                cx, cy = qx2, qy2
        elif cmd == 'q':
            for j in range(0, len(args), 4):
                qx1 = cx + args[j]
                qy1 = cy + args[j+1]
                qx2 = cx + args[j+2]
                qy2 = cy + args[j+3]
                cp1x = cx + 2.0/3.0 * (qx1 - cx)
                cp1y = cy + 2.0/3.0 * (qy1 - cy)
                cp2x = qx2 + 2.0/3.0 * (qx1 - qx2)
                cp2y = qy2 + 2.0/3.0 * (qy1 - qy2)
                ctx.curve_to(cp1x, cp1y, cp2x, cp2y, qx2, qy2)
                last_qp = (qx1, qy1)
                cx, cy = qx2, qy2
        elif cmd in ('Z', 'z'):
            ctx.close_path()
        elif cmd in ('S', 's'):
            # Smooth cubic bezier
            for j in range(0, len(args), 4):
                # Reflect last cubic control point
                if last_cmd in ('C', 'c', 'S', 's') and last_cp is not None:
                    cp1x = 2 * cx - last_cp[0]
                    cp1y = 2 * cy - last_cp[1]
                else:
                    cp1x, cp1y = cx, cy
                if cmd == 'S':
                    cp2x, cp2y = args[j], args[j+1]
                    ex, ey = args[j+2], args[j+3]
                else:
                    cp2x, cp2y = cx + args[j], cy + args[j+1]
                    ex, ey = cx + args[j+2], cy + args[j+3]
                ctx.curve_to(cp1x, cp1y, cp2x, cp2y, ex, ey)
                last_cp = (cp2x, cp2y)
                cx, cy = ex, ey
            last_cmd = cmd
            continue
        elif cmd in ('T', 't'):
            # Smooth quadratic bezier
            for j in range(0, len(args), 2):
                if last_cmd in ('Q', 'q', 'T', 't') and last_qp is not None:
                    qx1 = 2 * cx - last_qp[0]
                    qy1 = 2 * cy - last_qp[1]
                else:
                    qx1, qy1 = cx, cy
                if cmd == 'T':
                    ex, ey = args[j], args[j+1]
                else:
                    ex, ey = cx + args[j], cy + args[j+1]
                # Convert quadratic to cubic
                cp1x = cx + 2.0/3.0 * (qx1 - cx)
                cp1y = cy + 2.0/3.0 * (qy1 - cy)
                cp2x = ex + 2.0/3.0 * (qx1 - ex)
                cp2y = ey + 2.0/3.0 * (qy1 - ey)
                ctx.curve_to(cp1x, cp1y, cp2x, cp2y, ex, ey)
                last_qp = (qx1, qy1)
                cx, cy = ex, ey
            last_cmd = cmd
            continue
        elif cmd == 'A' or cmd == 'a':
            # SVG arc: endpoint parameterization to center parameterization
            j = 0
            while j + 6 < len(args):
                rx_a = abs(args[j]); ry_a = abs(args[j+1])
                phi = args[j+2] * math.pi / 180.0
                large_arc = int(args[j+3])
                sweep = int(args[j+4])
                ex, ey = args[j+5], args[j+6]
                if cmd == 'a':
                    ex += cx; ey += cy

                if rx_a == 0 or ry_a == 0:
                    ctx.line_to(ex, ey)
                    cx, cy = ex, ey
                    j += 7
                    continue

                # Step 1: Transform to unit circle space
                cos_phi = math.cos(phi)
                sin_phi = math.sin(phi)
                dx2 = (cx - ex) / 2.0
                dy2 = (cy - ey) / 2.0
                x1p = cos_phi * dx2 + sin_phi * dy2
                y1p = -sin_phi * dx2 + cos_phi * dy2

                # Step 2: Correct radii
                x1p2 = x1p * x1p
                y1p2 = y1p * y1p
                rx2 = rx_a * rx_a
                ry2 = ry_a * ry_a
                lam = x1p2 / rx2 + y1p2 / ry2
                if lam > 1:
                    s = math.sqrt(lam)
                    rx_a *= s; ry_a *= s
                    rx2 = rx_a * rx_a; ry2 = ry_a * ry_a

                # Step 3: Center point
                num = max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2)
                den = rx2 * y1p2 + ry2 * x1p2
                sq = math.sqrt(num / den) if den > 0 else 0
                if large_arc == sweep:
                    sq = -sq
                cxp = sq * rx_a * y1p / ry_a
                cyp = -sq * ry_a * x1p / rx_a
                cx_arc = cos_phi * cxp - sin_phi * cyp + (cx + ex) / 2.0
                cy_arc = sin_phi * cxp + cos_phi * cyp + (cy + ey) / 2.0

                # Step 4: Compute angles
                def angle_vec(ux, uy, vx, vy):
                    n = math.sqrt(ux*ux + uy*uy) * math.sqrt(vx*vx + vy*vy)
                    if n == 0: return 0
                    c = max(-1, min(1, (ux*vx + uy*vy) / n))
                    a = math.acos(c)
                    if ux * vy - uy * vx < 0:
                        a = -a
                    return a

                theta1 = angle_vec(1, 0, (x1p - cxp) / rx_a, (y1p - cyp) / ry_a)
                dtheta = angle_vec(
                    (x1p - cxp) / rx_a, (y1p - cyp) / ry_a,
                    (-x1p - cxp) / rx_a, (-y1p - cyp) / ry_a
                )
                if sweep == 0 and dtheta > 0:
                    dtheta -= 2 * math.pi
                elif sweep == 1 and dtheta < 0:
                    dtheta += 2 * math.pi

                # Draw arc using cairo with transform
                ctx.save()
                ctx.translate(cx_arc, cy_arc)
                ctx.rotate(phi)
                ctx.scale(rx_a, ry_a)
                if sweep == 1:
                    ctx.arc(0, 0, 1, theta1, theta1 + dtheta)
                else:
                    ctx.arc_negative(0, 0, 1, theta1, theta1 + dtheta)
                ctx.restore()

                cx, cy = ex, ey
                j += 7
        last_cmd = cmd


def render_element(ctx, elem):
    """Render a single element."""
    etype = elem.get("type")
    fill = elem.get("fill")
    stroke = elem.get("stroke")
    transform = elem.get("transform")
    elem_opacity = elem.get("opacity", 1.0)

    ctx.save()

    # Per-element opacity: render to group then paint with alpha
    if elem_opacity < 1.0:
        ctx.push_group()

    if transform:
        origin = transform.get("origin")
        if origin:
            ox, oy = origin
            ctx.translate(ox, oy)
            apply_transform(ctx, transform)
            ctx.translate(-ox, -oy)
        else:
            apply_transform(ctx, transform)

    if etype == "rect":
        x, y = elem.get("x", 0), elem.get("y", 0)
        w, h = elem.get("width", 0), elem.get("height", 0)
        rx, ry = elem.get("rx", 0), elem.get("ry", 0)
        if rx > 0 or ry > 0:
            r = max(rx, ry)
            ctx.new_sub_path()
            ctx.arc(x + w - r, y + r, r, -math.pi/2, 0)
            ctx.arc(x + w - r, y + h - r, r, 0, math.pi/2)
            ctx.arc(x + r, y + h - r, r, math.pi/2, math.pi)
            ctx.arc(x + r, y + r, r, math.pi, 3*math.pi/2)
            ctx.close_path()
        else:
            ctx.rectangle(x, y, w, h)
        if apply_fill(ctx, fill, elem):
            if stroke:
                ctx.fill_preserve()
            else:
                ctx.fill()
        if stroke:
            apply_stroke(ctx, stroke)

    elif etype == "ellipse":
        cx_e = elem.get("cx", 0)
        cy_e = elem.get("cy", 0)
        rx_e = elem.get("rx", 0)
        ry_e = elem.get("ry", 0)
        ctx.save()
        ctx.translate(cx_e, cy_e)
        ctx.scale(rx_e, ry_e)
        ctx.arc(0, 0, 1, 0, 2 * math.pi)
        ctx.restore()
        if apply_fill(ctx, fill, elem):
            if stroke:
                ctx.fill_preserve()
            else:
                ctx.fill()
        if stroke:
            apply_stroke(ctx, stroke)

    elif etype == "line":
        ctx.move_to(elem.get("x1", 0), elem.get("y1", 0))
        ctx.line_to(elem.get("x2", 0), elem.get("y2", 0))
        if stroke:
            apply_stroke(ctx, stroke)
        else:
            ctx.set_source_rgba(0, 0, 0, 1)
            ctx.set_line_width(1)
            ctx.stroke()

    elif etype == "text":
        x, y = elem.get("x", 0), elem.get("y", 0)
        content = elem.get("content", "")
        font_size = elem.get("font_size", 16)
        font_family = elem.get("font_family", "sans-serif")
        font_weight = elem.get("font_weight", "normal")
        align = elem.get("align", "left")

        slant = cairo.FONT_SLANT_NORMAL
        weight = cairo.FONT_WEIGHT_BOLD if font_weight == "bold" else cairo.FONT_WEIGHT_NORMAL
        ctx.select_font_face(font_family, slant, weight)
        ctx.set_font_size(font_size)

        extents = ctx.text_extents(content)
        tx = x
        if align == "center":
            tx = x - extents.width / 2
        elif align == "right":
            tx = x - extents.width

        ctx.move_to(tx, y)
        if apply_fill(ctx, fill, elem):
            ctx.show_text(content)
        else:
            ctx.set_source_rgba(0, 0, 0, 1)
            ctx.show_text(content)

    elif etype == "path":
        d = elem.get("d", "")
        fill_rule = elem.get("fill_rule", "nonzero")
        if fill_rule == "evenodd":
            ctx.set_fill_rule(cairo.FILL_RULE_EVEN_ODD)
        else:
            ctx.set_fill_rule(cairo.FILL_RULE_WINDING)
        trace_path(ctx, d)
        if apply_fill(ctx, fill, elem):
            if stroke:
                ctx.fill_preserve()
            else:
                ctx.fill()
        if stroke:
            apply_stroke(ctx, stroke)

    elif etype == "group":
        for child in elem.get("elements", []):
            render_element(ctx, child)

    elif etype == "boolean":
        op = elem.get("op", "union")
        subjects = elem.get("subjects", [])
        clips = elem.get("clips", [])
        result_d = boolean_op(op, subjects, clips)
        if result_d:
            fill_rule = elem.get("fill_rule", "nonzero")
            if fill_rule == "evenodd":
                ctx.set_fill_rule(cairo.FILL_RULE_EVEN_ODD)
            else:
                ctx.set_fill_rule(cairo.FILL_RULE_WINDING)
            trace_path(ctx, result_d)
            if apply_fill(ctx, fill, elem):
                if stroke:
                    ctx.fill_preserve()
                else:
                    ctx.fill()
            if stroke:
                apply_stroke(ctx, stroke)

    # Per-element opacity: composite group with alpha
    if elem_opacity < 1.0:
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(elem_opacity)

    ctx.restore()


def render_npng(data, output_path):
    """Render an npng document to PNG."""
    canvas = data.get("canvas", {})
    width = canvas.get("width", 800)
    height = canvas.get("height", 600)
    bg = canvas.get("background", "transparent")

    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)

    # Background
    bg_color = parse_color(bg)
    if bg_color:
        ctx.set_source_rgba(*bg_color)
        ctx.paint()

    # Resolve defs for component references (v0.3)
    defs = {}
    for d in data.get("defs", []):
        did = d.get("id")
        if did:
            defs[did] = d

    # Render layers
    for layer in data.get("layers", []):
        if not layer.get("visible", True):
            continue
        opacity = layer.get("opacity", 1.0)
        blend_mode = layer.get("blend_mode", "normal")
        layer_filters = layer.get("filters")
        clip_path = layer.get("clip_path")
        mask_ref = layer.get("mask")

        # Always render layer to its own surface for blend/filter support
        layer_surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
        layer_ctx = cairo.Context(layer_surface)

        # Apply clipping path if present (v0.3)
        if clip_path:
            trace_path(layer_ctx, clip_path)
            layer_ctx.clip()

        for elem in layer.get("elements", []):
            # Handle "use" references (v0.3)
            if elem.get("type") == "use":
                ref_id = elem.get("ref")
                if ref_id and ref_id in defs:
                    ref_elem = dict(defs[ref_id])
                    # Override position if specified
                    for k in ("x", "y", "cx", "cy", "transform"):
                        if k in elem:
                            ref_elem[k] = elem[k]
                    render_element(layer_ctx, ref_elem)
                continue
            render_element(layer_ctx, elem)

        # Apply filters (v0.2)
        if layer_filters:
            layer_surface = apply_filters(layer_surface, layer_filters)

        # Apply mask (v0.3) — mask is a grayscale surface; white = visible
        if mask_ref and mask_ref in defs:
            mask_def = defs[mask_ref]
            mask_surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
            mask_ctx = cairo.Context(mask_surface)
            for melem in mask_def.get("elements", []):
                render_element(mask_ctx, melem)
            # Use mask alpha to modulate layer alpha
            layer_surface.flush()
            mask_surface.flush()
            ld = bytearray(layer_surface.get_data())
            md = bytes(mask_surface.get_data())
            ls = layer_surface.get_stride()
            for y2 in range(height):
                for x2 in range(width):
                    idx = y2 * ls + x2 * 4
                    ma = md[idx + 3] / 255.0
                    ld[idx] = int(ld[idx] * ma)
                    ld[idx+1] = int(ld[idx+1] * ma)
                    ld[idx+2] = int(ld[idx+2] * ma)
                    ld[idx+3] = int(ld[idx+3] * ma)
            masked = cairo.ImageSurface.create_for_data(ld, cairo.FORMAT_ARGB32, width, height, ls)
            layer_surface = masked

        # Composite layer onto main surface
        if blend_mode != "normal" and blend_mode in BLEND_MODES:
            blend_surfaces(surface, layer_surface, blend_mode, opacity)
        else:
            ctx.set_source_surface(layer_surface, 0, 0)
            ctx.paint_with_alpha(opacity)

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    surface.write_to_png(output_path)
    print(f"Rendered: {output_path}")
    return output_path


def main():
    if len(sys.argv) < 2:
        print("Usage: render.py <input.npng> [output.png]")
        sys.exit(1)

    input_path = sys.argv[1]
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        base = os.path.splitext(os.path.basename(input_path))[0]
        output_path = f"/tmp/newpng-renders/{base}.png"

    with open(input_path) as f:
        data = yaml.safe_load(f)

    render_npng(data, output_path)


if __name__ == "__main__":
    main()
