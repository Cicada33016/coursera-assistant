# Coursera Assistant Troubleshooting & FAQ

This guide provides practical troubleshooting steps for common questions and issues encountered while using **Coursera Assistant**.

---

## ❓ Frequently Asked Questions & Solutions

### 1. "I ran Video Completion, but the green checkmarks did not appear."
**Cause:** Coursera's progress service writes updates to its backend database asynchronously and serves the course outline through a cached Content Delivery Network (CDN).  
**Solution:**
1. **Refresh the Coursera page first:** Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac) to bypass your local browser cache.
2. Check your progress tab in the Coursera course outline.
3. If specific videos still remain incomplete, click **Video Completion** again. Re-running is idempotent and will complete any remaining items.

---

### 2. "The extension popup says: 'Please open a Coursera course page first'."
**Cause:** The extension's content script only injects into domains matching `*://*.coursera.org/*`.  
**Solution:**
- Make sure your active browser tab is on `https://www.coursera.org`.
- If you just installed or updated the extension, reload your active Coursera tab so Chrome injects the updated content script.

---

### 3. "Gemini AI Quiz Solver returns an error or 404."
**Cause:** Either the Gemini API key was not entered, or the selected model is not enabled on your Google AI Studio account.  
**Solution:**
1. Open the extension popup, click the **Gear icon (⚙️)** to open Settings.
2. Verify that your **Gemini API Key** starts with `AIzaSy...` without leading or trailing spaces.
3. Ensure your active model is set to `gemini-3-flash-preview` (recommended).
4. Verify your quota at [Google AI Studio](https://aistudio.google.com/).

---

### 4. "How do I install or update Coursera Assistant manually?"
**Cause:** Coursera Assistant is distributed as an open-source extension directly from GitHub releases rather than the Chrome Web Store.  
**Solution:**
1. Download the latest `Mayank-Coursera-Extension-v1.0.0.zip` from [GitHub Releases](https://github.com/Cicada33016/coursera-assistant/releases).
2. Extract the ZIP file to a permanent folder on your computer.
3. Open `chrome://extensions/` in Google Chrome.
4. Enable the **Developer mode** toggle in the top-right corner.
5. Click **Load unpacked** and select the folder containing `manifest.json`.
6. Whenever an update notification appears in the popup, download the latest release and reload the unpacked directory in `chrome://extensions/`.

---

### 5. "Does Coursera Assistant collect or transmit my personal data?"
**Privacy Guarantee:**
- **Zero Remote Analytics:** Coursera Assistant contains no tracking pixels, Google Analytics, or third-party telemetry.
- **Local Key Storage:** Your Gemini API key is stored securely in your browser's local extension storage (`chrome.storage.local`).
- **Direct API Communication:** All AI requests travel directly from your browser to Google's official Gemini API endpoints (`generativelanguage.googleapis.com`).

---

*Return to [Documentation Overview](../README.md#documentation) • [Coursera Automation Guide](coursera-automation.md)*
