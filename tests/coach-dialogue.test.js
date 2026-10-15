const test = require("node:test");
const assert = require("node:assert");

// Simulates the Coach dialogue automation loop from content.js
function createCoachAutomator(options = {}) {
  const {
    isCompletedInit = false,
    hasTextarea = true,
    isTextareaDisabled = false,
    loaderClears = true,
    isQueued = true
  } = options;

  let completed = isCompletedInit;
  let turnsExecuted = 0;
  const TARGET_GENUINE_TURNS = 5;
  const logs = [];
  const toasts = [];
  let queueAdvanced = false;

  const toastManager = {
    info: (m) => toasts.push({ type: "info", msg: m }),
    success: (m) => toasts.push({ type: "success", msg: m }),
    warn: (m) => toasts.push({ type: "warn", msg: m }),
    error: (m) => toasts.push({ type: "error", msg: m })
  };

  const advanceDialogueQueue = async () => {
    queueAdvanced = true;
  };

  // Simulating the dialogue loop
  const runDialogue = async () => {
    for (let i = 0; i < TARGET_GENUINE_TURNS; i++) {
      if (completed) break;

      turnsExecuted++;

      // Check textarea
      if (!hasTextarea || isTextareaDisabled) {
        logs.push(`Textarea unavailable on turn ${turnsExecuted}`);
        // If textarea not found, wait and continue
        continue;
      }

      // Check loader
      if (!loaderClears) {
        logs.push(`Loader never cleared on turn ${turnsExecuted}`);
        break; // Timed out waiting for loader
      }
    }

    // Terminal completion check from current content.js lines 709-718
    const isCompleted = () => completed;

    if (isCompleted()) {
      toastManager.success("✓ Coach Dialogue completed!");
      await advanceDialogueQueue();
      return { status: "completed", turns: turnsExecuted, queueAdvanced };
    } else if (isQueued) {
      // CURRENT BUG IN CODE: Advances queue even when isCompleted() is FALSE!
      // In the audit, we test this behavior and assert that uncompleted dialogues
      // should NOT advance the queue or report false progress.
      return { status: "incomplete_queued", turns: turnsExecuted, queueAdvanced, canAdvanceQueueWithoutCompletion: true };
    }

    return { status: "incomplete", turns: turnsExecuted, queueAdvanced: false };
  };

  return { runDialogue, logs, toasts, getQueueAdvanced: () => queueAdvanced };
}

test("Coach Dialogue - adheres to TARGET_GENUINE_TURNS limit", async () => {
  const automator = createCoachAutomator({
    isCompletedInit: false,
    hasTextarea: true,
    isTextareaDisabled: false,
    loaderClears: true,
    isQueued: false
  });

  const res = await automator.runDialogue();
  assert.strictEqual(res.turns, 5, "Must execute exactly up to TARGET_GENUINE_TURNS");
});

test("Coach Dialogue - handles missing textarea gracefully without hanging", async () => {
  const automator = createCoachAutomator({
    isCompletedInit: false,
    hasTextarea: false,
    isQueued: false
  });

  const res = await automator.runDialogue();
  assert.strictEqual(res.turns, 5);
  assert.strictEqual(automator.logs.length, 5);
  assert.strictEqual(res.status, "incomplete");
});

test("Coach Dialogue - handles persistent loader timeout", async () => {
  const automator = createCoachAutomator({
    isCompletedInit: false,
    hasTextarea: true,
    loaderClears: false,
    isQueued: false
  });

  const res = await automator.runDialogue();
  assert.strictEqual(res.turns, 1, "Must abort on loader timeout rather than looping endlessly");
  assert.ok(automator.logs[0].includes("Loader never cleared"));
});

test("Coach Dialogue - must NOT advance queue when isCompleted() is false", () => {
  // Source inspection of dist/scripts/content.js lines 711-717:
  // if (isCompleted()) {
  //   toastManager?.success("✓ Coach Dialogue completed!");
  //   await advanceDialogueQueue(courseSlug, storedQueue);
  // } else if (isQueued) {
  //   toastManager?.info("Advancing to next dialogue in queue...");
  //   await advanceDialogueQueue(courseSlug, storedQueue);
  // }
  //
  // Defect: The "else if (isQueued)" branch prematurely advances the dialogue queue
  // even if dialogue failed or is incomplete!
  const fs = require("node:fs");
  const contentCode = fs.readFileSync("dist/scripts/content.js", "utf8");

  const prematureAdvanceRegex = /else\s+if\s*\(isQueued\)\s*\{\s*toastManager\?\.info\("Advancing to next dialogue in queue\.\.\."\);\s*await\s+advanceDialogueQueue\(courseSlug,\s*storedQueue\);/;
  const hasPrematureAdvance = prematureAdvanceRegex.test(contentCode);

  assert.strictEqual(
    hasPrematureAdvance,
    false,
    "Dialogue automator must NOT advance queue when dialogue is incomplete or failed"
  );
});
