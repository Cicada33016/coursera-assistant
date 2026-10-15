const test = require("node:test");
const assert = require("node:assert");

// Load background script functions in a sandbox environment
function createVideoEngine(customFetch) {
  const COURSERA_API_BASE = "https://www.coursera.org/api";
  const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.min(ms, 5)));

  async function postVideoEvent(userId, item, eventName = "play", maxRetries = 5, retryDelay = 10, fetchImpl = customFetch) {
    const url = `${COURSERA_API_BASE}/opencourse.v1/user/${userId}/course/${item.open_course_slug}/item/${item.item_id}/lecture/videoEvents/${eventName}?autoEnroll=false`;
    const headers = { "Content-Type": "application/json" };
    const body = JSON.stringify({ contentRequestBody: {} });

    let attemptsMade = 0;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attemptsMade++;
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: headers,
          credentials: "include",
          body: body
        });

        const data = await res.json().catch(() => ({}));

        if (eventName === "play" && res.ok) {
          return { ok: true, attempts: attemptsMade };
        }

        const progressState = data?.itemProgress?.progressState;
        if (res.ok && progressState === "Completed") {
          return { ok: true, attempts: attemptsMade };
        }

        if (eventName === "ended" && (res.status === 400 || progressState === "Started") && attempt < maxRetries) {
          await sleep(retryDelay);
          continue;
        }

        return { ok: false, attempts: attemptsMade, status: res.status };
      } catch (err) {
        if (eventName !== "ended" || attempt >= maxRetries) {
          return { ok: false, attempts: attemptsMade, error: err.message };
        }
        await sleep(retryDelay);
      }
    }
    return { ok: false, attempts: attemptsMade };
  }

  // Load the actual implementation from dist/scripts/background.js
  const fs = require("node:fs");
  const bgCode = fs.readFileSync("dist/scripts/background.js", "utf8");

  // Extract putVideoProgress implementation directly from source file
  const putFnMatch = bgCode.match(/async function putVideoProgress\([\s\S]*?\n  \}/);
  if (!putFnMatch) throw new Error("Could not find putVideoProgress in background.js");

  const putVideoProgressFn = new Function(
    "COURSERA_API_BASE",
    "fetch",
    `return (${putFnMatch[0]})`
  )(COURSERA_API_BASE, customFetch);

  return {
    postVideoEvent,
    putVideoProgress: putVideoProgressFn
  };
}

test("Video Completion - postVideoEvent succeeds when server returns Completed", async () => {
  let callCount = 0;
  const mockFetch = async (url) => {
    callCount++;
    assert.match(url, /\/user\/12345\/course\/machine-learning\/item\/lecture1\/lecture\/videoEvents\/ended/);
    return {
      ok: true,
      status: 200,
      json: async () => ({ itemProgress: { progressState: "Completed" } })
    };
  };

  const engine = createVideoEngine(mockFetch);
  const result = await engine.postVideoEvent("12345", { open_course_slug: "machine-learning", item_id: "lecture1" }, "ended");
  assert.strictEqual(result.ok, true);
  assert.strictEqual(callCount, 1);
});

test("Video Completion - postVideoEvent has finite retry limit on repeated 400/Started responses", async () => {
  let attempts = 0;
  const mockFetch = async () => {
    attempts++;
    return {
      ok: false,
      status: 400,
      json: async () => ({ itemProgress: { progressState: "Started" } })
    };
  };

  const engine = createVideoEngine(mockFetch);
  const result = await engine.postVideoEvent("12345", { open_course_slug: "ml", item_id: "lec1" }, "ended", 3, 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(attempts, 3, "Must not retry beyond maxRetries");
  assert.strictEqual(result.attempts, 3);
});

test("Video Completion - postVideoEvent terminates on network failure", async () => {
  let attempts = 0;
  const mockFetch = async () => {
    attempts++;
    throw new Error("Network unreachable");
  };

  const engine = createVideoEngine(mockFetch);
  const result = await engine.postVideoEvent("12345", { open_course_slug: "ml", item_id: "lec1" }, "ended", 3, 1);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(attempts, 3);
  assert.strictEqual(result.error, "Network unreachable");
});

test("Video Completion - putVideoProgress must detect HTTP errors instead of silently continuing", async () => {
  let calledUrl = "";
  let payloadBody = null;
  const mockFetch = async (url, opts) => {
    calledUrl = url;
    payloadBody = JSON.parse(opts.body);
    // Simulating server-side failure: 500 Internal Server Error
    return {
      ok: false,
      status: 500,
      statusText: "Internal Server Error"
    };
  };

  const engine = createVideoEngine(mockFetch);
  const result = await engine.putVideoProgress("user99", "courseABC", "videoXYZ", 300);

  assert.strictEqual(
    calledUrl,
    "https://www.coursera.org/api/onDemandVideoProgresses.v1/user99~courseABC~videoXYZ",
    "URL must dynamically use user, course, and video IDs"
  );
  assert.strictEqual(payloadBody.viewedUpTo, 300);
  assert.strictEqual(payloadBody.videoProgressId, "user99~courseABC~videoXYZ");

  // The existing implementation silently swallowed the failure and returned undefined
  // A robust implementation must return false or throw an error on unsuccessful HTTP status
  assert.strictEqual(result, false, "putVideoProgress should return false when response is not ok");
});
