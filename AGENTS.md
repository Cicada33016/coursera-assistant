# AGENTS.md — Coursera Assistant Engineering Framework

This document governs agentic and human engineering on the **Coursera Assistant** repository. It defines operating principles, architectural rules, memory integration, and verification standards.

---

## 1. Core Operating Principles

1. **Source of Truth Precedence:**
   - Git repository, working tree, and verified source code always supersede documentation, summaries, or AI chat memory.
   - Canonical GitHub repository: `https://github.com/Cicada33016/coursera-assistant` (default branch: `main`).
2. **Karpathy Engineering Guidelines:**
   - **Think Before Acting:** Expose assumptions, state tradeoffs, and clarify ambiguities before touching code.
   - **Simplicity First:** Implement the minimal code that solves the problem. Avoid speculative abstractions and gratuitous dependencies.
   - **Surgical Changes:** Modify only what is required. Never perform drive-by refactoring or reformat adjacent code.
   - **Goal-Driven Execution:** Define explicit, verifiable success criteria before starting. Loop until verified.
3. **Product & User Safety Invariants:**
   - **Never auto-submit graded assessments:** The extension assists by highlighting and selecting suggested answers in the DOM for user review. Final submission must remain under explicit student control.
   - **Credential Hygiene:** Never hardcode API keys, tokens, or personal identifiers in code, bundles, docs, or Git history. Use `chrome.storage.local`.
   - **Least Privilege:** Respect Chrome Manifest V3 boundaries and permissions. Keep network requests restricted to declared hosts.

---

## 2. System Architecture

Coursera Assistant is a Chrome Manifest V3 browser extension built with vanilla JavaScript, HTML, and CSS (no node build/bundler pipeline is required for runtime execution):

```
coursera-assistant/
├── manifest.json              # Chrome MV3 manifest
├── quiz-progress.html         # Floating detached quiz progress window
├── infimium.workspace.json    # Infimium project workspace definition
├── .agents/                   # Repository-backed state records & skills
│   ├── state/                 # NOW.md, CURRENT.md, NEXT.md, BLOCKERS.md
│   ├── decisions/             # Architecture Decision Records (ADRs)
│   └── skills/                # Project-specific engineering skills
├── dist/                      # Deployed runtime extension payload
│   ├── popup.html             # Action toolbar popup UI
│   ├── settings.html          # Options / settings page
│   ├── assets/                # Icon assets (1.png, 2.png, 3.png, 4.png)
│   ├── scripts/
│   │   ├── background.js      # MV3 Service Worker (API proxy, window mgmt)
│   │   ├── content.js         # Isolated-world content script (DOM automation)
│   │   ├── interceptor.js     # MAIN-world script (captures Coursera state)
│   │   ├── LatticeLoader.js   # Animated progress spinner component
│   │   ├── popup.js           # Popup controller logic
│   │   ├── quiz-progress.js   # Floating quiz progress controller
│   │   └── settings.js        # API key & model settings controller
│   └── ui/
│       ├── content.css        # Content script injected styles & toasts
│       ├── popup.css          # Extension popup stylesheet
│       ├── quiz-progress.css  # Floating progress window stylesheet
│       └── settings.css       # Options page stylesheet
└── docs/                      # Architectural and workflow documentation
```

### Key Subsystems

- **MV3 Service Worker (`dist/scripts/background.js`):**
  - Manages extension lifecycle, keyboard shortcuts (`Alt+B`, `Alt+W`), and detached quiz progress windows.
  - Proxies Gemini API calls via `GEMINI_PROXY_FETCH` to bypass page CSP restrictions.
  - Verifies that proxy requests only target `https://generativelanguage.googleapis.com/*`.
- **Content Script (`dist/scripts/content.js`):**
  - Injected at `document_end` on `*://*.coursera.org/*`.
  - Coordinates automation for video playback, reading items, discussion posts, Coach dialogue, and quiz answering.
  - Employs event-driven DOM polling and toast status updates.
- **Main-World Interceptor (`dist/scripts/interceptor.js`):**
  - Injected at `document_start` in the `MAIN` world on `*://*.coursera.org/*`.
  - Intercepts Coursera API responses and dispatches synthetic events across the isolated-world boundary.
- **Options & Storage (`dist/scripts/settings.js`, `dist/settings.html`):**
  - Configures `geminiApiKey` and `geminiModel` (e.g. `gemini-2.5-flash`, `gemini-3.8-flash`) in `chrome.storage.local`.

---

## 3. Local Memory & Semantic Retrieval (Infimium)

- **Ollama Inference:** Endpoint at `http://127.0.0.1:11434` with model `nomic-embed-text`.
- **Infimium MCP Integration:** Tools include `semantic_code_search`, `dep_graph`, `project_memory`, `get_context`, and `query_local_docs`.
- **Indexing:** Re-index using `infimium index --yes --no-playground` when source files or documentation change significantly.
- **Memory Checkpoints:** Use `project_memory` or `infimium update` to snapshot milestones and context layers.

---

## 4. Verification & Testing Protocol

Before committing any change:
1. **Lint/Syntax Check:** Verify all JavaScript files parse without syntax errors using `node --check <file>`.
2. **Manifest Verification:** Validate `manifest.json` schema and confirm all referenced files exist in `dist/`.
3. **Diff Review:** Inspect `git diff` to ensure no accidental whitespace noise, secrets, or unintended edits are introduced.
4. **State Synchronization:** Update `.agents/state/` and `AI_CONTEXT.md` alongside any functional or architectural change.
5. **No Blind Commit/Push:** Only commit verified work with descriptive conventional commit messages. Never force-push or rewrite remote history.
