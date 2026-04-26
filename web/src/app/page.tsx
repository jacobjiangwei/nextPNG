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

const ORIGINAL_APPLE_MARK_YAML = `npng: "0.4"
canvas:
  width: 700
  height: 620
  background: "#0B1020"
layers:
  - name: "aurora background"
    opacity: 0.75
    blend_mode: screen
    filters:
      - type: blur
        radius: 38
    elements:
      - type: ellipse
        cx: 210
        cy: 260
        rx: 230
        ry: 170
        fill:
          type: radial-gradient
          cx: 210
          cy: 260
          r: 230
          stops:
            - offset: 0
              color: "#FF3B7A90"
            - offset: 1
              color: "#FF3B7A00"
      - type: ellipse
        cx: 500
        cy: 260
        rx: 220
        ry: 160
        fill:
          type: radial-gradient
          cx: 500
          cy: 260
          r: 220
          stops:
            - offset: 0
              color: "#FFB02075"
            - offset: 1
              color: "#FFB02000"
      - type: ellipse
        cx: 360
        cy: 170
        rx: 200
        ry: 120
        fill:
          type: radial-gradient
          cx: 360
          cy: 170
          r: 200
          stops:
            - offset: 0
              color: "#6C63FF70"
            - offset: 1
              color: "#6C63FF00"

  - name: "soft ground shadow"
    opacity: 0.7
    filters:
      - type: blur
        radius: 22
    elements:
      - type: ellipse
        cx: 352
        cy: 474
        rx: 168
        ry: 35
        fill: "#00000080"

  - name: "apple glow"
    opacity: 0.55
    blend_mode: screen
    filters:
      - type: blur
        radius: 18
    elements:
      - type: path
        d: "M 305 183 C 263 145 202 148 161 190 C 118 234 116 311 148 388 C 178 460 229 511 268 524 C 285 529 296 515 312 515 C 328 515 342 531 361 523 C 406 504 451 445 480 374 C 512 294 491 219 446 183 C 407 151 345 151 305 183 Z"
        fill: "#FF5A7A"

  - name: "apple body"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 18
        radius: 28
        color: "#00000065"
    elements:
      - type: path
        d: "M 305 183 C 263 145 202 148 161 190 C 118 234 116 311 148 388 C 178 460 229 511 268 524 C 285 529 296 515 312 515 C 328 515 342 531 361 523 C 406 504 451 445 480 374 C 512 294 491 219 446 183 C 407 151 345 151 305 183 Z"
        fills:
          - fill:
              type: linear-gradient
              x1: 168
              y1: 155
              x2: 485
              y2: 520
              stops:
                - offset: 0
                  color: "#FF3B6B"
                - offset: 0.48
                  color: "#FF5F2E"
                - offset: 1
                  color: "#FFD166"
          - fill:
              type: radial-gradient
              cx: 246
              cy: 229
              r: 210
              stops:
                - offset: 0
                  color: "#FFFFFF65"
                - offset: 0.38
                  color: "#FFFFFF12"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.65
        strokes:
          - color: "#FFFFFF45"
            width: 2
          - color: "#22081655"
            width: 1

  - name: "bite cutout"
    elements:
      - type: ellipse
        cx: 474
        cy: 259
        rx: 52
        ry: 58
        fill: "#0B1020"
      - type: ellipse
        cx: 491
        cy: 306
        rx: 43
        ry: 45
        fill: "#0B1020"
      - type: ellipse
        cx: 455
        cy: 326
        rx: 34
        ry: 34
        fill: "#0B1020"

  - name: "surface highlights"
    opacity: 0.78
    elements:
      - type: path
        d: "M 196 220 C 222 185 264 173 302 195 C 253 207 217 245 198 302 C 190 274 187 245 196 220 Z"
        fill:
          type: linear-gradient
          x1: 190
          y1: 178
          x2: 305
          y2: 304
          stops:
            - offset: 0
              color: "#FFFFFF85"
            - offset: 1
              color: "#FFFFFF00"
      - type: path
        d: "M 253 485 C 285 505 319 506 354 486"
        fill: "none"
        stroke:
          color: "#FFFFFF45"
          width: 4
          cap: round

  - name: "stem and leaf"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 6
        radius: 10
        color: "#00000050"
    elements:
      - type: path
        d: "M 314 179 C 310 142 322 112 348 90 C 358 105 359 140 337 184 Z"
        fill:
          type: linear-gradient
          x1: 322
          y1: 90
          x2: 345
          y2: 184
          stops:
            - offset: 0
              color: "#8B5E34"
            - offset: 1
              color: "#3F2419"
      - type: path
        d: "M 335 139 C 366 82 429 56 488 80 C 468 136 406 172 335 139 Z"
        fill:
          type: linear-gradient
          x1: 344
          y1: 142
          x2: 480
          y2: 70
          stops:
            - offset: 0
              color: "#7CFF8D"
            - offset: 0.55
              color: "#2ED573"
            - offset: 1
              color: "#0B8F5A"
        stroke:
          color: "#D5FFD880"
          width: 1.5
      - type: path
        d: "M 360 132 C 397 116 426 96 459 82"
        fill: "none"
        stroke:
          color: "#E9FFE880"
          width: 2
          cap: round

  - name: "caption"
    elements:
      - type: text
        x: 350
        y: 575
        font_size: 16
        font_family: "sans-serif"
        align: center
        spans:
          - text: "Original "
            fill: "#94A3B8"
          - text: "NewPNG"
            bold: true
            fill: "#FFFFFF"
          - text: " apple mark demo"
            fill: "#94A3B8"
`;

