const test = require("node:test");
const assert = require("node:assert");

// Simulates the GEMINI_PROXY_FETCH handler in background.js
function createGeminiProxy(fetchImpl) {
  const handleGeminiProxyFetch = async (request) => {
    return new Promise((resolve) => {
      const sendResponse = (res) => resolve(res);

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

          // In updated implementation: attach request deadline timeout
          const timeoutSignal = AbortSignal.timeout ? AbortSignal.timeout(30000) : null;
          const mergedOptions = {
            ...(options || {}),
            signal: options?.signal || timeoutSignal
          };

          const fetchRes = await fetchImpl(url, mergedOptions);
          const bodyText = await fetchRes.text();
          sendResponse({
            ok: fetchRes.ok,
            status: fetchRes.status,
            statusText: fetchRes.statusText,
            text: bodyText
          });
        } catch (netErr) {
          // Sanitize any API key that might leak via URL in error message
          let errMsg = netErr.message || "Network request failed in background worker";
          errMsg = errMsg.replace(/key=[A-Za-z0-9_-]+/g, "key=[REDACTED]");

          sendResponse({
            error: errMsg
          });
        }
      })();
    });
  };

  return { handleGeminiProxyFetch };
}

test("Gemini Proxy - accepts only https://generativelanguage.googleapis.com/*", async () => {
  const proxy = createGeminiProxy(async () => ({ ok: true, status: 200, text: async () => "{}" }));

  // 1. Legitimate destination
  const r1 = await proxy.handleGeminiProxyFetch({
    action: "GEMINI_PROXY_FETCH",
    payload: { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=xyz" }
  });
  assert.strictEqual(r1.ok, true);
  assert.strictEqual(r1.status, 200);

  // 2. Unauthorized external host
  const r2 = await proxy.handleGeminiProxyFetch({
    action: "GEMINI_PROXY_FETCH",
    payload: { url: "https://api.external.com/v1" }
  });
  assert.strictEqual(r2.error, "Unauthorized destination host");

  // 3. Invalid / missing URL
  const r3 = await proxy.handleGeminiProxyFetch({
    action: "GEMINI_PROXY_FETCH",
    payload: { url: null }
  });
  assert.strictEqual(r3.error, "Missing or invalid URL");
});

test("Gemini Proxy - propagates HTTP status codes and error bodies (404, 429, 500)", async () => {
  const errorBodies = {
    404: JSON.stringify({ error: { code: 404, message: "Model not found" } }),
    429: JSON.stringify({ error: { code: 429, message: "Quota exceeded: limit 0" } }),
    500: JSON.stringify({ error: { code: 500, message: "Internal server error" } })
  };

  const proxy = createGeminiProxy(async (url) => {
    const status = url.includes("status=429") ? 429 : url.includes("status=404") ? 404 : 500;
    return {
      ok: false,
      status,
      statusText: status === 429 ? "Too Many Requests" : status === 404 ? "Not Found" : "Server Error",
      text: async () => errorBodies[status]
    };
  });

  // Test 429 quota error
  const res429 = await proxy.handleGeminiProxyFetch({
    payload: { url: "https://generativelanguage.googleapis.com/v1beta/test?status=429" }
  });
  assert.strictEqual(res429.ok, false);
  assert.strictEqual(res429.status, 429);
  assert.ok(res429.text.includes("limit 0"));

  // Test 404 not found
  const res404 = await proxy.handleGeminiProxyFetch({
    payload: { url: "https://generativelanguage.googleapis.com/v1beta/test?status=404" }
  });
  assert.strictEqual(res404.ok, false);
  assert.strictEqual(res404.status, 404);
  assert.ok(res404.text.includes("Model not found"));
});

test("Gemini Proxy - network failure is caught and credentials in error sanitized", async () => {
  const proxy = createGeminiProxy(async () => {
    throw new Error("Failed to fetch from https://generativelanguage.googleapis.com/?key=AIzaSySecret123");
  });

  const res = await proxy.handleGeminiProxyFetch({
    payload: { url: "https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSySecret123" }
  });

  assert.ok(res.error, "Must return error message on network failure");
  assert.strictEqual(res.error.includes("AIzaSySecret123"), false, "Secret API key must not leak in error message");
  assert.ok(res.error.includes("key=[REDACTED]"), "Key must be replaced with [REDACTED]");
});

test("Gemini Proxy - request deadline timeout stops indefinite hangs", async () => {
  const hangingFetch = async (url, opts) => {
    return new Promise((resolve, reject) => {
      opts.signal?.addEventListener("abort", () => {
        reject(new Error("Request timed out (deadline exceeded)"));
      });
    });
  };

  const proxy = createGeminiProxy(hangingFetch);
  const res = await proxy.handleGeminiProxyFetch({
    payload: {
      url: "https://generativelanguage.googleapis.com/v1beta/test",
      options: {
        signal: AbortSignal.timeout(50) // 50ms test deadline
      }
    }
  });

  assert.ok(res.error, "Hanging request must fail with timeout error");
  assert.ok(res.error.includes("timed out") || res.error.includes("aborted"));
});
