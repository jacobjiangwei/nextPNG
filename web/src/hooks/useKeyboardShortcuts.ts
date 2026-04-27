import { useEffect } from "react";
import type { EditorAction, ElementAddress } from "../lib/editorState";
import type { NpngDocument } from "../lib/types";
import { applyMove, getOrigProps } from "../lib/canvasInteraction";
import { compareAddressForRemoval, dropDescendantAddresses, getElementAtAddress, getParentElementList } from "../lib/elementTree";

export function useKeyboardShortcuts(
  dispatch: React.Dispatch<EditorAction>,
  selection: ElementAddress[],
  parsedDoc: NpngDocument | null,
  zoom: number,
  onFitToScreen: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const target = e.target;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest(".cm-editor") !== null));

      if (e.defaultPrevented || isEditableTarget) return;

      if (meta && key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      } else if (meta && key === "z" && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      } else if (meta && key === "a") {
        e.preventDefault();
        dispatch({ type: "SELECT_ALL" });
      } else if (meta && key === "d") {
        if (selection.length > 0) {
          e.preventDefault();
          dispatch({ type: "DUPLICATE_SELECTION" });
        }
      } else if (meta && key === "g" && !e.shiftKey) {
        if (selection.length > 1) {
          e.preventDefault();
          dispatch({ type: "GROUP_SELECTION" });
        }
      } else if (meta && key === "g" && e.shiftKey) {
        if (selection.length === 1) {
          e.preventDefault();
          dispatch({ type: "UNGROUP_SELECTION" });
        }
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
      } else if (meta && (e.code === "BracketLeft" || e.code === "BracketRight") && selection.length === 1 && parsedDoc?.layers) {
        const parent = getParentElementList(parsedDoc, selection[0]);
        if (parent) {
          e.preventDefault();
          const toIndex = e.code === "BracketRight"
            ? (e.shiftKey ? parent.list.length - 1 : parent.index + 1)
            : (e.shiftKey ? 0 : parent.index - 1);
          dispatch({ type: "REORDER_ELEMENT", from: selection[0], toIndex });
        }
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (selection.length > 0) {
          e.preventDefault();
          // Delete in reverse order to maintain indices
          const sorted = dropDescendantAddresses(selection).sort(compareAddressForRemoval);
          for (const addr of sorted) {
            dispatch({ type: "DELETE_ELEMENT", address: addr });
          }
        }
      } else if (e.key === "Escape") {
        dispatch({ type: "SELECT", address: null });
        dispatch({ type: "SET_TOOL", tool: "select" });
      } else if (!meta && !e.altKey && !e.shiftKey && ["v", "r", "o", "l", "t", "p", "f"].includes(key)) {
        if (key === "v") {
          e.preventDefault();
          dispatch({ type: "SET_TOOL", tool: "select" });
        } else if (key === "r") {
          e.preventDefault();
          dispatch({ type: "SET_TOOL", tool: "rect" });
        } else if (key === "o") {
          e.preventDefault();
          dispatch({ type: "SET_TOOL", tool: "ellipse" });
        } else if (key === "l") {
          e.preventDefault();
          dispatch({ type: "SET_TOOL", tool: "line" });
        } else if (key === "t") {
          e.preventDefault();
          dispatch({ type: "SET_TOOL", tool: "text" });
        } else if (key === "p") {
          e.preventDefault();
          dispatch({ type: "SET_TOOL", tool: "pen" });
        } else if (key === "f") {
          e.preventDefault();
          dispatch({ type: "SET_TOOL", tool: "frame" });
        }
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
          const updates = selection.flatMap((sel) => {
            const elem = getElementAtAddress(parsedDoc, sel);
            if (!elem) return [];
            const props = applyMove(elem, dx, dy, getOrigProps(elem));
            return Object.keys(props).length > 0 ? [{ address: sel, props }] : [];
          });
          if (updates.length > 0) {
            dispatch({ type: "UPDATE_ELEMENTS", updates });
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, selection, parsedDoc, zoom, onFitToScreen, enabled]);
}
