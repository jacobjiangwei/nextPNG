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
import { preloadNpngImages, renderNpng } from "../lib/renderer";

const SATISFACTION_PEACH_YAML = `npng: "0.4"
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

const ORIGINAL_APPLE_MARK_YAML = `npng: "0.4"
canvas:
  width: 760
  height: 620
  background: "#F5F7FB"
layers:
  - name: "paper background"
    elements:
      - type: rect
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
            - offset: 0.55
              color: "#F4F7FB"
            - offset: 1
              color: "#E7EDF7"
      - type: ellipse
        cx: 376
        cy: 326
        rx: 270
        ry: 280
        fill:
          type: radial-gradient
          cx: 376
          cy: 290
          r: 330
          stops:
            - offset: 0
              color: "#FFFFFF"
            - offset: 0.7
              color: "#E2E8F055"
            - offset: 1
              color: "#CBD5E100"

  - name: "ground shadow"
    opacity: 0.58
    filters:
      - type: blur
        radius: 18
    elements:
      - type: ellipse
        cx: 383
        cy: 525
        rx: 172
        ry: 34
        fill: "#0F172A55"
      - type: ellipse
        cx: 398
        cy: 512
        rx: 122
        ry: 20
        fill: "#33415555"

  - name: "body outer glow"
    opacity: 0.36
    filters:
      - type: blur
        radius: 16
    elements:
      - type: path
        d: "M 374 190 C 337 154 279 150 233 184 C 181 222 160 304 185 391 C 210 474 268 538 317 546 C 343 551 354 523 381 522 C 407 522 421 550 452 537 C 508 515 561 430 574 356 C 582 316 570 291 550 273 C 530 287 502 284 487 263 C 472 241 482 216 505 205 C 469 164 411 155 374 190 Z"
        fill: "#111827"

  - name: "main body"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 22
        radius: 28
        color: "#0F172A4D"
    elements:
      - type: path
        d: "M 374 190 C 337 154 279 150 233 184 C 181 222 160 304 185 391 C 210 474 268 538 317 546 C 343 551 354 523 381 522 C 407 522 421 550 452 537 C 508 515 561 430 574 356 C 582 316 570 291 550 273 C 530 287 502 284 487 263 C 472 241 482 216 505 205 C 469 164 411 155 374 190 Z"
        fills:
          - fill:
              type: linear-gradient
              x1: 205
              y1: 170
              x2: 555
              y2: 560
              stops:
                - offset: 0
                  color: "#475569"
                - offset: 0.26
                  color: "#111827"
                - offset: 0.68
                  color: "#030712"
                - offset: 1
                  color: "#334155"
          - fill:
              type: radial-gradient
              cx: 285
              cy: 245
              r: 230
              stops:
                - offset: 0
                  color: "#FFFFFF55"
                - offset: 0.34
                  color: "#FFFFFF18"
                - offset: 0.75
                  color: "#FFFFFF00"
            opacity: 0.9
          - fill:
              type: radial-gradient
              cx: 495
              cy: 500
              r: 210
              stops:
                - offset: 0
                  color: "#94A3B822"
                - offset: 1
                  color: "#94A3B800"
            opacity: 0.85
        strokes:
          - color: "#FFFFFF7A"
            width: 2
          - color: "#020617"
            width: 1

  - name: "bite polish"
    elements:
      - type: path
        d: "M 550 273 C 530 287 502 284 487 263 C 472 241 482 216 505 205"
        fill: "none"
        stroke:
          color: "#FFFFFF78"
          width: 4
          cap: round
      - type: path
        d: "M 552 278 C 533 294 498 289 481 265"
        fill: "none"
        stroke:
          color: "#02061766"
          width: 2
          cap: round

  - name: "body sculpting"
    elements:
      - type: path
        d: "M 235 218 C 266 180 323 174 360 205 C 303 214 255 259 229 331 C 213 281 214 244 235 218 Z"
        fill:
          type: linear-gradient
          x1: 228
          y1: 184
          x2: 360
          y2: 332
          stops:
            - offset: 0
              color: "#FFFFFF7D"
            - offset: 0.42
              color: "#FFFFFF2E"
            - offset: 1
              color: "#FFFFFF00"
      - type: path
        d: "M 283 493 C 319 516 369 520 418 497"
        fill: "none"
        stroke:
          color: "#FFFFFF3D"
          width: 5
          cap: round
      - type: path
        d: "M 518 364 C 496 444 455 500 412 520"
        fill: "none"
        stroke:
          color: "#64748B45"
          width: 5
          cap: round

  - name: "stem and leaf"
    filters:
      - type: drop-shadow
        dx: 0
        dy: 10
        radius: 14
        color: "#0F172A45"
    elements:
      - type: path
        d: "M 365 188 C 352 142 369 96 414 65 C 433 109 419 163 381 203 Z"
        fills:
          - fill:
              type: linear-gradient
              x1: 366
              y1: 68
              x2: 395
              y2: 202
              stops:
                - offset: 0
                  color: "#64748B"
                - offset: 0.55
                  color: "#111827"
                - offset: 1
                  color: "#020617"
          - fill:
              type: radial-gradient
              cx: 385
              cy: 97
              r: 70
              stops:
                - offset: 0
                  color: "#FFFFFF42"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.8
        stroke:
          color: "#FFFFFF70"
          width: 1.5
      - type: path
        d: "M 394 148 C 426 88 500 57 568 86 C 543 153 467 187 394 148 Z"
        fills:
          - fill:
              type: linear-gradient
              x1: 398
              y1: 154
              x2: 562
              y2: 82
              stops:
                - offset: 0
                  color: "#1F2937"
                - offset: 0.46
                  color: "#020617"
                - offset: 1
                  color: "#475569"
          - fill:
              type: radial-gradient
              cx: 505
              cy: 90
              r: 100
              stops:
                - offset: 0
                  color: "#FFFFFF4A"
                - offset: 0.55
                  color: "#FFFFFF10"
                - offset: 1
                  color: "#FFFFFF00"
            opacity: 0.9
        stroke:
          color: "#FFFFFF72"
          width: 2
      - type: path
        d: "M 421 140 C 459 124 505 99 544 86"
        fill: "none"
        stroke:
          color: "#FFFFFF6B"
          width: 2.4
          cap: round

  - name: "caption"
    opacity: 0.8
    elements:
      - type: text
        x: 380
        y: 590
        content: "Original curve-built apple-style mark"
        font_size: 13
        font_family: "sans-serif"
        fill: "#64748B"
        align: center
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
    name: "Satisfaction Peach",
    yaml: SATISFACTION_PEACH_YAML,
  },
  {
    name: "Original Apple-Style Mark",
    yaml: ORIGINAL_APPLE_MARK_YAML,
  },
  {
    name: "Four Tile Window Mark",
    yaml: FOUR_TILE_WINDOW_MARK_YAML,
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
  const [exportScale, setExportScale] = useState(4);

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
    ? state.parsedDoc.layers[firstSel.layerIndex]?.elements?.[firstSel.elementIndex] ?? null
    : null;

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-zinc-200">
      <Toolbar
        activeTool={state.activeTool}
        zoom={state.zoom}
        showGrid={state.showGrid}
        dispatch={dispatch}
        exportScale={exportScale}
        onExportScaleChange={setExportScale}
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
            <PropertyPanel
              element={selectedElement}
              address={firstSel}
              selectionCount={state.selection.length}
              doc={state.parsedDoc}
              dispatch={dispatch}
            />
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
