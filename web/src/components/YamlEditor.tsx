"use client";

import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";

interface YamlEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export default function YamlEditor({ value, onChange }: YamlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const suppressUpdate = useRef(false);

  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        suppressUpdate.current = true;
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [basicSetup, yamlLang(), oneDark, updateListener],
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
      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 bg-[#1e1e1e] border-b border-zinc-700">
        YAML Editor
      </div>
      <div ref={editorRef} className="flex-1 overflow-auto min-h-0" />
    </div>
  );
}
