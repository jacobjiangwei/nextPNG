"use client";

import { useCallback } from "react";

const EXAMPLES: { name: string; category: string; yaml: string }[] = [
  {
    name: "Hello World",
    category: "Basic",
    yaml: `npng: "0.1"
canvas:
  width: 400
  height: 300
  background: "#FFFFFF"
layers:
  - name: "shapes"
    elements:
      - type: rect
        x: 30
        y: 30
        width: 120
        height: 80
        fill: "#E74C3C"
      - type: ellipse
        cx: 280
        cy: 100
        rx: 60
        ry: 40
        fill: "#3498DB"
      - type: rect
        x: 100
        y: 160
        width: 200
        height: 100
        rx: 15
        ry: 15
        fill: "#2ECC71"
      - type: text
        x: 200
        y: 240
        content: "Hello nextPNG!"
        font_size: 20
        font_family: "sans-serif"
        font_weight: "bold"
        fill: "#FFFFFF"
        align: "center"`,
  },
  {
    name: "Gradient Star",
    category: "Basic",
    yaml: `npng: "0.1"
canvas:
  width: 400
  height: 400
  background: "#1A1A2E"
layers:
  - name: "star"
    elements:
      - type: path
        d: "M 200 50 L 230 140 L 325 140 L 248 195 L 275 285 L 200 232 L 125 285 L 152 195 L 75 140 L 170 140 Z"
        fill:
          type: linear-gradient
          x1: 75
          y1: 50
          x2: 325
          y2: 285
          stops:
            - offset: 0
              color: "#FFD700"
            - offset: 1
              color: "#FF8C00"
        stroke:
          color: "#B8860B"
          width: 2`,
  },
  {
    name: "Layer Opacity",
    category: "Basic",
    yaml: `npng: "0.1"
canvas:
  width: 400
  height: 400
  background: "#1A1A2E"
layers:
  - name: "background-shapes"
    opacity: 0.3
    elements:
      - type: ellipse
        cx: 100
        cy: 100
        rx: 150
        ry: 150
        fill: "#E94560"
      - type: ellipse
        cx: 300
        cy: 300
        rx: 150
        ry: 150
        fill: "#0F3460"
  - name: "main-content"
    elements:
      - type: rect
        x: 50
        y: 50
        width: 300
        height: 300
        rx: 20
        ry: 20
        fill: "#16213E80"
        stroke:
          color: "#E94560"
          width: 2
      - type: text
        x: 200
        y: 200
        content: "Layers"
        font_size: 48
        font_family: "sans-serif"
        font_weight: "bold"
        fill: "#FFFFFF"
        align: "center"`,
  },
  {
    name: "Transforms",
    category: "Basic",
    yaml: `npng: "0.1"
canvas:
  width: 400
  height: 400
  background: "#FFFFFF"
layers:
  - name: "pinwheel"
    elements:
      - type: rect
        x: -60
        y: -10
        width: 120
        height: 20
        fill: "#E74C3C"
        transform:
          translate: [200, 200]
          rotate: 0
      - type: rect
        x: -60
        y: -10
        width: 120
        height: 20
        fill: "#3498DB"
        transform:
          translate: [200, 200]
          rotate: 45
      - type: rect
        x: -60
        y: -10
        width: 120
        height: 20
        fill: "#2ECC71"
        transform:
          translate: [200, 200]
          rotate: 90
      - type: rect
        x: -60
        y: -10
        width: 120
        height: 20
        fill: "#F39C12"
        transform:
          translate: [200, 200]
          rotate: 135
      - type: ellipse
        cx: 0
        cy: 0
        rx: 15
        ry: 15
        fill: "#2C3E50"
        transform:
          translate: [200, 200]`,
  },
  {
    name: "Minimal Logo",
    category: "Logo",
    yaml: `npng: "0.4"
canvas:
  width: 400
  height: 400
  background: "#FFFFFF"
layers:
  - name: "logo mark"
    elements:
      - type: ellipse
        cx: 200
        cy: 180
        rx: 80
        ry: 80
        fill:
          type: linear-gradient
          x1: 120
          y1: 100
          x2: 280
          y2: 260
          stops:
            - offset: 0
              color: "#6366F1"
            - offset: 1
              color: "#8B5CF6"
      - type: rect
        x: 170
        y: 160
        width: 60
        height: 60
        rx: 8
        fill: "#FFFFFF"
        transform:
          rotate: 45
          origin: [200, 190]
  - name: "wordmark"
    elements:
      - type: text
        x: 200
        y: 310
        content: "BRAND"
        font_size: 36
        font_family: "Montserrat"
        font_weight: "700"
        fill: "#1E1B4B"
        align: "center"
      - type: text
        x: 200
        y: 340
        content: "STUDIO"
        font_size: 14
        font_family: "Inter"
        font_weight: "400"
        fill: "#6B7280"
        align: "center"`,
  },
  {
    name: "App Icon",
    category: "Icon",
    yaml: `npng: "0.4"
canvas:
  width: 256
  height: 256
  background: "transparent"
layers:
  - name: "background"
    elements:
      - type: rect
        x: 16
        y: 16
        width: 224
        height: 224
        rx: 48
        fill:
          type: linear-gradient
          x1: 16
          y1: 16
          x2: 240
          y2: 240
          stops:
            - offset: 0
              color: "#F59E0B"
            - offset: 1
              color: "#EF4444"
  - name: "icon shape"
    elements:
      - type: path
        d: "M 128 60 L 96 108 L 160 108 Z"
        fill: "#FFFFFF"
      - type: rect
        x: 104
        y: 116
        width: 48
        height: 80
        rx: 6
        fill: "#FFFFFF"`,
  },
  {
    name: "Business Card",
    category: "Card",
    yaml: `npng: "0.4"
canvas:
  width: 600
  height: 340
  background: "#FFFFFF"
layers:
  - name: "accent"
    elements:
      - type: rect
        x: 0
        y: 0
        width: 8
        height: 340
        fill: "#2563EB"
  - name: "content"
    elements:
      - type: text
        x: 40
        y: 80
        content: "Jane Smith"
        font_size: 32
        font_family: "Playfair Display"
        font_weight: "700"
        fill: "#111827"
      - type: text
        x: 40
        y: 115
        content: "Creative Director"
        font_size: 16
        font_family: "Inter"
        font_weight: "400"
        fill: "#6B7280"
      - type: line
        x1: 40
        y1: 145
        x2: 200
        y2: 145
        stroke:
          color: "#E5E7EB"
          width: 1
      - type: text
        x: 40
        y: 180
        content: "hello@example.com"
        font_size: 14
        font_family: "Inter"
        fill: "#2563EB"
      - type: text
        x: 40
        y: 205
        content: "+1 (555) 123-4567"
        font_size: 14
        font_family: "Inter"
        fill: "#374151"
      - type: text
        x: 40
        y: 230
        content: "www.example.com"
        font_size: 14
        font_family: "Inter"
        fill: "#374151"
  - name: "logo area"
    elements:
      - type: ellipse
        cx: 500
        cy: 80
        rx: 32
        ry: 32
        fill: "#2563EB"
      - type: text
        x: 500
        y: 88
        content: "JS"
        font_size: 22
        font_family: "Montserrat"
        font_weight: "700"
        fill: "#FFFFFF"
        align: "center"`,
  },
  {
    name: "Badge / Label",
    category: "Badge",
    yaml: `npng: "0.4"
canvas:
  width: 280
  height: 100
  background: "transparent"
layers:
  - name: "badge"
    elements:
      - type: rect
        x: 0
        y: 0
        width: 280
        height: 100
        rx: 50
        fill:
          type: linear-gradient
          x1: 0
          y1: 0
          x2: 280
          y2: 100
          stops:
            - offset: 0
              color: "#10B981"
            - offset: 1
              color: "#059669"
      - type: text
        x: 140
        y: 42
        content: "NEW"
        font_size: 12
        font_family: "Inter"
        font_weight: "600"
        fill: "#D1FAE5"
        align: "center"
      - type: text
        x: 140
        y: 68
        content: "RELEASE v2.0"
        font_size: 20
        font_family: "Bebas Neue"
        font_weight: "400"
        fill: "#FFFFFF"
        align: "center"`,
  },
  {
    name: "Event Poster",
    category: "Poster",
    yaml: `npng: "0.4"
canvas:
  width: 600
  height: 800
  background: "#0F172A"
layers:
  - name: "background accents"
    elements:
      - type: ellipse
        cx: 500
        cy: 100
        rx: 200
        ry: 200
        fill: "#1E3A5F"
        opacity: 0.5
      - type: ellipse
        cx: 100
        cy: 700
        rx: 180
        ry: 180
        fill: "#312E81"
        opacity: 0.4
  - name: "content"
    elements:
      - type: text
        x: 50
        y: 180
        content: "DESIGN"
        font_size: 72
        font_family: "Bebas Neue"
        fill: "#FFFFFF"
      - type: text
        x: 50
        y: 250
        content: "CONFERENCE"
        font_size: 72
        font_family: "Bebas Neue"
        fill:
          type: linear-gradient
          x1: 50
          y1: 220
          x2: 400
          y2: 260
          stops:
            - offset: 0
              color: "#818CF8"
            - offset: 1
              color: "#C084FC"
      - type: text
        x: 50
        y: 290
        content: "2026"
        font_size: 72
        font_family: "Bebas Neue"
        fill: "#6366F1"
      - type: line
        x1: 50
        y1: 320
        x2: 250
        y2: 320
        stroke:
          color: "#6366F1"
          width: 2
      - type: text
        x: 50
        y: 370
        content: "October 15-17 · San Francisco"
        font_size: 18
        font_family: "Inter"
        font_weight: "400"
        fill: "#94A3B8"
      - type: text
        x: 50
        y: 400
        content: "The future of AI-native design tools"
        font_size: 16
        font_family: "Inter"
        fill: "#64748B"
  - name: "cta"
    elements:
      - type: rect
        x: 50
        y: 680
        width: 200
        height: 50
        rx: 25
        fill: "#6366F1"
      - type: text
        x: 150
        y: 712
        content: "Register Now"
        font_size: 16
        font_family: "Inter"
        font_weight: "600"
        fill: "#FFFFFF"
        align: "center"`,
  },
];

interface ExamplesPanelProps {
  onSelect: (yaml: string) => void;
}

export default function ExamplesPanel({ onSelect }: ExamplesPanelProps) {
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) onSelect(text.trim());
    } catch {
      // clipboard access denied
    }
  }, [onSelect]);

  const categories = Array.from(new Set(EXAMPLES.map((ex) => ex.category)));

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-700">
        Templates & Examples
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <p className="text-zinc-500 text-xs mb-2">
          Load templates to start designing, or paste npng from any source.
        </p>
        {categories.map((cat) => (
          <div key={cat}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">{cat}</div>
            <div className="space-y-1 mb-3">
              {EXAMPLES.filter((ex) => ex.category === cat).map((ex, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(ex.yaml)}
                  className="w-full text-left px-3 py-2 text-sm bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-300"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <hr className="border-zinc-700 my-3" />
        <button
          onClick={handlePaste}
          className="w-full text-left px-3 py-2 text-sm bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-300"
        >
          Paste npng from clipboard
        </button>
      </div>
    </div>
  );
}
