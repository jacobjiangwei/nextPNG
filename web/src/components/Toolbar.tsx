"use client";

import { useState, useRef } from "react";
import type { Tool, EditorAction } from "../lib/editorState";

interface ToolbarProps {
  activeTool: Tool;
  zoom: number;
  showGrid: boolean;
  dispatch: React.Dispatch<EditorAction>;
  onExportPng: () => void;
  onDownloadNpng: () => void;
  onLoadExample: (yaml: string) => void;
  onFitToScreen: () => void;
  onImageUpload?: (dataUrl: string, width: number, height: number) => void;
  examples: { name: string; yaml: string }[];
  canUndo: boolean;
  canRedo: boolean;
}

const BASIC_TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "rect", label: "Rect" },
  { id: "ellipse", label: "Ellipse" },
  { id: "line", label: "Line" },
  { id: "text", label: "Text" },
  { id: "pen", label: "Pen" },
  { id: "polyline", label: "Polyline" },
  { id: "polygon", label: "Polygon" },
  { id: "frame", label: "Frame" },
];

const SHAPE_TOOLS: { id: Tool; label: string }[] = [
  { id: "star", label: "Star" },
  { id: "polygon-shape", label: "Polygon" },
  { id: "arrow-shape", label: "Arrow" },
];

export default function Toolbar({
  activeTool, zoom, showGrid, dispatch, onExportPng, onDownloadNpng, onLoadExample, onFitToScreen, onImageUpload, examples, canUndo, canRedo,
}: ToolbarProps) {
  const [shapesOpen, setShapesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        onImageUpload(dataUrl, img.naturalWidth, img.naturalHeight);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1a1a] border-b border-zinc-700">
      <span className="text-sm font-bold tracking-wider text-zinc-300 mr-3">NewPNG</span>

      <div className="flex items-center gap-0.5 bg-zinc-800 rounded p-0.5">
        {BASIC_TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: "SET_TOOL", tool: t.id })}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeTool === t.id
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Shapes dropdown */}
      <div className="relative">
        <button
          onClick={() => setShapesOpen(!shapesOpen)}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            SHAPE_TOOLS.some(t => t.id === activeTool)
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          Shapes
        </button>
        {shapesOpen && (
          <div className="absolute left-0 top-full mt-1 w-32 bg-zinc-800 border border-zinc-600 rounded shadow-lg z-50">
            {SHAPE_TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => { dispatch({ type: "SET_TOOL", tool: t.id }); setShapesOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 ${
                  activeTool === t.id ? "text-blue-300" : "text-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-2.5 py-1 text-xs rounded text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700"
      >
        Image
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

      <div className="flex items-center gap-0.5 ml-2">
        <button
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!canUndo}
          className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600 disabled:cursor-not-allowed"
          title="Undo (Cmd+Z)"
        >
          Undo
        </button>
        <button
          onClick={() => dispatch({ type: "REDO" })}
          disabled={!canRedo}
          className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600 disabled:cursor-not-allowed"
          title="Redo (Cmd+Shift+Z)"
        >
          Redo
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 ml-2 bg-zinc-800 rounded p-0.5">
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: zoom / 1.2 })}
          className="px-1.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
          title="Zoom out (Cmd+-)"
        >
          -
        </button>
        <span className="px-1.5 py-1 text-xs text-zinc-300 min-w-[40px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: zoom * 1.2 })}
          className="px-1.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
          title="Zoom in (Cmd+=)"
        >
          +
        </button>
        <button
          onClick={onFitToScreen}
          className="px-1.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
          title="Fit to screen (Cmd+0)"
        >
          Fit
        </button>
      </div>

      {/* Grid toggle */}
      <button
        onClick={() => dispatch({ type: "TOGGLE_GRID" })}
        className={`ml-1 px-2 py-1 text-xs rounded ${showGrid ? "bg-blue-600/30 text-blue-300" : "text-zinc-400 hover:text-zinc-200"}`}
        title="Toggle grid (Cmd+')"
      >
        Grid
      </button>

      <div className="flex-1" />

      <div className="relative group">
        <button className="px-3 py-1 text-xs bg-zinc-700 rounded hover:bg-zinc-600 text-zinc-300">
          Examples
        </button>
        <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-600 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => onLoadExample(ex.yaml)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onExportPng}
        className="px-3 py-1 text-xs bg-zinc-700 rounded hover:bg-zinc-600 text-zinc-300"
      >
        Export PNG
      </button>
      <button
        onClick={onDownloadNpng}
        className="px-3 py-1 text-xs bg-zinc-700 rounded hover:bg-zinc-600 text-zinc-300"
      >
        Download .npng
      </button>
    </div>
  );
}
