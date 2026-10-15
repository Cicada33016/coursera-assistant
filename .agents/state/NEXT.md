# NEXT — Immediate Next Development Task

## Single Specific Task: Live Coursera End-to-End User Pilot

- **Description:** With extension staging, package validation, options storage persistence, and popup UI verified, the next recommended task is an interactive end-to-end user pilot on live Coursera course sessions.
- **Files to Inspect:**
  - `dist/scripts/content.js`
  - `dist/scripts/background.js`
  - `dist/scripts/interceptor.js`
  - `manifest.json`
- **Acceptance Criteria:**
  1. Test non-destructive video progress tracking on live lecture items (`https://www.coursera.org/learn/*`).
  2. Test reading item completion timers and user status toasts.
  3. Validate DOM question extraction and answer suggestion selection (under explicit student control without auto-submission).
  4. Verify network communication through Gemini proxy on live API calls with user-provided API key.
