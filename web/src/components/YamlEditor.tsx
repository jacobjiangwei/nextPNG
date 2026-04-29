"use client";

import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";

const studioTheme = EditorView.theme({
  "&": {
    backgroundColor: "#10131c",
    fontSize: "11px",
    lineHeight: "1.6",
  },
  ".cm-content": {
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace",
    padding: "12px 0",
    caretColor: "#60a5fa",
  },
  ".cm-gutters": {
    backgroundColor: "#10131c",
    borderRight: "1px solid #1e2336",
    color: "#3b4261",
    fontSize: "10px",
    minWidth: "36px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#141829",
    color: "#6b7394",
  },
  ".cm-activeLine": {
    backgroundColor: "#141829",
  },
  ".cm-selectionBackground": {
    backgroundColor: "#1e3a5f !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "#1e3a5f !important",
  },
  ".cm-cursor": {
    borderLeftColor: "#60a5fa",
    borderLeftWidth: "1.5px",
  },
  ".cm-matchingBracket": {
    backgroundColor: "#1e3a5f",
    outline: "none",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
}, { dark: true });

interface YamlEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export default function YamlEditor({ value, onChange }: YamlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const suppressUpdate = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        suppressUpdate.current = true;
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [basicSetup, yamlLang(), oneDark, studioTheme, updateListener],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value changes into editor
  useEffect(() => {
    if (!viewRef.current) return;
    if (suppressUpdate.current) {
      suppressUpdate.current = false;
      return;
    }
    const current = viewRef.current.state.doc.toString();
    if (current !== value) {
      viewRef.current.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 bg-[#10131c] border-b border-[#1e2336]">
        <div className="text-xs font-semibold text-zinc-300">npng Source</div>
        <div className="text-[10px] text-zinc-500">Portable text protocol for editable, lossless graphics</div>
      </div>
      <div ref={editorRef} className="flex-1 overflow-auto min-h-0" />
    </div>
  );
}
