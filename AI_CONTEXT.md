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
- **Active Working Tree:** Clean; synchronized with `origin/main` at commit `7b00f554d8d5f9c4e3dedbf06c3576849dd9b991`.
- **Commit Baseline:** Remote upstream `7b00f55` (*fix(audit): resolve response stream consumption, video progress error handling, and selector resilience*); local HEAD `7b00f55`.
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

- **Staging Validation (Chrome 155):** Validated in Google Chrome 155.0.8059.79 on Windows 11. Manifest V3 root configuration accepted with zero manifest warnings or errors.
- **ES Module Resolution Fix:** Resolved ES module extensionless import in `dist/scripts/quiz-progress.js` (`./LatticeLoader.js`) and enhanced `importmap` in `quiz-progress.html` with scoped mappings to prevent HTTP 404 in browser module loading.
- **Popup Non-Coursera Resilience:** Added safe `chrome.runtime.lastError` callback consumption to `dist/scripts/popup.js` for non-Coursera tab graceful degradation.
- **Options & Storage Persistence:** Validated in real Chrome browser via CDP. Verified `geminiModelSelect`, `geminiAutoQuizToggle`, `geminiKeyInput`, `speedInput`, and save feedback persist across reloads using keys `key`, `model`, `quiz`, and sync `s`.
- **Progress Window DOM & Loader:** Verified in real Chrome browser via CDP. `quiz-progress.html` loads, displays `Gemini 3 Flash` badge, and dynamically mounts `LatticeLoader` with 18 rendered cells and zero console errors.
- **Video Progress Engine:** Verified with unit test harness (`tests/video-completion.test.js`). `putVideoProgress` checks `res.ok` status and logs failures.
- **Reading Automation:** Verified with unit test harness (`tests/reading-completion.test.js`). Handles 200/201/204, numeric vs string userId fallback, and partial failures.
- **Coach Dialogue:** Verified with unit test harness (`tests/coach-dialogue.test.js`). Adheres to `TARGET_GENUINE_TURNS` limit, tolerates missing textareas and loader hangs, and never advances queue without terminal completion.
- **Quiz Assistant:** Verified with unit test harness (`tests/gemini-quiz.test.js`). Response body consumption bug in `inspectResponse` resolved via caching. Fallback to default model on 404/quota-zero verified.
- **Gemini Proxy Service Worker:** Verified with unit test harness (`tests/gemini-proxy.test.js`). Enforces destination authorization, 30s deadline timeout, status propagation, and API key sanitization.
- **DOM & Selector Robustness:** Verified with unit test harness (`tests/dom-robustness.test.js`). Fallback semantic selectors (`data-testid='part-Submission_Part'`, etc.) prevent failure when Coursera class hashes change.
- **Answer Selection Safety:** Invariant preserved: answers are selected in the DOM for student review; final submission is explicitly NOT automated on graded assessments.
- **Test Suite Status:** 28/28 tests passing (`tests/*.test.js`).

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
4. **Live Coursera Sessions:** Verification was performed using real Chrome CDP staging harnesses and Node.js unit tests. Automation against a live authenticated student account was intentionally omitted during staging per safety protocol.

---

## 8. Exact Next Development Task

- **Task:** End-to-End Live Coursera Pilot or Next Feature Milestone.
- **Files to Inspect:** `dist/scripts/content.js`, `dist/scripts/background.js`, `dist/scripts/interceptor.js`.
- **Acceptance Criteria:**
  1. Validate content script injection and toast notifications on live Coursera course pages (`https://www.coursera.org/learn/*`).
  2. Test video progress sync against real video player events.
  3. Validate quiz answer suggestions in DOM under explicit user supervision without submitting.

---

## 9. How to Retrieve Deeper Context

- **Semantic Code Search:** Use Infimium MCP tool `semantic_code_search` with natural language queries (e.g. `"quiz answer fill logic"`).
- **Symbol Expansion:** Call `expand_symbol` on returned symbol names.
- **Project Memory:** Call `project_memory` (`action: "history"`) or `get_context`.
- **CLI Commands:** Run `infimium status`, `infimium memory`, or `infimium doctor`.
