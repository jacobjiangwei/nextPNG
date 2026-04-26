"use client";

import { useState } from "react";
import type { NpngDocument } from "../lib/types";
import type { ElementAddress, EditorAction } from "../lib/editorState";

interface LayerPanelProps {
  doc: NpngDocument | null;
  selection: ElementAddress[];
  dispatch: React.Dispatch<EditorAction>;
}

export default function LayerPanel({ doc, selection, dispatch }: LayerPanelProps) {
  const [editingLayer, setEditingLayer] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const startRename = (li: number, name: string) => {
    setEditingLayer(li);
    setEditName(name);
  };

  const commitRename = () => {
    if (editingLayer !== null && editName.trim()) {
      dispatch({ type: "RENAME_LAYER", layerIndex: editingLayer, name: editName.trim() });
    }
    setEditingLayer(null);
  };

  if (!doc?.layers?.length) {
    return (
      <div className="flex flex-col h-full bg-[#1e1e1e]">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-700">
          <span>Layers</span>
          <button
            onClick={() => dispatch({ type: "ADD_LAYER" })}
            className="text-zinc-400 hover:text-zinc-200 px-1"
            title="Add layer"
          >+</button>
        </div>
        <div className="p-3 text-xs text-zinc-500">No layers</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-700">
        <span>Layers</span>
        <button
          onClick={() => dispatch({ type: "ADD_LAYER" })}
          className="text-zinc-400 hover:text-zinc-200 px-1"
          title="Add layer"
        >+</button>
      </div>
      <div className="flex-1 overflow-auto">
        {doc.layers.map((layer, li) => (
          <div key={li}>
            <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-800/50 border-b border-zinc-700/50">
              <button
                onClick={() => dispatch({ type: "TOGGLE_LAYER_VISIBILITY", layerIndex: li })}
                className={`text-xs w-5 h-5 flex items-center justify-center rounded ${layer.visible === false ? "text-zinc-600" : "text-zinc-300"}`}
                title={layer.visible === false ? "Show layer" : "Hide layer"}
              >
                {layer.visible === false ? "○" : "●"}
              </button>
              {editingLayer === li ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingLayer(null); }}
                  className="flex-1 text-xs bg-zinc-700 border border-zinc-500 rounded px-1 py-0.5 text-zinc-200 min-w-0"
                />
              ) : (
                <span
                  className="text-xs text-zinc-400 font-medium flex-1 truncate cursor-pointer"
                  onDoubleClick={() => startRename(li, layer.name || `Layer ${li + 1}`)}
                >
                  {layer.name || `Layer ${li + 1}`}
                </span>
              )}
              <button
                onClick={() => dispatch({ type: "REORDER_LAYER", fromIndex: li, toIndex: Math.max(0, li - 1) })}
                disabled={li === 0}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-0.5"
                title="Move layer up"
              >▲</button>
              <button
                onClick={() => dispatch({ type: "REORDER_LAYER", fromIndex: li, toIndex: Math.min(doc.layers!.length - 1, li + 1) })}
                disabled={li === doc.layers!.length - 1}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-0.5"
                title="Move layer down"
              >▼</button>
              <button
                onClick={() => dispatch({ type: "DELETE_LAYER", layerIndex: li })}
                className="text-[10px] text-zinc-500 hover:text-red-400 px-0.5"
                title="Delete layer"
              >✕</button>
            </div>
            {(layer.elements ?? []).map((elem, ei) => {
              const isSelected = selection.some(s => s.layerIndex === li && s.elementIndex === ei);
              let label: string = elem.type;
              if (elem.type === "text" && elem.content) label = `text: "${elem.content}"`;
              const totalElements = (layer.elements ?? []).length;
              return (
                <div key={ei} className={`flex items-center transition-colors duration-150 ${
                  isSelected ? "bg-blue-600/50 border-l-2 border-blue-400" : "hover:bg-zinc-700/50 border-l-2 border-transparent"
                }`}>
                  <button
                    onClick={(e) => dispatch({
                      type: "SELECT",
                      address: { layerIndex: li, elementIndex: ei },
                      append: e.shiftKey || e.metaKey || e.ctrlKey,
                    })}
                    className={`flex-1 text-left px-5 py-1 text-xs truncate ${
                      isSelected ? "text-blue-200 font-medium" : "text-zinc-400"
                    }`}
                    title="Click to select, Shift/Cmd/Ctrl-click to add or remove"
                  >
                    {label}
                  </button>
                  <button
                    onClick={() => dispatch({ type: "REORDER_ELEMENT", from: { layerIndex: li, elementIndex: ei }, toIndex: Math.max(0, ei - 1) })}
                    disabled={ei === 0}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-0.5"
                  >▲</button>
                  <button
                    onClick={() => dispatch({ type: "REORDER_ELEMENT", from: { layerIndex: li, elementIndex: ei }, toIndex: Math.min(totalElements - 1, ei + 1) })}
                    disabled={ei === totalElements - 1}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-1"
                  >▼</button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
