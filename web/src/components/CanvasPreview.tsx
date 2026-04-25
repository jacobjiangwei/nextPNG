"use client";

import { useEffect, useRef } from "react";
import yaml from "js-yaml";
import { renderNpng } from "../lib/renderer";
import type { NpngDocument } from "../lib/types";

interface CanvasPreviewProps {
  yamlText: string;
}

export default function CanvasPreview({ yamlText }: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const data = yaml.load(yamlText) as NpngDocument;
      if (data && typeof data === "object") {
        renderNpng(data, canvasRef.current);
        errorRef.current = null;
      }
    } catch {
      // parse error — keep last render
    }
  }, [yamlText]);

  return (
    <div className="flex flex-col h-full items-center justify-center overflow-auto bg-[#1e1e1e]">
      <div className="p-4 flex items-center justify-center flex-1 w-full">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full border border-zinc-700"
          style={{ imageRendering: "auto" }}
        />
      </div>
    </div>
  );
}
