/**
 * Coursera Automation Extension - Main World Network Interceptor
 * 
 * Injected into the page MAIN world at document_start via Manifest V3 content_scripts.
 * Hooks XMLHttpRequest and window.fetch to capture Coursera course materials
 * and quiz state responses, relaying them to the extension's content script
 * via window.postMessage targeted to the page origin.
 */
(() => {
  'use strict';

  // Guard against multiple injections in the same frame
  if (window.__COURSERA_INTERCEPTOR_INITIALIZED__) {
    return;
  }
  window.__COURSERA_INTERCEPTOR_INITIALIZED__ = true;

  /**
   * Dispatches intercepted network payloads to window listeners with exact origin targeting
   */
  function dispatchInterceptedMessage(payload) {
    try {
      const targetOrigin = (window.location && window.location.origin && window.location.origin.startsWith("http"))
        ? window.location.origin
        : "*";
      window.postMessage(payload, targetOrigin);
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // 1. Hook XMLHttpRequest
  // ---------------------------------------------------------------------------
  if (typeof XMLHttpRequest !== "undefined" && XMLHttpRequest.prototype) {
    const xhrProto = XMLHttpRequest.prototype;
    const origOpen = xhrProto.open;
    const origSend = xhrProto.send;
    const origSetRequestHeader = xhrProto.setRequestHeader;

    xhrProto.open = function (method, url) {
      this._interceptorMethod = method;
      this._interceptorUrl = url;
      this._interceptorHeaders = {};
      return origOpen.apply(this, arguments);
    };

    xhrProto.setRequestHeader = function (header, value) {
      if (!this._interceptorHeaders) {
        this._interceptorHeaders = {};
      }
      this._interceptorHeaders[header] = value;
      return origSetRequestHeader.apply(this, arguments);
    };

    xhrProto.send = function (body) {
      this.addEventListener("load", function () {
        try {
          const rawUrl = this._interceptorUrl;
          if (!rawUrl) return;

          const allHeaders = typeof this.getAllResponseHeaders === "function"
            ? (this.getAllResponseHeaders() || "")
            : "";

          const contentTypeHeader = allHeaders
            .split("\n")
            .find(h => h.toLowerCase().startsWith("content-type")) || "";
          const contentType = contentTypeHeader.split(":")[1]?.trim() || "*";

          let parsedResponse = this.responseText;
          if (this.responseType !== "blob" && this.responseText) {
            if (contentType.toLowerCase().includes("application/json")) {
              try {
                parsedResponse = JSON.parse(this.responseText);
              } catch (_) {
                parsedResponse = this.responseText;
              }
            }
          }

          const payload = {
            url: rawUrl,
            contentType: contentType,
            response: parsedResponse,
            extra: {
              originalUrl: rawUrl,
              method: this._interceptorMethod || "GET",
              requestHeaders: this._interceptorHeaders || {},
              status: this.status,
              responseHeaders: allHeaders
            }
          };

          dispatchInterceptedMessage(payload);
        } catch (_) {}
      });

      return origSend.apply(this, arguments);
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Hook window.fetch
  // ---------------------------------------------------------------------------
  if (typeof window.fetch === "function") {
    const origFetch = window.fetch;
    window.fetch = async function (resource, init) {
      try {
        const response = await origFetch(resource, init);
        try {
          const clonedResponse = response.clone();
          const rawUrl = typeof resource === "string"
            ? resource
            : (resource?.url || response.url || "");
          const contentType = clonedResponse.headers?.get("content-type") || "*";

          let parsedResponse;
          if (contentType.toLowerCase().includes("application/json")) {
            try {
              parsedResponse = await clonedResponse.json();
            } catch (_) {
              parsedResponse = await clonedResponse.text();
            }
          } else {
            parsedResponse = await clonedResponse.text();
          }

          const payload = {
            url: rawUrl,
            contentType: contentType,
            response: parsedResponse,
            extra: {
              originalUrl: rawUrl,
              method: init?.method || "GET",
              requestHeaders: init?.headers ? Array.from(new Headers(init.headers).entries()) : [],
              requestBody: init?.body,
              status: response.status,
              statusText: response.statusText,
              responseHeaders: clonedResponse.headers ? Array.from(clonedResponse.headers.entries()) : []
            }
          };

          dispatchInterceptedMessage(payload);
        } catch (_) {}

        return response;
      } catch (err) {
        throw err;
      }
    };
  }
})();