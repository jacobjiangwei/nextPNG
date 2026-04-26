"use client";

import { useReducer, useCallback, useState } from "react";
import { editorReducer, createInitialState } from "../lib/editorState";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import Toolbar from "../components/Toolbar";
import LayerPanel from "../components/LayerPanel";
import ChatPanel from "../components/ChatPanel";
import CanvasPreview from "../components/CanvasPreview";
import PropertyPanel from "../components/PropertyPanel";
import YamlEditor from "../components/YamlEditor";

const EXAMPLES = [
  {
    name: "Hello World",
    yaml: `npng: "0.1"\ncanvas:\n  width: 400\n  height: 300\n  background: "#FFFFFF"\nlayers:\n  - name: "shapes"\n    elements:\n      - type: rect\n        x: 30\n        y: 30\n        width: 120\n        height: 80\n        fill: "#E74C3C"\n      - type: ellipse\n        cx: 280\n        cy: 100\n        rx: 60\n        ry: 40\n        fill: "#3498DB"\n      - type: text\n        x: 200\n        y: 240\n        content: "Hello NewPNG!"\n        font_size: 20\n        font_family: "sans-serif"\n        font_weight: "bold"\n        fill: "#FFFFFF"\n        align: "center"`,
  },
  {
    name: "Gradient Star",
    yaml: `npng: "0.1"\ncanvas:\n  width: 400\n  height: 400\n  background: "#1A1A2E"\nlayers:\n  - name: "star"\n    elements:\n      - type: path\n        d: "M 200 50 L 230 140 L 325 140 L 248 195 L 275 285 L 200 232 L 125 285 L 152 195 L 75 140 L 170 140 Z"\n        fill:\n          type: linear-gradient\n          x1: 75\n          y1: 50\n          x2: 325\n          y2: 285\n          stops:\n            - offset: 0\n              color: "#FFD700"\n            - offset: 1\n              color: "#FF8C00"\n        stroke:\n          color: "#B8860B"\n          width: 2`,
  },
  {
    name: "Layer Opacity",
    yaml: `npng: "0.1"\ncanvas:\n  width: 400\n  height: 400\n  background: "#1A1A2E"\nlayers:\n  - name: "background-shapes"\n    opacity: 0.3\n    elements:\n      - type: ellipse\n        cx: 100\n        cy: 100\n        rx: 150\n        ry: 150\n        fill: "#E94560"\n      - type: ellipse\n        cx: 300\n        cy: 300\n        rx: 150\n        ry: 150\n        fill: "#0F3460"\n  - name: "main-content"\n    elements:\n      - type: rect\n        x: 50\n        y: 50\n        width: 300\n        height: 300\n        rx: 20\n        ry: 20\n        fill: "#16213E80"\n        stroke:\n          color: "#E94560"\n          width: 2\n      - type: text\n        x: 200\n        y: 200\n        content: "Layers"\n        font_size: 48\n        font_family: "sans-serif"\n        font_weight: "bold"\n        fill: "#FFFFFF"\n        align: "center"`,
  },
  {
    name: "Transforms",
    yaml: `npng: "0.1"\ncanvas:\n  width: 400\n  height: 400\n  background: "#FFFFFF"\nlayers:\n  - name: "pinwheel"\n    elements:\n      - type: rect\n        x: -60\n        y: -10\n        width: 120\n        height: 20\n        fill: "#E74C3C"\n        transform:\n          translate: [200, 200]\n          rotate: 0\n      - type: rect\n        x: -60\n        y: -10\n        width: 120\n        height: 20\n        fill: "#3498DB"\n        transform:\n          translate: [200, 200]\n          rotate: 45\n      - type: rect\n        x: -60\n        y: -10\n        width: 120\n        height: 20\n        fill: "#2ECC71"\n        transform:\n          translate: [200, 200]\n          rotate: 90\n      - type: rect\n        x: -60\n        y: -10\n        width: 120\n        height: 20\n        fill: "#F39C12"\n        transform:\n          translate: [200, 200]\n          rotate: 135\n      - type: ellipse\n        cx: 0\n        cy: 0\n        rx: 15\n        ry: 15\n        fill: "#2C3E50"\n        transform:\n          translate: [200, 200]`,
  },
];

