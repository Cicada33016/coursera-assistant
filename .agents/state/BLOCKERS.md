# BLOCKERS — Active Blockers & Unverified State

## External Prerequisites & Unverified Constraints

1. **Live Coursera Authenticated Session:**
   - Real-world interaction with Coursera's production backend requires an authenticated student account enrolled in active courses.
   - Per safety guidelines and audit protocol, offline test harnesses, real Chrome CDP staging, and DOM mocks were used. Real student session interaction remains unexecuted and must be performed under explicit user supervision.
2. **Reboot Persistence for Ollama:**
   - Startup registry entry is configured under `HKCU:\Software\Microsoft\Windows\CurrentVersion\Run`. Fresh system reboot validation remains marked as **PENDING VERIFICATION**.
3. **Chrome CLI Extension Loading:**
   - Official branded Google Chrome builds (v137+) reject the `--load-extension` command-line switch for user-facing security (`--load-extension is not allowed in Google Chrome, ignoring`). Unpacked extensions in standard Chrome must be loaded via `chrome://extensions` "Load unpacked" UI or using Chrome for Testing binaries.
4. **Resolved Items:**
   - *GitHub Authentication:* Authenticated via `gh auth setup-git` as `Cicada33016`; remote fast-forward push confirmed.
   - *Infimium Runtime:* Smart App Control native module resolution patched via lazy loading; vector database operational.
   - *ES Module Resolution in Progress Window:* Fixed extensionless import in `quiz-progress.js` and enhanced `importmap` in `quiz-progress.html`.
   - *Non-Coursera Tab Error Handling:* Added `chrome.runtime.lastError` callbacks to `popup.js` messaging.
