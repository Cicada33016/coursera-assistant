# NEXT — Immediate Next Development Task

## Single Specific Task: Extension Baseline Regression & Syntax Verification

- **Description:** Run systematic syntax and structural verification across all JavaScript files, styles, and HTML entry points within `dist/` to confirm that the extension payload is 100% compliant with Chrome Manifest V3 runtime requirements and that no legacy syntax or broken references remain.
- **Files to Inspect:**
  - `manifest.json`
  - `dist/scripts/background.js`
  - `dist/scripts/content.js`
  - `dist/scripts/interceptor.js`
  - `dist/scripts/popup.js`
  - `dist/scripts/settings.js`
  - `dist/scripts/quiz-progress.js`
  - `dist/scripts/LatticeLoader.js`
- **Acceptance Criteria:**
  1. `node --check` passes cleanly with code 0 on all 8 scripts under `dist/scripts/`.
  2. Every file path referenced in `manifest.json` exists on disk.
  3. No unredacted API key references appear in string literals or error messages.
  4. Quotas and rate limits on Gemini proxy requests are verified to have graceful error handling.
