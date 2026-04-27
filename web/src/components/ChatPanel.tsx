"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  onYamlGenerated: (yaml: string) => void;
  currentYaml?: string;
  selectionContext?: {
    label: string;
    element: unknown;
  } | null;
}

const AI_GUIDE_URL = "https://github.com/jacobjiangwei/newPNG/blob/main/spec/AI_GENERATION_GUIDE.md";
const FORMAT_SPEC_URL = "https://github.com/jacobjiangwei/newPNG/blob/main/spec/npng-v3.md";

function buildExternalAiPrompt(imageRequest: string) {
  const request = imageRequest.trim() || "[describe what you want here]";
  return `Generate an editable NewPNG image as .npng YAML.

Follow this guide:
https://github.com/jacobjiangwei/newPNG/blob/main/spec/AI_GENERATION_GUIDE.md

Rules:
- Return one complete YAML document inside a \`\`\`yaml code block.
- Use npng: "0.3".
- Use canvas, layers, named objects, and stable kebab-case IDs.
- Keep text as editable type: text.
- Prefer editable shapes, paths, groups, frames, gradients, fills, strokes, and effects.
- Do not return SVG, JSON, HTML/CSS, or a flat bitmap.
- Do not just describe the image.
- Make it visually polished and easy to edit in NewPNG Studio.

Image request:
${request}`;
}

function extractNpngYaml(text: string): string | null {
  const fencedYaml = text.match(/```(?:yaml|npng)?\s*\n([\s\S]*?)\n```/);
  const candidate = (fencedYaml?.[1] ?? text).trim();
  if (!candidate) return null;
  if (!/(^|\n)\s*npng\s*:/.test(candidate)) return null;
  if (!/(^|\n)\s*canvas\s*:/.test(candidate)) return null;
  if (!/(^|\n)\s*layers\s*:/.test(candidate)) return null;
  return candidate;
}

export default function ChatPanel({ onYamlGenerated, currentYaml, selectionContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [externalImageRequest, setExternalImageRequest] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const externalAiPrompt = buildExternalAiPrompt(externalImageRequest);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || loading) return;

      const userMsg: Message = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            currentYaml,
            selectionContext,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${err}` },
          ]);
          setLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let assistantText = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: assistantText };
            return copy;
          });
        }

        // Extract YAML from response
        const yaml = extractNpngYaml(assistantText);
        if (yaml) {
          onYamlGenerated(yaml);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${message}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, onYamlGenerated, currentYaml, selectionContext]
  );

  const handleCopyPrompt = useCallback(async () => {
    setCopyError(null);
    if (!externalImageRequest.trim()) {
      setCopyError("Describe what you want to generate first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildExternalAiPrompt(externalImageRequest));
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCopyError(`Copy failed: ${message}`);
    }
  }, [externalImageRequest]);

  const handlePasteGeneratedYaml = useCallback(async () => {
    setCopyError(null);
    setPasteStatus(null);
    try {
      const clipboardText = await navigator.clipboard.readText();
      const yaml = extractNpngYaml(clipboardText);
      if (!yaml) {
        setCopyError("Clipboard does not look like a complete npng YAML document.");
        return;
      }
      onYamlGenerated(yaml);
      setPasteStatus("Pasted into Source and updated the canvas.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCopyError(`Paste failed: ${message}`);
    }
  }, [onYamlGenerated]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-700 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-zinc-300">Text-to-Design AI</div>
          <div className="text-[10px] text-zinc-500">Generates editable npng source</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium">
          <a
            href={AI_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 hover:text-blue-200"
          >
            AI guide
          </a>
          <span className="text-zinc-600">/</span>
          <a
            href={FORMAT_SPEC_URL}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-zinc-200"
          >
            Spec
          </a>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2 text-sm">
            {selectionContext ? (
              <>
                <p className="font-medium text-zinc-300">Edit the selected object with AI.</p>
                <p className="text-zinc-500">
                  Selected: {selectionContext.label}. Ask for a local change like &quot;make it glassy&quot; or
                  &quot;turn this into a blue gradient button&quot;.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-zinc-300">AI onboarding: go out, generate, come back.</p>
                <p className="text-zinc-500">
                  First describe what you want. NewPNG will package your request with the generation rules so you
                  can paste it into ChatGPT, Claude, Gemini, or any AI tool.
                </p>
                <label className="block rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-2">
                  <span className="mb-1 block text-xs font-semibold text-zinc-300">What do you want to generate?</span>
                  <textarea
                    value={externalImageRequest}
                    onChange={(e) => {
                      setExternalImageRequest(e.target.value);
                      setCopiedPrompt(false);
                      setCopyError(null);
                      setPasteStatus(null);
                    }}
                    placeholder="Example: a cute yellow duck icon, vector style, soft gradient, editable layers"
                    className="h-20 w-full resize-none rounded border border-zinc-700 bg-zinc-950/80 p-2 text-xs leading-relaxed text-zinc-200 outline-none focus:border-blue-500"
                  />
                </label>
                <div className="grid gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-2 text-xs">
                  <div className="flex gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      1
                    </div>
                    <div>
                      <div className="font-medium text-zinc-300">Copy prompt</div>
                      <div className="text-[11px] text-zinc-500">It includes your request and the NewPNG rules.</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      2
                    </div>
                    <div>
                      <div className="font-medium text-zinc-300">Go out</div>
                      <div className="text-[11px] text-zinc-500">Paste it into your favorite AI tool.</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      3
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-zinc-300">Come back</div>
                      <div className="text-[11px] text-zinc-500">
                        Copy the AI&apos;s YAML response, then paste it here. Source updates automatically.
                      </div>
                      <button
                        type="button"
                        onClick={handlePasteGeneratedYaml}
                        className="mt-2 rounded bg-zinc-700 px-2.5 py-1 text-[11px] font-semibold text-zinc-100 hover:bg-zinc-600"
                      >
                        Paste generated YAML
                      </button>
                      {pasteStatus && <div className="mt-1 text-[11px] text-emerald-300">{pasteStatus}</div>}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-2 text-xs text-blue-100/90">
                  <div className="mb-1 font-semibold text-blue-200">Prompt to copy into any AI tool</div>
                  <textarea
                    readOnly
                    value={externalAiPrompt}
                    className="h-48 w-full resize-none rounded border border-zinc-700 bg-zinc-950/80 p-2 font-mono text-[10px] leading-relaxed text-zinc-300 outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      disabled={!externalImageRequest.trim()}
                      className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {copiedPrompt ? "Copied" : "Copy prompt with request"}
                    </button>
                    <a
                      href={AI_GUIDE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-medium text-blue-300 hover:text-blue-200"
                    >
                      Full generation guide
                    </a>
                  </div>
                  {copyError && <div className="mt-2 text-[11px] text-red-300">{copyError}</div>}
                </div>
                <p className="text-xs text-zinc-600">
                  Short version: generate editable NewPNG source, not pixels.
                </p>
              </>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm whitespace-pre-wrap ${
              msg.role === "user" ? "text-blue-300" : "text-zinc-300"
            }`}
          >
            <span className="font-bold text-xs text-zinc-500">
              {msg.role === "user" ? "You" : "Claude"}:{" "}
            </span>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="text-zinc-500 text-sm animate-pulse">Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectionContext ? "Describe how to change the selection..." : "Describe the design you want..."}
          className="flex-1 bg-zinc-800 text-zinc-200 px-3 py-2 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-blue-500"
        >
          Send
        </button>
      </form>
    </div>
  );
}
