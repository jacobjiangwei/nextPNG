# nextPNG — Copilot / Agent Instructions

## What is this project?

nextPNG is an AI-native online vector graphics design tool. Users describe images in natural language, Claude AI generates YAML in a custom format called **npng**, and the web app renders it in real-time on Canvas 2D. Users can also manually edit the YAML and export PNG/npng files.

**Live site:** https://nextpng.org

## Repository structure

```
nextPNG/
├── web/                        # Next.js 16 web application (THE main deliverable)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Figma-like Studio layout (AI/Layers/Source | Canvas | Inspector)
│   │   │   ├── layout.tsx      # Root layout
│   │   │   ├── globals.css     # Dark theme styles
│   │   │   └── api/chat/route.ts  # Claude API streaming endpoint
│   │   ├── components/
│   │   │   ├── CanvasPreview.tsx   # Canvas 2D renderer component
│   │   │   ├── YamlEditor.tsx      # CodeMirror 6 YAML editor
│   │   │   ├── ExamplesPanel.tsx   # Built-in examples + clipboard paste
│   │   │   └── ChatPanel.tsx       # AI chat and patch panel
│   │   └── lib/
│   │       ├── renderer.ts     # Core rendering engine (~300 lines, Canvas 2D)
│   │       ├── types.ts        # TypeScript interfaces for npng format
│   │       ├── colors.ts       # Hex color parser
│   │       └── pathParser.ts   # SVG path command parser
│   ├── next.config.ts          # output: "standalone" for Azure deployment
│   ├── server.js               # Custom server (NOT used in deployment — standalone has its own)
│   └── package.json
├── spec/
│   ├── npng-v3.md              # npng format specification (v0.3 baseline)
│   ├── AI_GENERATION_GUIDE.md  # Prompt-friendly rules for AI-generated npng
│   └── FORMAT_ROADMAP.md       # Format evolution roadmap
├── examples/                   # 22+ example .npng files
├── renderer/                   # Original Python renderer (reference only)
├── tools/                      # Utility scripts (svg2npng, etc.)
├── .github/workflows/deploy.yml  # CI/CD pipeline
├── AGENT_PROMPT.md             # Project vision and architecture
├── PROGRESS.md                 # Phase 1 completion status
└── CHANGELOG.md                # Format version history
```

## Tech stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Framework      | React 19 + Next.js 16 (App Router)      |
| Language       | TypeScript 5 (strict mode)              |
| Rendering      | Canvas 2D API (browser-native)          |
| YAML parsing   | js-yaml                                 |
| Code editor    | CodeMirror 6 (One Dark theme)           |
| Styling        | Tailwind CSS 4                          |
| AI backend     | Anthropic Claude API (streaming SSE)    |
| Deployment     | Azure App Service (B1 Linux, southeastasia) |
| CI/CD          | GitHub Actions                          |

## CI/CD pipeline — IMPORTANT

**Every push to `main` triggers automatic deployment to Azure.** The pipeline:

1. Checkout → Setup Node 20 → `npm ci` → `npm run build`
2. Copy static assets into `.next/standalone/`
3. Zip and deploy to Azure App Service via `az webapp deploy`

**Azure resources:**
- Resource group: `newpng` (southeastasia)
- App Service plan: `newpng-plan` (B1 Linux)
- Web app: `newpng`
- Auth: Service principal stored in GitHub secret `AZURE_CREDENTIALS`

## Workflow for agents

### Before committing code, ALWAYS:

1. **Run `npm run build` in `web/`** to verify compilation passes. Do not commit code that breaks the build — it will deploy broken code to production.
2. **Check for TypeScript errors** — strict mode is on.
3. **Test rendering changes** by verifying the default YAML example still renders correctly.

### Commit and deploy flow:

1. Make changes
2. Run `cd web && npm run build` — fix any errors
3. `git add` only the files you changed
4. `git commit` with a clear message
5. `git push origin main` — this triggers the pipeline
6. Wait for GitHub Actions to complete — check with `gh run list --limit 1`
7. If the run fails, check logs with `gh run view <id> --log-failed` and fix

