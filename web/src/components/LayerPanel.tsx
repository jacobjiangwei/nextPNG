"use client";

import { useState } from "react";
import type { NpngDocument, NpngElement } from "../lib/types";
import type { ElementAddress, EditorAction } from "../lib/editorState";
import { getElementShortLabel } from "../lib/elementLabels";
import { addressKey, addressPath, childElements, makeAddress, sameAddress } from "../lib/elementTree";

interface LayerPanelProps {
  doc: NpngDocument | null;
  selection: ElementAddress[];
  dispatch: React.Dispatch<EditorAction>;
}

type EditingTarget =
  | { type: "layer"; layerIndex: number }
  | { type: "element"; key: string; address: ElementAddress };

type DragItem =
  | { type: "layer"; layerIndex: number }
  | { type: "element"; address: ElementAddress; parentKey: string };

function parentKeyFor(address: ElementAddress): string {
  return `${address.layerIndex}:${addressPath(address).slice(0, -1).join(".")}`;
}

export default function LayerPanel({ doc, selection, dispatch }: LayerPanelProps) {
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [editName, setEditName] = useState("");
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const startRename = (li: number, name: string) => {
    setEditingTarget({ type: "layer", layerIndex: li });
    setEditName(name);
  };

  const startRenameElement = (address: ElementAddress, elem: NpngElement, fallbackLabel: string) => {
    setEditingTarget({ type: "element", key: addressKey(address), address });
    setEditName(elem.name || fallbackLabel);
  };

  const commitRename = () => {
    if (!editingTarget) return;
    const name = editName.trim();
    if (editingTarget.type === "layer" && name) {
      dispatch({ type: "RENAME_LAYER", layerIndex: editingTarget.layerIndex, name });
    }
    if (editingTarget.type === "element") {
      dispatch({ type: "RENAME_ELEMENT", address: editingTarget.address, name });
    }
    setEditingTarget(null);
  };

  const cancelRename = () => setEditingTarget(null);

  const clearDragState = () => {
    setDragItem(null);
    setDragOverKey(null);
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

  const renderElementRows = (
    layerIndex: number,
    elements: NpngElement[],
    depth: number,
    pathPrefix: number[],
    layerLocked: boolean,
    ancestorTransformed = false,
  ): React.ReactNode => {
    return [...elements.entries()].reverse().map(([elementIndex, elem]) => {
      const path = [...pathPrefix, elementIndex];
      const address = makeAddress(layerIndex, path);
      const rowKey = addressKey(address);
      const parentKey = parentKeyFor(address);
      const isSelected = selection.some(s => sameAddress(s, address));
      const label = getElementShortLabel(elem, elementIndex);
      const totalElements = elements.length;
      const children = childElements(elem) ?? [];
      const locked = layerLocked || elem.locked;
      const childSelectionBlocked = ancestorTransformed;
      const canReorder = depth === 0;
      const isEditing = editingTarget?.type === "element" && editingTarget.key === rowKey;
      const canDragElement = !locked && !childSelectionBlocked;
      return (
        <div key={rowKey}>
          <div
            draggable={canDragElement}
            onDragStart={(e) => {
              if (!canDragElement) return;
              e.stopPropagation();
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", rowKey);
              setDragItem({ type: "element", address, parentKey });
            }}
            onDragOver={(e) => {
              if (dragItem?.type === "element" && dragItem.parentKey === parentKey && canDragElement) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverKey(rowKey);
              }
            }}
            onDragLeave={() => setDragOverKey((current) => current === rowKey ? null : current)}
            onDrop={(e) => {
              if (dragItem?.type === "element" && dragItem.parentKey === parentKey && canDragElement) {
                e.preventDefault();
                e.stopPropagation();
                dispatch({ type: "REORDER_ELEMENT", from: dragItem.address, toIndex: elementIndex });
              }
              clearDragState();
            }}
            onDragEnd={clearDragState}
            className={`flex items-center transition-colors duration-150 ${
            isSelected ? "bg-blue-600/50 border-l-2 border-blue-400" : "hover:bg-zinc-700/50 border-l-2 border-transparent"
          } ${dragOverKey === rowKey ? "ring-1 ring-blue-400/70 bg-blue-500/10" : ""}`}
              style={{ paddingLeft: `${20 + depth * 14}px`, paddingRight: 4 }}
            >
            {isEditing ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") cancelRename();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 rounded border border-blue-500/70 bg-zinc-900 px-1 py-0.5 text-xs text-zinc-100 outline-none"
              />
            ) : (
              <button
                onClick={(e) => dispatch({
                  type: "SELECT",
                  address,
                  append: e.shiftKey || e.metaKey || e.ctrlKey,
                })}
                onDoubleClick={() => {
                  if (!locked && elem.visible !== false && !childSelectionBlocked) {
                    startRenameElement(address, elem, label);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !locked && elem.visible !== false && !childSelectionBlocked) {
                    startRenameElement(address, elem, label);
                  }
                }}
                disabled={locked || elem.visible === false || childSelectionBlocked}
                className={`flex-1 text-left py-1 text-xs truncate disabled:cursor-not-allowed ${
                  isSelected ? "text-blue-200 font-medium" : locked || elem.visible === false || childSelectionBlocked ? "text-zinc-600" : "text-zinc-400"
                }`}
                title={childSelectionBlocked ? "Select the transformed parent container first" : locked ? "Unlock before selecting" : elem.visible === false ? "Show before selecting" : "Click to select, Shift/Cmd/Ctrl-click to add or remove. Double-click or Enter to rename."}
              >
                <span className="mr-1 text-zinc-600">{canDragElement ? "⋮⋮" : "  "}</span>
                {children.length > 0 ? "▸ " : ""}
                {label}
              </button>
            )}
            <button
              onClick={() => dispatch({ type: "TOGGLE_ELEMENT_VISIBILITY", address })}
              disabled={locked}
              className={`text-[10px] px-0.5 disabled:text-zinc-700 ${elem.visible === false ? "text-zinc-600" : "text-zinc-400 hover:text-zinc-200"}`}
              title={elem.visible === false ? "Show object" : "Hide object"}
            >
              {elem.visible === false ? "○" : "●"}
            </button>
            <button
              onClick={() => dispatch({ type: "TOGGLE_ELEMENT_LOCK", address })}
              disabled={layerLocked}
              className={`text-[10px] px-0.5 disabled:text-zinc-700 ${elem.locked ? "text-amber-300" : "text-zinc-500 hover:text-zinc-300"}`}
              title={elem.locked ? "Unlock object" : "Lock object"}
            >
              {elem.locked ? "L" : "-"}
            </button>
            <button
              onClick={() => dispatch({ type: "REORDER_ELEMENT", from: address, toIndex: Math.min(totalElements - 1, elementIndex + 1) })}
              disabled={!canReorder || elementIndex === totalElements - 1 || locked}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-0.5"
              title={canReorder ? "Move object up visually" : "Drag nested siblings to reorder"}
            >▲</button>
            <button
              onClick={() => dispatch({ type: "REORDER_ELEMENT", from: address, toIndex: Math.max(0, elementIndex - 1) })}
              disabled={!canReorder || elementIndex === 0 || locked}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-1"
              title={canReorder ? "Move object down visually" : "Drag nested siblings to reorder"}
            >▼</button>
          </div>
          {children.length > 0 && renderElementRows(layerIndex, children, depth + 1, path, locked || elem.visible === false, ancestorTransformed || !!elem.transform)}
        </div>
      );
    });
  };

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
        {[...doc.layers.entries()].reverse().map(([li, layer]) => (
          <div key={li}>
            <div
              draggable={!layer.locked}
              onDragStart={(e) => {
                if (layer.locked) return;
                e.stopPropagation();
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", `layer:${li}`);
                setDragItem({ type: "layer", layerIndex: li });
              }}
              onDragOver={(e) => {
                if (dragItem?.type === "layer" && dragItem.layerIndex !== li && !layer.locked) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverKey(`layer:${li}`);
                }
              }}
              onDragLeave={() => setDragOverKey((current) => current === `layer:${li}` ? null : current)}
              onDrop={(e) => {
                if (dragItem?.type === "layer" && dragItem.layerIndex !== li && !layer.locked) {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch({ type: "REORDER_LAYER", fromIndex: dragItem.layerIndex, toIndex: li });
                }
                clearDragState();
              }}
              onDragEnd={clearDragState}
              className={`flex items-center gap-1 px-2 py-1.5 bg-zinc-800/50 border-b border-zinc-700/50 ${dragOverKey === `layer:${li}` ? "ring-1 ring-blue-400/70 bg-blue-500/10" : ""}`}
            >
              <span className={`text-[10px] ${layer.locked ? "text-zinc-700" : "text-zinc-500"}`}>⋮⋮</span>
              <button
                onClick={() => dispatch({ type: "TOGGLE_LAYER_VISIBILITY", layerIndex: li })}
                className={`text-xs w-5 h-5 flex items-center justify-center rounded ${layer.visible === false ? "text-zinc-600" : "text-zinc-300"}`}
                title={layer.visible === false ? "Show layer" : "Hide layer"}
              >
                {layer.visible === false ? "○" : "●"}
              </button>
              <button
                onClick={() => dispatch({ type: "TOGGLE_LAYER_LOCK", layerIndex: li })}
                className={`text-[10px] w-5 h-5 flex items-center justify-center rounded ${layer.locked ? "text-amber-300" : "text-zinc-500 hover:text-zinc-300"}`}
                title={layer.locked ? "Unlock layer" : "Lock layer"}
              >
                {layer.locked ? "L" : "-"}
              </button>
              {editingTarget?.type === "layer" && editingTarget.layerIndex === li ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }}
                  className="flex-1 text-xs bg-zinc-700 border border-zinc-500 rounded px-1 py-0.5 text-zinc-200 min-w-0"
                />
              ) : (
                <span
                  className="text-xs text-zinc-400 font-medium flex-1 truncate cursor-pointer"
                  onDoubleClick={() => { if (!layer.locked) startRename(li, layer.name || `Layer ${li + 1}`); }}
                >
                  {layer.name || `Layer ${li + 1}`}
                </span>
              )}
              <button
                onClick={() => dispatch({ type: "REORDER_LAYER", fromIndex: li, toIndex: Math.min(doc.layers!.length - 1, li + 1) })}
                disabled={li === doc.layers!.length - 1 || layer.locked}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-0.5"
                title="Move layer up visually"
              >▲</button>
              <button
                onClick={() => dispatch({ type: "REORDER_LAYER", fromIndex: li, toIndex: Math.max(0, li - 1) })}
                disabled={li === 0 || layer.locked}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-0.5"
                title="Move layer down visually"
              >▼</button>
              <button
                onClick={() => dispatch({ type: "DELETE_LAYER", layerIndex: li })}
                disabled={layer.locked}
                className="text-[10px] text-zinc-500 hover:text-red-400 disabled:text-zinc-700 px-0.5"
                title="Delete layer"
              >✕</button>
            </div>
            {renderElementRows(li, layer.elements ?? [], 0, [], !!layer.locked)}
          </div>
        ))}
      </div>
    </div>
  );
}
