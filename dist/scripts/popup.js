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

    const githubButton = document.getElementById("githubBtn");
    githubButton?.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: "https://github.com/Cicada33016/coursera-assistant" });
    });

    initUpdateManagement();
  };

  /**
   * Initializes Update Management UI (Banners, Mandatory Overlays, First-launch modals)
   */
  const initUpdateManagement = async () => {
    const bannerEl = document.getElementById("optionalUpdateBanner");
    const bannerCurrentEl = document.getElementById("bannerCurrentVersion");
    const bannerLatestEl = document.getElementById("bannerLatestVersion");
    const btnOptionalUpdate = document.getElementById("btnOptionalUpdate");
    const btnDismissUpdate = document.getElementById("btnDismissUpdate");

    const mandatoryModal = document.getElementById("mandatoryUpdateModal");
    const mandatorySubtitle = document.getElementById("mandatorySubtitle");
    const mandatoryInstalledEl = document.getElementById("mandatoryInstalledVersion");
    const mandatoryTargetLabel = document.getElementById("mandatoryTargetLabel");
    const mandatoryTargetEl = document.getElementById("mandatoryTargetVersion");
    const btnMandatoryUpdate = document.getElementById("btnMandatoryUpdate");

    const starModal = document.getElementById("starPromptModal");
    const btnStarRepo = document.getElementById("btnStarRepo");
    const btnDismissStar = document.getElementById("btnDismissStar");

    // Banner interactions
    btnDismissUpdate?.addEventListener("click", () => {
      bannerEl?.classList.add("hidden");
    });

    btnOptionalUpdate?.addEventListener("click", (e) => {
      e.preventDefault();
      const targetUrl = btnOptionalUpdate.href || "https://github.com/Cicada33016/coursera-assistant/releases/latest";
      chrome.tabs.create({ url: targetUrl });
    });

    btnMandatoryUpdate?.addEventListener("click", (e) => {
      e.preventDefault();
      const targetUrl = btnMandatoryUpdate.href || "https://github.com/Cicada33016/coursera-assistant/releases/latest";
      chrome.tabs.create({ url: targetUrl });
    });

    // Star prompt interactions
    btnStarRepo?.addEventListener("click", () => {
      starModal?.classList.add("hidden");
      chrome.tabs.create({ url: "https://github.com/Cicada33016/coursera-assistant" });
    });

    btnDismissStar?.addEventListener("click", () => {
      starModal?.classList.add("hidden");
    });

    const updateManager = globalThis.AutoCourseraUpdateManager;
    if (!updateManager) return;

    // Check first-launch onboarding
    try {
      const firstLaunchResult = await updateManager.handleFirstLaunch();
      if (firstLaunchResult?.showStarPrompt && starModal) {
        starModal.classList.remove("hidden");
      }
    } catch (e) {
      console.warn("[AutoCoursera] First-launch check error:", e);
    }

    // Function to render update state
    const applyUpdateState = (state) => {
      if (!state) return;

      if (state.status === "MANDATORY" && mandatoryModal) {
        mandatoryModal.classList.remove("hidden");
        bannerEl?.classList.add("hidden");

        if (mandatoryInstalledEl) mandatoryInstalledEl.textContent = state.installedVersion;
        if (btnMandatoryUpdate && state.releaseUrl) btnMandatoryUpdate.href = state.releaseUrl;

        if (state.reason === "BELOW_MINIMUM") {
          if (mandatorySubtitle) mandatorySubtitle.textContent = "Your version is no longer supported.";
          if (mandatoryTargetLabel) mandatoryTargetLabel.textContent = "Minimum supported version:";
          if (mandatoryTargetEl) mandatoryTargetEl.textContent = state.minimumSupportedVersion;
        } else {
          // UPDATE_REQUIRED_FLAG
          if (mandatorySubtitle) mandatorySubtitle.textContent = "A mandatory update is available.";
          if (mandatoryTargetLabel) mandatoryTargetLabel.textContent = "Required version:";
          if (mandatoryTargetEl) mandatoryTargetEl.textContent = state.latestVersion;
        }
      } else if (state.status === "OPTIONAL" && bannerEl) {
        mandatoryModal?.classList.add("hidden");
        bannerEl.classList.remove("hidden");

        if (bannerCurrentEl) bannerCurrentEl.textContent = state.installedVersion;
        if (bannerLatestEl) bannerLatestEl.textContent = state.latestVersion;
        if (btnOptionalUpdate && state.releaseUrl) btnOptionalUpdate.href = state.releaseUrl;
      } else {
        // UP_TO_DATE
        bannerEl?.classList.add("hidden");
        mandatoryModal?.classList.add("hidden");
      }
    };

    // Perform non-blocking check
    try {
      const state = await updateManager.checkForUpdates(false);
      applyUpdateState(state);
    } catch (err) {
      console.warn("[AutoCoursera] Update check error:", err);
    }
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
