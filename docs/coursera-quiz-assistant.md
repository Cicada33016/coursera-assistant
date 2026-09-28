# AI-Assisted Coursera Quiz Solver with Google Gemini

The **AI Quiz Solver** in **Coursera Assistant** provides an intelligent, automated study assistant designed to parse quiz draft questions directly from the Coursera page DOM, evaluate them using Google's official Gemini AI models, and fill answer options automatically.

---

## 📌 Architecture & Design Philosophy

The Coursera Assistant AI Quiz Solver is built around educational assistance and human-in-the-loop review:

1. **Direct DOM Question Parsing:** Scans the active quiz draft page for question prompts, code snippets, multiple-choice options, multi-select checkboxes, and free-response fields.
2. **GraphQL State Interception:** Uses an isolated MAIN-world interceptor (`interceptor.js`) to capture Coursera's raw quiz attempt payload (`querystate`), guaranteeing full fidelity of mathematical notation and tabular questions.
3. **Structured Gemini Evaluation:** Dispatches questions with a low-temperature prompt (`temperature: 0.1`) requesting strict JSON-formatted answers with clear rationales.
4. **Automated Option Selection:** Emits synthetic click and input events on matching DOM elements to select the evaluated answers.
5. **Human Review Requirement:** The extension **never** clicks the final "Submit" button automatically. You always retain complete control to review the filled answers and their rationales before final submission.

---

## 🔑 Getting Your Google Gemini API Key

The quiz solver connects directly to Google AI Studio. Google provides a generous free tier for developers and personal projects without requiring credit cards or billing setups.

### Step-by-Step Setup
1. Visit [Google AI Studio](https://aistudio.google.com/) and sign in with your Google account.
2. Click **Get API key** in the left sidebar navigation.
3. Click **Create API key** and select or create a Google Cloud project.
4. Copy the generated API key (format: `AIzaSy...`).
5. Open the **Coursera Assistant** popup in Chrome, click the **Gear icon (⚙️)** to open Settings, paste your key into the **Gemini API Key** field, and click **Save Settings**.

---

## 🤖 Supported Gemini Models

| Model Identifier | AI Studio Tier | Recommendation | Description |
| :--- | :--- | :--- | :--- |
| `gemini-3-flash-preview` | Free Tier Available | **Default & Recommended** | State-of-the-art reasoning, lightning fast, highly accurate on academic quizzes. |
| `gemini-3.8-flash` | Free Tier Available | High Speed | Optimized for high-throughput evaluation of lengthy multiple-choice assessments. |
| `gemini-3.5-flash` | Free Tier Available | Stable Fallback | Battle-tested fallback model for standard general-knowledge questions. |

*You can switch models anytime from the extension popup dropdown or Settings page.*

---

## 🚀 How to Solve a Quiz

1. Open your Coursera quiz or assignment attempt page (e.g. `https://www.coursera.org/learn/.../exam/...`).
2. Click the **Coursera Assistant** extension icon.
3. Click the **Solve Quiz** button (or let Auto Quiz trigger if enabled in Settings).
4. A dedicated progress overlay will open:
   - Displays real-time question evaluation status.
   - Shows answered question count and Gemini response status.
5. Review each filled response on your quiz page.
6. When satisfied, click Coursera's official **Submit** button yourself.

---

## 🛡️ Privacy & Security Guarantee

- **Direct Transmission:** Your API key is stored locally in Chrome extension storage (`chrome.storage.local`) and is transmitted directly to Google's official Gemini endpoint (`https://generativelanguage.googleapis.com`).
- **Zero Intermediate Servers:** No quiz questions, student identifiers, or API credentials are ever routed through third-party servers, intermediate proxies, or external analytics services.

---

*Return to [Documentation Overview](../README.md#documentation) • [Coursera Automation Guide](coursera-automation.md)*
