#!/usr/bin/env python3
"""SVG to NewPNG converter.

Converts simple SVG files into .npng (YAML) format.
Handles: paths, rects, circles, ellipses, groups, transforms, fills, strokes.

Usage: python3 tools/svg2npng.py input.svg [output.npng]
"""

import sys
import os
import re
import xml.etree.ElementTree as ET
import yaml

SVG_NS = "http://www.w3.org/2000/svg"


def strip_ns(tag):
    """Remove XML namespace from tag name."""
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def parse_color(val):
    """Parse SVG color value to hex string."""
    if not val or val == "none":
        return val
    val = val.strip()
    if val.startswith("#"):
        return val.upper()
    # Named colors (common ones)
    named = {
        "black": "#000000", "white": "#FFFFFF", "red": "#FF0000",
        "green": "#008000", "blue": "#0000FF", "yellow": "#FFFF00",
        "orange": "#FFA500", "purple": "#800080", "gray": "#808080",
        "grey": "#808080", "none": "none",
    }
    if val.lower() in named:
        return named[val.lower()]
    # rgb(r,g,b)
    m = re.match(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", val)
    if m:
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"#{r:02X}{g:02X}{b:02X}"
    return val


def parse_transform(t):
    """Parse SVG transform string. Returns npng transform dict or None."""
    if not t:
        return None
    result = {}
    # translate(x, y)
    m = re.search(r"translate\(\s*([^,\s]+)[\s,]+([^)]+)\)", t)
    if m:
        result["translate"] = [float(m.group(1)), float(m.group(2))]
    # rotate(angle) or rotate(angle, cx, cy)
    m = re.search(r"rotate\(\s*([^,\s)]+)(?:[\s,]+([^,\s]+)[\s,]+([^)]+))?\)", t)
    if m:
        result["rotate"] = float(m.group(1))
        if m.group(2) and m.group(3):
            result["origin"] = [float(m.group(2)), float(m.group(3))]
    # scale(sx, sy) or scale(s)
    m = re.search(r"scale\(\s*([^,\s)]+)(?:[\s,]+([^)]+))?\)", t)
    if m:
        sx = float(m.group(1))
        sy = float(m.group(2)) if m.group(2) else sx
        result["scale"] = [sx, sy]
    return result if result else None


def parse_style(style_str):
    """Parse CSS style string into dict."""
    if not style_str:
        return {}
    props = {}
    for part in style_str.split(";"):
        part = part.strip()
        if ":" in part:
            k, v = part.split(":", 1)
            props[k.strip()] = v.strip()
    return props


def get_attr(el, name, style=None):
    """Get attribute from element or its style."""
    if style and name in style:
        return style[name]
    return el.get(name)


def convert_element(el, style_override=None):
    """Convert an SVG element to npng element dict."""
    tag = strip_ns(el.tag)
    style = parse_style(el.get("style", ""))
    if style_override:
        style.update(style_override)

    elem = {}
    fill = get_attr(el, "fill", style)
    stroke_color = get_attr(el, "stroke", style)
    stroke_width = get_attr(el, "stroke-width", style)
    opacity = get_attr(el, "opacity", style)
    fill_opacity = get_attr(el, "fill-opacity", style)
    transform = el.get("transform")

    if tag == "path":
        d = el.get("d", "")
        elem["type"] = "path"
        elem["d"] = d
        fill_rule = get_attr(el, "fill-rule", style)
        if fill_rule == "evenodd":
            elem["fill_rule"] = "evenodd"
    elif tag == "rect":
        elem["type"] = "rect"
        elem["x"] = float(el.get("x", 0))
        elem["y"] = float(el.get("y", 0))
        elem["width"] = float(el.get("width", 0))
        elem["height"] = float(el.get("height", 0))
        rx = el.get("rx")
        ry = el.get("ry")
        if rx:
            elem["rx"] = float(rx)
        if ry:
            elem["ry"] = float(ry)
    elif tag == "circle":
        elem["type"] = "ellipse"
        elem["cx"] = float(el.get("cx", 0))
        elem["cy"] = float(el.get("cy", 0))
        r = float(el.get("r", 0))
        elem["rx"] = r
        elem["ry"] = r
    elif tag == "ellipse":
        elem["type"] = "ellipse"
        elem["cx"] = float(el.get("cx", 0))
        elem["cy"] = float(el.get("cy", 0))
        elem["rx"] = float(el.get("rx", 0))
        elem["ry"] = float(el.get("ry", 0))
    elif tag == "line":
        elem["type"] = "line"
        elem["x1"] = float(el.get("x1", 0))
        elem["y1"] = float(el.get("y1", 0))
        elem["x2"] = float(el.get("x2", 0))
        elem["y2"] = float(el.get("y2", 0))
    elif tag == "polygon":
        points = el.get("points", "").strip()
        if points:
            d = "M " + " L ".join(points.split()) + " Z"
            elem["type"] = "path"
            elem["d"] = d
    elif tag == "polyline":
        points = el.get("points", "").strip()
        if points:
            d = "M " + " L ".join(points.split())
            elem["type"] = "path"
            elem["d"] = d
    elif tag == "text":
        elem["type"] = "text"
        elem["x"] = float(el.get("x", 0))
        elem["y"] = float(el.get("y", 0))
        elem["content"] = (el.text or "").strip()
        font_size = get_attr(el, "font-size", style)
        if font_size:
            elem["font_size"] = float(re.sub(r"px$", "", font_size))
    elif tag == "g":
        children = []
        for child in el:
            c = convert_element(child, style)
            if c:
                children.append(c)
        if children:
            return {"type": "group", "elements": children}
        return None
    else:
        return None

    # Apply fill
    if fill and fill != "none":
        elem["fill"] = parse_color(fill)
    elif fill == "none":
        elem["fill"] = "none"

    # Apply stroke
    if stroke_color and stroke_color != "none":
        s = {"color": parse_color(stroke_color)}
        if stroke_width:
            s["width"] = float(stroke_width)
        elem["stroke"] = s

    # Apply opacity
    if opacity and float(opacity) < 1.0:
        elem["opacity"] = float(opacity)

    # Apply transform
    t = parse_transform(transform)
    if t:
        elem["transform"] = t

    return elem


def convert_svg(svg_path):
    """Convert SVG file to npng dict."""
    tree = ET.parse(svg_path)
    root = tree.getroot()

    # Get canvas dimensions
    width = float(root.get("width", "400").replace("px", ""))
    height = float(root.get("height", "400").replace("px", ""))

    # Check viewBox
    viewbox = root.get("viewBox")
    if viewbox and (root.get("width") is None):
        parts = viewbox.split()
        if len(parts) == 4:
            width = float(parts[2])
            height = float(parts[3])

    npng = {
        "npng": "0.4",
        "canvas": {
            "width": int(width),
            "height": int(height),
            "background": "#FFFFFF",
        },
        "layers": [],
    }

    elements = []
    for child in root:
        tag = strip_ns(child.tag)
        if tag in ("defs", "metadata", "title", "desc"):
            continue
        elem = convert_element(child)
        if elem:
            elements.append(elem)

    if elements:
        npng["layers"].append({"name": "main", "elements": elements})

    return npng


def npng_to_yaml(npng):
    """Convert npng dict to clean YAML string."""
    # Custom representer to handle multiline path data nicely
    class Dumper(yaml.Dumper):
        pass

    def str_representer(dumper, data):
        if "\n" in data:
            return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')

    Dumper.add_representer(str, str_representer)

    return yaml.dump(npng, Dumper=Dumper, default_flow_style=False, sort_keys=False)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 tools/svg2npng.py input.svg [output.npng]")
        sys.exit(1)

    svg_path = sys.argv[1]
    if len(sys.argv) >= 3:
        out_path = sys.argv[2]
    else:
        out_path = os.path.splitext(svg_path)[0] + ".npng"

    npng = convert_svg(svg_path)
    yaml_str = npng_to_yaml(npng)

    with open(out_path, "w") as f:
        f.write(yaml_str)

    print(f"Converted {svg_path} → {out_path}")
    n_elements = sum(len(l.get("elements", [])) for l in npng.get("layers", []))
    print(f"  Canvas: {npng['canvas']['width']}x{npng['canvas']['height']}")
    print(f"  Elements: {n_elements}")


if __name__ == "__main__":
    main()
