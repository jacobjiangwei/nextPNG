# NewPNG — Next Generation AI Designer

## Project Vision

一个 AI 原生的在线设计工具。用户用自然语言描述想要的图形，AI 生成 npng 格式的矢量图，用户可以在网页上实时预览、手动编辑、导出。

**核心定位**：AI 生成 + 人类可编辑的矢量设计平台。不是 Figma 的替代品，而是一个全新品类——AI 驱动的图形创作工具。

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  Web App                     │
│                                              │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐ │
│  │ AI Chat  │  │  Canvas   │  │   YAML    │ │
│  │  Panel   │→ │  Preview  │↔ │  Editor   │ │
│  │          │  │ (renderer)│  │           │ │
│  └──────────┘  └───────────┘  └───────────┘ │
│       ↓                                      │
│  Claude API → generates .npng YAML           │
└─────────────────────────────────────────────┘
```

### 三个核心面板

1. **AI Chat Panel**（左）：用户输入自然语言描述，调用 Claude API 生成 npng YAML
2. **Canvas Preview**（中）：实时渲染 npng → Canvas 2D / SVG DOM
3. **YAML Editor**（右）：代码编辑器，编辑 YAML 实时刷新预览

### 双向同步

- AI 生成 YAML → 预览自动更新
- 手动改 YAML → 预览自动更新
- （未来）拖拽编辑画布 → YAML 自动更新

## Tech Stack

| 层 | 技术 |
|---|------|
| 前端框架 | React + Next.js (App Router) |
| 渲染引擎 | Canvas 2D API（浏览器端，移植现有 pycairo 逻辑）|
| YAML 解析 | js-yaml |
| 代码编辑器 | CodeMirror 或 Monaco Editor |
| AI 后端 | Claude API (Anthropic) |
| 部署 | Azure App Service (免费层) |
| 样式 | Tailwind CSS |

## Implementation Plan

### Phase 1: MVP — AI 生成 + 预览 + 代码编辑

最小闭环，让整个流程跑通：

1. **Next.js 项目搭建**
   - 创建 `web/` 目录，初始化 Next.js + TypeScript + Tailwind
   - 三栏布局：AI 聊天 | 画布预览 | YAML 编辑器

2. **浏览器端 npng 渲染器**
   - 将现有 Python 渲染器 (`renderer/render.py`) 的核心逻辑移植为 TypeScript
   - 支持 Canvas 2D API 绘制所有 npng 元素类型：
     - rect, ellipse, path, line, text
     - fill, stroke, opacity, transform
     - boolean operations (union, subtract, intersect, exclude)
     - gradients (linear, radial)
   - YAML 输入 → Canvas 输出，实时渲染

3. **YAML 代码编辑器**
   - 集成 CodeMirror/Monaco
   - YAML 语法高亮
   - 编辑时自动触发重新渲染（debounce）
   - 错误提示（YAML 解析失败时）

4. **AI 生成接口**
   - Next.js API Route 调用 Claude API
   - System prompt 包含 npng 格式规范 + 示例
   - 用户输入描述 → Claude 返回 npng YAML → 填入编辑器 → 触发渲染
   - 流式输出（streaming），用户能看到 YAML 逐步生成

5. **导出功能**
   - 导出 PNG（Canvas.toDataURL）
   - 导出 SVG（npng → SVG 转换）
   - 下载 .npng 源文件

### Phase 2: 可视化编辑

在 MVP 基础上加交互式编辑能力：

- 画布上选中元素（点击选中，显示边框/控制点）
- 拖拽移动元素
- 属性面板（修改颜色、大小、位置等）
- 修改操作同步回 YAML
- 图层面板（显示 layers 结构，拖拽排序）

### Phase 3: 协作与高级功能

- 用户账号系统
- 项目保存/加载
- AI 对话上下文（多轮修改："把背景改成蓝色"、"加个阴影"）
- 模板库（预设的 npng 模板）
- 实时协作

## Azure Deployment Plan

使用 Azure App Service 免费层：

```bash
# 创建资源组
az group create --name newpng-rg --location eastasia

# 创建 App Service Plan（免费层）
az appservice plan create --name newpng-plan --resource-group newpng-rg --sku F1 --is-linux

# 创建 Web App
az webapp create --name newpng-app --resource-group newpng-rg --plan newpng-plan --runtime "NODE:20-lts"

# 部署（从本地 git 或 GitHub Actions）
az webapp deployment source config-local-git --name newpng-app --resource-group newpng-rg
```

默认域名：`newpng-app.azurewebsites.net`

## npng Format

格式规范和演进路线是独立于 Web App 的核心 initiative，详见：

- **当前规范**：`spec/npng-v3.md`（v0.3 基线，v0.4 在此基础上加了布尔运算/fill rule/opacity/transform origin）
- **格式路线图**：`spec/FORMAT_ROADMAP.md`（对标 Figma + Photoshop 全部能力的演进计划）

格式的目标是无限接近 Figma + Photoshop 能做的所有操作。Web App 的渲染器应逐步跟进格式的演进。

## Existing Assets

这些是已有的资源，新项目可以复用：

| 文件 | 用途 |
|------|------|
| `renderer/render.py` | Python 渲染器（~1000行），移植到 TS 的参考实现 |
| `spec/npng-v1.md` | 格式规范文档 |
| `examples/*.npng` | 22 个示例文件，可作为 AI prompt 的 few-shot examples |
| `tools/svg2npng.py` | SVG → npng 转换器 |
| `tools/gen_apple.py` | 算法生成 npng 的示例 |

## Key Lessons from Format Development

1. **LLM 无法手写复杂贝塞尔路径** — 对于 AI 生成，应引导 LLM 使用简单几何图元（rect, ellipse）+ 布尔运算组合，而非手写复杂 path
2. **几何图形效果好** — 卡通人物、简单 logo、图标等用基本图元堆叠就能做好
3. **格式能力决定上限** — AI 能生成什么取决于格式支持什么，而非 AI 多聪明
4. **双向编辑是核心体验** — AI 生成初稿 + 人类微调 = 最佳工作流

## Anti-Patterns

1. ❌ 让 AI 手写复杂有机形状的贝塞尔路径
2. ❌ 用白色遮罩模拟布尔减法
3. ❌ 过度工程化——先做 MVP 跑通再说
4. ❌ 一次性实现所有功能——严格按 Phase 顺序来
