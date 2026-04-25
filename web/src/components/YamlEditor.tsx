"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface YamlEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export default function YamlEditor({ value, onChange }: YamlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const suppressUpdate = useRef(false);

  useEffect(() => {
    if (!editorRef.current) return;
    let destroyed = false;

    async function init() {
      const { EditorView, keymap } = await import("@codemirror/view");
      const { EditorState } = await import("@codemirror/state");
      const { basicSetup } = await import("@codemirror/basic-setup");
      const { yaml: yamlLang } = await import("@codemirror/lang-yaml");
      const { oneDark } = await import("@codemirror/theme-one-dark");

      if (destroyed) return;

      const updateListener = EditorView.updateListener.of((update: any) => {
        if (update.docChanged) {
          suppressUpdate.current = true;
          onChange(update.state.doc.toString());
        }
      });

      const state = EditorState.create({
        doc: value,
        extensions: [basicSetup, yamlLang(), oneDark, updateListener],
      });

      const view = new EditorView({
        state,
        parent: editorRef.current!,
      });

      viewRef.current = view;
    }

    init();

    return () => {
      destroyed = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 bg-[#1e1e1e] border-b border-zinc-700">
        YAML Editor
      </div>
      <div ref={editorRef} className="flex-1 overflow-auto" />
      {error && (
        <div className="px-3 py-1 text-xs text-red-400 bg-red-900/30">{error}</div>
      )}
    </div>
  );
}
