"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  onYamlGenerated: (yaml: string) => void;
}

export default function ChatPanel({ onYamlGenerated }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
          body: JSON.stringify({ messages: [...messages, userMsg] }),
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
        const yamlMatch = assistantText.match(/```(?:yaml|npng)?\s*\n([\s\S]*?)\n```/);
        if (yamlMatch) {
          onYamlGenerated(yamlMatch[1]);
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
    [input, loading, messages, onYamlGenerated]
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-700">
        AI Chat
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-zinc-500 text-sm">
            Ask Claude to generate an npng image. e.g. &quot;Draw a red circle on a white background&quot;
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
          placeholder="Describe an image..."
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
