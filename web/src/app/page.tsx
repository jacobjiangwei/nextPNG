"use client";

import { useReducer, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { editorReducer, createInitialState } from "../lib/editorState";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import Toolbar from "../components/Toolbar";
import LayerPanel from "../components/LayerPanel";
import ChatPanel from "../components/ChatPanel";
import CanvasPreview from "../components/CanvasPreview";
import PropertyPanel from "../components/PropertyPanel";
import YamlEditor from "../components/YamlEditor";
import { preloadNpngImages, renderNpng } from "../lib/renderer";
import { npngToSvg } from "../lib/svgExporter";
import { getElementAtAddress } from "../lib/elementTree";
import { decodeNpngShare, encodeNpngShare, readNpngSharePayload } from "../lib/npngShare";
import {
  createStoredProject,
  getProjectDocument,
  inferProjectName,
  loadStoredProjectState,
  persistStoredProjectState,
  saveProjectVersion,
  updateProjectDraft,
  type StoredNpngProject,
} from "../lib/projectStorage";

const SATISFACTION_PEACH_YAML = `npng: "0.5"
canvas:
  width: 760
  height: 620
  background: "#FFF5EC"
layers:
  - name: "warm studio background"
    elements:
      - type: rect
        name: Background wash
        x: 0
        y: 0
        width: 760
        height: 620
        fill:
          type: linear-gradient
          x1: 0
          y1: 0
          x2: 760
          y2: 620
          stops:
            - offset: 0
              color: "#FFFDF9"
            - offset: 0.45
              color: "#FFF1E2"
            - offset: 1
              color: "#FFE0CA"
      - type: ellipse
        name: Pink atmosphere glow
        cx: 225
        cy: 170
        rx: 210
        ry: 155
        fill:
          type: radial-gradient
          cx: 225
          cy: 170
          r: 230
          stops:
            - offset: 0
              color: "#FFD1DC80"
            - offset: 1
              color: "#FFD1DC00"
      - type: ellipse
        name: Golden atmosphere glow
        cx: 548
        cy: 220
        rx: 205
        ry: 145
        fill:
          type: radial-gradient
          cx: 548
          cy: 220
          r: 220
          stops:
            - offset: 0
              color: "#FFE28A75"
            - offset: 1
              color: "#FFE28A00"

  - name: "soft shadow"
    opacity: 0.62
    filters:
      - type: blur
        radius: 18
    elements:
      - type: ellipse
        name: Main soft shadow
        cx: 382
        cy: 527
        rx: 188
        ry: 34
        fill: "#B4530950"
      - type: ellipse
        name: Contact shadow
        cx: 380
        cy: 510
        rx: 125
        ry: 20
        fill: "#7C2D1250"

  - name: "peach aura"
    opacity: 0.58
    blend_mode: screen
    filters:
      - type: blur
        radius: 20
    elements:
      - type: path
        name: Peach glow
        d: "M 371 176 C 322 124 232 138 192 214 C 147 299 180 418 274 494 C 313 526 346 545 382 545 C 418 545 455 524 494 488 C 587 403 615 291 565 211 C 522 142 439 126 390 176 C 384 182 377 182 371 176 Z"
        fill: "#FF8FAB"

  - name: "peach body"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 20
        radius: 28
        color: "#9A34124D"
    elements:
      - type: path
        name: Peach body silhouette
        d: "M 371 176 C 322 124 232 138 192 214 C 147 299 180 418 274 494 C 313 526 346 545 382 545 C 418 545 455 524 494 488 C 587 403 615 291 565 211 C 522 142 439 126 390 176 C 384 182 377 182 371 176 Z"
        fills:
          - fill:
              type: linear-gradient
              x1: 190
              y1: 145
              x2: 565
              y2: 540
              stops:
                - offset: 0
                  color: "#FFD4A8"
                - offset: 0.28
                  color: "#FF9F8E"
                - offset: 0.58
                  color: "#FF6F91"
                - offset: 1
                  color: "#FFB86B"
          - fill:
              type: radial-gradient
              cx: 286
              cy: 240
              r: 260
              stops:
                - offset: 0
                  color: "#FFFFFF78"
                - offset: 0.38
                  color: "#FFFFFF1E"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.85
          - fill:
              type: radial-gradient
              cx: 492
              cy: 420
              r: 210
              stops:
                - offset: 0
                  color: "#E11D4855"
                - offset: 0.65
                  color: "#E11D4810"
                - offset: 1
                  color: "#E11D4800"
            opacity: 0.75
        strokes:
          - color: "#FFFFFF86"
            width: 2
          - color: "#C2410C55"
            width: 1

  - name: "fruit sculpting"
    elements:
      - type: path
        name: Left fruit groove
        d: "M 376 188 C 350 244 346 308 364 374 C 379 429 377 487 347 535"
        fill: "none"
        stroke:
          color: "#D9486A90"
          width: 5
          cap: round
      - type: path
        name: Right fruit highlight groove
        d: "M 390 188 C 428 251 433 326 407 391 C 388 439 387 497 418 536"
        fill: "none"
        stroke:
          color: "#FFDDAD70"
          width: 4
          cap: round
      - type: path
        name: Main glossy highlight
        d: "M 235 228 C 267 181 330 166 366 203 C 308 218 255 277 231 360 C 211 302 212 255 235 228 Z"
        fill:
          type: linear-gradient
          x1: 228
          y1: 178
          x2: 368
          y2: 360
          stops:
            - offset: 0
              color: "#FFFFFF8A"
            - offset: 0.48
              color: "#FFFFFF30"
            - offset: 1
              color: "#FFFFFF00"
      - type: path
        name: Bottom gloss smile
        d: "M 252 463 C 291 506 337 526 383 527 C 431 527 474 507 516 463"
        fill: "none"
        stroke:
          color: "#FFFFFF45"
          width: 5
          cap: round

  - name: "satisfied face"
    elements:
      - type: ellipse
        name: Left blush
        cx: 287
        cy: 365
        rx: 42
        ry: 26
        fill:
          type: radial-gradient
          cx: 287
          cy: 365
          r: 48
          stops:
            - offset: 0
              color: "#FF5C8A66"
            - offset: 1
              color: "#FF5C8A00"
      - type: ellipse
        name: Right blush
        cx: 476
        cy: 365
        rx: 42
        ry: 26
        fill:
          type: radial-gradient
          cx: 476
          cy: 365
          r: 48
          stops:
            - offset: 0
              color: "#FF5C8A66"
            - offset: 1
              color: "#FF5C8A00"
      - type: path
        name: Left happy eye
        d: "M 265 330 C 280 344 303 344 319 329"
        fill: "none"
        stroke:
          color: "#7C2D12"
          width: 6
          cap: round
      - type: path
        name: Right happy eye
        d: "M 444 329 C 460 344 484 344 500 330"
        fill: "none"
        stroke:
          color: "#7C2D12"
          width: 6
          cap: round
      - type: path
        name: Satisfied smile
        d: "M 333 400 C 353 425 408 425 430 400"
        fill: "none"
        stroke:
          color: "#7C2D12"
          width: 6
          cap: round
      - type: path
        name: Smile highlight
        d: "M 358 413 C 374 424 391 424 407 413"
        fill: "none"
        stroke:
          color: "#FFFFFF70"
          width: 2.5
          cap: round

  - name: "stem and leaves"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 8
        radius: 12
        color: "#78350F40"
    elements:
      - type: path
        name: Stem
        d: "M 372 182 C 359 143 373 105 411 82 C 429 120 415 162 389 196 Z"
        fill:
          type: linear-gradient
          x1: 372
          y1: 82
          x2: 406
          y2: 196
          stops:
            - offset: 0
              color: "#9A5A22"
            - offset: 1
              color: "#5C2E0B"
        stroke:
          color: "#FED7AA90"
          width: 1.5
      - type: path
        name: Leaf
        d: "M 392 147 C 430 88 506 66 572 100 C 541 165 462 194 392 147 Z"
        fills:
          - fill:
              type: linear-gradient
              x1: 396
              y1: 152
              x2: 564
              y2: 94
              stops:
                - offset: 0
                  color: "#65A30D"
                - offset: 0.48
                  color: "#16A34A"
                - offset: 1
                  color: "#BBF7D0"
          - fill:
              type: radial-gradient
              cx: 510
              cy: 96
              r: 95
              stops:
                - offset: 0
                  color: "#FFFFFF66"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.75
        stroke:
          color: "#F0FDF4A0"
          width: 2
      - type: path
        name: Leaf vein
        d: "M 424 141 C 465 126 511 105 548 99"
        fill: "none"
        stroke:
          color: "#DCFCE790"
          width: 2.4
          cap: round

  - name: "sparkles"
    opacity: 0.9
    elements:
      - type: path
        name: Left sparkle
        d: "M 159 196 L 171 222 L 198 234 L 171 246 L 159 272 L 147 246 L 120 234 L 147 222 Z"
        fill: "#FFFFFFAA"
        stroke:
          color: "#FDBA74"
          width: 1.2
      - type: path
        name: Right sparkle
        d: "M 604 346 L 613 365 L 633 374 L 613 383 L 604 403 L 595 383 L 575 374 L 595 365 Z"
        fill: "#FFFFFFAA"
        stroke:
          color: "#FDBA74"
          width: 1.2
      - type: ellipse
        name: Left dot sparkle
        cx: 185
        cy: 396
        rx: 8
        ry: 8
        fill: "#FFFFFFB0"
      - type: ellipse
        name: Right dot sparkle
        cx: 590
        cy: 229
        rx: 7
        ry: 7
        fill: "#FFFFFFB0"

  - name: "caption"
    opacity: 0.82
    elements:
      - type: text
        name: Caption
        x: 380
        y: 586
        content: "Satisfaction Peach"
        font_size: 15
        font_family: "sans-serif"
        font_weight: "bold"
        fill: "#9A3412"
        align: center
`;

const PURE_APPLE_DESIGN_YAML = `npng: "0.5"
canvas:
  width: 760
  height: 620
  background: "#FFFDF8"
layers:
  - id: warm-background
    name: "warm studio background"
    elements:
      - type: rect
        id: background-wash
        name: Warm background wash
        x: 0
        y: 0
        width: 760
        height: 620
        fill:
          type: linear-gradient
          x1: 0
          y1: 0
          x2: 760
          y2: 620
          stops:
            - offset: 0
              color: "#FFFFFF"
            - offset: 0.6
              color: "#FFF7ED"
            - offset: 1
              color: "#FEE2E2"

  - id: apple-shadow
    name: "soft fruit shadow"
    opacity: 0.32
    filters:
      - type: blur
        radius: 22
    elements:
      - type: ellipse
        id: oval-ground-shadow
        name: Oval ground shadow
        cx: 382
        cy: 536
        rx: 174
        ry: 27
        fill: "#7F1D1D"

  - id: apple-body-glow
    name: "apple body glow"
    opacity: 0.34
    filters:
      - type: blur
        radius: 18
    elements:
      - type: path
        id: red-body-glow
        name: Red apple glow
        d: "M 380 186 C 346 150 294 151 252 190 C 202 237 180 324 194 406 C 211 508 281 564 337 544 C 358 536 370 517 380 517 C 390 517 402 536 423 544 C 479 564 549 508 566 406 C 580 324 558 237 508 190 C 466 151 414 150 380 186 Z"
        fill: "#DC2626"

  - id: apple-body
    name: "pure apple fruit"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 18
        radius: 26
        color: "#7F1D1D33"
    elements:
      - type: path
        id: apple-silhouette
        name: Rounded apple silhouette
        d: "M 380 186 C 346 150 294 151 252 190 C 202 237 180 324 194 406 C 211 508 281 564 337 544 C 358 536 370 517 380 517 C 390 517 402 536 423 544 C 479 564 549 508 566 406 C 580 324 558 237 508 190 C 466 151 414 150 380 186 Z"
        fills:
          - fill:
              type: radial-gradient
              cx: 286
              cy: 254
              r: 300
              stops:
                - offset: 0
                  color: "#FB7185"
                - offset: 0.42
                  color: "#E11D48"
                - offset: 0.78
                  color: "#BE123C"
                - offset: 1
                  color: "#881337"
          - fill:
              type: radial-gradient
              cx: 484
              cy: 462
              r: 240
              stops:
                - offset: 0
                  color: "#7F1D1D55"
                - offset: 1
                  color: "#7F1D1D00"
            opacity: 0.82
        strokes:
          - color: "#FFFFFF75"
            width: 2
          - color: "#7F1D1D"
            width: 1.5
      - type: path
        id: top-dimple-shadow
        name: Top dimple shadow
        d: "M 331 180 C 354 197 367 211 380 213 C 394 211 407 197 429 180 C 420 222 403 249 380 252 C 357 249 340 222 331 180 Z"
        fill: "#7F1D1D66"
      - type: path
        id: left-skin-highlight
        name: Soft left skin highlight
        d: "M 273 229 C 233 274 221 350 239 423 C 250 470 276 506 314 524 C 286 453 282 342 322 247 C 303 238 287 232 273 229 Z"
        fill:
          type: linear-gradient
          x1: 240
          y1: 230
          x2: 324
          y2: 524
          stops:
            - offset: 0
              color: "#FFFFFF75"
            - offset: 0.45
              color: "#FFFFFF2E"
            - offset: 1
              color: "#FFFFFF00"
      - type: path
        id: lower-belly-gloss
        name: Lower belly gloss
        d: "M 306 501 C 347 529 413 529 456 501"
        fill: "none"
        stroke:
          color: "#FFFFFF42"
          width: 6
          cap: round
      - type: path
        id: right-red-depth
        name: Right side depth
        d: "M 508 230 C 552 301 556 420 496 508"
        fill: "none"
        stroke:
          color: "#7F1D1D55"
          width: 8
          cap: round

  - id: stem-and-leaf
    name: "stem and leaf"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 8
        radius: 12
        color: "#451A0338"
    elements:
      - type: path
        id: brown-stem
        name: Short curved stem
        d: "M 375 194 C 364 149 383 104 426 77 C 441 106 428 158 394 199 Z"
        fills:
          - fill:
              type: linear-gradient
              x1: 374
              y1: 78
              x2: 406
              y2: 198
              stops:
                - offset: 0
                  color: "#92400E"
                - offset: 0.48
                  color: "#78350F"
                - offset: 1
                  color: "#451A03"
          - fill:
              type: radial-gradient
              cx: 404
              cy: 104
              r: 70
              stops:
                - offset: 0
                  color: "#FDE68A55"
                - offset: 1
                  color: "#FDE68A00"
            opacity: 0.8
        stroke:
          color: "#FFFFFF66"
          width: 1.5
      - type: path
        id: green-leaf
        name: Single apple leaf
        d: "M 411 130 C 462 79 548 75 606 132 C 554 184 469 184 411 130 Z"
        fills:
          - fill:
              type: linear-gradient
              x1: 414
              y1: 132
              x2: 604
              y2: 118
              stops:
                - offset: 0
                  color: "#166534"
                - offset: 0.42
                  color: "#22C55E"
                - offset: 1
                  color: "#86EFAC"
          - fill:
              type: radial-gradient
              cx: 520
              cy: 102
              r: 110
              stops:
                - offset: 0
                  color: "#FFFFFF55"
                - offset: 0.58
                  color: "#FFFFFF16"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.75
        stroke:
          color: "#14532D"
          width: 2
      - type: path
        id: leaf-vein
        name: Leaf vein
        d: "M 436 131 C 482 122 542 118 586 130"
        fill: "none"
        stroke:
          color: "#DCFCE780"
          width: 3
          cap: round

`;

const FOUR_TILE_WINDOW_MARK_YAML = `npng: "0.5"
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
    name: "Satisfaction Peach",
    yaml: SATISFACTION_PEACH_YAML,
  },
  {
    name: "Pure Apple Design",
    yaml: PURE_APPLE_DESIGN_YAML,
  },
  {
    name: "Four Tile Window Mark",
    yaml: FOUR_TILE_WINDOW_MARK_YAML,
  },
  {
    name: "Hello World",
    yaml: `npng: "0.5"\ncanvas:\n  width: 400\n  height: 300\n  background: "#FFFFFF"\nlayers:\n  - name: "shapes"\n    elements:\n      - type: rect\n        x: 30\n        y: 30\n        width: 120\n        height: 80\n        fill: "#E74C3C"\n      - type: ellipse\n        cx: 280\n        cy: 100\n        rx: 60\n        ry: 40\n        fill: "#3498DB"\n      - type: text\n        x: 200\n        y: 240\n        content: "Hello nextPNG!"\n        font_size: 20\n        font_family: "sans-serif"\n        font_weight: "bold"\n        fill: "#FFFFFF"\n        align: "center"`,
  },
  {
    name: "Gradient Star",
    yaml: `npng: "0.5"\ncanvas:\n  width: 400\n  height: 400\n  background: "#1A1A2E"\nlayers:\n  - name: "star"\n    elements:\n      - type: path\n        d: "M 200 50 L 230 140 L 325 140 L 248 195 L 275 285 L 200 232 L 125 285 L 152 195 L 75 140 L 170 140 Z"\n        fill:\n          type: linear-gradient\n          x1: 75\n          y1: 50\n          x2: 325\n          y2: 285\n          stops:\n            - offset: 0\n              color: "#FFD700"\n            - offset: 1\n              color: "#FF8C00"\n        stroke:\n          color: "#B8860B"\n          width: 2`,
  },
  {
    name: "Layer Opacity",
    yaml: `npng: "0.5"\ncanvas:\n  width: 400\n  height: 400\n  background: "#1A1A2E"\nlayers:\n  - name: "background-shapes"\n    opacity: 0.3\n    elements:\n      - type: ellipse\n        cx: 100\n        cy: 100\n        rx: 150\n        ry: 150\n        fill: "#E94560"\n      - type: ellipse\n        cx: 300\n        cy: 300\n        rx: 150\n        ry: 150\n        fill: "#0F3460"\n  - name: "main-content"\n    elements:\n      - type: rect\n        x: 50\n        y: 50\n        width: 300\n        height: 300\n        rx: 20\n        ry: 20\n        fill: "#16213E80"\n        stroke:\n          color: "#E94560"\n          width: 2\n      - type: text\n        x: 200\n        y: 200\n        content: "Layers"\n        font_size: 48\n        font_family: "sans-serif"\n        font_weight: "bold"\n        fill: "#FFFFFF"\n        align: "center"`,
  },
  {
    name: "Transforms",
    yaml: `npng: "0.5"\ncanvas:\n  width: 400\n  height: 400\n  background: "#FFFFFF"\nlayers:\n  - name: "pinwheel"\n    elements:\n      - type: rect\n        x: -60\n        y: -10\n        width: 120\n        height: 20\n        fill: "#E74C3C"\n        transform:\n          translate: [200, 200]\n          rotate: 0\n      - type: rect\n        x: -60\n        y: -10\n        width: 120\n        height: 20\n        fill: "#3498DB"\n        transform:\n          translate: [200, 200]\n          rotate: 45\n      - type: rect\n        x: -60\n        y: -10\n        width: 120\n        height: 20\n        fill: "#2ECC71"\n        transform:\n          translate: [200, 200]\n          rotate: 90\n      - type: rect\n        x: -60\n        y: -10\n        width: 120\n        height: 20\n        fill: "#F39C12"\n        transform:\n          translate: [200, 200]\n          rotate: 135\n      - type: ellipse\n        cx: 0\n        cy: 0\n        rx: 15\n        ry: 15\n        fill: "#2C3E50"\n        transform:\n          translate: [200, 200]`,
  },
];

const DEFAULT_YAML = `npng: "0.5"
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
        content: "nextPNG"
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
        content: "Text-to-Design Graphics"
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

function LandingPage() {
  const valueCards = [
    {
      title: "AI generates editable source",
      body: "Unlike Midjourney or DALL-E that output frozen bitmaps, nextPNG generates structured vector files with layers, text, and styles you can edit.",
    },
    {
      title: "Open npng format",
      body: "YAML-based, human-readable, git-diffable. Like Markdown for design — not locked into any proprietary tool.",
    },
    {
      title: "Lossless at any size",
      body: "Vector source renders sharply at 1x, 4x, or any DPI. Perfect for logos, icons, and print-ready graphics.",
    },
  ];

  const comparisonRows = [
    { feature: "AI generates", us: true, figma: false, midjourney: true, canva: "partial" },
    { feature: "Editable layers", us: true, figma: true, midjourney: false, canva: "partial" },
    { feature: "Open format", us: true, figma: false, midjourney: false, canva: false },
    { feature: "Vector/lossless", us: true, figma: true, midjourney: false, canva: "partial" },
    { feature: "Version-controllable", us: true, figma: false, midjourney: false, canva: false },
    { feature: "Self-hostable", us: true, figma: false, midjourney: false, canva: false },
  ];

  const useCases = [
    { emoji: "🎨", label: "Logos", desc: "Brand marks and wordmarks" },
    { emoji: "✨", label: "Icons", desc: "UI icons and icon sets" },
    { emoji: "📐", label: "Posters", desc: "Event and marketing posters" },
    { emoji: "💳", label: "Cards", desc: "Business and product cards" },
    { emoji: "🏷️", label: "Badges", desc: "Labels, tags, and badges" },
    { emoji: "📊", label: "Infographics", desc: "Data visualization graphics" },
  ];

  const checkMark = (v: boolean | string) =>
    v === true ? "✅" : v === "partial" ? "⚠️" : "❌";

  return (
    <main className="min-h-screen overflow-hidden bg-[#07090f] text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(59,130,246,0.28),transparent_32%),radial-gradient(circle_at_82%_28%,rgba(168,85,247,0.22),transparent_30%),radial-gradient(circle_at_55%_82%,rgba(20,184,166,0.14),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold tracking-[0.22em]">nextPNG</div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-blue-300/80">AI-native vector design</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/jacobjiangwei/nextPNG"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-zinc-700 bg-zinc-950/50 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              GitHub
            </a>
            <Link
              href="/viewer"
              className="rounded-full border border-zinc-700 bg-zinc-950/50 px-4 py-2 text-sm text-zinc-300 transition hover:border-blue-400 hover:text-white"
            >
              Viewer
            </Link>
            <Link
              href="/editing"
              className="rounded-full border border-zinc-700 bg-zinc-950/50 px-4 py-2 text-sm text-zinc-300 transition hover:border-blue-400 hover:text-white"
            >
              Open Studio
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
              Open format · AI-native · Editable vector graphics
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Design with AI.<br />Edit like Figma.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              AI image generators give you frozen pixels. nextPNG gives you <strong className="text-white">editable vector source</strong> — layers, shapes, text, and styles in an open YAML format. Export to SVG, PNG, or share the source.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/editing"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_40px_rgba(255,255,255,0.18)] transition hover:bg-blue-100"
              >
                Open Studio — Free
              </Link>
              <a
                href="https://github.com/jacobjiangwei/nextPNG/tree/main/spec"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-zinc-600 bg-zinc-950/60 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-blue-400 hover:bg-blue-500/10"
              >
                Read the spec →
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs text-zinc-400">
              <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5">Prompt → Design</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5">YAML Source</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5">SVG + PNG Export</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5">34 Google Fonts</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5">Open Source</span>
            </div>
          </div>

          {/* Code preview mockup */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-blue-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-zinc-700/80 bg-zinc-950/80 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-zinc-500">npng source → editable design</span>
              </div>
              <div className="grid min-h-[430px] grid-cols-[0.88fr_1.12fr]">
                <div className="border-r border-zinc-800 bg-[#10131c] p-5 font-mono text-[11px] leading-5 text-zinc-400">
                  <div className="text-blue-300">npng: &quot;0.5&quot;</div>
                  <div>canvas:</div>
                  <div className="pl-4">width: 760</div>
                  <div className="pl-4">height: 620</div>
                  <div>layers:</div>
                  <div className="pl-4 text-purple-300">- name: hero card</div>
                  <div className="pl-8">elements:</div>
                  <div className="pl-10 text-emerald-300">- type: rect</div>
                  <div className="pl-12">rx: 28</div>
                  <div className="pl-12">fill: glass-gradient</div>
                  <div className="pl-10 text-emerald-300">- type: text</div>
                  <div className="pl-12">content: Launch faster</div>
                  <div className="pl-12">font_family: Montserrat</div>
                  <div className="mt-4 rounded-lg border border-blue-400/20 bg-blue-400/10 p-3 font-sans text-xs leading-5 text-blue-100">
                    Edit the source: change colors, move layers, swap fonts, rewrite text, then export to SVG or PNG.
                  </div>
                </div>
                <div className="relative overflow-hidden bg-[radial-gradient(circle_at_34%_24%,rgba(96,165,250,0.45),transparent_25%),radial-gradient(circle_at_72%_64%,rgba(236,72,153,0.32),transparent_28%),#0f1020] p-6">
                  <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:32px_32px]" />
                  <div className="relative mt-10 rounded-[1.6rem] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
                    <div className="mb-14 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-300 via-fuchsia-300 to-amber-200 shadow-lg" />
                    <div className="text-3xl font-semibold tracking-tight text-white">Launch faster</div>
                    <div className="mt-3 max-w-[280px] text-sm leading-6 text-white/65">
                      Prompt-generated design source that stays layered, editable, and lossless.
                    </div>
                    <div className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-950">Export SVG / PNG</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value cards */}
        <section className="grid gap-3 pb-10 md:grid-cols-3">
          {valueCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5">
              <div className="text-sm font-semibold text-white">{card.title}</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">{card.body}</div>
            </div>
          ))}
        </section>

        {/* Use cases */}
        <section className="pb-10">
          <h2 className="mb-6 text-center text-2xl font-semibold text-white">What you can design</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {useCases.map((uc) => (
              <div key={uc.label} className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-950/55 p-4 text-center">
                <span className="text-2xl">{uc.emoji}</span>
                <div className="mt-2 text-sm font-semibold text-white">{uc.label}</div>
                <div className="mt-1 text-xs text-zinc-500">{uc.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison table */}
        <section className="pb-10">
          <h2 className="mb-6 text-center text-2xl font-semibold text-white">Why npng?</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/55">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-3 text-left font-medium">Feature</th>
                  <th className="px-4 py-3 text-center font-semibold text-blue-300">nextPNG</th>
                  <th className="px-4 py-3 text-center font-medium">Figma</th>
                  <th className="px-4 py-3 text-center font-medium">Midjourney</th>
                  <th className="px-4 py-3 text-center font-medium">Canva</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-zinc-800/50">
                    <td className="px-4 py-2.5 text-zinc-300">{row.feature}</td>
                    <td className="px-4 py-2.5 text-center">{checkMark(row.us)}</td>
                    <td className="px-4 py-2.5 text-center">{checkMark(row.figma)}</td>
                    <td className="px-4 py-2.5 text-center">{checkMark(row.midjourney)}</td>
                    <td className="px-4 py-2.5 text-center">{checkMark(row.canva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* npng format highlight */}
        <section className="pb-10">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-8">
            <h2 className="mb-4 text-2xl font-semibold text-white">The npng format — open standard for AI-native design</h2>
            <p className="mb-6 max-w-3xl text-sm leading-6 text-zinc-400">
              npng is a YAML-based vector graphics format designed for AI generation. It&apos;s human-readable, git-diffable, and can be rendered by any Canvas 2D implementation. Think of it as Markdown for design files.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-300">For AI agents</div>
                <div className="text-sm text-zinc-400">Any LLM can generate valid npng with a system prompt. No special API needed.</div>
              </div>
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">For developers</div>
                <div className="text-sm text-zinc-400">YAML source, git-friendly, render with JavaScript/Python. npm package coming soon.</div>
              </div>
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-300">For designers</div>
                <div className="text-sm text-zinc-400">Layers, styles, components — familiar concepts, now AI-generated and text-portable.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-500">
          <div className="flex items-center justify-center gap-4">
            <a href="https://github.com/jacobjiangwei/nextPNG" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition">GitHub</a>
            <span>·</span>
            <a href="https://github.com/jacobjiangwei/nextPNG/tree/main/spec" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition">Format Spec</a>
            <span>·</span>
            <a href="https://github.com/jacobjiangwei/nextPNG/tree/main/examples" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition">Examples</a>
            <span>·</span>
            <span>© {new Date().getFullYear()} nextPNG</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

export function DesignStudio() {
  const [state, dispatch] = useReducer(editorReducer, DEFAULT_YAML, createInitialState);
  const [leftTab, setLeftTab] = useState<"ai" | "layers" | "source">("ai");
  const [exportScale, setExportScale] = useState(4);
  const [projects, setProjects] = useState<StoredNpngProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectStorageReady, setProjectStorageReady] = useState(false);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;

  useEffect(() => {
    const stored = loadStoredProjectState();
    let nextProjects = stored.projects;
    let nextActiveProjectId = stored.activeProjectId;
    let nextYaml: string | null = null;
    let nextLeftTab: typeof leftTab | null = null;
    let nextProjectStatus: string | null = null;

    const payload = readNpngSharePayload(window.location.search, window.location.hash);
    if (payload) {
      try {
        const sharedYaml = decodeNpngShare(payload);
        const sharedProject = createStoredProject(sharedYaml, "Shared npng", "Imported from share link");
        nextProjects = [...nextProjects, sharedProject];
        nextActiveProjectId = sharedProject.id;
        nextYaml = sharedYaml;
        nextLeftTab = "source";
        nextProjectStatus = "Loaded shared npng source into a local project.";
      } catch (error) {
        console.error(error);
        nextProjectStatus = "Could not decode the shared npng URL.";
      }
    } else {
      const activeStoredProject = nextProjects.find((project) => project.id === nextActiveProjectId);
      if (activeStoredProject) {
        nextYaml = getProjectDocument(activeStoredProject);
      }
    }

    const timer = window.setTimeout(() => {
      if (nextYaml) dispatch({ type: "SET_YAML", yaml: nextYaml, pushHistory: false });
      if (nextLeftTab) setLeftTab(nextLeftTab);
      if (nextProjectStatus) setProjectStatus(nextProjectStatus);
      setProjects(nextProjects);
      setActiveProjectId(nextActiveProjectId);
      setProjectStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!projectStorageReady) return;
    persistStoredProjectState(projects, activeProjectId);
  }, [projects, activeProjectId, projectStorageReady]);

  useEffect(() => {
    if (!projectStorageReady || !activeProjectId) return;
    const timer = window.setTimeout(() => {
      setProjects((currentProjects) => updateProjectDraft(
        currentProjects,
        activeProjectId,
        state.yamlText,
        inferProjectName(state.parsedDoc),
      ));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeProjectId, projectStorageReady, state.parsedDoc, state.yamlText]);

  const handleFitToScreen = useCallback(() => {
    const cw = state.parsedDoc?.canvas?.width ?? 600;
    const ch = state.parsedDoc?.canvas?.height ?? 400;
    // Approximate viewport: window minus Figma-like sidebars
    const vw = Math.max(200, window.innerWidth - 600);
    const vh = Math.max(200, window.innerHeight - 80);
    const zoom = Math.min(vw / cw, vh / ch) * 0.9;
    dispatch({ type: "SET_ZOOM", zoom });
    dispatch({ type: "SET_PAN", panX: 0, panY: 0 });
  }, [state.parsedDoc]);

  useKeyboardShortcuts(dispatch, state.selection, state.parsedDoc, state.zoom, handleFitToScreen);

  const handleYamlChange = useCallback((yaml: string) => {
    dispatch({ type: "SET_YAML", yaml });
  }, []);

  const handleExportPng = useCallback(async () => {
    if (!state.parsedDoc) {
      alert("Cannot export PNG until the YAML is valid.");
      return;
    }
    try {
      await preloadNpngImages(state.parsedDoc);
      const canvas = document.createElement("canvas");
      renderNpng(state.parsedDoc, canvas, { pixelRatio: exportScale });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        alert("PNG export failed.");
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `export@${exportScale}x.png`;
      link.href = objectUrl;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      console.error(error);
      alert("PNG export failed because one or more image assets could not be rendered.");
    }
  }, [state.parsedDoc, exportScale]);

  const handleDownloadNpng = useCallback(() => {
    const blob = new Blob([state.yamlText], { type: "text/yaml" });
    const link = document.createElement("a");
    link.download = "image.npng";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [state.yamlText]);

  const handleExportSvg = useCallback(() => {
    if (!state.parsedDoc) {
      alert("Cannot export SVG until the YAML is valid.");
      return;
    }
    const svg = npngToSvg(state.parsedDoc);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = "export.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [state.parsedDoc]);

  const handleExportPdf = useCallback(async () => {
    if (!state.parsedDoc) {
      alert("Cannot export PDF until the YAML is valid.");
      return;
    }
    try {
      await preloadNpngImages(state.parsedDoc);
      const canvas = document.createElement("canvas");
      renderNpng(state.parsedDoc, canvas, { pixelRatio: exportScale });
      const imgData = canvas.toDataURL("image/png");
      const w = state.parsedDoc.canvas?.width ?? 800;
      const h = state.parsedDoc.canvas?.height ?? 600;
      const { jsPDF } = await import("jspdf");
      const orientation = w >= h ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "px", format: [w, h] });
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save("export.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF export failed.");
    }
  }, [state.parsedDoc, exportScale]);

  const handleLoadExample = useCallback((yaml: string) => {
    dispatch({ type: "SET_YAML", yaml });
  }, []);

  const handleNewProject = useCallback(() => {
    const project = createStoredProject(DEFAULT_YAML, "Untitled npng", "Created");
    setProjects((currentProjects) => [...currentProjects, project]);
    setActiveProjectId(project.id);
    dispatch({ type: "SET_YAML", yaml: DEFAULT_YAML, pushHistory: false });
    setShareUrl(null);
    setProjectStatus("Created a new local project.");
    setLeftTab("source");
  }, []);

  const handleSaveVersion = useCallback(() => {
    if (!activeProjectId) {
      const project = createStoredProject(state.yamlText, inferProjectName(state.parsedDoc), "Saved version 1");
      setProjects((currentProjects) => [...currentProjects, project]);
      setActiveProjectId(project.id);
      setProjectStatus("Saved this npng as a local project.");
      return;
    }

    const nextVersionNumber = (activeProject?.versions.length ?? 0) + 1;
    setProjects((currentProjects) => saveProjectVersion(
      currentProjects,
      activeProjectId,
      state.yamlText,
      `Saved version ${nextVersionNumber}`,
    ));
    setProjectStatus(`Saved version ${nextVersionNumber}.`);
  }, [activeProject, activeProjectId, state.parsedDoc, state.yamlText]);

  const handleOpenProject = useCallback((projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    setActiveProjectId(project.id);
    dispatch({ type: "SET_YAML", yaml: getProjectDocument(project), pushHistory: false });
    setShareUrl(null);
    setProjectStatus(`Opened ${project.name}.`);
  }, [projects]);

  const handleRestoreVersion = useCallback((projectId: string, versionId: string) => {
    const project = projects.find((item) => item.id === projectId);
    const version = project?.versions.find((item) => item.id === versionId);
    if (!project || !version) return;

    setActiveProjectId(projectId);
    setProjects((currentProjects) => currentProjects.map((item) => (
      item.id === projectId
        ? { ...item, draftYaml: version.yamlText, currentVersionId: version.id, updatedAt: new Date().toISOString() }
        : item
    )));
    dispatch({ type: "SET_YAML", yaml: version.yamlText, pushHistory: false });
    setShareUrl(null);
    setProjectStatus(`Restored ${version.label}.`);
  }, [projects]);

  const handleDeleteProject = useCallback((projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !window.confirm(`Delete local project "${project.name}"?`)) return;

    const remainingProjects = projects.filter((item) => item.id !== projectId);
    setProjects(remainingProjects);
    if (projectId === activeProjectId) {
      const nextProject = remainingProjects[0] ?? null;
      setActiveProjectId(nextProject?.id ?? null);
      dispatch({ type: "SET_YAML", yaml: nextProject ? getProjectDocument(nextProject) : DEFAULT_YAML, pushHistory: false });
    }
    setShareUrl(null);
    setProjectStatus("Deleted the local project.");
  }, [activeProjectId, projects]);

  const handleCreateShareLink = useCallback(async () => {
    const url = `${window.location.origin}/viewer#npng=${encodeNpngShare(state.yamlText)}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setProjectStatus("Viewer share link copied.");
    } catch (error) {
      console.error(error);
      setProjectStatus("Copy failed; select the link below manually.");
    }
  }, [state.yamlText]);

  const handleImageUpload = useCallback((dataUrl: string, imageWidth: number, imageHeight: number) => {
    const maxSize = 300;
    const scale = Math.min(1, maxSize / Math.max(imageWidth, imageHeight));
    const width = Math.round(imageWidth * scale);
    const height = Math.round(imageHeight * scale);
    const canvasWidth = state.parsedDoc?.canvas?.width ?? 600;
    const canvasHeight = state.parsedDoc?.canvas?.height ?? 400;

    dispatch({
      type: "ADD_ELEMENT",
      layerIndex: -1,
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
    ? getElementAtAddress(state.parsedDoc, firstSel) ?? null
    : null;
  const leftTabs: { id: typeof leftTab; label: string; hint: string }[] = [
    { id: "ai", label: "AI", hint: "Prompt and patch" },
    { id: "layers", label: "Layers", hint: "Object tree" },
    { id: "source", label: "Source", hint: "npng YAML" },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#181818] text-zinc-200">
      <Toolbar
        activeTool={state.activeTool}
        zoom={state.zoom}
        showGrid={state.showGrid}
        dispatch={dispatch}
        exportScale={exportScale}
        onExportScaleChange={setExportScale}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExportPdf={handleExportPdf}
        onDownloadNpng={handleDownloadNpng}
        onLoadExample={handleLoadExample}
        onFitToScreen={handleFitToScreen}
        onImageUpload={handleImageUpload}
        onNewProject={handleNewProject}
        onSaveVersion={handleSaveVersion}
        onCreateShareLink={handleCreateShareLink}
        examples={EXAMPLES}
        canUndo={state.historyIndex > 0}
        canRedo={state.historyIndex < state.history.length - 1}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left workspace panel: AI / Layers / Source */}
        <aside className="w-[292px] shrink-0 border-r border-zinc-700/80 bg-[#232323] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-700/80">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-100">{activeProject?.name ?? "Untitled npng"}</div>
                <div className="mt-0.5 text-[11px] text-blue-300/80">AI-native editable design</div>
              </div>
              <div className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400">
                {state.parsedDoc?.npng ?? "npng"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 border-b border-zinc-700/80 p-2">
            {leftTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLeftTab(tab.id)}
                className={`rounded-md px-2 py-1.5 text-left transition ${
                  leftTab === tab.id
                    ? "bg-zinc-700/90 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
                title={tab.hint}
              >
                <div className="text-xs font-medium">{tab.label}</div>
                <div className="text-[9px] text-zinc-500">{tab.hint}</div>
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {leftTab === "ai" && (
              <div className="h-full overflow-hidden">
                <ChatPanel
                  onYamlGenerated={handleLoadExample}
                  currentYaml={state.yamlText}
                  onOpenLayers={() => setLeftTab("layers")}
                  selectionContext={selectedElement && firstSel ? {
                    label: selectedElement.name ?? `${selectedElement.type} #${firstSel.elementIndex + 1}`,
                    element: selectedElement,
                  } : null}
                />
              </div>
            )}
            {leftTab === "layers" && (
              <LayerPanel doc={state.parsedDoc} selection={state.selection} dispatch={dispatch} />
            )}
            {leftTab === "source" && (
              <YamlEditor value={state.yamlText} onChange={handleYamlChange} />
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-hidden bg-[#191919]">
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
        </main>

        {/* Right sidebar: Figma-like Design inspector */}
        <aside className="w-[300px] shrink-0 border-l border-zinc-700/80 bg-[#252525] flex flex-col overflow-hidden">
          <div className="border-b border-zinc-700/80 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-200">Design</div>
              <div className="text-xs text-zinc-500">{Math.round(state.zoom * 100)}%</div>
            </div>
          </div>

          <div className="border-b border-zinc-700/80 px-4 py-3 text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Page</span>
              <span className="text-zinc-500">{state.parsedDoc?.canvas?.width ?? 0} x {state.parsedDoc?.canvas?.height ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-zinc-800 px-2 py-1.5 text-zinc-300">
              <span
                className="h-4 w-4 rounded border border-zinc-600"
                style={{ background: state.parsedDoc?.canvas?.background ?? "#1E1E1E" }}
              />
              <span className="font-mono text-[11px]">{state.parsedDoc?.canvas?.background ?? "#1E1E1E"}</span>
              <span className="ml-auto text-zinc-500">100%</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <div className="border-b border-zinc-700/80 px-3 py-2 text-xs font-semibold text-zinc-400">
              {selectedElement ? "Selection" : "Design"}
            </div>
            <PropertyPanel
              element={selectedElement}
              address={firstSel}
              selectionCount={state.selection.length}
              doc={state.parsedDoc}
              dispatch={dispatch}
            />
          </div>

        </aside>
      </div>
    </div>
  );
}

export default function Home() {
  return <LandingPage />;
}