### Do NOT:

- Push code that doesn't compile
- Modify `deploy.yml` without understanding the standalone output structure
- Overwrite `.next/standalone/server.js` — Next.js generates its own, and the custom `web/server.js` is NOT used in deployment
- Add `ANTHROPIC_API_KEY` or any secrets to source code
- Delete or modify `spec/npng-v3.md` without explicit instructions — it's the format source of truth
- Over-engineer. This project follows strict phased development (see below)

### Do:

- Keep changes minimal and focused
- Follow existing code patterns and naming conventions
- Use Tailwind for styling, match the dark theme
- Refer to `spec/npng-v3.md` when working on renderer or format-related features
- Refer to `spec/AI_GENERATION_GUIDE.md` when working on AI prompts or generated examples
- Refer to `examples/*.npng` for real-world format usage
- Update `PROGRESS.md` when completing major milestones

## Current status: Phase 1 MVP complete

**Phase 1 (done):** Three-panel web app with examples, canvas preview, YAML editor, PNG/npng export.

**Phase 2 (next):** Visual editing — click to select elements on canvas, drag to move, properties panel, layer panel.

**Phase 3 (future):** User accounts, project persistence, multi-turn AI conversation, templates.

Do NOT implement Phase 2/3 features unless explicitly asked. Stay focused on the current phase.

## npng format overview

The npng format is a YAML-based vector graphics format. Key structure:

```yaml
npng: "0.3"
canvas:
  width: 800
  height: 600
  background: "#FFFFFF"
defs: []          # Reusable element definitions
layers:
  - name: "Layer 1"
    opacity: 1.0
    blend_mode: "normal"
    elements:
      - type: rect
        x: 10
        y: 10
        width: 100
        height: 50
        fill: "#FF0000"
```

Supported core element types: `rect`, `ellipse`, `line`, `text`, `path`, `group`, `use`; the Studio also supports `image`, `frame`, and component instances.

The renderer (`web/src/lib/renderer.ts`) supports all v0.3/v0.4 features including gradients, transforms, blend modes, filters, clip paths, masks, and defs/use references. The full spec is in `spec/npng-v3.md`.

## Key design principles

1. **AI generates, humans refine** — the core workflow is AI-generated YAML + manual editing
2. **Format capability = ceiling** — what the format supports determines what can be created
3. **LLMs can't write complex bezier paths** — guide AI to use simple shapes + boolean operations
4. **Bidirectional sync** — YAML changes update canvas, and (future) canvas edits update YAML
5. **Don't over-engineer** — MVP first, iterate incrementally

---

## Competitive Analysis & Strategic Positioning

### 我们是谁

nextPNG 的核心是 **推广 npng 格式** —— 一个 AI 原生的开放矢量图形格式。
Web Studio (nextpng.org) 是格式的展示窗口和参考实现，而非一个要烧钱提供 AI 服务的 SaaS 产品。

**商业逻辑**：npng 格式被广泛采纳 → 生态工具围绕格式生长 → nextPNG 作为格式定义者占据标准制定权。
类比：Markdown 之于 Typora/Obsidian，SVG 之于浏览器，OpenAPI 之于 Swagger。

### 格式推广战略（核心使命）

| 战略方向 | 具体做法 |
|----------|----------|
| **让 AI 工具原生输出 npng** | 提供 system prompt、few-shot examples，让 ChatGPT/Claude/Gemini 等 AI 都能直接生成 npng |
| **让设计工具能读写 npng** | 提供 Figma 插件、VS Code 扩展、命令行工具，降低接入成本 |
| **让开发者能渲染 npng** | 提供 JS/Python/Go 渲染库，像渲染 Markdown 一样简单 |
| **让 Web Studio 成为最佳体验** | nextpng.org 作为"npng 格式长什么样"的活广告，零门槛体验 |
| **格式规范公开透明** | spec/ 目录是开放标准，欢迎社区参与演进 |

### 核心竞品对比（格式/标准层面）

