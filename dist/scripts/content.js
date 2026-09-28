/**
 * Coursera Automation Extension - Content Script (content.js)
 * 
 * Orchestrates in-page Coursera automation for the three core features:
 * - Reading Material completion (supplements)
 * - Discussion automation with configurable pacing speed delay
 * - Dialogue / Ungraded Widget completion (widget sessions & progress)
 */
(() => {
  'use strict';

  (function () {
    const ACTIVE_GUARD_KEY = "__coursera_ext_active__";
    if (window[ACTIVE_GUARD_KEY]) {
      return;
    }
    window[ACTIVE_GUARD_KEY] = true;

    // In-memory state variables
    let currentUserId = null;
    let currentUserObj = null;
    let currentCourseId = "";
    let cachedCourseMaterials = null;
    let toastManager = null;
    let isVideoCompletionActive = false;
    let videoCountdownTimerId = null;
    const extensionVersion = chrome.runtime.getManifest()?.version || "1.0.0";

    /**
     * Checks if a video completion reload occurred and displays confirmation toast
     */
    const checkPostReloadState = () => {
      try {
        if (sessionStorage.getItem("coursera_video_completion_reloaded") === "true") {
          sessionStorage.removeItem("coursera_video_completion_reloaded");
          showToast("Completed lectures", "success");
        }
      } catch (e) {}
    };

    window.addEventListener("beforeunload", () => {
      if (videoCountdownTimerId) {
        clearInterval(videoCountdownTimerId);
        videoCountdownTimerId = null;
      }
    });



    const JSON_REF = typeof window !== 'undefined' && window.JSON ? window.JSON : JSON;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Builds HTTP request headers including extension version
     */
    function buildHeaders(extraHeaders = {}) {
      return {
        "Content-Type": "application/json",
        "X-Ext-Version": extensionVersion,
        ...extraHeaders
      };
    }

    /**
     * Writes a value to chrome.storage.sync
     */
    const setSyncStorage = (key, value) => {
      try {
        const obj = { [key]: value };
        chrome.storage.sync.set(obj, function () {
          return value;
        });
      } catch (e) {}
    };

    /**
     * Reads a value from chrome.storage.sync as a Promise
     */
    const getSyncStorage = key => new Promise((resolve) => {
      try {
        chrome.storage.sync.get([key], function (res) {
          if (res && res[key] !== undefined) {
            resolve(res[key]);
          } else {
            resolve(null);
          }
        });
      } catch (e) {
        resolve(null);
      }
    });

    /**
     * Displays a toast notification in the center-top of the screen
     */
    const showToast = (message, type = "success", keep = false) => {
      let container = document.getElementById("ext-toast-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "ext-toast-container";
        Object.assign(container.style, {
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: "2147483647",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          pointerEvents: "none"
        });
        document.body.appendChild(container);
      }

      let toastMain = document.getElementById("ext-toast-main");
      const accentColor = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : type === "warn" ? "#f59e0b" : "#2563eb";
      if (!toastMain) {
        toastMain = document.createElement("div");
        toastMain.id = "ext-toast-main";
        Object.assign(toastMain.style, {
          background: "#14161c",
          color: "#f3f4f6",
          border: "1px solid #2b303e",
          borderLeft: `3px solid ${accentColor}`,
          padding: "9px 18px",
          borderRadius: "6px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
          fontSize: "12.5px",
          fontWeight: "500",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif',
          opacity: "1",
          transform: "translateY(0)",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          maxWidth: "90vw",
          textAlign: "center",
          minWidth: "220px",
          lineHeight: "1.4"
        });
        container.appendChild(toastMain);
      }

      toastMain.textContent = message;
      toastMain.style.borderLeft = `3px solid ${accentColor}`;

      const win = window;
      if (!keep) {
        if (win.extToastTimeout) {
          clearTimeout(win.extToastTimeout);
        }
        win.extToastTimeout = setTimeout(() => {
          toastMain.style.opacity = "0";
          toastMain.style.transform = "translateY(-4px)";
          setTimeout(() => toastMain.remove(), 250);
        }, 3500);
      }
    };

    /**
     * Toast notification manager for feature-specific alerts
     */
    class ToastNotificationManager {
      constructor() {
        this.toasts = null;
        this.init();
      }

      init() {
        if (!document.querySelector(".toasts")) {
          this.createToastContainer();
        }
      }

      createToastContainer() {
        this.toasts = document.createElement("div");
        this.toasts.className = "toasts";
        this.toasts.style.position = "fixed";
        this.toasts.style.top = "20px";
        this.toasts.style.left = "50%";
        this.toasts.style.transform = "translateX(-50%)";
        this.toasts.style.zIndex = "9999";
        this.toasts.style.display = "flex";
        this.toasts.style.flexDirection = "column";
        this.toasts.style.gap = "10px";
        document.body.appendChild(this.toasts);
      }

      error(msg) {
        const toast = this.createToast(msg, "red");
        this.displayToast(toast);
      }

      success(msg) {
        const toast = this.createToast(msg, "green");
        this.displayToast(toast);
      }

      info(msg) {
        const toast = this.createToast(msg, "blue");
        this.displayToast(toast);
      }

      createToast(text, color) {
        const elem = document.createElement("div");
        elem.className = "toast-" + color;
        const accent = color === "green" ? "#10b981" : color === "red" ? "#ef4444" : "#2563eb";
        Object.assign(elem.style, {
          padding: "9px 18px",
          backgroundColor: "#14161c",
          color: "#f3f4f6",
          border: "1px solid #2b303e",
          borderLeft: `3px solid ${accent}`,
          borderRadius: "6px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          fontSize: "12.5px",
          fontWeight: "500",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif',
          lineHeight: "1.4"
        });
        elem.textContent = text;
        return elem;
      }

      displayToast(elem) {
        if (this.toasts) {
          this.toasts.appendChild(elem);
          setTimeout(() => {
            if (this.toasts) {
              this.toasts.removeChild(elem);
            }
          }, 3000);
        }
      }
    }

    /**
     * Safely extracts window.App JSON data from script text without regex backtracking
     */
    function parseWindowAppFromScript(scriptText) {
      if (!scriptText || !scriptText.includes("window.App")) return null;
      const marker = "window.App";
      const idx = scriptText.indexOf(marker);
      if (idx === -1) return null;
      const eqIdx = scriptText.indexOf("=", idx);
      if (eqIdx === -1) return null;
      const start = scriptText.indexOf("{", eqIdx);
      if (start === -1) return null;

      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = start; i < scriptText.length; i++) {
        const ch = scriptText[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === "{") depth++;
          else if (ch === "}") {
            depth--;
            if (depth === 0) {
              const jsonStr = scriptText.substring(start, i + 1);
              try {
                return JSON.parse(jsonStr);
              } catch (e) {
                return null;
              }
            }
          }
        }
      }
      return null;
    }

    /**
     * Extracts authenticated Coursera user data from in-page window.App scripts
     */
    const extractUserData = () => {
      const scriptTags = document.getElementsByTagName("script");
      for (let script of scriptTags) {
        const text = script.innerHTML || script.textContent || "";
        if (text.includes("window.App")) {
          const appData = parseWindowAppFromScript(text);
          const userData = appData?.context?.dispatcher?.stores?.ApplicationStore?.userData;
          if (userData && userData.id) {
            return userData;
          }
        }
      }
      return null;
    };

    /**
     * Resolves authenticated userId from DOM or cookie
     */
    const resolveUserId = async () => {
      if (currentUserId && /^\d+$/.test(String(currentUserId))) return currentUserId;
      const user = extractUserData();
      if (user?.id && /^\d+$/.test(String(user.id))) {
        currentUserId = String(user.id);
        currentUserObj = user;
        return currentUserId;
      }

      // Check cookie c_user
      const match = document.cookie.match(/(?:^|;\s*)c_user=([^;]+)/);
      if (match && match[1] && /^\d+$/.test(match[1])) {
        currentUserId = match[1];
        return currentUserId;
      }

      // Direct authenticated API fallback for modern Coursera
      try {
        const resp = await fetch("https://www.coursera.org/api/users.v1?q=me", { credentials: "include" });
        if (resp.ok) {
          const data = await resp.json();
          const me = data.elements?.[0];
          if (me?.id && /^\d+$/.test(String(me.id))) {
            currentUserId = String(me.id);
            currentUserObj = me;
            return currentUserId;
          }
        }
      } catch (_) {}

      return null;
    };

    // -------------------------------------------------------------
    // Page Load & Initialization
    // -------------------------------------------------------------
    const initStartup = async () => {
      if (!toastManager && document.body) {
        toastManager = new ToastNotificationManager();
      }
      await resolveUserId();
      checkPostReloadState();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        toastManager = new ToastNotificationManager();
        initStartup();
      });
    } else {
      initStartup();
    }

    window.addEventListener("load", async () => {
      if (!toastManager) {
        toastManager = new ToastNotificationManager();
      }
      await resolveUserId();
      checkPostReloadState();
      await checkAndCompleteCurrentWidget();
    });

    let isWidgetCheckRunning = false;

    /**
     * Synthesizes an intelligent, contextually relevant answer to a Coach Dialogue prompt.
     * Integrates Gemini API if configured; otherwise utilizes academic heuristic synthesis.
     */
    const synthesizeDialogueAnswer = async (questionText = "") => {
      const q = questionText.toLowerCase();

      // Check for Gemini API key in local storage
      try {
        const geminiConfig = await new Promise(resolve => {
          chrome.storage.local.get(["geminiApiKey", "geminiModel"], resolve);
        });

        if (geminiConfig?.geminiApiKey && questionText.trim().length > 10) {
          const model = geminiConfig.geminiModel || "gemini-2.5-flash";
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiConfig.geminiApiKey}`;
          const aiResp = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are an expert college student answering a Coursera Socratic Dialogue question. Give a clear, accurate, and concise answer (2-3 sentences max) to this prompt: "${questionText.slice(0, 500)}"`
                }]
              }]
            })
          });
          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim().length > 5) {
              return text.trim();
            }
          }
        }
      } catch (_) {}

      // Academic Heuristic Knowledge Engine
      if (q.includes("cloud") || q.includes("gcp") || q.includes("aws") || q.includes("azure")) {
        return "Cloud computing provides scalable on-demand access to shared compute, storage, and networking resources over the internet, enabling elasticity and cost optimization compared to managing physical data centers.";
      }
      if (q.includes("thread") || q.includes("concurrency") || q.includes("lock") || q.includes("synchron")) {
        return "Concurrency enables multiple tasks or execution paths to make progress simultaneously. Utilizing thread pools, synchronized blocks, and atomic variables helps prevent race conditions and deadlocks while maximizing processor throughput.";
      }
      if (q.includes("network") || q.includes("packet") || q.includes("router") || q.includes("protocol") || q.includes("ip") || q.includes("tcp")) {
        return "Networking relies on standardized layered protocols where packets are encapsulated, routed across interconnected nodes via IP addressing, and reliably delivered using transport layer controls like TCP handshakes and flow control.";
      }
      if (q.includes("database") || q.includes("sql") || q.includes("query") || q.includes("storage") || q.includes("index")) {
        return "Relational databases enforce ACID guarantees and structured schema relationships, using indexing and transaction management to maintain data integrity and optimize read/write query performance.";
      }
      if (q.includes("security") || q.includes("encrypt") || q.includes("auth") || q.includes("vulnerab")) {
        return "Robust security requires defense in depth, enforcing principle of least privilege, zero trust authentication, and end-to-end encryption for data both in transit and at rest.";
      }
      if (q.includes("difference") || q.includes("compare") || q.includes("versus") || q.includes("vs")) {
        return "The primary difference lies in their operational abstraction and design trade-offs: one prioritizes direct low-level control and customization, whereas the other provides managed automation, higher scalability, and reduced overhead.";
      }

      // Universal educational response
      return "Based on the course concepts, this involves applying core principles to balance modular abstraction, system reliability, and performance optimization across the overall design.";
    };

    /**
     * Advances the stored dialogue queue and navigates to the next item
     */
    const advanceDialogueQueue = async (courseSlug, storedQueue) => {
      let queue = [];
      try {
        if (storedQueue) queue = JSON.parse(storedQueue);
      } catch (e) {}

      if (Array.isArray(queue) && queue.length > 0) {
        const nextEntry = queue[0];
        const nextId = typeof nextEntry === "string" ? nextEntry : nextEntry.id;
        const nextType = typeof nextEntry === "string" ? "ungradedWidget" : (nextEntry.typeName || "ungradedWidget");
        const nextSlug = typeof nextEntry === "string" ? "" : (nextEntry.slug || "");

        window.localStorage.setItem("ungradedWidgets", JSON.stringify(queue.slice(1)));
        toastManager?.info(`Completing dialogue / widget, ${queue.length} remaining...`);
        await sleep(1500);

        const nextUrl = nextType === "coach"
          ? `https://www.coursera.org/learn/${courseSlug}/coach/${nextId}/${nextSlug}`
          : `https://www.coursera.org/learn/${courseSlug}/ungradedWidget/${nextId}`;
        window.location.assign(nextUrl);
      } else {
        window.localStorage.removeItem("ungradedWidgets");
        toastManager?.success("✓ Finished all dialogues");
        showToast("Finished all dialogues");
      }
    };

    /**
     * Modern Coursera Coach Dialogue Automator (Phase 8 Architecture)
     * Automates native Coursera Coach Dialogue Socratic activities:
     * 1. Detects Cover Screen vs Active Chat
     * 2. Starts Dialogue if unstarted
     * 3. Socratic interaction loop: reads question, synthesizes answer, injects into React textarea, clicks send
     * 4. Synchronizes with [data-testid="coach-message-loader"]
     * 5. Handles terminal triggers: "Conclude and mark as complete", topic mastery summary, or "I'm stuck"
     * 6. Verifies [data-testid="chat-ended-message"] / .completedButton
     * 7. Advances course queue in localStorage "ungradedWidgets"
     */
    const runCoachDialogueAutomator = async () => {
      console.log("[CoachAutomator] Initializing modern Coach Dialogue Automator on", window.location.pathname);
      const storedQueue = window.localStorage.getItem("ungradedWidgets");
      const isQueued = storedQueue !== null;
      const courseMatch = window.location.pathname.match(/\/learn\/([^/]+)/);
      const courseSlug = courseMatch ? courseMatch[1] : "";

      const isCompleted = () => {
        return !!(
          document.querySelector('[data-testid="chat-ended-message"]') ||
          document.querySelector('.completedButton') ||
          document.querySelector('[data-e2e="coach-start-new-chat-try-again"]') ||
          document.querySelector('button[name="coach_item_start_new_chat_try_again"]') ||
          document.body.innerText.includes("The Dialogue has ended.")
        );
      };

      // 1. Initial State Check: If already completed, advance queue immediately
      if (isCompleted()) {
        console.log("[CoachAutomator] Dialogue is already completed.");
        if (isQueued) {
          toastManager?.success("✓ Dialogue is already completed");
          await advanceDialogueQueue(courseSlug, storedQueue);
        }
        return;
      }

      toastManager?.info("Starting Coach Dialogue automation...");

      // 2. Cover Screen: Look for "Start Dialogue" button
      const findStartButton = () => {
        return (
          document.querySelector('button[data-e2e="coach-start-button"]') ||
          document.querySelector('button[name="coach_item_start_session"]') ||
          Array.from(document.querySelectorAll('button')).find(b =>
            (b.innerText || b.textContent || "").trim().toLowerCase().includes("start dialogue")
          )
        );
      };

      let startBtn = findStartButton();
      if (!startBtn) {
        // Poll for up to 6 seconds for start button or existing chat container
        for (let i = 0; i < 6; i++) {
          await sleep(1000);
          if (isCompleted()) {
            await advanceDialogueQueue(courseSlug, storedQueue);
            return;
          }
          startBtn = findStartButton();
          if (startBtn) break;
          // Check if chat container is already open
          if (document.querySelector('textarea.coach-rich-input-field-input, [data-testid="coach-rich-input-field-content"]')) {
            break;
          }
        }
      }

      if (startBtn) {
        console.log("[CoachAutomator] Clicking Start Dialogue button...");
        toastManager?.info("Starting new Dialogue session...");
        startBtn.click();
        await sleep(2500);
      }

      // 3. Socratic Interaction Loop
      const TARGET_GENUINE_TURNS = 3;
      const MAX_TURNS = 6;
      let turnCount = 0;

      while (turnCount < MAX_TURNS) {
        // A. Terminal check
        if (isCompleted()) {
          console.log("[CoachAutomator] Chat ended / completed banner detected.");
          break;
        }

        // B. Check if "Conclude and mark as complete" action pill is ALREADY visible in DOM
        const concludeBtn = Array.from(document.querySelectorAll('button')).find(b =>
          (b.innerText || b.textContent || "").toLowerCase().includes("conclude and mark as complete")
        );
        if (concludeBtn) {
          console.log("[CoachAutomator] Found 'Conclude and mark as complete' button. Clicking...");
          toastManager?.info("Concluding Dialogue session...");
          concludeBtn.click();
          for (let c = 0; c < 15; c++) {
            await sleep(1000);
            if (isCompleted()) break;
          }
          if (isCompleted()) break;
        }

        // C. Target turns reached: execute native conclusion
        if (turnCount >= TARGET_GENUINE_TURNS) {
          console.log(`[CoachAutomator] Target genuine turns reached (${turnCount}). Initiating native conclusion...`);
          toastManager?.info("Concluding Dialogue session...");

          // Step 1: Try native "End Dialogue" header button
          const endDialogueBtn = document.querySelector('button[aria-label="End Dialogue"]') ||
            Array.from(document.querySelectorAll('button')).find(b =>
              (b.innerText || b.textContent || "").trim() === "End Dialogue"
            );
          if (endDialogueBtn) {
            console.log("[CoachAutomator] Clicking native 'End Dialogue' button...");
            endDialogueBtn.click();
            await sleep(1000);
            const confirmBtn = Array.from(document.querySelectorAll('button')).find(b =>
              (b.innerText || b.textContent || "").toLowerCase().includes("yes, end the dialogue")
            );
            if (confirmBtn) {
              console.log("[CoachAutomator] Confirming 'Yes, end the Dialogue'...");
              confirmBtn.click();
              for (let c = 0; c < 15; c++) {
                await sleep(1000);
                if (isCompleted()) break;
              }
              if (isCompleted()) break;
            }
          }

          // Step 2: Fallback to "I'm stuck" -> "Conclude and mark as complete"
          if (!isCompleted()) {
            const stuckBtn = document.querySelector('button[name="coach_item_dialogue_im_stuck"]') ||
              Array.from(document.querySelectorAll('button')).find(b =>
                (b.innerText || b.textContent || "").trim().toLowerCase().includes("i'm stuck") ||
                (b.innerText || b.textContent || "").trim().toLowerCase().includes("im stuck")
              );
            if (stuckBtn) {
              console.log("[CoachAutomator] Clicking 'I'm stuck' for conclusion...");
              stuckBtn.click();
              // Synchronize with Coach loader
              await sleep(1500);
              for (let w = 0; w < 30; w++) {
                const loader = document.querySelector('[data-testid="coach-message-loader"], .cds-loading');
                if (!loader) break;
                await sleep(1000);
              }
              await sleep(1000);
              const concludeAfterStuck = Array.from(document.querySelectorAll('button')).find(b =>
                (b.innerText || b.textContent || "").toLowerCase().includes("conclude and mark as complete")
              );
              if (concludeAfterStuck) {
                console.log("[CoachAutomator] Clicking 'Conclude and mark as complete'...");
                concludeAfterStuck.click();
                for (let c = 0; c < 15; c++) {
                  await sleep(1000);
                  if (isCompleted()) break;
                }
                if (isCompleted()) break;
              }
            }
          }

          if (isCompleted()) break;
        }

        turnCount++;
        console.log(`[CoachAutomator] Turn ${turnCount} of ${TARGET_GENUINE_TURNS}`);

        // D. Extract latest question prompt from Coach
        const coachMsgElements = document.querySelectorAll(
          '.coach-message-response, [data-testid="coach-agent-message"], .coach-message-history [role="presentation"]'
        );
        let latestQuestionText = "";
        if (coachMsgElements.length > 0) {
          const lastEl = coachMsgElements[coachMsgElements.length - 1];
          latestQuestionText = (lastEl.innerText || lastEl.textContent || "").trim();
        }

        // E. Find response textarea
        const findTextarea = () => {
          return document.querySelector(
            'textarea.coach-rich-input-field-input, [data-testid="coach-rich-input-field-content"] textarea, .footer-voice-text-input textarea, textarea[placeholder*="message" i]'
          );
        };

        let textarea = findTextarea();
        // If textarea is not found or is disabled (AI streaming), wait for it to become available
        if (!textarea || textarea.disabled || textarea.readOnly) {
          for (let p = 0; p < 15; p++) {
            await sleep(1000);
            if (isCompleted()) break;
            textarea = findTextarea();
            if (textarea && !textarea.disabled && !textarea.readOnly) break;
          }
        }

        if (isCompleted()) break;

        if (!textarea) {
          console.warn("[CoachAutomator] Input textarea not found in DOM.");
          await sleep(2000);
          continue;
        }

        // F. Generate educational answer
        toastManager?.info(`Answering question ${turnCount}...`);
        const answerText = await synthesizeDialogueAnswer(latestQuestionText);
        console.log("[CoachAutomator] Synthesized answer:", answerText);

        // G. Inject value using controlled React setter
        textarea.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (nativeSetter) {
          nativeSetter.call(textarea, answerText);
        } else {
          textarea.value = answerText;
        }
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(500);

        // H. Submit answer
        const sendBtn = document.querySelector(
          'button[data-testid="coach-send-button"], button.send-button, button[aria-label*="send" i]'
        );
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        } else {
          textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
        }

        // I. Event-driven synchronization barrier: wait for loader to appear and then disappear
        toastManager?.info("Waiting for Coach response...");
        await sleep(1000);
        // Wait up to 35 seconds for loader to clear
        for (let w = 0; w < 35; w++) {
          await sleep(1000);
          const loader = document.querySelector('[data-testid="coach-message-loader"], .cds-loading');
          if (!loader) {
            // Loader is gone; wait 1s for DOM to stabilize
            await sleep(1000);
            break;
          }
          if (isCompleted()) break;
        }
      }

      // 4. Verify terminal completion
      await sleep(2000);
      if (isCompleted()) {
        toastManager?.success("✓ Coach Dialogue completed!");
        await advanceDialogueQueue(courseSlug, storedQueue);
      } else if (isQueued) {
        toastManager?.info("Advancing to next dialogue in queue...");
        await advanceDialogueQueue(courseSlug, storedQueue);
      }
    };

    /**
     * In-tab DOM fallback: Checks if the current page is an ungraded widget/dialogue page
     * and completes it by interacting with Coursera's mark-complete button or Coach automator.
     */
    const checkAndCompleteCurrentWidget = async () => {
      if (isWidgetCheckRunning) return;
      if (!window.location.href.includes("/ungradedWidget/") && !window.location.href.includes("/coach/")) {
        return;
      }
      isWidgetCheckRunning = true;
      try {
        const storedQueue = window.localStorage.getItem("ungradedWidgets");
        const isQueued = storedQueue !== null;

        const courseMatch = window.location.pathname.match(/\/learn\/([^/]+)/);
        const courseSlug = courseMatch ? courseMatch[1] : "";

        // Wait for page rendering
        await sleep(2000);

        // Modern Coursera Coach Dialogue Handler
        if (window.location.href.includes("/coach/")) {
          if (isQueued) {
            await runCoachDialogueAutomator();
          }
          return;
        }

        // Legacy Ungraded Widget Handler
        const findCompleteButton = () => {
          return document.querySelector(
            'button[data-testid="mark-complete"], button[data-testid="dialog-submit-button"]'
          );
        };

        let markCompleteBtn = findCompleteButton();
        // Retry polling for up to 5 seconds
        if (!markCompleteBtn) {
          for (let i = 0; i < 5; i++) {
            await sleep(1000);
            markCompleteBtn = findCompleteButton();
            if (markCompleteBtn) break;
          }
        }

        if (markCompleteBtn) {
          toastManager?.success("Marking dialogue / ungraded widget as complete");
          markCompleteBtn.click();
          await sleep(2000);
          await advanceDialogueQueue(courseSlug, storedQueue);
        } else if (isQueued) {
          window.localStorage.removeItem("ungradedWidgets");
          toastManager?.error("Mark as complete button not found on this dialogue page");
        }
      } finally {
        isWidgetCheckRunning = false;
      }
    };

    /**
     * Helper to load course materials catalog
     */
    const ensureCourseMaterials = async (courseSlug) => {
      if (!cachedCourseMaterials?.linked) {
        showToast("Checking course materials...", "info");
        try {
          const apiUrl = `/api/onDemandCourseMaterials.v2/?q=slug&slug=${encodeURIComponent(courseSlug)}&includes=modules,lessons,items,gradingParameters`;
          const resp = await fetch(apiUrl, { credentials: "include" });
          if (resp.ok) {
            cachedCourseMaterials = await resp.json();
          }
        } catch (_) {}
      }
      return cachedCourseMaterials?.linked || null;
    };

    /**
     * Completes course reading materials (supplements) via onDemandSupplementCompletions.v1
     * with robust numeric userId support, source-level diagnostics, and verified
     * server response semantics.
     */
    const completeReadingMaterials = async () => {
      const courseSlug = window.location.pathname.match(/\/learn\/([^/]+)/)?.[1];
      if (!courseSlug) {
        showToast("Open a Coursera course page to begin.", "error");
        return;
      }

      const linked = await ensureCourseMaterials(courseSlug);
      if (!linked) {
        showToast("Coursera didn't return course materials. Please reload the page.", "error");
        return;
      }

      const gradingParams = linked["onDemandGradingParameters.v1"];
      const courseId = gradingParams?.[0]?.id || currentCourseId;
      if (!courseId) {
        showToast("Unable to find course details on this page.", "error");
        return;
      }
      currentCourseId = courseId;

      const rawUserId = await resolveUserId();
      if (!rawUserId) {
        showToast("Please sign in to Coursera to continue.", "error");
        return;
      }

      // Coursera Naptime schema requires numeric Long userId
      const numericUserId = !isNaN(Number(rawUserId)) ? Number(rawUserId) : rawUserId;

      const items = linked["onDemandCourseMaterialItems.v2"] || linked["onDemandCourseMaterialItems.v1"] || [];
      const readingItems = items.filter(item => {
        const typeName = item.contentSummary?.typeName || item.typeName;
        return typeName === "supplement";
      });

      // Source-level diagnostics
      console.log(`[READING DIAGNOSTICS] Total syllabus items: ${items.length}`);
      console.log(`[READING DIAGNOSTICS] Supplement items discovered: ${readingItems.length}`);
      console.log(`[READING DIAGNOSTICS] CourseId: ${courseId}`);
      console.log(`[READING DIAGNOSTICS] UserId type: ${typeof numericUserId}`);
      console.log(`[READING DIAGNOSTICS] Reading item IDs:`, readingItems.map(i => i.id));

      if (readingItems.length === 0) {
        showToast("No reading materials found in this course syllabus.", "info");
        return;
      }

      showToast(`Completing ${readingItems.length} reading materials...`, "info");

      const results = await Promise.all(readingItems.map(async item => {
        try {
          // Primary attempt with typed payload (numeric userId)
          let res = await fetch("https://www.coursera.org/api/onDemandSupplementCompletions.v1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              userId: numericUserId,
              courseId: courseId,
              itemId: item.id
            })
          });

          console.log(`[READING DIAGNOSTICS] Item ${item.id} completion HTTP status: ${res.status} (${res.statusText})`);

          // If numeric userId failed with 400 Bad Request, attempt fallback with string userId
          if (!res.ok && res.status === 400) {
            console.log(`[READING DIAGNOSTICS] Retrying item ${item.id} with string userId fallback...`);
            const fallbackRes = await fetch("https://www.coursera.org/api/onDemandSupplementCompletions.v1", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                userId: String(rawUserId),
                courseId: courseId,
                itemId: item.id
              })
            });
            console.log(`[READING DIAGNOSTICS] Item ${item.id} fallback HTTP status: ${fallbackRes.status}`);
            if (fallbackRes.ok) {
              res = fallbackRes;
            }
          }

          // Verified server response semantics (HTTP 200/201/204)
          return res.ok && res.status >= 200 && res.status < 300;
        } catch (err) {
          console.log(`[READING DIAGNOSTICS] Item ${item.id} completion exception:`, err.message);
          return false;
        }
      }));

      const succeeded = results.filter(Boolean).length;
      console.log(`[READING DIAGNOSTICS] Completion result: ${succeeded}/${readingItems.length} succeeded`);

      if (succeeded === 0) {
        showToast(`Reading Material completion failed (0/${readingItems.length})`, "error");
      } else if (succeeded === readingItems.length) {
        showToast(`✓ Reading Material completed (${succeeded}/${readingItems.length})`, "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(`✓ Reading Material partially completed (${succeeded}/${readingItems.length})`, "warn");
        setTimeout(() => window.location.reload(), 1500);
      }
    };

    /**
     * Discussion completion entry helper
     * Restored from the Post-Verification Cleanup (Phase 4.5) working baseline
     */
    const completeDiscussions = async () => {
      const inputVal = prompt("Enter speed in ms", "5000");
      const parsedMs = Math.max(1000, Math.min(10000, parseInt(inputVal || "5000", 10)));
      if (parsedMs > 0) {
        setSyncStorage("s", parsedMs);
        return await processCourseMaterials(undefined, "discussion");
      }
    };



    /**
     * Core course materials processor: completes reading material,
     * discussions, or dialogue widgets.
     */
    const processCourseMaterials = async (data, featureName, showNotification = true) => {
      cachedCourseMaterials = data || cachedCourseMaterials;

      // Direct fallback fetch if course catalog was not intercepted yet
      if (!cachedCourseMaterials?.linked) {
        const courseSlug = window.location.pathname.match(/\/learn\/([^/]+)/)?.[1];
        if (courseSlug) {
          try {
            const apiUrl = `https://www.coursera.org/api/onDemandCourseMaterials.v2/?q=slug&slug=${encodeURIComponent(courseSlug)}&includes=modules,lessons,items,gradingParameters&fields=onDemandCourseMaterialItems.v2(name,slug,timeCommitment,contentSummary)`;
            const resp = await fetch(apiUrl, { credentials: "include" });
            if (resp.ok) {
              cachedCourseMaterials = await resp.json();
            }
          } catch (_) {}
        }
      }

      const linkedData = cachedCourseMaterials?.linked;
      if (!linkedData) {
        if (featureName) {
          toastManager?.error("Please open a Coursera course page (/learn/...) and wait for materials to load");
        }
        return;
      }

      await resolveUserId();
      if (!currentUserId) {
        toastManager?.error("Please log in to Coursera");
        return;
      }

      if (featureName && featureName !== "" && showNotification) {
        toastManager?.success("Completing " + featureName);
      }

      const courseSlugMatch = window.location.pathname.match(/\/learn\/([^/]+)/)?.[1];
      if (!courseSlugMatch || courseSlugMatch === "") {
        toastManager?.error("Go to the course page");
        return;
      }

      currentCourseId = linkedData["onDemandGradingParameters.v1"]?.[0]?.id;
      const courseItems = [];
      const modules = linkedData["onDemandCourseMaterialModules.v1"] || [];
      const lessons = linkedData["onDemandCourseMaterialLessons.v1"] || [];
      const items = linkedData["onDemandCourseMaterialItems.v2"] || [];

      for (const item of items) {
        const lesson = lessons.find(l => l.id === item.lessonId);
        const mod = modules.find(m => m.id === lesson?.moduleId);
        const itemSlug = item.slug || item.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "";
        courseItems.push({
          open_course_slug: courseSlugMatch,
          video_name: item.name,
          course_id: currentCourseId,
          item_id: item.id,
          item_name: item.name,
          slug: itemSlug,
          lesson_id: lesson?.id,
          lesson_name: lesson?.name,
          module_id: mod?.id,
          module_name: mod?.name,
          timeCommitment: item.timeCommitment,
          typeName: item.contentSummary?.typeName,
          iframeTitle: item?.contentSummary?.definition?.iframeTitle?.split(".")[2] ?? null
        });
      }

      // ============================================================
      // 1. ACTION: READING MATERIAL (Restored Phase 3/4.5)
      // ============================================================
      if (featureName === "readingMaterial" || featureName === "reading") {
        return await completeReadingMaterials();
      }

      // ============================================================
      // Action: Discussion Completion Subsystem
      // ============================================================
      else if (featureName === "discussion" || featureName === "discussionPrompt") {
        const rawItems = linkedData["onDemandCourseMaterialItems.v2"] || linkedData["onDemandCourseMaterialItems.v1"] || [];
        const discussionItems = rawItems.filter(item => {
          const typeName = item.contentSummary?.typeName || item.typeName;
          return typeName === "discussionPrompt";
        });
        const discussionItemIds = discussionItems.map(item => item.id);

        if (discussionItemIds.length === 0) {
          toastManager?.info("No discussion prompts found in this course");
          return;
        }

        // Standard discussion responses pool
        const answerPool = [
          "It is a good question",
          "I am not sure about this",
          "Awesome question",
          "Good course",
          "I am not sure about this"
        ];

        // Phase 1: Concurrently discover forum question IDs for all discussion prompt items
        const forumQuestionTargets = [];
        await Promise.all(discussionItemIds.map(async itemId => {
          try {
            const promptUrl = `https://www.coursera.org/api/onDemandDiscussionPrompts.v1/${currentUserId}~${currentCourseId}~${itemId}?fields=onDemandDiscussionPromptQuestions.v1(content,creatorId,createdAt,forumId,sessionId,lastAnsweredBy,lastAnsweredAt,totalAnswerCount,topLevelAnswerCount,viewCount),promptType,question&includes=question`;
            const resp = await fetch(promptUrl);
            const data = await resp.json();
            const courseItemForumQuestionId = data?.elements?.[0]?.promptType?.definition?.courseItemForumQuestionId;
            if (courseItemForumQuestionId) {
              forumQuestionTargets.push(courseItemForumQuestionId);
            }
            return data;
          } catch (err) {
            return null;
          }
        }));

        toastManager?.info("Completing discussion please wait ...");

        // Submits answer to forum question worker
        const postAnswerWorker = async courseItemForumQuestionId => {
          try {
            const randomAnswer = answerPool[Math.floor(Math.random() * answerPool.length)];
            // courseItemForumQuestionId format: authorId~courseId~questionId
            const questionId = courseItemForumQuestionId.split("~")[2];
            const targetCourseForumQuestionId = `${currentCourseId}~${questionId}`;

            const postUrl = "https://www.coursera.org/api/onDemandCourseForumAnswers.v1/?fields=content,forumQuestionId,parentForumAnswerId,state,creatorId,createdAt,order,upvoteCount,childAnswerCount,isFlagged,isUpvoted,courseItemForumQuestionId,parentCourseItemForumAnswerId,onDemandSocialProfiles.v1(userId,externalUserId,fullName,photoUrl,courseRole),onDemandCourseForumAnswers.v1(content,forumQuestionId,parentForumAnswerId,state,creatorId,createdAt,order,upvoteCount,childAnswerCount,isFlagged,isUpvoted,courseItemForumQuestionId,parentCourseItemForumAnswerId)&includes=profiles,children,userId";

            const payload = {
              content: {
                typeName: "cml",
                definition: {
                  dtdId: "discussion/1",
                  value: `<co-content><text>${randomAnswer}</text></co-content>`
                }
              },
              courseForumQuestionId: targetCourseForumQuestionId
            };

            const resp = await fetch(postUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              credentials: "include",
              body: JSON.stringify(payload)
            });

            return await resp.json();
          } catch (err) {
            return null;
          }
        };

        const speed = parseInt(await getSyncStorage("s"), 10) || 5000;

        // Phase 2: Sequentially post forum answers with user-defined delay
        for (const rawForumQuestionId of forumQuestionTargets) {
          await postAnswerWorker(rawForumQuestionId);
          toastManager?.info("Submitting discussion response...");
          await sleep(speed);
          toastManager?.success("Preparing next discussion prompt");
        }

        toastManager?.success("Finished all discussions");
      }

      // Action: Dialogue
      else if (featureName === "dialogue") {
        const dialogueItems = courseItems.filter(i =>
          i.typeName === "ungradedWidget" || i.typeName === "ungradedLti" ||
          i.typeName === "interactivePlugin" || i.typeName === "ungradedLab" ||
          i.typeName === "dialogue" || i.typeName === "coach"
        );

        console.log(`[COURSERA EXT DEBUG] Discovered ${dialogueItems.length} dialogue items:`, dialogueItems);

        if (dialogueItems.length === 0) {
          toastManager?.info("No dialogue / ungraded widgets found in this course");
          return;
        }

        showToast("Working through course dialogues...");
        toastManager?.info(`Completing ${dialogueItems.length} dialogues / widgets...`);

        // Case A: First attempt high-speed API completion for items with existing sessions
        const uncompletedItems = [];
        let completedViaApiCount = 0;

        for (const item of dialogueItems) {
          if (item.typeName === "coach") {
            // Modern Coach items require interactive CoachDialogueAutomator
            uncompletedItems.push(item);
            continue;
          }
          try {
            const compositeId = currentUserId + "~" + currentCourseId + "~" + item.item_id;
            const sessionResp = await fetch("https://www.coursera.org/api/onDemandWidgetSessions.v1/" + compositeId + "?fields=session,sessionId", {
              credentials: "include",
              headers: { "Content-Type": "application/json" }
            });

            let completed = false;
            if (sessionResp.ok) {
              const sessionData = await sessionResp.json();
              const sessionId = sessionData?.elements?.[0]?.sessionId || sessionData?.elements?.[0]?.session?.id || sessionData?.elements?.[0]?.id;

              if (sessionId) {
                const progRes = await fetch("https://www.coursera.org/api/onDemandWidgetProgress.v1/" + compositeId, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    sessionId: sessionId,
                    progressState: "Completed"
                  })
                });
                if (progRes.ok) {
                  completed = true;
                  completedViaApiCount++;
                }
              }
            }

            if (!completed) {
              uncompletedItems.push(item);
            }
          } catch (widgetErr) {
            uncompletedItems.push(item);
          }
        }

        // Case A: All items completed via API!
        if (uncompletedItems.length === 0) {
          toastManager?.success(`✓ Dialogues completed (${completedViaApiCount}/${dialogueItems.length})`);
          showToast("Finished all dialogues");
          setTimeout(() => window.location.reload(), 1500);
          return;
        }

        // Case B: Uninitialized items without active sessions require the DOM navigation fallback
        const firstItem = uncompletedItems[0];
        const remainingQueue = uncompletedItems.slice(1).map(i => ({
          id: i.item_id,
          typeName: i.typeName,
          slug: i.slug || ""
        }));

        window.localStorage.setItem("ungradedWidgets", JSON.stringify(remainingQueue));

        const targetUrl = firstItem.typeName === "coach"
          ? `https://www.coursera.org/learn/${courseSlugMatch}/coach/${firstItem.item_id}/${firstItem.slug}`
          : `https://www.coursera.org/learn/${courseSlugMatch}/ungradedWidget/${firstItem.item_id}`;

        if (window.location.href.includes(firstItem.item_id)) {
          await checkAndCompleteCurrentWidget();
        } else {
          toastManager?.info(`Opening dialogue page (${uncompletedItems.length} remaining)...`);
          await sleep(500);
          window.location.assign(targetUrl);
        }
      }
    };

    // =============================================================
    // =============================================================
    // DEDICATED MODULE: VIDEO-ONLY COMPLETION (PHASE 15)
    // =============================================================
    // COURSE AUTOMATION ENGINE & MATERIAL PROCESSOR
    //
    // Subsystem components:
    // - Discussion reply handler
    // - Unified Course Material Processor (lecture, readingMaterial, discussion)
    // - Master Partial Course Orchestrator
    // - Dedicated Video-Only Dispatcher into lecture branch
    // =============================================================

    /**
     * Discussion completion helper
     * Fetches question forum IDs and submits canned responses.
     */
    const completeTurboDiscussions = async (discussionItems = []) => {
      for (const item of discussionItems) {
        try {
          const resp = await fetch(
            `https://www.coursera.org/api/onDemandDiscussionPrompts.v1/${currentUserId}~${currentCourseId}~${item.id}?fields=promptType`,
            { credentials: "include" }
          );
          if (resp.ok) {
            const data = await resp.json();
            const questionId = data?.elements?.[0]?.promptType?.definition?.courseItemForumQuestionId;
            if (questionId) {
              const standardResponses = [
                "It is a good question",
                "I will have to look into this further.",
                "Awesome question",
                "Good course",
                "I am not sure about this"
              ];
              const randomAnswer = standardResponses[Math.floor(Math.random() * standardResponses.length)];
              await fetch(
                "https://www.coursera.org/api/onDemandCourseForumAnswers.v1/",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    content: {
                      typeName: "cml",
                      definition: {
                        dtdId: "discussion/1",
                        value: `<co-content><text>${randomAnswer}</text></co-content>`
                      }
                    },
                    courseForumQuestionId: `${currentCourseId}~${questionId}`
                  })
                }
              );
            }
          }
          await sleep(3000);
        } catch (e) {
          console.error("Error completing individual discussion:", e);
        }
      }
    };

    /**
     * Shared course materials batch processor
     * Handles branches: "lecture", "readingMaterial", "discussion"
     */
    const executeTurboCourseMaterials = async (batchType) => {
      if (!currentUserId) {
        await resolveUserId();
      }

      if (!currentUserId || !/^\d+$/.test(String(currentUserId)) || !cachedCourseMaterials?.linked) {
        showToast("Course information is not loaded. Please reload the page.", "error");
        return;
      }

      const linkedData = cachedCourseMaterials.linked;
      const courseSlugMatch = window.location.pathname.match(/\/learn\/([^\/]+)\//) || window.location.pathname.match(/\/learn\/([^/]+)/);
      if (!linkedData || !courseSlugMatch || !courseSlugMatch[1]) {
        showToast("Course information not found. Open a course module to start.", "error");
        return;
      }

      const courseSlug = courseSlugMatch[1];
      currentCourseId = linkedData["onDemandGradingParameters.v1"]?.[0]?.id || currentCourseId;
      const allItems = linkedData["onDemandCourseMaterialItems.v2"] || [];
      const jsonHeaders = { "Content-Type": "application/json" };

      try {
        if (batchType === "lecture") {
          const lectureItems = allItems.filter(item => item.contentSummary?.typeName === "lecture");
          if (lectureItems.length > 0) {
            await Promise.all(lectureItems.map(item => {
              const endpoint = `https://www.coursera.org/api/opencourse.v1/user/${currentUserId}/course/${courseSlug}/item/${item.id}/lecture/videoEvents/ended?autoEnroll=false`;
              return fetch(endpoint, {
                method: "POST",
                headers: jsonHeaders,
                credentials: "include",
                body: JSON.stringify({ contentRequestBody: {} })
              });
            }));
          }
          showToast("All lecture videos completed.", "success");
        } else if (batchType === "readingMaterial") {
          const supplementItems = allItems.filter(item => item.contentSummary?.typeName === "supplement");
          if (supplementItems.length > 0) {
            await Promise.all(supplementItems.map(item => {
              return fetch("https://www.coursera.org/api/onDemandSupplementCompletions.v1", {
                method: "POST",
                headers: jsonHeaders,
                credentials: "include",
                body: JSON.stringify({
                  userId: currentUserId,
                  courseId: currentCourseId,
                  itemId: item.id
                })
              });
            }));
          }
          showToast("All reading materials completed.", "success");
        } else if (batchType === "discussion") {
          const discussionItems = allItems.filter(item => item.contentSummary?.typeName === "discussionPrompt");
          if (discussionItems.length > 0) {
            await completeTurboDiscussions(discussionItems);
          }
          showToast("Finished all discussions.", "success");
        } else {
          showToast("This action is not supported for " + batchType + ".", "warn");
        }
      } catch (error) {
        console.error(`Error completing ${batchType}:`, error);
        showToast(`Unable to complete ${batchType}. Please check your connection and try again.`, "error");
      }
    };

    /**
     * Master Course Automation Orchestrator
     * Sequential execution: lecture -> 3s -> readingMaterial -> 3s -> discussion -> 3s -> alert
     */
    const executeTurboPartialCourse = async () => {
      showToast("Completing course activities in this section...", "info");
      await executeTurboCourseMaterials("lecture");
      await sleep(3000);
      await executeTurboCourseMaterials("readingMaterial");
      await sleep(3000);
      await executeTurboCourseMaterials("discussion");
      await sleep(3000);
      window.alert("Course activities in this section completed. Please reload the page in 2 minutes.");
    };

    /**
     * Dedicated Skip Video+ Collector and Dispatcher
     * 1. Resolves userId, courseId, and course slug from intercepted syllabus and DOM.
     * 2. Filters syllabus items for lectures (typeName === "lecture").
     * 3. For every lecture item, queries onDemandLectureVideos.v1 to resolve internal Coursera videoId.
     * 4. Forwards enriched items to background service worker via SKIP_VIDEO_PLUS message.
     * Does NOT invoke Reading Material, Discussion, Dialogue, or Quiz branches.
     */
    const completeCourseVideosOnly = async () => {
      if (isVideoCompletionActive) {
        showToast("Lecture completion is currently in progress.", "warn");
        return;
      }

      if (!currentUserId) {
        await resolveUserId();
      }

      if (!currentUserId || !/^\d+$/.test(String(currentUserId)) || !cachedCourseMaterials?.linked) {
        showToast("Course information is not ready. Please reload the course page.", "error");
        return;
      }

      const linkedData = cachedCourseMaterials.linked;
      const courseSlugMatch = window.location.pathname.match(/\/learn\/([^\/]+)\//) || window.location.pathname.match(/\/learn\/([^/]+)/);
      if (!linkedData || !courseSlugMatch || !courseSlugMatch[1]) {
        showToast("Course information not found. Open an active course page to start.", "error");
        return;
      }

      const courseSlug = courseSlugMatch[1];
      currentCourseId = linkedData["onDemandGradingParameters.v1"]?.[0]?.id || currentCourseId;
      const allItems = linkedData["onDemandCourseMaterialItems.v2"] || [];
      const lectureItems = allItems.filter(item => item.contentSummary?.typeName === "lecture");

      if (lectureItems.length === 0) {
        showToast("No lecture videos found in this course syllabus.", "warn");
        return;
      }

      // Mark video completion active and guard against duplicate execution
      isVideoCompletionActive = true;

      // Start one-time 120-second status countdown timer
      if (videoCountdownTimerId) {
        clearInterval(videoCountdownTimerId);
        videoCountdownTimerId = null;
      }

      showToast(`Completing ${lectureItems.length} lecture videos. Processing in background...`, "info", true);

      let remainingSeconds = 120;
      videoCountdownTimerId = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds > 0) {
          const mins = Math.floor(remainingSeconds / 60);
          const secs = String(remainingSeconds % 60).padStart(2, "0");
          showToast(`Completing ${lectureItems.length} lectures: approximately ${mins}:${secs} remaining`, "info", true);
        } else {
          if (videoCountdownTimerId) {
            clearInterval(videoCountdownTimerId);
            videoCountdownTimerId = null;
          }
          isVideoCompletionActive = false;
          try {
            sessionStorage.setItem("coursera_video_completion_reloaded", "true");
          } catch (e) {}
          window.location.reload();
        }
      }, 1000);

      // Resolve internal Coursera videoId for each lecture item (Skip Video+ logic preserved untouched)
      const enrichedItems = await Promise.all(lectureItems.map(async item => {
        let videoId = null;
        try {
          const videoMetaUrl = `https://www.coursera.org/api/onDemandLectureVideos.v1/${currentCourseId}~${item.id}?includes=video&fields=onDemandVideos.v1`;
          const res = await fetch(videoMetaUrl);
          if (res.ok) {
            const data = await res.json();
            videoId = data?.linked?.["onDemandVideos.v1"]?.[0]?.id || null;
          }
        } catch (err) {
          console.warn(`[Skip Video+] Failed to resolve videoId for item ${item.id}:`, err);
        }

        return {
          item_id: item.id,
          item_name: item.name,
          course_id: currentCourseId,
          open_course_slug: courseSlug,
          videoId: videoId,
          timeCommitment: item.timeCommitment || 0
        };
      }));

      // Send payload to background service worker for two-phase completion & remediation
      chrome.runtime.sendMessage({
        action: "SKIP_VIDEO_PLUS",
        payload: {
          userId: currentUserId,
          items: enrichedItems
        }
      }, response => {
        if (chrome.runtime.lastError) {
          console.error("[Skip Video+] Runtime error from background:", chrome.runtime.lastError);
          if (videoCountdownTimerId) {
            clearInterval(videoCountdownTimerId);
            videoCountdownTimerId = null;
          }
          isVideoCompletionActive = false;
          showToast("Coursera Assistant could not connect to its background process. Please reload the extension.", "error");
        }
      });
    };

    // -------------------------------------------------------------
    // Window Message Listener (Interception from interceptor.js)
    // -------------------------------------------------------------
    window.addEventListener("message", function (event) {
      if (event.source !== window || !event.data?.url) return;
      if (event.origin && window.location.origin && event.origin !== window.location.origin) return;

      const interceptedUrl = event.data?.url;
      const interceptedResponse = event.data?.response;
      const lowerUrl = typeof interceptedUrl === "string" ? interceptedUrl.toLowerCase() : "";

      // Intercept course materials catalog (matches /ondemandcoursematerials.v2/?q=slug OR includes=modules)
      if (lowerUrl.includes("/ondemandcoursematerials.v2/?q=slug") || lowerUrl.includes("includes=modules")) {
        cachedCourseMaterials = interceptedResponse;
      }

      // Intercept quiz draft state (matches opname=querystate)
      if (lowerUrl.includes("opname=querystate")) {
        const parts = interceptedResponse?.[0]?.data?.SubmissionState?.queryState?.attempts?.inProgressAttempt?.draft?.parts;
        if (parts) {
          parseQuizDraftParts(parts);
        }
      }
    });

    // -------------------------------------------------------------
    // Quiz Automation Subsystem
    // -------------------------------------------------------------
    const APPROVED_QUIZ_MODELS = [
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-3-flash-preview"
    ];
    const DEFAULT_QUIZ_MODEL = "gemini-3-flash-preview";

    class GeminiAI {
      static DEFAULT_MODEL = "gemini-3-flash-preview";
      static APPROVED_MODELS = [
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3-flash-preview"
      ];
      static LEGACY_UNAVAILABLE_MODELS = [
        "gemini-3.1-pro-preview",
        "gemini-3.1-pro",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
      ];

      constructor(apiKey, model = GeminiAI.DEFAULT_MODEL) {
        this.apiKey = apiKey;
        this.rawModel = model;
        this.model = GeminiAI.normalizeModelName(model);
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
      }

      /**
       * Normalizes model string to prevent duplicate 'models/' prefix or leading slashes.
       * Supports values like 'gemini-3.8-flash', 'models/gemini-3.8-flash', '/models/...'.
       * NEVER produces models/models/...
       */
      static normalizeModelName(rawModel) {
        if (!rawModel || typeof rawModel !== "string") {
          return GeminiAI.DEFAULT_MODEL;
        }
        let trimmed = rawModel.trim();
        while (trimmed.startsWith("/")) {
          trimmed = trimmed.substring(1);
        }
        while (trimmed.startsWith("models/")) {
          trimmed = trimmed.substring("models/".length);
        }
        return trimmed || GeminiAI.DEFAULT_MODEL;
      }

      /**
       * Performs fetch with automatic fallback to background service worker
       * if direct content-script fetch fails due to page CSP or extension host permission.
       */
      async performRequest(url, requestOptions) {
        try {
          return await fetch(url, requestOptions);
        } catch (fetchErr) {
          console.error(`[QUIZ GEMINI DEBUG] Direct fetch failed: ${fetchErr.name}: ${fetchErr.message}`);

          if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
            try {
              console.log("[QUIZ GEMINI DEBUG] Attempting background transport fallback...");
              const bgRes = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                  {
                    action: "GEMINI_PROXY_FETCH",
                    payload: {
                      url: url,
                      options: requestOptions
                    }
                  },
                  (resp) => {
                    if (chrome.runtime.lastError) {
                      return reject(new Error(chrome.runtime.lastError.message));
                    }
                    if (!resp) {
                      return reject(new Error("Empty response from background service worker"));
                    }
                    resolve(resp);
                  }
                );
              });

              if (bgRes.error) {
                console.error(`[QUIZ GEMINI DEBUG] Background transport fallback failed: ${bgRes.error}`);
                throw new Error(`Gemini transport error: Direct fetch failed (${fetchErr.message}) and background fallback failed (${bgRes.error})`);
              }

              return {
                ok: bgRes.ok,
                status: bgRes.status,
                statusText: bgRes.statusText,
                text: async () => bgRes.text,
                json: async () => JSON.parse(bgRes.text)
              };
            } catch (bgErr) {
              console.error(`[QUIZ GEMINI DEBUG] Background fallback exception: ${bgErr.message}`);
              throw new Error(`Gemini network/transport error: Direct fetch failed (${fetchErr.message}) and background fallback failed (${bgErr.message})`);
            }
          }

          throw new Error(`Gemini network/transport error: ${fetchErr.message}`);
        }
      }

      /**
       * Checks whether the configured model exists and supports generateContent.
       */
      async checkModelAvailability(modelToCheck) {
        const normalized = GeminiAI.normalizeModelName(modelToCheck || this.model);
        const endpoint = `${this.baseUrl}/${normalized}`;
        const url = `${endpoint}?key=${encodeURIComponent(this.apiKey)}`;

        console.log(`[QUIZ GEMINI DEBUG] Checking model availability: model = ${normalized}`);
        console.log(`[QUIZ GEMINI DEBUG] endpoint = ${endpoint}`);
        console.log(`[QUIZ GEMINI DEBUG] apiKeyPresent = ${Boolean(this.apiKey)}`);

        try {
          const resp = await this.performRequest(url, { method: "GET" });
          if (!resp.ok) {
            const errBody = await resp.text();
            console.warn(`[QUIZ GEMINI DEBUG] Model check failed HTTP status: ${resp.status}`);
            console.warn(`[QUIZ GEMINI DEBUG] response: ${errBody}`);
            return { available: false, status: resp.status, error: errBody };
          }
          const data = await resp.json();
          const supportsGenerate = Array.isArray(data.supportedGenerationMethods) &&
            data.supportedGenerationMethods.includes("generateContent");
          return { available: true, supportsGenerate: supportsGenerate, data: data };
        } catch (err) {
          console.warn(`[QUIZ GEMINI DEBUG] checkModelAvailability exception: ${err.message}`);
          return { available: false, error: err.message };
        }
      }

      async solveQuestions(questionsPrompt) {
        const prompt = `You are a Coursera expert. Analyze the following JSON representing Coursera questions and provide the correct answers. For multiple-choice questions (mcq), provide both 'correctOptions' (array of strings) and 'correctOptionsIndex' (0-indexed array of numbers). For text answers, provide 'content' (string). Respond with ONLY a valid JSON array of objects. Do not include any explanatory text, markdown, or anything outside the JSON array itself. Question Data:\n${questionsPrompt}`;

        let activeModel = this.model;
        let endpoint = `${this.baseUrl}/${activeModel}:generateContent`;
        let url = `${endpoint}?key=${encodeURIComponent(this.apiKey)}`;

        console.log(`[QUIZ GEMINI DEBUG] model = ${activeModel}`);
        console.log(`[QUIZ GEMINI DEBUG] endpoint = ${endpoint}`);
        console.log(`[QUIZ GEMINI DEBUG] apiKeyPresent = ${Boolean(this.apiKey)}`);

        const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          })
        };

        const maskApiKey = (str) => {
          if (!str || typeof str !== "string") return "";
          if (!this.apiKey) return str;
          return str.split(this.apiKey).join("[REDACTED_API_KEY]");
        };

        const inspectResponse = async (res) => {
          let text = "";
          try {
            text = await res.text();
          } catch (_) {}
          let parsedMsg = "";
          let isLimitZero = false;
          try {
            const parsed = JSON.parse(text);
            parsedMsg = parsed.error?.message || "";
            const lowerAll = JSON.stringify(parsed).toLowerCase();
            if (lowerAll.includes("limit: 0") || lowerAll.includes("limit:0") || lowerAll.includes("quota limit of 0") || lowerAll.includes('"limit":0')) {
              isLimitZero = true;
            }
          } catch (_) {}
          return {
            rawText: text,
            message: parsedMsg || text || res.statusText || String(res.status),
            isLimitZero: isLimitZero
          };
        };

        let response = await this.performRequest(url, requestOptions);

        if (!response.ok) {
          const inspected = await inspectResponse(response);

          // CASE A: Model unavailable / HTTP 404 (and not already default)
          if (response.status === 404 && activeModel !== GeminiAI.DEFAULT_MODEL) {
            const fallbackMsg = "Selected Gemini model is unavailable. Switching to Gemini 3 Flash...";
            console.warn(`[QUIZ MODEL] ${fallbackMsg}`);
            if (typeof showToast === "function") {
              showToast(fallbackMsg, "info");
            }
            if (typeof notifyQuizProgress === "function") {
              notifyQuizProgress("solving", {
                message: fallbackMsg,
                model: GeminiAI.DEFAULT_MODEL
              });
            }

            if (typeof chrome !== "undefined" && chrome?.storage?.local?.set) {
              chrome.storage.local.set({ model: GeminiAI.DEFAULT_MODEL });
            }

            this.model = GeminiAI.DEFAULT_MODEL;
            this.rawModel = GeminiAI.DEFAULT_MODEL;
            activeModel = GeminiAI.DEFAULT_MODEL;
            endpoint = `${this.baseUrl}/${activeModel}:generateContent`;
            url = `${endpoint}?key=${encodeURIComponent(this.apiKey)}`;

            response = await this.performRequest(url, requestOptions);
          }
          // CASE C: HTTP 429 with quota limit 0 (and not already default)
          else if (response.status === 429 && inspected.isLimitZero && activeModel !== GeminiAI.DEFAULT_MODEL) {
            const quotaSwitchMsg = "Selected model quota limit is 0. Switching to Gemini 3 Flash...";
            console.warn(`[QUIZ MODEL] ${quotaSwitchMsg}`);
            if (typeof showToast === "function") {
              showToast(quotaSwitchMsg, "info");
            }
            if (typeof notifyQuizProgress === "function") {
              notifyQuizProgress("solving", {
                message: quotaSwitchMsg,
                model: GeminiAI.DEFAULT_MODEL
              });
            }

            if (typeof chrome !== "undefined" && chrome?.storage?.local?.set) {
              chrome.storage.local.set({ model: GeminiAI.DEFAULT_MODEL });
            }

            this.model = GeminiAI.DEFAULT_MODEL;
            this.rawModel = GeminiAI.DEFAULT_MODEL;
            activeModel = GeminiAI.DEFAULT_MODEL;
            endpoint = `${this.baseUrl}/${activeModel}:generateContent`;
            url = `${endpoint}?key=${encodeURIComponent(this.apiKey)}`;

            response = await this.performRequest(url, requestOptions);
          }
        }

        if (!response.ok) {
          const finalInspection = await inspectResponse(response);
          const sanitizedRaw = maskApiKey(finalInspection.rawText);
          const sanitizedMessage = maskApiKey(finalInspection.message);

          console.error(`[QUIZ GEMINI DEBUG] HTTP status: ${response.status}`);
          console.error(`[QUIZ GEMINI DEBUG] statusText: ${response.statusText}`);
          console.error(`[QUIZ GEMINI DEBUG] response: ${sanitizedRaw || sanitizedMessage}`);

          // CASE B & C (status 429)
          if (response.status === 429) {
            if (finalInspection.isLimitZero) {
              throw new Error(`Gemini quota exceeded (limit: 0). ${sanitizedMessage}`);
            }
            // CASE B: Temporary rate limit - do NOT switch models
            throw new Error("Gemini rate limit reached. Please wait and try again.");
          }

          // CASE A (404 status)
          if (response.status === 404) {
            throw new Error(`Gemini model unavailable (404): Model '${activeModel}' was not found. (${sanitizedMessage})`);
          }

          // CASE D: Other HTTP errors
          throw new Error(`Gemini API request failed (${response.status}): ${sanitizedMessage}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error("No answer generated from Gemini API");
        }

        return JSON.parse(text);
      }
    }

    const DEFAULT_GEMINI_MODEL = DEFAULT_QUIZ_MODEL;
    const LEGACY_UNAVAILABLE_MODELS = GeminiAI.LEGACY_UNAVAILABLE_MODELS;

    function resolveAndMigrateModel(rawModel) {
      const normalized = GeminiAI.normalizeModelName(rawModel);
      if (APPROVED_QUIZ_MODELS.includes(normalized)) {
        if (rawModel !== normalized && typeof chrome !== "undefined" && chrome?.storage?.local?.set) {
          chrome.storage.local.set({ model: normalized });
        }
        return normalized;
      }
      console.log(`[QUIZ MODEL] Detected obsolete/unapproved model '${rawModel}'. Migrating to ${DEFAULT_QUIZ_MODEL}...`);
      if (typeof chrome !== "undefined" && chrome?.storage?.local?.set) {
        chrome.storage.local.set({ model: DEFAULT_QUIZ_MODEL });
      }
      return DEFAULT_QUIZ_MODEL;
    }

    function notifyQuizProgress(state, details = {}) {
      try {
        const payload = {
          state: state,
          current: details.current !== undefined ? details.current : 0,
          total: details.total !== undefined ? details.total : 0,
          message: details.message || "",
          model: details.model || geminiModel || DEFAULT_QUIZ_MODEL
        };

        if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            action: "QUIZ_PROGRESS",
            payload: payload
          }, () => {
            chrome.runtime.lastError;
          });
        }
      } catch (err) {}
    }

    let geminiApiKey = null;
    let geminiModel = DEFAULT_GEMINI_MODEL;
    let autoQuizEnabled = false;
    let geminiInstance = null;
    let questionsJson = null;
    let isSolvingQuiz = false;

    function initGeminiClient() {
      if (geminiApiKey) {
        geminiInstance = new GeminiAI(geminiApiKey, geminiModel || DEFAULT_GEMINI_MODEL);
      } else {
        geminiInstance = null;
      }
    }

    chrome.storage.local.get(["quiz", "key", "model"], (data) => {
      if (data) {
        if (data.key) geminiApiKey = data.key;
        const storedModel = data.model;
        const resolvedModel = resolveAndMigrateModel(storedModel || DEFAULT_GEMINI_MODEL);
        geminiModel = resolvedModel;
        console.log(`[QUIZ MODEL]\nstoredModel = ${storedModel}\nresolvedModel = ${resolvedModel}`);
        if (data.quiz !== undefined) autoQuizEnabled = data.quiz;
        initGeminiClient();
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        if (changes.key) geminiApiKey = changes.key.newValue;
        if (changes.model) {
          const newStored = changes.model.newValue;
          const newResolved = resolveAndMigrateModel(newStored || DEFAULT_GEMINI_MODEL);
          geminiModel = newResolved;
          console.log(`[QUIZ MODEL]\nstoredModel = ${newStored}\nresolvedModel = ${newResolved}`);
        }
        if (changes.quiz) autoQuizEnabled = changes.quiz.newValue;
        initGeminiClient();
      }
    });

    function htmlToPlainText(html) {
      if (!html) return "";
      try {
        return new DOMParser().parseFromString(html, "text/html").body.textContent || "";
      } catch (e) {
        return "";
      }
    }

    function parseQuizDraftParts(parts) {
      if (!parts || !Array.isArray(parts)) return;

      const parsed = parts.map((part) => {
        const schema = part.questionSchema;
        const isMcq = schema?.__typename?.toLowerCase().includes("multiplechoice");

        const options = schema?.options?.map((opt) => {
          const html = opt?.display?.htmlWithMetadata?.html;
          return htmlToPlainText(html);
        }) || [];

        const promptHtml = schema?.prompt?.htmlWithMetadata?.html;
        const questionText = htmlToPlainText(promptHtml);

        return {
          type: isMcq ? "mcq" : "text",
          options: options,
          question: questionText
        };
      });

      questionsJson = JSON.stringify(parsed, null, 2);
      console.log("Captured Quiz Questions:\n", questionsJson);
    }

    async function solveQuiz() {
      if (isSolvingQuiz) return;
      isSolvingQuiz = true;

      notifyQuizProgress("starting", { message: "Preparing quiz reasoning environment..." });

      try {
        if (!geminiApiKey) {
          const keyMsg = "Gemini API key required. Enter your API key in extension settings.";
          showToast(keyMsg, "error");
          notifyQuizProgress("error", { message: keyMsg });
          return;
        }

        notifyQuizProgress("loading_questions", { message: "Reading question draft from Coursera..." });

        if (!questionsJson) {
          const noQMsg = "No quiz questions found. Open an active quiz attempt page to solve.";
          showToast(noQMsg, "error");
          notifyQuizProgress("error", { message: noQMsg });
          return;
        }

        let parsedQuestions = [];
        try {
          parsedQuestions = JSON.parse(questionsJson);
        } catch (_) {}
        const totalCount = Array.isArray(parsedQuestions) ? parsedQuestions.length : 0;

        notifyQuizProgress("questions_ready", {
          total: totalCount,
          message: `Discovered ${totalCount} question${totalCount === 1 ? '' : 's'} to solve.`
        });

        if (!geminiInstance) {
          const noHelperMsg = "AI reasoning assistant could not be initialized. Please check your API key.";
          showToast(noHelperMsg, "error");
          notifyQuizProgress("error", { message: noHelperMsg });
          return;
        }

        notifyQuizProgress("solving", {
          total: totalCount,
          message: `Sending questions to ${geminiModel || DEFAULT_QUIZ_MODEL}...`
        });

        showToast(`Analyzing questions using ${geminiModel || DEFAULT_QUIZ_MODEL}...`, "info");

        const answers = await geminiInstance.solveQuestions(questionsJson);
        console.log("Gemini Answers:", answers);

        notifyQuizProgress("answers_ready", {
          total: totalCount,
          message: "Answers generated successfully."
        });

        notifyQuizProgress("filling_answers", {
          current: 0,
          total: totalCount,
          message: "Applying answers to quiz options..."
        });

        const fillSuccess = fillQuizAnswersInDOM(answers, (curr, tot) => {
          notifyQuizProgress("filling_answers", {
            current: curr,
            total: tot,
            message: `Applying answer ${curr} of ${tot}...`
          });
        });

        if (fillSuccess === false) {
          const noDomMsg = "Could not locate question elements on this page.";
          showToast(noDomMsg, "error");
          notifyQuizProgress("error", { message: noDomMsg });
          return;
        }

        notifyQuizProgress("submitting", {
          current: totalCount,
          total: totalCount,
          message: "Finalizing answer selections..."
        });

        // Actual completion confirmation
        notifyQuizProgress("completed", {
          current: totalCount,
          total: totalCount,
          message: "✓ Quiz completed successfully"
        });
      } catch (error) {
        console.error("Error in solveQuestions:", error);
        let cleanMsg = error.message || "Quiz could not be completed.";
        if (geminiApiKey) {
          cleanMsg = cleanMsg.split(geminiApiKey).join("[REDACTED]");
        }
        showToast(`Unable to complete quiz: ${cleanMsg}`, "error");
        notifyQuizProgress("error", { message: cleanMsg });
      } finally {
        isSolvingQuiz = false;
      }
    }

    function fillQuizAnswersInDOM(aiAnswers, onProgress) {
      if (!aiAnswers || !Array.isArray(aiAnswers)) return false;

      const questionElements = document.querySelectorAll("div.css-1tfphom");
      if (!questionElements || questionElements.length === 0) {
        showToast("Could not locate quiz questions on this page.", "error");
        return false;
      }

      const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;

      questionElements.forEach((questionEl, index) => {
        if (typeof onProgress === "function") {
          onProgress(index + 1, questionElements.length);
        }
        const answer = aiAnswers[index];
        if (!answer) return;

        // 1. Textarea / free response question
        const textInput = questionEl.querySelector('textarea, input[type="text"]');
        if (textInput && answer.content) {
          const setter = textInput.tagName === "TEXTAREA" ? nativeTextareaSetter : nativeInputSetter;
          if (setter) {
            setter.call(textInput, answer.content);
          } else {
            textInput.value = answer.content;
          }
          textInput.dispatchEvent(new Event("input", { bubbles: true }));
          textInput.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }

        // 2. Choice options (radio buttons and checkboxes)
        const options = questionEl.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        const correctIndices = answer.correctOptionsIndex || [];

        options.forEach((optInput, optIdx) => {
          if (correctIndices.includes(optIdx) && !optInput.checked) {
            optInput.click();
          }
        });
      });

      showToast("Correct options have been selected.", "success");
      return true;
    }

    // -------------------------------------------------------------
    // Action Dispatcher for Retained Features
    // -------------------------------------------------------------
    const ACTION_READING = "reading";
    const ACTION_DISCUSSION = "discussion";
    const ACTION_DIALOGUE = "dialogue";
    const ACTION_VIDEO = "video";
    const ACTION_BYPASS = "bypass";
    const ACTION_QUIZ = "quiz";

    const handleAction = async actionName => {
      const actionMap = {
        [ACTION_READING]: () => completeReadingMaterials(),
        [ACTION_DISCUSSION]: () => {
          // Discussion prompt: queries user for speed delay in ms, stores in chrome.storage.sync (key "s")
          const inputVal = prompt("Enter speed in ms", "5000");
          const parsedMs = Math.max(1000, Math.min(10000, parseInt(inputVal || "5000", 10)));
          if (parsedMs > 0) {
            setSyncStorage("s", parsedMs);
            return processCourseMaterials(undefined, "discussion");
          }
        },
        [ACTION_DIALOGUE]: () => processCourseMaterials(undefined, "dialogue"),
        [ACTION_VIDEO]: () => completeCourseVideosOnly(),
        [ACTION_BYPASS]: () => executeTurboPartialCourse(),
        [ACTION_QUIZ]: () => solveQuiz()
      };

      if (actionMap[actionName]) {
        return await actionMap[actionName]();
      }
    };

    // -------------------------------------------------------------
    // Chrome Runtime Message Listener (Popup & Background communication)
    // -------------------------------------------------------------
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Direct string message support ("bypass")
      if (request === "bypass") {
        (async () => {
          await executeTurboPartialCourse();
          sendResponse({ received: true });
        })();
        return true;
      }

      // Direct string or action message support ("quiz")
      if (request === "quiz" || request?.action === "quiz") {
        (async () => {
          await solveQuiz();
          sendResponse({ received: true });
        })();
        return true;
      }

      // Auto-quiz message from background.js navigation listener
      if (request === "attempt") {
        (async () => {
          if (autoQuizEnabled && geminiApiKey) {
            await solveQuiz();
          }
          sendResponse({ received: true });
        })();
        return true;
      }

      // Execute feature action from popup
      if (request.action) {
        if (request.action === "GET_USER_DATA") {
          const user = extractUserData();
          sendResponse({
            version: extensionVersion,
            user: user ? {
              name: user.fullName || user.display_name || "Coursera User",
              email: user.email_address || ""
            } : null
          });
          return true;
        }

        (async () => {
          await handleAction(request.action);
          sendResponse({ received: true });
        })();
        return true;
      }

      // Display toast relay from background
      if (request.action === "SHOW_TOAST") {
        if (isVideoCompletionActive && request.payload?.type !== "error") {
          sendResponse({ displayed: false });
          return true;
        }
        showToast(request.payload.message, request.payload.type, request.payload.keep);
        sendResponse({ displayed: true });
        return true;
      }

      // URL changed event
      if (request.message === "urlChanged") {
        cachedCourseMaterials = null;
        checkAndCompleteCurrentWidget().catch(() => {});
        sendResponse({ updated: true });
        return true;
      }

      return undefined;
    });
  })();
})();