const DEFAULT_YAML = `npng: "0.1"
canvas:
  width: 600
  height: 500
  background: "#0F0B1E"
defs:
  - id: diamond
    type: path
    d: "M 0 -12 L 8 0 L 0 12 L -8 0 Z"
    fill: "#FFFFFF20"
layers:
  # --- Background aurora glow ---
  - name: "aurora"
    opacity: 0.6
    blend_mode: screen
    filters:
      - type: blur
        radius: 40
    elements:
      - type: ellipse
        cx: 150
        cy: 200
        rx: 200
        ry: 120
        fill:
          type: radial-gradient
          cx: 150
          cy: 200
          r: 200
          stops:
            - offset: 0
              color: "#6C63FF"
            - offset: 1
              color: "#6C63FF00"
      - type: ellipse
        cx: 450
        cy: 280
        rx: 180
        ry: 100
        fill:
          type: radial-gradient
          cx: 450
          cy: 280
          r: 180
          stops:
            - offset: 0
              color: "#FF6B9D"
            - offset: 1
              color: "#FF6B9D00"
      - type: ellipse
        cx: 300
        cy: 120
        rx: 160
        ry: 90
        fill:
          type: radial-gradient
          cx: 300
          cy: 120
          r: 160
          stops:
            - offset: 0
              color: "#00D2FF"
            - offset: 1
              color: "#00D2FF00"

  # --- Scattered diamond particles ---
  - name: "particles"
    opacity: 0.4
    elements:
      - type: use
        ref: diamond
        transform:
          translate: [80, 60]
          rotate: 15
      - type: use
        ref: diamond
        transform:
          translate: [520, 90]
          rotate: -20
      - type: use
        ref: diamond
        transform:
          translate: [180, 420]
          rotate: 45
      - type: use
        ref: diamond
        transform:
          translate: [470, 400]
          rotate: 30
      - type: use
        ref: diamond
        transform:
          translate: [50, 300]
          rotate: -10
      - type: use
        ref: diamond
        transform:
          translate: [540, 250]
          rotate: 60

  # --- Main card with glassmorphism ---
  - name: "card"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 8
        radius: 30
        color: "#00000060"
    elements:
      - type: rect
        x: 80
        y: 80
        width: 440
        height: 340
        rx: 24
        ry: 24
        fill: "#FFFFFF10"
        stroke:
          color: "#FFFFFF18"
          width: 1

  # --- Gradient accent bar ---
  - name: "accent"
    clip_path: "M 80 80 L 520 80 L 520 88 L 80 88 Z"
    elements:
      - type: rect
        x: 80
        y: 80
        width: 440
        height: 8
        fill:
          type: linear-gradient
          x1: 80
          y1: 84
          x2: 520
          y2: 84
          stops:
            - offset: 0
              color: "#6C63FF"
            - offset: 0.5
              color: "#FF6B9D"
            - offset: 1
              color: "#00D2FF"

  # --- Icon: abstract logo mark ---
  - name: "logo"
    elements:
      - type: path
        d: "M 300 140 L 340 200 L 300 200 L 340 260 L 260 260 L 300 200 L 260 200 Z"
        fill:
          type: linear-gradient
          x1: 260
          y1: 140
          x2: 340
          y2: 260
          stops:
            - offset: 0
              color: "#6C63FF"
            - offset: 1
              color: "#00D2FF"
        stroke:
          color: "#FFFFFF30"
          width: 1

  # --- Typography ---
  - name: "text"
    elements:
      - type: text
        x: 300
        y: 300
        content: "NewPNG"
        font_size: 42
        font_family: "sans-serif"
        font_weight: "bold"
        fill:
          type: linear-gradient
          x1: 220
          y1: 270
          x2: 380
          y2: 310
          stops:
            - offset: 0
              color: "#FFFFFF"
            - offset: 1
              color: "#FFFFFFB0"
        align: "center"
      - type: text
        x: 300
        y: 330
        content: "Visual Vector Graphics"
        font_size: 14
        font_family: "sans-serif"
        fill: "#FFFFFF60"
        align: "center"

  # --- Feature pills ---
  - name: "pills"
    elements:
      - type: rect
        x: 120
        y: 355
        width: 90
        height: 28
        rx: 14
        ry: 14
        fill: "#6C63FF30"
        stroke:
          color: "#6C63FF60"
          width: 1
      - type: text
        x: 165
        y: 374
        content: "Gradients"
        font_size: 11
        font_family: "sans-serif"
        fill: "#A5A0FF"
        align: "center"
      - type: rect
        x: 225
        y: 355
        width: 70
        height: 28
        rx: 14
        ry: 14
        fill: "#FF6B9D30"
        stroke:
          color: "#FF6B9D60"
          width: 1
      - type: text
        x: 260
        y: 374
        content: "Layers"
        font_size: 11
        font_family: "sans-serif"
        fill: "#FF9DBF"
        align: "center"
      - type: rect
        x: 310
        y: 355
        width: 65
        height: 28
        rx: 14
        ry: 14
        fill: "#00D2FF30"
        stroke:
          color: "#00D2FF60"
          width: 1
      - type: text
        x: 342
        y: 374
        content: "Paths"
        font_size: 11
        font_family: "sans-serif"
        fill: "#66E3FF"
        align: "center"
      - type: rect
        x: 390
        y: 355
        width: 85
        height: 28
        rx: 14
        ry: 14
        fill: "#FFD70030"
        stroke:
          color: "#FFD70060"
          width: 1
      - type: text
        x: 432
        y: 374
        content: "Transforms"
        font_size: 11
        font_family: "sans-serif"
        fill: "#FFE566"
        align: "center"

  # --- Decorative rings ---
  - name: "rings"
    opacity: 0.15
    elements:
      - type: ellipse
        cx: 300
        cy: 250
        rx: 220
        ry: 220
        stroke:
          color: "#FFFFFF"
          width: 1
          dash: [4, 8]
      - type: ellipse
        cx: 300
        cy: 250
        rx: 260
        ry: 260
        stroke:
          color: "#FFFFFF"
          width: 1
          dash: [2, 12]
`;

