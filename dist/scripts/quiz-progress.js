/**
 * Coursera Automation Extension - Persistent Quiz Solver Window Controller (quiz-progress.js)
 * 
 * Renders live quiz progress events from the solver engine.
 * Receives QUIZ_PROGRESS runtime messages and updates the UI in real time.
 * Note: Solver logic is strictly isolated in content.js.
 */
(() => {
  'use strict';

  const MODEL_DISPLAY_NAMES = {
    "gemini-3.8-flash": "Gemini 3.8 Flash",
    "gemini-3.5-flash": "Gemini 3.5 Flash",
    "gemini-3-flash-preview": "Gemini 3 Flash"
  };

  const modelBadge = document.getElementById("modelBadge");
  const spinner = document.getElementById("spinner");
  const statusSymbolSuccess = document.getElementById("statusSymbolSuccess");
  const statusSymbolError = document.getElementById("statusSymbolError");
  const statusTitle = document.getElementById("statusTitle");
  const statusSubtitle = document.getElementById("statusSubtitle");
  const stepBarFill = document.getElementById("stepBarFill");
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  const btnSettings = document.getElementById("btnSettings");
  const btnDismiss = document.getElementById("btnDismiss");
  const footerHint = document.getElementById("footerHint");

  function setModelDisplay(modelId) {
    if (!modelBadge) return;
    const cleanId = (modelId || "gemini-3-flash-preview").replace(/^\/?(models\/)+/, "").trim();
    const displayName = MODEL_DISPLAY_NAMES[cleanId] || "Gemini 3 Flash";
    modelBadge.textContent = displayName;
  }

  function setStepState(stepElem, state) {
    if (!stepElem) return;
    stepElem.classList.remove("active", "done");
    if (state === "active") stepElem.classList.add("active");
    if (state === "done") stepElem.classList.add("done");
  }

  function renderProgress(payload) {
    if (!payload) return;
    const { state, message, model, current, total } = payload;

    if (model) {
      setModelDisplay(model);
    }

    if (spinner) spinner.style.display = "block";
    if (statusSymbolSuccess) statusSymbolSuccess.className = "status-symbol";
    if (statusSymbolError) statusSymbolError.className = "status-symbol";
    if (btnSettings) btnSettings.style.display = "none";

    switch (state) {
      case "starting":
        if (statusTitle) statusTitle.textContent = "Initializing...";
        if (statusSubtitle) statusSubtitle.textContent = message || "Preparing quiz reasoning environment...";
        if (stepBarFill) stepBarFill.style.width = "10%";
        setStepState(step1, "active");
        setStepState(step2, "");
        setStepState(step3, "");
        break;

      case "loading_questions":
        if (statusTitle) statusTitle.textContent = "Extracting questions...";
        if (statusSubtitle) statusSubtitle.textContent = message || "Reading question draft from Coursera...";
        if (stepBarFill) stepBarFill.style.width = "25%";
        setStepState(step1, "active");
        break;

      case "questions_ready":
        if (statusTitle) statusTitle.textContent = "Questions indexed";
        if (statusSubtitle) {
          const detail = total ? `Discovered ${total} questions to solve.` : "Quiz questions successfully indexed.";
          statusSubtitle.textContent = message || detail;
        }
        if (stepBarFill) stepBarFill.style.width = "40%";
        setStepState(step1, "done");
        setStepState(step2, "active");
        break;

      case "solving":
        if (statusTitle) statusTitle.textContent = "AI reasoning in progress...";
        if (statusSubtitle) statusSubtitle.textContent = message || "Gemini is analyzing questions and verifying answers...";
        if (stepBarFill) stepBarFill.style.width = "65%";
        setStepState(step1, "done");
        setStepState(step2, "active");
        break;

      case "answers_ready":
        if (statusTitle) statusTitle.textContent = "Answers ready";
        if (statusSubtitle) statusSubtitle.textContent = message || "Answers verified and ready to apply.";
        if (stepBarFill) stepBarFill.style.width = "80%";
        setStepState(step1, "done");
        setStepState(step2, "done");
        setStepState(step3, "active");
        break;

      case "filling_answers":
        if (statusTitle) statusTitle.textContent = "Applying answers...";
        if (statusSubtitle) {
          const countDetail = (current !== undefined && total) ? `Applying answer ${current} of ${total}...` : "Injecting correct options into DOM...";
          statusSubtitle.textContent = message || countDetail;
        }
        if (stepBarFill) stepBarFill.style.width = "90%";
        setStepState(step1, "done");
        setStepState(step2, "done");
        setStepState(step3, "active");
        break;

      case "submitting":
        if (statusTitle) statusTitle.textContent = "Verifying options...";
        if (statusSubtitle) statusSubtitle.textContent = message || "Answer choices selected. Verifying attempt...";
        if (stepBarFill) stepBarFill.style.width = "95%";
        setStepState(step1, "done");
        setStepState(step2, "done");
        setStepState(step3, "active");
        break;

      case "completed":
        if (spinner) spinner.style.display = "none";
        if (statusSymbolSuccess) statusSymbolSuccess.className = "status-symbol success";
        if (statusTitle) statusTitle.textContent = "Quiz completed";
        if (statusSubtitle) statusSubtitle.textContent = message || "✓ Quiz completed successfully";
        if (stepBarFill) {
          stepBarFill.style.width = "100%";
          stepBarFill.style.background = "#2ea043";
        }
        setStepState(step1, "done");
        setStepState(step2, "done");
        if (footerHint) footerHint.textContent = "Window will close automatically...";
        setTimeout(() => {
          if (typeof window !== "undefined" && typeof window.close === "function") {
            window.close();
          }
        }, 4000);
        break;

      case "error":
        if (spinner) spinner.style.display = "none";
        if (statusSymbolError) statusSymbolError.className = "status-symbol error";
        if (statusTitle) statusTitle.textContent = "Unable to complete quiz";
        if (statusSubtitle) statusSubtitle.textContent = message || "Coursera did not return the expected response.";
        if (stepBarFill) {
          stepBarFill.style.background = "#f85149";
        }
        if (footerHint) footerHint.textContent = "Window kept open for review";
        if (message && message.toLowerCase().includes("api key") && btnSettings) {
          btnSettings.style.display = "inline-block";
        }
        break;

      default:
        if (message && statusSubtitle) statusSubtitle.textContent = message;
        break;
    }
  }

  // Load configured model from storage on startup
  if (typeof chrome !== "undefined" && chrome?.storage?.local) {
    chrome.storage.local.get(["model"], (data) => {
      if (data?.model) {
        setModelDisplay(data.model);
      }
    });
  }

  // Request latest cached state from background on startup
  if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ action: "GET_QUIZ_PROGRESS" }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.payload) {
        renderProgress(response.payload);
      }
    });
  }

  // Runtime message listener for live QUIZ_PROGRESS updates
  if (typeof chrome !== "undefined" && chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === "QUIZ_PROGRESS" && request.payload) {
        renderProgress(request.payload);
      }
    });
  }

  // Button actions
  btnDismiss?.addEventListener("click", () => {
    window.close();
  });

  btnSettings?.addEventListener("click", () => {
    if (typeof chrome !== "undefined") {
      if (chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        chrome.runtime.sendMessage({ action: "OPEN_OPTIONS" });
      }
    }
  });

})();
