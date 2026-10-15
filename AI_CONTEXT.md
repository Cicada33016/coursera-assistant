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

- **Video Progress Engine:** Verified with unit test harness (`tests/video-completion.test.js`). `putVideoProgress` checks `res.ok` status and logs failures.
- **Reading Automation:** Verified with unit test harness (`tests/reading-completion.test.js`). Handles 200/201/204, numeric vs string userId fallback, and partial failures.
- **Coach Dialogue:** Verified with unit test harness (`tests/coach-dialogue.test.js`). Adheres to `TARGET_GENUINE_TURNS` limit, tolerates missing textareas and loader hangs, and never advances queue without terminal completion.
- **Quiz Assistant:** Verified with unit test harness (`tests/gemini-quiz.test.js`). Response body consumption bug in `inspectResponse` resolved via caching. Fallback to default model on 404/quota-zero verified.
- **Gemini Proxy Service Worker:** Verified with unit test harness (`tests/gemini-proxy.test.js`). Enforces destination authorization, 30s deadline timeout, status propagation, and API key sanitization.
- **DOM & Selector Robustness:** Verified with unit test harness (`tests/dom-robustness.test.js`). Fallback semantic selectors (`data-testid='part-Submission_Part'`, etc.) prevent failure when Coursera class hashes change.
- **Answer Selection Safety:** Invariant preserved: answers are selected in the DOM for student review; final submission is explicitly NOT automated on graded assessments.

---

## 6. Architectural Decisions (ADRs)

- **ADR-001:** Vanilla MV3 architecture without node bundler. Direct file distribution under `dist/`.
- **ADR-002:** Infimium local memory & semantic search backed by Ollama (`nomic-embed-text`) and SQLite vector store.
- **ADR-003:** Repository-backed state records (`.agents/state/`) as the shared durable truth across AI environments.

---

## 7. Known Risks, Bugs & Constraints

1. **Coursera DOM Fragility:** Coursera class names (e.g. `css-1tfphom`) frequently shift across platform releases. Resilient fallback selectors (`div[data-testid='part-Submission_Part']`, `fieldset.cds-formGroup`) provide defense-in-depth.
2. **Gemini API Key Exposure Risk:** API keys must never be logged or echoed. Sanitization via `[REDACTED]` is enforced across content scripts, service worker proxies, and test runners.
3. **Smart App Control Policy on Windows:** Global `infimium` CLI required lazy-loading for `@sengac/tree-sitter` to avoid Windows Smart App Control blocking unsigned native `.node` addons.
4. **Live Coursera Sessions:** Verification was performed using Node.js unit tests and mock DOM environments. End-to-end testing against real authenticated Coursera sessions must be performed with live student credentials.

---

## 8. Exact Next Development Task

- **Task:** Chrome Extension End-to-End Staging Validation in Chrome Developer Mode.
- **Files to Inspect:** `dist/manifest.json`, `dist/popup.html`, `dist/settings.html`, `dist/scripts/content.js`.
- **Acceptance Criteria:**
  1. Load unpacked extension in Chrome with zero manifest warnings.
  2. Options page successfully reads/writes to `chrome.storage.local`.
  3. Action popup renders cleanly with active model selector.
  4. Content script communication with service worker passes runtime checks.

---

## 9. How to Retrieve Deeper Context

- **Semantic Code Search:** Use Infimium MCP tool `semantic_code_search` with natural language queries (e.g. `"quiz answer fill logic"`).
- **Symbol Expansion:** Call `expand_symbol` on returned symbol names.
- **Project Memory:** Call `project_memory` (`action: "history"`) or `get_context`.
- **CLI Commands:** Run `infimium status`, `infimium memory`, or `infimium doctor`.