const FOUR_TILE_WINDOW_MARK_YAML = `npng: "0.4"
canvas:
  width: 800
  height: 520
  background: "#0B0F1A"
layers:
  - name: "deep background"
    elements:
      - type: rect
        x: 0
        y: 0
        width: 800
        height: 520
        fill:
          type: linear-gradient
          x1: 0
          y1: 0
          x2: 800
          y2: 520
          stops:
            - offset: 0
              color: "#07111F"
            - offset: 0.5
              color: "#101827"
            - offset: 1
              color: "#05070D"

  - name: "soft color glow"
    opacity: 0.9
    blend_mode: screen
    filters:
      - type: blur
        radius: 42
    elements:
      - type: ellipse
        cx: 285
        cy: 190
        rx: 150
        ry: 120
        fill:
          type: radial-gradient
          cx: 285
          cy: 190
          r: 150
          stops:
            - offset: 0
              color: "#F2502265"
            - offset: 1
              color: "#F2502200"
      - type: ellipse
        cx: 455
        cy: 190
        rx: 150
        ry: 120
        fill:
          type: radial-gradient
          cx: 455
          cy: 190
          r: 150
          stops:
            - offset: 0
              color: "#7FBA0065"
            - offset: 1
              color: "#7FBA0000"
      - type: ellipse
        cx: 285
        cy: 360
        rx: 150
        ry: 120
        fill:
          type: radial-gradient
          cx: 285
          cy: 360
          r: 150
          stops:
            - offset: 0
              color: "#00A4EF65"
            - offset: 1
              color: "#00A4EF00"
      - type: ellipse
        cx: 455
        cy: 360
        rx: 150
        ry: 120
        fill:
          type: radial-gradient
          cx: 455
          cy: 360
          r: 150
          stops:
            - offset: 0
              color: "#FFB90065"
            - offset: 1
              color: "#FFB90000"

  - name: "mark shadow"
    opacity: 0.7
    filters:
      - type: blur
        radius: 20
    elements:
      - type: rect
        x: 246
        y: 138
        width: 268
        height: 268
        rx: 10
        ry: 10
        fill: "#00000085"

  - name: "four precise tiles"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 18
        radius: 28
        color: "#00000070"
    elements:
      - type: rect
        x: 250
        y: 120
        width: 122
        height: 122
        fills:
          - fill:
              type: linear-gradient
              x1: 250
              y1: 120
              x2: 372
              y2: 242
              stops:
                - offset: 0
                  color: "#FF6A3D"
                - offset: 1
                  color: "#F25022"
          - fill:
              type: radial-gradient
              cx: 278
              cy: 146
              r: 100
              stops:
                - offset: 0
                  color: "#FFFFFF50"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.55
        strokes:
          - color: "#FFFFFF35"
            width: 1.5
      - type: rect
        x: 388
        y: 120
        width: 122
        height: 122
        fills:
          - fill:
              type: linear-gradient
              x1: 388
              y1: 120
              x2: 510
              y2: 242
              stops:
                - offset: 0
                  color: "#A6E22E"
                - offset: 1
                  color: "#7FBA00"
          - fill:
              type: radial-gradient
              cx: 416
              cy: 146
              r: 100
              stops:
                - offset: 0
                  color: "#FFFFFF45"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.55
        strokes:
          - color: "#FFFFFF35"
            width: 1.5
      - type: rect
        x: 250
        y: 258
        width: 122
        height: 122
        fills:
          - fill:
              type: linear-gradient
              x1: 250
              y1: 258
              x2: 372
              y2: 380
              stops:
                - offset: 0
                  color: "#35C8FF"
                - offset: 1
                  color: "#00A4EF"
          - fill:
              type: radial-gradient
              cx: 278
              cy: 284
              r: 100
              stops:
                - offset: 0
                  color: "#FFFFFF45"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.55
        strokes:
          - color: "#FFFFFF35"
            width: 1.5
      - type: rect
        x: 388
        y: 258
        width: 122
        height: 122
        fills:
          - fill:
              type: linear-gradient
              x1: 388
              y1: 258
              x2: 510
              y2: 380
              stops:
                - offset: 0
                  color: "#FFD95A"
                - offset: 1
                  color: "#FFB900"
          - fill:
              type: radial-gradient
              cx: 416
              cy: 284
              r: 100
              stops:
                - offset: 0
                  color: "#FFFFFF45"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.55
        strokes:
          - color: "#FFFFFF35"
            width: 1.5

  - name: "crisp gutter lines"
    opacity: 0.92
    elements:
      - type: rect
        x: 372
        y: 120
        width: 16
        height: 260
        fill: "#0B0F1A"
      - type: rect
        x: 250
        y: 242
        width: 260
        height: 16
        fill: "#0B0F1A"
      - type: line
        x1: 250
        y1: 120
        x2: 510
        y2: 120
        stroke:
          color: "#FFFFFF55"
          width: 1
      - type: line
        x1: 250
        y1: 380
        x2: 510
        y2: 380
        stroke:
          color: "#00000055"
          width: 1

  - name: "caption"
    elements:
      - type: text
        x: 380
        y: 438
        font_size: 18
        font_family: "sans-serif"
        align: center
        spans:
          - text: "Geometric "
            fill: "#94A3B8"
          - text: "four-tile"
            bold: true
            fill: "#FFFFFF"
          - text: " logo demo"
            fill: "#94A3B8"
      - type: text
        x: 380
        y: 466
        content: "Precise rectangles beat hand-written curves."
        font_size: 13
        font_family: "sans-serif"
        align: center
        fill: "#64748B"
`;

const EXAMPLES = [
  {
    name: "Four Tile Window Mark",
    yaml: FOUR_TILE_WINDOW_MARK_YAML,
  },
  {
    name: "Apple Curve Stress Test",
    yaml: ORIGINAL_APPLE_MARK_YAML,
  },
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
