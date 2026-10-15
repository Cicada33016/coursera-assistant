# NEXT — Immediate Next Development Task

## Single Specific Task: Chrome Extension End-to-End Staging Validation

- **Description:** Load the audited extension into a real Chromium browser instance (via Chrome developer mode `chrome://extensions` or Puppeteer/browser subagent with a mocked Coursera fixture) to verify runtime extension initialization, options page configuration, and content script injection without CSP violations.
- **Files to Inspect:**
  - `dist/manifest.json`
  - `dist/popup.html`
  - `dist/settings.html`
  - `dist/scripts/content.js`
- **Acceptance Criteria:**
  1. Extension loads into Chrome with zero manifest warnings or errors.
  2. Options page loads cleanly and successfully saves/reads settings in `chrome.storage.local`.
  3. Toolbar popup renders correctly without layout distortion or script errors.
  4. Content script injects into target domain and communicates with the background service worker via Chrome runtime messaging.
