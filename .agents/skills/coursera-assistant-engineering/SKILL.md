---
name: coursera-assistant-engineering
description: Engineering guidelines, architecture rules, and testing workflows for developing and maintaining the Coursera Assistant Chrome Manifest V3 browser extension.
---

# Coursera Assistant Engineering Skill

This skill guides engineering on the Coursera Assistant Chrome extension. It enforces Manifest V3 compliance, DOM mutation safety, API error resilience, and student-controlled quiz workflows.

---

## 1. Architectural Map & Component Roles

When modifying or debugging the extension, target the appropriate component:

- **Manifest Configuration (`manifest.json`):**
  - MV3 schema definition.
  - Declares background service worker (`dist/scripts/background.js`).
  - Declares isolated content script (`dist/scripts/content.js`) and MAIN-world script (`dist/scripts/interceptor.js`).
  - Host permissions restricted to `*://*.coursera.org/*` and `https://generativelanguage.googleapis.com/*`.
- **Background Service Worker (`dist/scripts/background.js`):**
  - **Responsibilities:** Extension lifecycle, tab query coordination, keyboard command listeners (`open_popup_1`, `open_popup_2`), detached quiz progress window lifecycle (`OPEN_QUIZ_WINDOW`, `CLOSE_QUIZ_WINDOW`), and `GEMINI_PROXY_FETCH`.
  - **Invariants:** Must never initiate arbitrary external network calls. Only forwards requests targeting `https://generativelanguage.googleapis.com/*`.
- **Content Script (`dist/scripts/content.js`):**
  - **Responsibilities:** Automation logic for Coursera course elements: video playback (`postVideoEvent`, `putVideoProgress`), reading completion, discussion reply injection, Coach dialogue, and quiz answer selection.
  - **Invariants:** Uses polling with exponential backoff and barrier timeouts. Answers are selected in the DOM; quiz submission buttons are NEVER clicked automatically on graded assessments.
- **Main-World Interceptor (`dist/scripts/interceptor.js`):**
  - **Responsibilities:** Runs in `world: "MAIN"` at `document_start` to intercept `XMLHttpRequest` and `fetch` calls made by Coursera's React application and dispatch synthetic CustomEvents (`CourseraAssistant_Intercepted`) to the content script.
- **Settings & Popup UI (`dist/scripts/popup.js`, `dist/scripts/settings.js`):**
  - Stores configuration (`geminiApiKey`, `geminiModel`) in `chrome.storage.local`.

---

## 2. Manifest V3 & Browser Compliance Rules

1. **Service Worker Lifecycle:**
   - Background service workers are ephemeral and will terminate when idle.
   - Do NOT store persistent state in global in-memory variables inside `background.js`. Rely on `chrome.storage.local` or message queries.
2. **Asynchronous Messaging:**
   - When handling `chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { ... })` asynchronously, ALWAYS `return true;` to keep the message port open until `sendResponse()` is called.
3. **CORS & CSP Bypass via Background Proxy:**
   - Content scripts running on `coursera.org` cannot directly fetch `generativelanguage.googleapis.com` due to Coursera's Content Security Policy (`connect-src`).
   - All Gemini API calls must be dispatched to `background.js` via `GEMINI_PROXY_FETCH`.

---

## 3. DOM Automation & Timing Barriers

Coursera is a dynamic Single Page Application (SPA) using React. Class names (e.g. `div.css-1tfphom`) frequently change between deployments.

### Best Practices:
- Prefer semantic selectors, ARIA attributes, and `data-testid` attributes over generated CSS hash classes:
  - Good: `button[data-testid="mark-complete"]`, `button[aria-label*="send" i]`
  - Fallback: Structural traversal with null-safety checks.
- Always implement timeout barriers (e.g. wait loops with maximum retry limits) to avoid infinite polling.
- Dispatch synthetic `input` and `change` events after setting element `.value` to inform React state managers:
  ```javascript
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  ```

---

## 4. Gemini API Error Handling & Privacy

1. **Credential Hygiene:**
   - Never log API keys.
   - Sanitize error messages before displaying toasts or logging:
     ```javascript
     let cleanMsg = error.message || "Request failed.";
     if (geminiApiKey) {
       cleanMsg = cleanMsg.split(geminiApiKey).join("[REDACTED]");
     }
     ```
2. **Model Selection:**
   - Default to `gemini-2.5-flash` or `gemini-3.8-flash`. Validate model strings against supported identifiers.
3. **Fallback Synthesis:**
   - When the API key is not configured or network quota is exceeded, fall back gracefully to heuristic matching or alert the user cleanly.

---

## 5. Verification Protocol Before Changes

1. **Syntax Check:**
   Run `node --check` on all modified JavaScript files.
2. **Manifest Integrity:**
   Verify that all paths declared in `manifest.json` resolve to actual files.
3. **State Synchronization:**
   Update `.agents/state/NOW.md`, `CURRENT.md`, and `NEXT.md` on every completed milestone.
4. **Git Hygiene:**
   Commit with clear conventional commit messages (`feat:`, `fix:`, `refactor:`, `docs:`). Never force-push.
