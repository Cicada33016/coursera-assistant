/**
 * Coursera Automation Extension - Popup UI Controller (popup.js)
 * 
 * Manages the extension popup: renders action buttons for the three core
 * features (Reading Material, Discussion, Dialogue) and dispatches action
 * messages to the content script on the active tab.
 */
(() => {
  'use strict';

  // Core automation features (Reading, Discussion, Dialogue, and Video Completion)
  const FEATURES = [
    {
      label: "Reading Material",
      action: "reading"
    },
    {
      label: "Discussion",
      action: "discussion"
    },
    {
      label: "Dialogue",
      action: "dialogue"
    },
    {
      label: "Video Completion",
      action: "video"
    },
    {
      label: "Solve Quiz",
      action: "quiz"
    }
  ];

  document.addEventListener("DOMContentLoaded", () => {
    initPopup();
    initGeminiSettings();
  });

  /**
   * Initializes popup UI and attaches event listeners
   */
  const initPopup = () => {
    renderButtonsGrid();
    loadUserProfile();

    const settingsButton = document.getElementById("settingsBtn");
    settingsButton?.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        action: "OPEN_OPTIONS"
      });
    });
  };

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

  /**
   * Initializes Gemini AI Settings and Auto-Quiz controls
   */
  const initGeminiSettings = () => {
    const keyInput = document.getElementById("key");
    const modelSelect = document.getElementById("model-select");
    const saveBtn = document.getElementById("save");
    const quizToggle = document.getElementById("quizToggel");
    const autoQuizBtn = document.getElementById("autoQuiz");
    const statusEl = document.getElementById("key-status");

    // Load initial Gemini settings from chrome.storage.local
    chrome.storage.local.get(["quiz", "key", "model"], (data) => {
      if (data) {
        if (data.quiz !== undefined && quizToggle) {
          quizToggle.checked = Boolean(data.quiz);
        }
        if (data.key && keyInput) {
          keyInput.value = data.key;
        }
        if (modelSelect) {
          const resolved = normalizeQuizModel(data.model || DEFAULT_QUIZ_MODEL);
          modelSelect.value = resolved;
          if (data.model && resolved !== data.model) {
            chrome.storage.local.set({ model: resolved });
          }
        }
      }
    });

    // Save Settings button click
    saveBtn?.addEventListener("click", () => {
      const keyVal = keyInput?.value?.trim();
      const modelVal = normalizeQuizModel(modelSelect?.value || DEFAULT_QUIZ_MODEL);

      if (!keyVal) {
        if (statusEl) {
          statusEl.textContent = "Please enter an API key to save.";
          statusEl.style.color = "var(--danger, #ef4444)";
        }
        return;
      }

      chrome.storage.local.set({ key: keyVal, model: modelVal }, () => {
        console.log("Gemini settings saved.");
        saveBtn.classList.add("saved");
        if (statusEl) {
          statusEl.textContent = "Gemini settings saved.";
          statusEl.style.color = "var(--primary, #3b82f6)";
        }
        setTimeout(() => {
          saveBtn.classList.remove("saved");
          window.close();
        }, 2000);
      });
    });

    // Auto-Quiz toggle change
    quizToggle?.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      chrome.storage.local.get(["key"], (res) => {
        if (isChecked && (!res.key || !res.key.trim())) {
          e.target.checked = false;
          if (statusEl) {
            statusEl.textContent = "Enter and save your API key to continue.";
            statusEl.style.color = "var(--danger, #ef4444)";
          }
          return;
        }
        chrome.storage.local.set({ quiz: isChecked });
      });
    });

    // Solve quiz button click
    autoQuizBtn?.addEventListener("click", () => {
      chrome.storage.local.get(["key"], (res) => {
        if (!res.key || !res.key.trim()) {
          if (statusEl) {
            statusEl.textContent = "Enter and save your API key to continue.";
            statusEl.style.color = "var(--danger, #ef4444)";
          }
          return;
        }

        autoQuizBtn.disabled = true;
        setTimeout(() => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, "quiz");
            }
            window.close();
          });
        }, 1500);
      });
    });
  };

  /**
   * Loads authenticated Coursera user profile from the active tab content script
   */
  const loadUserProfile = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs || !tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: "GET_USER_DATA" }, response => {
        if (chrome.runtime.lastError) {
          return;
        }
        if (response?.user) {
          const profileEl = document.getElementById("userProfile");
          const nameEl = document.getElementById("userName");
          const emailEl = document.getElementById("userEmail");
          if (profileEl && nameEl && emailEl) {
            profileEl.classList.remove("hidden");
            nameEl.textContent = response.user.name || "Coursera User";
            if (response.user.email) {
              emailEl.innerHTML = '<span class="email-pill">' + response.user.email + '</span>';
            }
          }
        }
      });
    });
  };

  /**
   * Populates the grid of action buttons based on the FEATURES array
   */
  const renderButtonsGrid = () => {
    const gridContainer = document.getElementById("courseraModelGrid");
    if (gridContainer) {
      gridContainer.innerHTML = "";
      FEATURES.forEach(feature => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("courseraBtnWrapper");

        const button = createFeatureButton(feature);
        wrapper.appendChild(button);

        gridContainer.appendChild(wrapper);
      });
    }
  };

  /**
   * Creates an individual feature button element
   */
  const createFeatureButton = (feature) => {
    const button = document.createElement("button");
    button.classList.add("courseraModelBtn");

    const labelSpan = document.createElement("span");
    labelSpan.textContent = feature.label;
    button.appendChild(labelSpan);

    button.addEventListener("click", () => {
      sendActionToActiveTab(feature.action);
    });

    return button;
  };

  /**
   * Sends an action message to the active Coursera tab
   */
  const sendActionToActiveTab = (action) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: action
        });
      }
    });
  };
})();
