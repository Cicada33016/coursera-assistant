const test = require("node:test");
const assert = require("node:assert");

// Simulates DOM elements and fillQuizAnswersInDOM behavior
class MockElement {
  constructor(tagName, attrs = {}, text = "") {
    this.tagName = tagName.toUpperCase();
    this.attributes = attrs;
    this.value = "";
    this.checked = false;
    this.children = [];
    this.textContent = text;
    this.eventsDispatched = [];
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const checkNode = (node) => {
      if (node.matches(selector)) results.push(node);
      for (const child of node.children) checkNode(child);
    };
    for (const child of this.children) checkNode(child);
    return results;
  }

  matches(selector) {
    if (selector.startsWith(".")) {
      const cls = selector.slice(1);
      return (this.attributes["class"] || "").split(" ").includes(cls);
    }
    if (selector.includes("[data-testid=")) {
      const match = selector.match(/\[data-testid="([^"]+)"\]/);
      if (match && this.attributes["data-testid"] === match[1]) return true;
    }
    if (selector.includes("div.css-1tfphom")) {
      return this.tagName === "DIV" && (this.attributes["class"] || "").includes("css-1tfphom");
    }
    if (selector.includes('input[type="radio"]')) {
      return this.tagName === "INPUT" && this.attributes["type"] === "radio";
    }
    if (selector.includes('input[type="checkbox"]')) {
      return this.tagName === "INPUT" && this.attributes["type"] === "checkbox";
    }
    if (selector.includes("textarea")) {
      return this.tagName === "TEXTAREA";
    }
    return false;
  }

  appendChild(el) {
    this.children.push(el);
    return el;
  }

  dispatchEvent(evt) {
    this.eventsDispatched.push(evt.type);
    return true;
  }

  click() {
    this.checked = true;
    this.dispatchEvent({ type: "click" });
    this.dispatchEvent({ type: "change" });
  }
}

function createMockQuizDocument(questionSelectorType = "legacy_hash") {
  const root = new MockElement("BODY");

  // Create question containers based on test scenario
  for (let q = 0; q < 2; q++) {
    let qEl;
    if (questionSelectorType === "legacy_hash") {
      qEl = new MockElement("DIV", { class: "css-1tfphom some-wrapper" });
    } else if (questionSelectorType === "semantic_testid") {
      qEl = new MockElement("DIV", { "data-testid": "part-Submission_Part", class: "modern-container" });
    } else {
      qEl = new MockElement("DIV", { class: "unrecognized-hash-999" });
    }

    // Add 3 radio options
    for (let opt = 0; opt < 3; opt++) {
      const radio = new MockElement("INPUT", { type: "radio", name: `q_${q}` });
      qEl.appendChild(radio);
    }
    root.appendChild(qEl);
  }

  return root;
}

test("DOM Robustness - legacy css-1tfphom selector succeeds when hash is present", () => {
  const doc = createMockQuizDocument("legacy_hash");
  const questions = doc.querySelectorAll("div.css-1tfphom");
  assert.strictEqual(questions.length, 2);

  // Simulate answer selection on legacy hash elements
  const options = questions[0].querySelectorAll('input[type="radio"]');
  options[1].click();
  assert.strictEqual(options[1].checked, true);
  assert.ok(options[1].eventsDispatched.includes("change"));
});

test("DOM Robustness - legacy css-1tfphom selector fails when Coursera changes CSS class", () => {
  const doc = createMockQuizDocument("semantic_testid");
  // The current code in content.js line 2059 queries ONLY "div.css-1tfphom"
  const legacyQuestions = doc.querySelectorAll("div.css-1tfphom");
  assert.strictEqual(legacyQuestions.length, 0, "Current selector fails on pages without css-1tfphom class");

  // A resilient selector with semantic fallback finds the questions:
  const resilientQuestions = doc.querySelectorAll('div.css-1tfphom, div[data-testid="part-Submission_Part"]');
  assert.strictEqual(resilientQuestions.length, 2, "Resilient selector successfully finds questions via data-testid fallback");
});

test("DOM Robustness - event dispatching informs React controlled components", () => {
  const input = new MockElement("TEXTAREA", { class: "free-text" });
  input.value = "Answer text from AI";
  input.dispatchEvent({ type: "input" });
  input.dispatchEvent({ type: "change" });

  assert.strictEqual(input.value, "Answer text from AI");
  assert.ok(input.eventsDispatched.includes("input"), "Must dispatch input event for React state");
  assert.ok(input.eventsDispatched.includes("change"), "Must dispatch change event for form controllers");
});

test("DOM Robustness - content.js includes resilient fallback selectors", () => {
  const fs = require("node:fs");
  const contentCode = fs.readFileSync("dist/scripts/content.js", "utf8");
  assert.ok(
    contentCode.includes("data-testid='part-Submission_Part'"),
    "Must include data-testid fallback selector in fillQuizAnswersInDOM"
  );
});
