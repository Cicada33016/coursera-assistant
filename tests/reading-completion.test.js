const test = require("node:test");
const assert = require("node:assert");

// Simulates reading completion engine logic from content.js
function createReadingEngine(options = {}) {
  const {
    courseSlug = "machine-learning",
    materials = null,
    userId = 12345678,
    fetchResponses = {}
  } = options;

  let toastMessages = [];
  const showToast = (msg, type) => {
    toastMessages.push({ msg, type });
  };

  const executeCompletion = async () => {
    if (!courseSlug) {
      showToast("Open a Coursera course page to begin.", "error");
      return { success: false, reason: "missing_course_slug" };
    }

    if (!materials) {
      showToast("Coursera didn't return course materials. Please reload the page.", "error");
      return { success: false, reason: "missing_materials" };
    }

    const gradingParams = materials["onDemandGradingParameters.v1"];
    const courseId = gradingParams?.[0]?.id;
    if (!courseId) {
      showToast("Unable to find course details on this page.", "error");
      return { success: false, reason: "missing_course_id" };
    }

    if (!userId) {
      showToast("Please sign in to Coursera to continue.", "error");
      return { success: false, reason: "missing_user_id" };
    }

    const rawUserId = userId;
    const numericUserId = !isNaN(Number(rawUserId)) ? Number(rawUserId) : rawUserId;

    const items = materials["onDemandCourseMaterialItems.v2"] || materials["onDemandCourseMaterialItems.v1"] || [];
    const readingItems = items.filter(item => {
      const typeName = item.contentSummary?.typeName || item.typeName;
      return typeName === "supplement";
    });

    if (readingItems.length === 0) {
      showToast("No reading materials found in this course syllabus.", "info");
      return { success: true, count: 0, reason: "empty_reading_list" };
    }

    showToast(`Completing ${readingItems.length} reading materials...`, "info");

    const attemptsLog = [];
    const results = await Promise.all(readingItems.map(async item => {
      try {
        const primaryRes = fetchResponses[item.id]?.primary || { ok: true, status: 200, statusText: "OK" };
        attemptsLog.push({ itemId: item.id, type: "numeric", payloadUserId: numericUserId, status: primaryRes.status });

        let res = primaryRes;

        // Fallback: If numeric userId failed with 400 Bad Request, retry with string userId
        if (!res.ok && res.status === 400) {
          const fallbackRes = fetchResponses[item.id]?.fallback || { ok: true, status: 200, statusText: "OK" };
          attemptsLog.push({ itemId: item.id, type: "string_fallback", payloadUserId: String(rawUserId), status: fallbackRes.status });
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        }

        return res.ok && res.status >= 200 && res.status < 300;
      } catch (err) {
        attemptsLog.push({ itemId: item.id, error: err.message });
        return false;
      }
    }));

    const succeeded = results.filter(Boolean).length;
    if (succeeded === 0) {
      showToast(`Reading Material completion failed (0/${readingItems.length})`, "error");
    } else if (succeeded === readingItems.length) {
      showToast(`✓ Reading Material completed (${succeeded}/${readingItems.length})`, "success");
    } else {
      showToast(`✓ Reading Material partially completed (${succeeded}/${readingItems.length})`, "warn");
    }

    return {
      success: succeeded === readingItems.length,
      partial: succeeded > 0 && succeeded < readingItems.length,
      succeeded,
      total: readingItems.length,
      attemptsLog,
      toastMessages
    };
  };

  return { executeCompletion, toastMessages };
}

test("Reading Completion - succeeds on HTTP 200/201/204", async () => {
  const materials = {
    "onDemandGradingParameters.v1": [{ id: "c1" }],
    "onDemandCourseMaterialItems.v2": [
      { id: "read1", typeName: "supplement" },
      { id: "read2", typeName: "supplement" }
    ]
  };

  const engine = createReadingEngine({
    courseSlug: "test-course",
    materials,
    userId: 12345,
    fetchResponses: {
      read1: { primary: { ok: true, status: 200 } },
      read2: { primary: { ok: true, status: 204 } }
    }
  });

  const res = await engine.executeCompletion();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.succeeded, 2);
  assert.strictEqual(res.total, 2);
  assert.ok(res.toastMessages.some(t => t.type === "success" && t.msg.includes("✓ Reading Material completed")));
});

test("Reading Completion - numeric userId fallback to string on HTTP 400", async () => {
  const materials = {
    "onDemandGradingParameters.v1": [{ id: "c1" }],
    "onDemandCourseMaterialItems.v2": [
      { id: "item400", typeName: "supplement" }
    ]
  };

  const engine = createReadingEngine({
    courseSlug: "test-course",
    materials,
    userId: 98765432,
    fetchResponses: {
      item400: {
        primary: { ok: false, status: 400 }, // numeric rejected by backend
        fallback: { ok: true, status: 200 }   // string accepted
      }
    }
  });

  const res = await engine.executeCompletion();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.attemptsLog.length, 2);
  assert.strictEqual(res.attemptsLog[0].type, "numeric");
  assert.strictEqual(typeof res.attemptsLog[0].payloadUserId, "number");
  assert.strictEqual(res.attemptsLog[1].type, "string_fallback");
  assert.strictEqual(typeof res.attemptsLog[1].payloadUserId, "string");
});

test("Reading Completion - handles missing course, missing user, and empty reading list", async () => {
  // 1. Missing course slug
  const noCourseEngine = createReadingEngine({ courseSlug: "" });
  const r1 = await noCourseEngine.executeCompletion();
  assert.strictEqual(r1.success, false);
  assert.strictEqual(r1.reason, "missing_course_slug");

  // 2. Missing user ID
  const noUserEngine = createReadingEngine({ courseSlug: "test", materials: { "onDemandGradingParameters.v1": [{ id: "c1" }] }, userId: null });
  const r2 = await noUserEngine.executeCompletion();
  assert.strictEqual(r2.success, false);
  assert.strictEqual(r2.reason, "missing_user_id");

  // 3. Empty reading items
  const emptyEngine = createReadingEngine({
    courseSlug: "test",
    userId: 123,
    materials: {
      "onDemandGradingParameters.v1": [{ id: "c1" }],
      "onDemandCourseMaterialItems.v2": [{ id: "video1", typeName: "lecture" }]
    }
  });
  const r3 = await emptyEngine.executeCompletion();
  assert.strictEqual(r3.success, true);
  assert.strictEqual(r3.count, 0);
  assert.strictEqual(r3.reason, "empty_reading_list");
});

test("Reading Completion - handles partial failures with warning toast", async () => {
  const materials = {
    "onDemandGradingParameters.v1": [{ id: "c1" }],
    "onDemandCourseMaterialItems.v2": [
      { id: "itemOK", typeName: "supplement" },
      { id: "itemFail", typeName: "supplement" }
    ]
  };

  const engine = createReadingEngine({
    courseSlug: "test-course",
    materials,
    userId: 12345,
    fetchResponses: {
      itemOK: { primary: { ok: true, status: 200 } },
      itemFail: { primary: { ok: false, status: 500 } }
    }
  });

  const res = await engine.executeCompletion();
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.partial, true);
  assert.strictEqual(res.succeeded, 1);
  assert.strictEqual(res.total, 2);
  assert.ok(res.toastMessages.some(t => t.type === "warn" && t.msg.includes("partially completed (1/2)")));
});
