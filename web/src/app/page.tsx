"use client";

import { useState, useCallback } from "react";
import ExamplesPanel from "../components/ExamplesPanel";
import CanvasPreview from "../components/CanvasPreview";
import YamlEditor from "../components/YamlEditor";

const DEFAULT_YAML = `npng: "0.1"
canvas:
  width: 400
  height: 300
  background: "#FFFFFF"
layers:
  - name: "shapes"
    elements:
      - type: rect
        x: 30
        y: 30
        width: 120
        height: 80
        fill: "#E74C3C"
      - type: ellipse
        cx: 280
        cy: 100
        rx: 60
        ry: 40
        fill: "#3498DB"
      - type: text
        x: 200
        y: 240
        content: "Hello NewPNG!"
        font_size: 20
        font_family: "sans-serif"
        font_weight: "bold"
        fill: "#333333"
        align: "center"
`;

export default function Home() {
  const [yamlText, setYamlText] = useState(DEFAULT_YAML);

  const handleExportPng = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "export.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const handleDownloadNpng = useCallback(() => {
    const blob = new Blob([yamlText], { type: "text/yaml" });
    const link = document.createElement("a");
    link.download = "image.npng";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [yamlText]);

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-zinc-200">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border-b border-zinc-700">
        <span className="text-sm font-bold tracking-wider text-zinc-300">NewPNG</span>
        <div className="flex-1" />
        <button
          onClick={handleExportPng}
          className="px-3 py-1 text-xs bg-zinc-700 rounded hover:bg-zinc-600"
        >
          Export PNG
        </button>
        <button
          onClick={handleDownloadNpng}
          className="px-3 py-1 text-xs bg-zinc-700 rounded hover:bg-zinc-600"
        >
          Download .npng
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/5 border-r border-zinc-700 overflow-hidden">
          <ExamplesPanel onSelect={setYamlText} />
        </div>
        <div className="w-2/5 border-r border-zinc-700 overflow-hidden">
          <CanvasPreview yamlText={yamlText} />
        </div>
        <div className="w-2/5 overflow-hidden">
          <YamlEditor value={yamlText} onChange={setYamlText} />
        </div>
      </div>
    </div>
  );
}
