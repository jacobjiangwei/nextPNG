"use client";

import { useCallback } from "react";

const EXAMPLES: { name: string; yaml: string }[] = [
  {
    name: "Hello World",
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
        content: "Hello NewPNG!"
        font_size: 20
        font_family: "sans-serif"
        font_weight: "bold"
        fill: "#FFFFFF"
        align: "center"`,
  },
  {
    name: "Gradient Star",
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

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-700">
        Examples
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        <p className="text-zinc-500 text-xs mb-3">
          Load an example or paste npng YAML from any source into the editor.
        </p>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            onClick={() => onSelect(ex.yaml)}
            className="w-full text-left px-3 py-2 text-sm bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-300"
          >
            {ex.name}
          </button>
        ))}
        <hr className="border-zinc-700 my-3" />
        <button
          onClick={handlePaste}
          className="w-full text-left px-3 py-2 text-sm bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-300"
        >
          Paste from clipboard
        </button>
      </div>
    </div>
  );
}
