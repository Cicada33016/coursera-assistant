# AI_CONTEXT.md — Coursera Assistant Context Briefing

*Fresh-session briefing for Antigravity, ChatGPT, and human collaborators. Synchronized with repository state.*

---

## 1. Project Purpose & Scope

**Coursera Assistant** is a production-grade Chrome Manifest V3 browser extension designed to assist learners on `coursera.org`. It provides automation and assistance for:
- Video lecture progress synchronization (`opencourse.v1` and `onDemandVideoProgresses.v1` events).
- Reading item auto-completion and delay management.
- Discussion forum prompt generation and automated response assistance.
- AI Study Coach dialogue progression and barrier synchronization.
- Gemini-powered quiz analysis, heuristic parsing, and answer option selection in the DOM (under explicit student control; never auto-submitting graded assessments).

---

## 2. Canonical Repository & Workflow

- **Canonical Remote:** `https://github.com/Cicada33016/coursera-assistant.git`
- **Default Branch:** `main`
- **Active Working Tree:** Clean; 1 local commit ahead of `origin/main` (local bootstrap commit: `acbfb1a`).
- **Commit Baseline:** Remote upstream `f0b14a4` (*docs: integrate tutorial walkthrough and demo video cards in README*); local head `acbfb1a`.
- **Branching Policy:** Work directly on `main` for verified incremental releases, or feature branches for multi-step tasks. Never force-push (`--force`) or rewrite remote history.

---

## 3. Technology Stack & Runtime Profile

- **Platform:** Chrome Extension Manifest V3 (MV3).
- **Core Languages:** Vanilla ECMAScript (ES2022+), Semantic HTML5, Vanilla CSS3 with custom variables.
- **Build System:** Direct runtime payload under `dist/`. No bundler/transpiler (Vite/Webpack) is used or required. Files are loaded directly by the browser extension runtime.
- **Verification Commands:**
  - Syntax check: `node --check dist/scripts/*.js`
  - Manifest validation: Validate `manifest.json` against Chrome MV3 schema and verify all referenced files exist.
  - State check: `infimium status` / `infimium doctor`
- **AI Backend:** Google Gemini API (`generativelanguage.googleapis.com`) via background service worker fetch proxy (`GEMINI_PROXY_FETCH`). Models supported: `gemini-2.5-flash`, `gemini-3.8-flash`.

---

## 4. Key Architecture & File Map

| Path | Component | Responsibility |
|---|---|---|
| `manifest.json` | Manifest V3 | Declares permissions (`storage`, `activeTab`, `scripting`, `tabs`, `commands`), entry points, and content script matches. |
| `dist/popup.html` / `dist/scripts/popup.js` | Action Popup | Extension toolbar UI: course slug detection, item queue trigger, model selector, settings shortcut. |
| `dist/settings.html` / `dist/scripts/settings.js` | Options Page | Configuration of Gemini API key, default model, and persistence in `chrome.storage.local`. |
| `dist/scripts/background.js` | Service Worker | Handles extension events, keyboard shortcuts (`Alt+B`, `Alt+W`), detached quiz progress window lifecycle, and proxies Gemini API requests. |
| `dist/scripts/content.js` | Content Script | Injected into Coursera pages (`document_end`). Executes video events, reading completion, coach dialogue, and quiz option selection. |
| `dist/scripts/interceptor.js` | Main-World Script | Injected at `document_start` (`world: MAIN`) to observe and relay Coursera API responses. |
| `dist/scripts/quiz-progress.js` | Progress Window | Manages UI updates and logs inside the detached floating progress popup. |
| `dist/scripts/LatticeLoader.js` | UI Component | Canvas/DOM lattice animation loader for async operations. |
| `infimium.workspace.json` | Local Memory | Defines Infimium workspace structure for semantic retrieval and code graph indexing. |

---

## 5. Verified Implementation State

- **Video Progress Engine:** Implemented with `postVideoEvent` (`play`/`ended` signals) and `putVideoProgress` API sync.
- **Reading Automation:** Implemented with scroll simulation and completion verification.
- **Discussion Assistant:** Implemented with canned response generation and forum API calls.
- **Coach Dialogue:** Implemented with input event dispatching, DOM polling, and 35-second barrier wait.
- **Quiz Assistant:** Implemented with 3-attempt retry loop (`c89bf52`), single-flight window creation lock (`1bb539c`), LatticeLoader integration, and Gemini prompt synthesis.
- **Answer Selection Safety:** Answers are selected in the DOM for student review; final submission is explicitly NOT automated on graded quizzes.

---

## 6. Architectural Decisions (ADRs)

- **ADR-001:** Vanilla MV3 architecture without node bundler. Direct file distribution under `dist/`.
- **ADR-002:** Infimium local memory & semantic search backed by Ollama (`nomic-embed-text`) and SQLite vector store.
- **ADR-003:** Repository-backed state records (`.agents/state/`) as the shared durable truth across AI environments.

---

## 7. Known Risks, Bugs & Constraints

1. **Coursera DOM Fragility:** Coursera class names (e.g. `css-1tfphom`) frequently shift across platform releases. Heuristic selectors must fall back gracefully to `data-testid` and ARIA attributes.
2. **Gemini API Key Exposure Risk:** API keys must never be logged or echoed in toast error messages. Sanitization via `cleanMsg.split(geminiApiKey).join("[REDACTED]")` is strictly enforced.
3. **Smart App Control Policy on Windows:** Global `infimium` CLI required lazy-loading for `@sengac/tree-sitter` to avoid Windows Smart App Control blocking unsigned native `.node` addons.

---

## 8. Exact Next Development Task

- **Task:** Comprehensive extension health check and regression verification on Coursera item types (video, reading, coach, quiz) using automated DOM mocking or staging fixtures.
- **Files to Inspect:** `dist/scripts/content.js`, `dist/scripts/background.js`, `manifest.json`.
- **Acceptance Criteria:**
  1. All JavaScript files pass `node --check`.
  2. All permissions in `manifest.json` match required API surfaces.
  3. No unredacted keys or unbounded recursive loops exist.

---

## 9. How to Retrieve Deeper Context

- **Semantic Code Search:** Use Infimium MCP tool `semantic_code_search` with natural language queries (e.g. `"quiz answer fill logic"`).
- **Symbol Expansion:** Call `expand_symbol` on returned symbol names.
- **Project Memory:** Call `project_memory` (`action: "history"`) or `get_context`.
- **CLI Commands:** Run `infimium status`, `infimium memory`, or `infimium doctor`.
