/**
 * Coursera Automation Extension - Options/Settings Controller (settings.js)
 * 
 * Manages user preferences for retained features:
 * - Discussion automation response delay speed (stored under key "s" in chrome.storage.sync)
 */
(() => {
  'use strict';

  const APPROVED_QUIZ_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview"
  ];
  const DEFAULT_QUIZ_MODEL = "gemini-3-flash-preview";

  const normalizeQuizModel = (raw) => {
    if (!raw || typeof raw !== "string") return DEFAULT_QUIZ_MODEL;
    let trimmed = raw.trim();
    while (trimmed.startsWith("/")) trimmed = trimmed.substring(1);
    while (trimmed.startsWith("models/")) trimmed = trimmed.substring("models/".length);
    return APPROVED_QUIZ_MODELS.includes(trimmed) ? trimmed : DEFAULT_QUIZ_MODEL;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const speedInput = document.getElementById("speedInput");
    const geminiKeyInput = document.getElementById("geminiKeyInput");
    const geminiModelSelect = document.getElementById("geminiModelSelect");
    const geminiAutoQuizToggle = document.getElementById("geminiAutoQuizToggle");
    const saveBtn = document.getElementById("saveBtn");
    const statusDiv = document.getElementById("status");

    // Load saved discussion speed delay from chrome.storage.sync
    chrome.storage.sync.get(["s"], stored => {
      const parsedSpeed = parseInt(stored?.s);
      if (speedInput && !isNaN(parsedSpeed) && parsedSpeed > 0) {
        speedInput.value = parsedSpeed;
      }
    });

    // Load saved Gemini settings from chrome.storage.local
    chrome.storage.local.get(["key", "model", "quiz"], stored => {
      if (stored) {
        if (stored.key && geminiKeyInput) geminiKeyInput.value = stored.key;
        if (geminiModelSelect) {
          const resolved = normalizeQuizModel(stored.model || DEFAULT_QUIZ_MODEL);
          geminiModelSelect.value = resolved;
          if (stored.model && resolved !== stored.model) {
            chrome.storage.local.set({ model: resolved });
          }
        }
        if (stored.quiz !== undefined && geminiAutoQuizToggle) geminiAutoQuizToggle.checked = Boolean(stored.quiz);
      }
    });

    // Save updated settings
    saveBtn?.addEventListener("click", () => {
      let speedVal = parseInt(speedInput?.value || "5000");
      if (isNaN(speedVal) || speedVal < 1000) {
        speedVal = 1000;
      } else if (speedVal > 20000) {
        speedVal = 20000;
      }

      if (speedInput) {
        speedInput.value = speedVal;
      }

      chrome.storage.sync.set({ s: speedVal }, () => {
        const geminiKeyVal = geminiKeyInput?.value?.trim() || "";
        const geminiModelVal = normalizeQuizModel(geminiModelSelect?.value || DEFAULT_QUIZ_MODEL);
        const geminiQuizVal = Boolean(geminiAutoQuizToggle?.checked);

        chrome.storage.local.set({
          key: geminiKeyVal,
          model: geminiModelVal,
          quiz: geminiQuizVal
        }, () => {
          if (statusDiv) {
            statusDiv.textContent = "Preferences saved successfully.";
            statusDiv.style.color = "#10b981";
            setTimeout(() => {
              statusDiv.textContent = "";
            }, 2000);
          }
        });
      });
    });
  });
})();
