/**
 * Coursera Automation Extension - Background Service Worker (background.js)
 * 
 * Handles extension lifecycle events, options page triggers,
 * tab navigation tracking (urlChanged messages), and keyboard shortcuts.
 */
(() => {
  'use strict';

  // -------------------------------------------------------------
  // Lifecycle Event Handlers
  // -------------------------------------------------------------
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "update") {
      chrome.runtime.onUpdateAvailable?.addListener(function (updateInfo) {
        console.log("Updating extension to version " + updateInfo.version);
        chrome.runtime.reload();
      });
    }
  });

  // -------------------------------------------------------------
  // Skip Video+ Engine Helper Functions
  // -------------------------------------------------------------
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const COURSERA_API_BASE = "https://www.coursera.org/api";

  /**
   * Dispatches toast notification to the active Coursera tab
   */
  async function showToastInTab(tabId, message, type = "info", keep = false) {
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: "SHOW_TOAST",
        payload: { message, type, keep }
      }, () => {
        // Suppress lastError if tab closed or reloaded
        chrome.runtime.lastError;
      });
    }
  }

  /**
   * Dispatches lecture video event (play or ended) with retry and completion verification
   */
  async function postVideoEvent(userId, item, eventName = "play", maxRetries = 5, retryDelay = 8000) {
    const url = `${COURSERA_API_BASE}/opencourse.v1/user/${userId}/course/${item.open_course_slug}/item/${item.item_id}/lecture/videoEvents/${eventName}?autoEnroll=false`;
    const headers = { "Content-Type": "application/json" };
    const body = JSON.stringify({ contentRequestBody: {} });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: headers,
          credentials: "include",
          body: body
        });

        const data = await res.json().catch(() => ({}));

        if (eventName === "play" && res.ok) {
          return true;
        }

        const progressState = data?.itemProgress?.progressState;
        if (res.ok && progressState === "Completed") {
          return true;
        }

        if (eventName === "ended" && (res.status === 400 || progressState === "Started") && attempt < maxRetries) {
          await sleep(retryDelay);
          continue;
        }

        return false;
      } catch (err) {
        if (eventName !== "ended" || attempt >= maxRetries) {
          return false;
        }
        await sleep(retryDelay);
      }
    }
    return false;
  }

  /**
   * Creates the required server-side video progress record via PUT onDemandVideoProgresses.v1
   */
  async function putVideoProgress(userId, courseId, videoId, timeCommitment) {
    if (!videoId) return;
    const viewedUpTo = Math.floor(timeCommitment || 0);
    const videoProgressId = `${userId}~${courseId}~${videoId}`;
    const url = `${COURSERA_API_BASE}/onDemandVideoProgresses.v1/${videoProgressId}`;

    try {
      const payload = {
        viewedUpTo: viewedUpTo,
        videoProgressId: videoProgressId
      };
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn("[Skip Video+] Failed to PUT video progress:", err);
    }
  }

  // -------------------------------------------------------------
  // Persistent Quiz Progress Window Management
  // -------------------------------------------------------------
  let quizProgressWindowId = null;
  let quizProgressWindowCreationPromise = null;
  let latestQuizProgress = null;
  let quizCloseTimeoutId = null;

  async function openOrCreateQuizProgressWindow() {
    if (quizCloseTimeoutId) {
      clearTimeout(quizCloseTimeoutId);
      quizCloseTimeoutId = null;
    }

    // 1. If a valid existing window exists: focus and return it
    if (quizProgressWindowId !== null) {
      try {
        const win = await chrome.windows.get(quizProgressWindowId);
        if (win) {
          await chrome.windows.update(quizProgressWindowId, { focused: true });
          return quizProgressWindowId;
        }
      } catch (e) {
        quizProgressWindowId = null;
      }
    }

    // 2. If quizProgressWindowCreationPromise exists: await that SAME promise and return its resulting window ID
    if (quizProgressWindowCreationPromise) {
      return await quizProgressWindowCreationPromise;
    }

    // 3. Otherwise create exactly ONE chrome.windows.create() operation
    // 4. Store that Promise immediately before awaiting
    quizProgressWindowCreationPromise = (async () => {
      try {
        const createdWindow = await chrome.windows.create({
          url: chrome.runtime.getURL("quiz-progress.html"),
          type: "popup",
          width: 360,
          height: 460,
          focused: true
        });
        // 5. When creation finishes: assign quizProgressWindowId
        quizProgressWindowId = createdWindow?.id ?? null;
        return quizProgressWindowId;
      } catch (err) {
        // 7. If creation fails, clear the promise and allow a future retry
        console.warn("[Quiz Window] Failed to create persistent window:", err);
        quizProgressWindowId = null;
        return null;
      } finally {
        // 6. Always clear quizProgressWindowCreationPromise in finally
        quizProgressWindowCreationPromise = null;
      }
    })();

    return await quizProgressWindowCreationPromise;
  }

  function closeQuizProgressWindow() {
    if (quizCloseTimeoutId) {
      clearTimeout(quizCloseTimeoutId);
      quizCloseTimeoutId = null;
    }
    if (quizProgressWindowId !== null) {
      const winId = quizProgressWindowId;
      quizProgressWindowId = null;
      try {
        chrome.windows.remove(winId).catch(() => {});
      } catch (e) {}
    }
  }

  chrome.windows?.onRemoved?.addListener((removedWindowId) => {
    if (removedWindowId === quizProgressWindowId) {
      quizProgressWindowId = null;
      if (quizCloseTimeoutId) {
        clearTimeout(quizCloseTimeoutId);
        quizCloseTimeoutId = null;
      }
      try {
        chrome.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError || !tabs) return;
          for (const tab of tabs) {
            if (tab && tab.id) {
              chrome.tabs.sendMessage(tab.id, { action: "QUIZ_WINDOW_CLOSED" }, () => {
                chrome.runtime.lastError;
              });
            }
          }
        });
      } catch (_) {}
    }
  });

  // -------------------------------------------------------------
  // Message Listener for Extension Actions
  // -------------------------------------------------------------
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "OPEN_OPTIONS") {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      return true;
    }

    if (request.action === "OPEN_POPUP") {
      chrome.action.openPopup?.().catch(() => {});
      sendResponse({ success: true });
      return true;
    }

    // Skip Video+ Master Engine
    if (request.action === "SKIP_VIDEO_PLUS") {
      (async () => {
        const userId = request.payload?.userId;
        const items = request.payload?.items || [];
        const tabId = sender?.tab?.id;

        try {
          // Phase 1: Optimistic probe pass (ended event directly)
          const probeResults = await Promise.all(items.map(async item => {
            const isComplete = await postVideoEvent(userId, item, "ended", 1, 0);
            return {
              videoData: item,
              success: isComplete
            };
          }));

          const alreadyCompleted = probeResults.filter(r => r.success).length;
          const failedItems = probeResults.filter(r => !r.success).map(r => r.videoData);
          const failedCount = failedItems.length;

          if (failedCount === 0) {
            await showToastInTab(tabId, `All ${items.length} lecture videos completed.`, "success");
            sendResponse({ success: true, completed: items.length, total: items.length });
            return;
          }

          await showToastInTab(tabId, `Completing ${failedCount} remaining lecture videos...`, "info", true);

          // Phase 2: Remediation loop for failed items (play -> PUT progress -> sleep 2000 -> ended)
          let processedCount = 0;
          let remediationSuccessCount = 0;

          await Promise.all(failedItems.map(async item => {
            try {
              // A. Start playback session on server
              await postVideoEvent(userId, item, "play", 1, 0);

              // B. Write 100% video progress record to database
              await putVideoProgress(userId, item.course_id, item.videoId, item.timeCommitment);

              // C. Mandatory 2000ms delay for database / cache commit
              await sleep(2000);

              // D. Final ended event with up to 5 retries at 8000ms intervals
              const endedOk = await postVideoEvent(userId, item, "ended", 5, 8000);

              processedCount++;
              if (endedOk) remediationSuccessCount++;

              await showToastInTab(tabId, `Completing lecture ${processedCount} of ${failedCount}...`, "info", true);

              return {
                item_id: item.item_id,
                item_name: item.item_name,
                status: endedOk ? "completed" : "failed_again"
              };
            } catch (err) {
              processedCount++;
              return {
                item_id: item.item_id,
                item_name: item.item_name,
                status: "error",
                error: err.message
              };
            }
          }));

          const totalCompleted = alreadyCompleted + remediationSuccessCount;
          if (totalCompleted === items.length) {
            await showToastInTab(tabId, `All ${totalCompleted} of ${items.length} lecture videos completed.`, "success");
          } else {
            const failedFinal = items.length - totalCompleted;
            await showToastInTab(tabId, `Completed ${totalCompleted} of ${items.length} lecture videos. ${failedFinal} items require attention.`, "warn");
          }

          sendResponse({
            success: true,
            completed: totalCompleted,
            total: items.length
          });
        } catch (err) {
          console.error("[Skip Video+] Error during video processing:", err);
          await showToastInTab(tabId, "Coursera did not return the expected response for video completion.", "error");
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true; // Keep message channel open for async sendResponse
    }

    // Gemini API Request Proxy (handles fetch in extension context to avoid page CSP issues)
    if (request.action === "GEMINI_PROXY_FETCH") {
      (async () => {
        try {
          const { url, options } = request.payload || {};
          if (!url || typeof url !== "string") {
            sendResponse({ error: "Missing or invalid URL" });
            return;
          }
          if (!url.startsWith("https://generativelanguage.googleapis.com/")) {
            sendResponse({ error: "Unauthorized destination host" });
            return;
          }
          const fetchRes = await fetch(url, options || {});
          const bodyText = await fetchRes.text();
          sendResponse({
            ok: fetchRes.ok,
            status: fetchRes.status,
            statusText: fetchRes.statusText,
            text: bodyText
          });
        } catch (netErr) {
          sendResponse({
            error: netErr.message || "Network request failed in background worker"
          });
        }
      })();
      return true;
    }

    // Quiz Progress Window Handlers & Relays
    if (request.action === "OPEN_QUIZ_WINDOW") {
      (async () => {
        const winId = await openOrCreateQuizProgressWindow();
        sendResponse({ success: true, windowId: winId });
      })();
      return true;
    }

    if (request.action === "CLOSE_QUIZ_WINDOW") {
      closeQuizProgressWindow();
      sendResponse({ success: true });
      return true;
    }

    if (request.action === "GET_QUIZ_PROGRESS") {
      sendResponse({ payload: latestQuizProgress });
      return true;
    }

    if (request.action === "QUIZ_PROGRESS") {
      latestQuizProgress = request.payload;

      // Automatically open or focus the persistent window when quiz starts
      if (request.payload?.state === "starting" || (quizProgressWindowId === null && !quizProgressWindowCreationPromise)) {
        openOrCreateQuizProgressWindow().catch(() => {});
      }

      // If completed, keep visible for ~3-5 seconds then close
      if (request.payload?.state === "completed") {
        if (quizCloseTimeoutId) clearTimeout(quizCloseTimeoutId);
        quizCloseTimeoutId = setTimeout(() => {
          closeQuizProgressWindow();
        }, 4000);
      }

      // If error occurs, keep open and cancel any pending auto-close
      if (request.payload?.state === "error") {
        if (quizCloseTimeoutId) {
          clearTimeout(quizCloseTimeoutId);
          quizCloseTimeoutId = null;
        }
      }

      sendResponse({ received: true });
      return true;
    }

    return undefined;
  });

  // -------------------------------------------------------------
  // URL Change & Tab Navigation Tracker
  // -------------------------------------------------------------
  const activeTabUrls = {};

  chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    if (tab.url && tab.status === "complete") {
      if (activeTabUrls[tabId] === tab.url) {
        return;
      }

      activeTabUrls[tabId] = tab.url;
      chrome.tabs.sendMessage(tabId, {
        message: "urlChanged",
        url: tab.url
      }, function () {
        // Consume lastError to prevent uncaught error when content script is not yet injected
        chrome.runtime.lastError;
      });

      // Auto-Quiz trigger: if on coursera.org/learn and pathname ends with 'attempt'
      if (tab.url.startsWith("https://www.coursera.org/learn")) {
        try {
          const urlpath = new URL(tab.url).pathname;
          if (urlpath.endsWith("attempt")) {
            chrome.tabs.sendMessage(tabId, "attempt", function () {
              chrome.runtime.lastError;
            });
          }
        } catch (e) {}
      }
    }
  });

  chrome.tabs.onRemoved.addListener(tabId => {
    delete activeTabUrls[tabId];
  });

  // -------------------------------------------------------------
  // Keyboard Shortcut Commands
  // -------------------------------------------------------------
  chrome.commands.onCommand.addListener(command => {
    if (command === "open_popup_1" || command === "open_popup_2") {
      chrome.action.openPopup?.();
    }
  });
})();
