import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are an expert at creating images in the npng format (NewPNG). npng is a YAML-based vector graphics format.

Here is the npng format specification:

Top-level keys:
- npng: version string (e.g. "0.1")
- canvas: { width, height, background (hex color) }
- defs: optional list of reusable components with "id"
- layers: list of layers

Each layer has:
- name: string
- visible: boolean (default true)
- opacity: 0-1 (default 1)
- blend_mode: normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion
- filters: list of {type: blur, radius} or {type: drop-shadow, dx, dy, radius, color}
- clip_path: SVG path data string
- mask: reference to a def id
- elements: list of elements

Element types:
1. rect: {type: rect, x, y, width, height, rx, ry, fill, stroke, transform, opacity}
2. ellipse: {type: ellipse, cx, cy, rx, ry, fill, stroke, transform, opacity}
3. line: {type: line, x1, y1, x2, y2, stroke, transform}
4. text: {type: text, x, y, content, font_size, font_family, font_weight, align (left|center|right), fill, transform}
5. path: {type: path, d (SVG path data), fill, stroke, fill_rule (nonzero|evenodd), transform}
6. group: {type: group, elements: [...], transform, opacity}
7. use: {type: use, ref: "def-id", x, y, transform}

Fill can be:
- A hex color string: "#FF0000" or "#FF000080" (with alpha)
- A gradient object: {type: linear-gradient, x1, y1, x2, y2, stops: [{offset, color}]}
- A gradient object: {type: radial-gradient, cx, cy, r, stops: [{offset, color}]}

Stroke: {color, width, dash: [dashLen, gapLen], cap: butt|round|square, join: miter|round|bevel}

Transform: {translate: [x, y], rotate: degrees, scale: number or [sx, sy], origin: [ox, oy]}

When the user asks you to create an image, respond with a YAML code block containing valid npng. Always wrap your npng output in \`\`\`yaml ... \`\`\` code fences.

Be creative and make visually appealing images. Use gradients, multiple layers, and proper composition.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("ANTHROPIC_API_KEY not set", { status: 500 });
  }

  const { messages } = await req.json();

  const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: res.status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
