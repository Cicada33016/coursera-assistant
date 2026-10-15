# ADR-001: Manifest V3 Direct Runtime Architecture

## Status
Accepted

## Context
Coursera Assistant is a browser extension targeting modern Chrome. It automates video, reading, discussion, coach dialogue, and quiz workflows on `coursera.org`. Extensions can either use complex build toolchains (Webpack, Vite, Rollup) or distribute a direct, unbundled vanilla JavaScript architecture.

## Decision
We maintain a direct vanilla ECMAScript architecture located under `dist/`:
1. `manifest.json` points directly to files under `dist/scripts/`, `dist/ui/`, and `dist/assets/`.
2. No intermediate build or transpilation step is required for execution.
3. The background service worker (`dist/scripts/background.js`) acts as a secure fetch proxy (`GEMINI_PROXY_FETCH`) for Google Gemini API calls, bypassing page CSP restrictions without exposing keys in web pages.
4. An isolated content script (`dist/scripts/content.js`) manages page automation and toasts.
5. A main-world interceptor (`dist/scripts/interceptor.js`) captures Coursera application events and relays them via synthetic custom events.
6. Graded quiz answers are highlighted and selected in the DOM for user review, but final submission is never automated to preserve student control and academic integrity.

## Consequences
- **Positive:** Zero build step latency, instant reload during development, full transparency in code reviews, minimal attack surface.
- **Negative:** Code must use native ES modules and browser-compatible syntax; polyfills and modern JSX require deliberate handling (e.g. `LatticeLoader.js` exists alongside `.jsx`).
