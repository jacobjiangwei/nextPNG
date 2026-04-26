import { useEffect } from "react";
import type { EditorAction, ElementAddress } from "../lib/editorState";
import type { NpngDocument } from "../lib/types";

export function useKeyboardShortcuts(
  dispatch: React.Dispatch<EditorAction>,
  selection: ElementAddress[],
  parsedDoc: NpngDocument | null,
  zoom: number,
  onFitToScreen: () => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest(".cm-editor") !== null));

      if (e.defaultPrevented || isEditableTarget) return;

      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      } else if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      } else if (meta && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        dispatch({ type: "SET_ZOOM", zoom: zoom * 1.2 });
      } else if (meta && e.key === "-") {
        e.preventDefault();
        dispatch({ type: "SET_ZOOM", zoom: zoom / 1.2 });
      } else if (meta && e.key === "0") {
        e.preventDefault();
        onFitToScreen();
      } else if (meta && e.key === "'") {
        e.preventDefault();
        dispatch({ type: "TOGGLE_GRID" });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (selection.length > 0) {
          e.preventDefault();
          // Delete in reverse order to maintain indices
          const sorted = [...selection].sort((a, b) => b.elementIndex - a.elementIndex || b.layerIndex - a.layerIndex);
          for (const addr of sorted) {
            dispatch({ type: "DELETE_ELEMENT", address: addr });
          }
        }
      } else if (e.key === "Escape") {
        dispatch({ type: "SELECT", address: null });
        dispatch({ type: "SET_TOOL", tool: "select" });
      } else if (selection.length > 0 && parsedDoc?.layers) {
        // Arrow key nudging — nudge all selected
        const delta = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === "ArrowLeft") dx = -delta;
        else if (e.key === "ArrowRight") dx = delta;
        else if (e.key === "ArrowUp") dy = -delta;
        else if (e.key === "ArrowDown") dy = delta;
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          for (const sel of selection) {
            const layer = parsedDoc.layers[sel.layerIndex];
            const elem = layer?.elements?.[sel.elementIndex];
            if (elem) {
              let props: Record<string, unknown> = {};
              if (elem.type === "rect" || elem.type === "text") {
                props = { x: (elem.x ?? 0) + dx, y: (elem.y ?? 0) + dy };
              } else if (elem.type === "ellipse") {
                props = { cx: (elem.cx ?? 0) + dx, cy: (elem.cy ?? 0) + dy };
              } else if (elem.type === "line") {
                props = { x1: (elem.x1 ?? 0) + dx, y1: (elem.y1 ?? 0) + dy, x2: (elem.x2 ?? 0) + dx, y2: (elem.y2 ?? 0) + dy };
              }
              if (Object.keys(props).length > 0) {
                dispatch({ type: "UPDATE_ELEMENT", address: sel, props });
              }
            }
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, selection, parsedDoc, zoom, onFitToScreen]);
}