| 格式/工具 | 可读性 | AI友好 | 可编辑结构 | 矢量 | 图层/语义 | 生态开放 |
|-----------|--------|--------|------------|------|-----------|----------|
| **npng (我们)** | ✅ YAML纯文本 | ✅ 专为LLM设计 | ✅ 图层+样式+组件 | ✅ | ✅ | ✅ 开放spec |
| **SVG** | ⚠️ XML冗长 | ⚠️ LLM写不好复杂路径 | ⚠️ 扁平无图层 | ✅ | ❌ | ✅ W3C标准 |
| **Figma格式** | ❌ 私有二进制 | ❌ | ✅ 有结构 | ✅ | ✅ | ❌ 封闭 |
| **PSD/AI** | ❌ 二进制 | ❌ | ✅ | ✅ | ✅ | ❌ Adobe私有 |
| **Midjourney输出** | ❌ 像素PNG | ❌ | ❌ 不可编辑 | ❌ | ❌ | ❌ |
| **Canva格式** | ❌ 私有 | ❌ | ⚠️ 模板受限 | ⚠️ | ⚠️ | ❌ |

### npng 格式的差异化优势

1. **人类可读可写** — YAML 格式，任何文本编辑器都能打开、修改、diff
2. **AI 原生** — 专门为 LLM 生成设计，简单几何+组合，不需要手写贝塞尔
3. **结构化** — 图层、组件、样式、defs/use，不是扁平元素堆砌
4. **轻量渲染** — 任何支持 Canvas 2D 的环境都能渲染，无需重型引擎
5. **版本控制友好** — 像代码一样 git diff、merge、review
6. **跨平台** — 不绑定任何工具或平台，任何人都可以写渲染器

### 与竞品的关键差距（格式推广视角）

#### 🔴 紧急（格式采纳的前提）
1. **SVG 双向转换** — npng↔SVG 互转工具。用户现有资产是 SVG，必须能导入；输出也要能导出 SVG 给下游使用。
2. **渲染器多语言实现** — 目前只有 JS (Canvas 2D)。需要 Python、Go、Swift 渲染器让更多生态接入。
3. **格式规范完善** — spec 要更完整、更严谨，像 W3C 标准那样可以让第三方独立实现。
4. **AI 生成 prompt 库** — 公开一套高质量 system prompt + few-shot，让任何 AI 工具都能输出 npng。

#### 🟡 重要（扩大格式生态）
5. **Figma 插件** — 在 Figma 里一键导出 npng，或从 npng 导入。桥接现有设计师群体。
6. **VS Code 扩展完善** — 语法高亮、实时预览、schema 校验。让开发者把 npng 当 Markdown 用。
7. **CLI 工具** — `npng render input.npng -o output.png`，集成到 CI/CD 和自动化流水线。
8. **模板/示例库扩充** — examples/ 目录要覆盖 logo、icon、poster、card 等主流场景，成为学习 npng 的入口。
9. **npm/pip 包发布** — 把渲染器作为独立库发布，`npm install npng-renderer`。

#### 🟢 差异化机会
10. **npng 作为 AI agent 间的设计协议** — agent A 生成 npng，agent B 修改，agent C 渲染。像 JSON 一样成为数据交换格式。
11. **设计稿 diff 可视化** — 格式天生支持 diff，做一个可视化 diff 工具就是杀手级功能。
12. **社区贡献标准流程** — 开放 RFC 流程让社区参与格式演进，类似 TC39/W3C。

### 开发策略

1. **格式推广 > 产品功能** — Web Studio 是展示窗口，不是烧钱的 SaaS。不要在 AI 服务上重投入。
2. **降低接入成本** — 让别人用 npng 的门槛越低越好：好文档、好工具、好示例。
3. **AI 服务由用户自带 key** — 不提供免费 AI 服务，用户用自己的 API key 或本地模型。
4. **格式先行** — 任何新功能先问"这是否让 npng 格式更有吸引力？"
5. **生态思维** — 我们不需要做所有工具，只需要让别人能轻松基于 npng 构建工具。
