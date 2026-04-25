# NewPNG — Copilot / Agent Instructions

## What is this project?

NewPNG is an AI-native online vector graphics design tool. Users describe images in natural language, Claude AI generates YAML in a custom format called **npng**, and the web app renders it in real-time on Canvas 2D. Users can also manually edit the YAML and export PNG/npng files.

**Live site:** https://newpng.azurewebsites.net

## Repository structure

```
newPNG/
├── web/                        # Next.js 16 web application (THE main deliverable)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Main three-panel layout (ExamplesPanel | CanvasPreview | YamlEditor)
│   │   │   ├── layout.tsx      # Root layout
│   │   │   ├── globals.css     # Dark theme styles
│   │   │   └── api/chat/route.ts  # Claude API streaming endpoint (not wired to UI yet)
│   │   ├── components/
│   │   │   ├── CanvasPreview.tsx   # Canvas 2D renderer component
│   │   │   ├── YamlEditor.tsx      # CodeMirror 6 YAML editor
│   │   │   ├── ExamplesPanel.tsx   # Built-in examples + clipboard paste
│   │   │   └── ChatPanel.tsx       # AI chat (deprecated, replaced by ExamplesPanel)
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
defs: {}          # Reusable element definitions
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

Supported element types: `rect`, `ellipse`, `line`, `text`, `path`, `group`, `use`.

The renderer (`web/src/lib/renderer.ts`) supports all v0.3/v0.4 features including gradients, transforms, blend modes, filters, clip paths, masks, and defs/use references. The full spec is in `spec/npng-v3.md`.

## Key design principles

1. **AI generates, humans refine** — the core workflow is AI-generated YAML + manual editing
2. **Format capability = ceiling** — what the format supports determines what can be created
3. **LLMs can't write complex bezier paths** — guide AI to use simple shapes + boolean operations
4. **Bidirectional sync** — YAML changes update canvas, and (future) canvas edits update YAML
5. **Don't over-engineer** — MVP first, iterate incrementally