export default function Home() {
  const [state, dispatch] = useReducer(editorReducer, DEFAULT_YAML, createInitialState);
  const [yamlOpen, setYamlOpen] = useState(true);

  const handleFitToScreen = useCallback(() => {
    const cw = state.parsedDoc?.canvas?.width ?? 600;
    const ch = state.parsedDoc?.canvas?.height ?? 400;
    // Approximate viewport: window minus sidebars
    const vw = Math.max(200, window.innerWidth - 480);
    const vh = Math.max(200, window.innerHeight - 80);
    const zoom = Math.min(vw / cw, vh / ch) * 0.9;
    dispatch({ type: "SET_ZOOM", zoom });
    dispatch({ type: "SET_PAN", panX: 0, panY: 0 });
  }, [state.parsedDoc]);

  useKeyboardShortcuts(dispatch, state.selection, state.parsedDoc, state.zoom, handleFitToScreen);

  const handleYamlChange = useCallback((yaml: string) => {
    dispatch({ type: "SET_YAML", yaml });
  }, []);

  const handleExportPng = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "export.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const handleDownloadNpng = useCallback(() => {
    const blob = new Blob([state.yamlText], { type: "text/yaml" });
    const link = document.createElement("a");
    link.download = "image.npng";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [state.yamlText]);

  const handleLoadExample = useCallback((yaml: string) => {
    dispatch({ type: "SET_YAML", yaml });
  }, []);

  const handleImageUpload = useCallback((dataUrl: string, imageWidth: number, imageHeight: number) => {
    const maxSize = 300;
    const scale = Math.min(1, maxSize / Math.max(imageWidth, imageHeight));
    const width = Math.round(imageWidth * scale);
    const height = Math.round(imageHeight * scale);
    const canvasWidth = state.parsedDoc?.canvas?.width ?? 600;
    const canvasHeight = state.parsedDoc?.canvas?.height ?? 400;

    dispatch({
      type: "ADD_ELEMENT",
      layerIndex: 0,
      element: {
        type: "image",
        x: Math.round((canvasWidth - width) / 2),
        y: Math.round((canvasHeight - height) / 2),
        width,
        height,
        href: dataUrl,
      },
    });
  }, [state.parsedDoc]);

  const firstSel = state.selection.length === 1 ? state.selection[0] : null;
  const selectedElement = firstSel && state.parsedDoc?.layers
    ? state.parsedDoc.layers[firstSel.layerIndex]?.elements?.[firstSel.elementIndex] ?? null
    : null;

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-zinc-200">
      <Toolbar
        activeTool={state.activeTool}
        zoom={state.zoom}
        showGrid={state.showGrid}
        dispatch={dispatch}
        onExportPng={handleExportPng}
        onDownloadNpng={handleDownloadNpng}
        onLoadExample={handleLoadExample}
        onFitToScreen={handleFitToScreen}
        onImageUpload={handleImageUpload}
        examples={EXAMPLES}
        canUndo={state.historyIndex > 0}
        canRedo={state.historyIndex < state.history.length - 1}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* AI + Layer Panel */}
        <div className="w-[260px] shrink-0 border-r border-zinc-700 overflow-hidden flex flex-col">
          <div className="h-[320px] shrink-0 border-b border-zinc-700 overflow-hidden">
            <ChatPanel onYamlGenerated={handleLoadExample} />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <LayerPanel doc={state.parsedDoc} selection={state.selection} dispatch={dispatch} />
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <CanvasPreview
            yamlText={state.yamlText}
            parsedDoc={state.parsedDoc}
            selection={state.selection}
             activeTool={state.activeTool}
             dragState={state.dragState}
             drawState={state.drawState}
             penState={state.penState}
             polyState={state.polyState}
             zoom={state.zoom}
            panX={state.panX}
            panY={state.panY}
            showGrid={state.showGrid}
            gridSize={state.gridSize}
            dispatch={dispatch}
          />
        </div>

        {/* Right sidebar: Property Inspector + YAML Editor */}
        <div className="w-[280px] shrink-0 border-l border-zinc-700 flex flex-col overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-700 bg-[#1e1e1e]">
            Properties
          </div>
          <div className="flex-1 overflow-auto bg-[#1e1e1e]">
            <PropertyPanel element={selectedElement} address={firstSel} doc={state.parsedDoc} dispatch={dispatch} />
          </div>

          {/* Collapsible YAML Editor */}
          <div className="border-t border-zinc-700">
            <button
              onClick={() => setYamlOpen(!yamlOpen)}
              className="w-full px-3 py-2 text-xs font-semibold text-zinc-400 bg-[#1e1e1e] hover:bg-zinc-800 text-left flex items-center gap-1"
            >
              <span className={`transition-transform ${yamlOpen ? "rotate-90" : ""}`}>▶</span>
              YAML Editor
            </button>
            {yamlOpen && (
              <div className="h-[300px]">
                <YamlEditor value={state.yamlText} onChange={handleYamlChange} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
