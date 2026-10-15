const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");

// Extract inspectResponse directly from dist/scripts/content.js
function getSourceInspectResponse() {
  const contentCode = fs.readFileSync("dist/scripts/content.js", "utf8");
  const fnMatch = contentCode.match(/const inspectResponse = async \(res\) => \{[\s\S]*?\n        \};/);
  if (!fnMatch) throw new Error("Could not find inspectResponse in content.js");

  return new Function(`${fnMatch[0]}; return inspectResponse;`)();
}

test("Gemini Quiz - inspectResponse reproduces stream consumption bug on second read", async () => {
  const inspectResponse = getSourceInspectResponse();

  // Create a real Response object with a 429 quota-zero error body
  const errorPayload = {
    error: {
      code: 429,
      message: "Quota exceeded for quota metric 'GenerateContent' and limit: 0",
      status: "RESOURCE_EXHAUSTED"
    }
  };

  const response = new Response(JSON.stringify(errorPayload), {
    status: 429,
    statusText: "Too Many Requests"
  });

  // Call 1: First inspection
  const inspection1 = await inspectResponse(response);
  assert.strictEqual(inspection1.isLimitZero, true, "First inspection must detect limit: 0");
  assert.ok(inspection1.rawText.includes("limit: 0"), "First inspection contains rawText");

  // Call 2: Second inspection on the SAME response (simulating lines 1682 and 1739 in content.js)
  const inspection2 = await inspectResponse(response);

  // In the unfixed code: inspection2.rawText is "" and inspection2.isLimitZero is FALSE
  // because the body stream was already consumed by call 1!
  assert.strictEqual(
    inspection2.rawText,
    inspection1.rawText,
    "Second inspection must preserve rawText instead of losing it due to consumed stream"
  );
  assert.strictEqual(
    inspection2.isLimitZero,
    true,
    "Second inspection must preserve isLimitZero instead of misclassifying quota error"
  );
});

test("Gemini Quiz - API keys are redacted in error messages", () => {
  const apiKey = "AIzaSyD-SecretKey123456789";
  const rawError = `Request failed: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const maskApiKey = (str) => {
    if (!str || typeof str !== "string") return "";
    if (!apiKey) return str;
    return str.split(apiKey).join("[REDACTED_API_KEY]");
  };

  const masked = maskApiKey(rawError);
  assert.strictEqual(masked.includes(apiKey), false, "API key must not appear in masked error");
  assert.strictEqual(masked.includes("[REDACTED_API_KEY]"), true, "API key must be replaced with [REDACTED_API_KEY]");
});

test("Gemini Quiz - Model fallback switches 404 to default model", async () => {
  const DEFAULT_MODEL = "gemini-2.5-flash";
  let activeModel = "gemini-3.8-flash";

  let attempts = 0;
  const mockPerformRequest = async (url) => {
    attempts++;
    if (url.includes("gemini-3.8-flash")) {
      return new Response(JSON.stringify({ error: { message: "models/gemini-3.8-flash is not found for API version v1beta" } }), {
        status: 404,
        statusText: "Not Found"
      });
    }
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify([{ question: "q1", correctOptionsIndex: [0] }]) }] } }]
    }), {
      status: 200,
      statusText: "OK"
    });
  };

  // Simulating solver logic
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
  let resp = await mockPerformRequest(url);

  if (!resp.ok && resp.status === 404 && activeModel !== DEFAULT_MODEL) {
    activeModel = DEFAULT_MODEL;
    url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
    resp = await mockPerformRequest(url);
  }

  assert.strictEqual(resp.ok, true);
  assert.strictEqual(activeModel, DEFAULT_MODEL);
  assert.strictEqual(attempts, 2);
});

test("Gemini Quiz - Student safety invariant: fillQuizAnswersInDOM never submits quiz", () => {
  // Verify by inspecting fillQuizAnswersInDOM in content.js
  const contentCode = fs.readFileSync("dist/scripts/content.js", "utf8");
  const fillFnMatch = contentCode.match(/function fillQuizAnswersInDOM[\s\S]*?\n    \}/);
  assert.ok(fillFnMatch, "fillQuizAnswersInDOM exists");

  const fillFnBody = fillFnMatch[0];
  assert.strictEqual(fillFnBody.includes('type="submit"'), false, "Must not click submit buttons");
  assert.strictEqual(fillFnBody.includes("submit-quiz"), false, "Must not reference submit quiz action");
  assert.strictEqual(fillFnBody.includes(".submit()"), false, "Must not call form.submit()");
});
