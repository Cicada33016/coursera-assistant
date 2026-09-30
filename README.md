<div align="center">

# Coursera Assistant

**A Chrome extension for automating repetitive Coursera course tasks.**

A streamlined browser extension that automates lecture progress, supplemental readings, discussion forum participation, Coach activities, and AI-assisted quiz workflows.

[![Star on GitHub](https://img.shields.io/badge/★%20Star%20on%20GitHub-coursera--assistant-181717?style=for-the-badge&logo=github)](https://github.com/Cicada33016/coursera-assistant)
![Version](https://img.shields.io/badge/version-1.0.0-2563eb?style=for-the-badge)
![Manifest](https://img.shields.io/badge/manifest-v3-0284c7?style=for-the-badge)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-ea580c?style=for-the-badge)](https://aistudio.google.com/)
![Status](https://img.shields.io/badge/build-verified-16a34a?style=for-the-badge)

<br>

**Built by Mayank Bisht**

<br>

[Features](#features) &nbsp;•&nbsp; [How it works](#how-it-works) &nbsp;•&nbsp; [Get Started](#get-started) &nbsp;•&nbsp; [AI Quiz Solver](#-ai-quiz-solver) &nbsp;•&nbsp; [AI Study Coach](#-coming-soon-ai-study-coach) &nbsp;•&nbsp; [FAQ](#-troubleshooting) &nbsp;•&nbsp; [Docs](#-documentation)

</div>

---

<div align="center">

### 🎥 See Coursera Assistant in Action

A quick walkthrough of the extension's core features and workflow. Click👇

<br>

[![Coursera Assistant Demo Video](https://img.youtube.com/vi/dAG7kG4mE8s/maxresdefault.jpg)](https://youtu.be/dAG7kG4mE8s?si=u6_M0pvs3rbzqpNX)

</div>

---

## What is Coursera Assistant?

Coursera Assistant is a lightweight Google Chrome extension designed to help students navigate online courses with less friction. It handles routine course actions that consume unnecessary study time—such as waiting out video playback timers, acknowledging short reading pages, submitting required discussion prompts, and stepping through structured Coach dialogues.

You maintain full control over every action. The extension runs only when explicitly triggered, and its AI features serve as an educational study aid. When working on graded quizzes, suggested answers are presented for your review—assessments are never automatically submitted without your manual confirmation.

---

<a id="features"></a>
## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🎥 Video Completion</h3>
      <p>Complete eligible lecture video progress automatically without manual scrub timers.</p>
    </td>
    <td width="50%" valign="top">
      <h3>📖 Reading Completion</h3>
      <p>Mark supplemental course articles and reference readings as complete.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>💬 Discussion Assistant</h3>
      <p>Handle required discussion forum replies with configurable delay intervals.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🤖 Coach Dialogue</h3>
      <p>Progress through interactive AI Coach activities and guided multi-turn prompts.</p>
    </td>
  </tr>
  <tr>
    <td colspan="2" valign="top">
      <h3>🧠 AI Quiz Solver</h3>
      <p>Analyze active quiz questions using Google Gemini and review suggested answers directly on the page.</p>
    </td>
  </tr>
</table>

---

<a id="how-it-works"></a>
## How it works

<table>
  <tr>
    <th width="50%">Course Tasks</th>
    <th width="50%">Quiz Assistance</th>
  </tr>
  <tr>
    <td align="center" valign="top">
      <br>
      <strong>Open Coursera</strong><br>
      ↓<br>
      <strong>Open Coursera Assistant</strong><br>
      ↓<br>
      <strong>Choose a feature</strong><br>
      ↓<br>
      <strong>Run</strong>
      <br><br>
    </td>
    <td align="center" valign="top">
      <br>
      <strong>Open quiz</strong><br>
      ↓<br>
      <strong>Let Gemini analyze it</strong><br>
      ↓<br>
      <strong>Review suggested answers</strong><br>
      ↓<br>
      <strong>Submit yourself</strong>
      <br><br>
    </td>
  </tr>
</table>

---

<a id="get-started"></a>
## Get Started

### 01 · Download
[Download the latest release package](https://github.com/Cicada33016/coursera-assistant/releases/latest) (`Mayank-Coursera-Extension-v1.0.0.zip`).

### 02 · Extract
Unzip the downloaded `.zip` file on your computer.

### 03 · Open Chrome Extensions
Open Google Chrome and navigate to:
```text
chrome://extensions
```

### 04 · Enable Developer Mode
Turn on the **Developer mode** toggle in the top-right corner.

### 05 · Load the extension
Click **Load unpacked** in the top-left corner and select the extracted project folder.

### 06 · Pin it
Click the puzzle icon (🧩) in the Chrome toolbar and pin **Coursera Assistant** for quick access.

---

### First use

**Coursera → Extension → Choose feature → Run**

---

<a id="ai-quiz-solver"></a>
## 🧠 AI Quiz Solver

> Uses Google Gemini to analyze active Coursera quiz questions and suggest answers before you submit.

**Supported formats:**  
`Multiple choice` &nbsp;·&nbsp; `Checkboxes` &nbsp;·&nbsp; `Text input`

> **You remain in control.**  
> Answers are suggested on the page for your review. The extension does not automatically submit the quiz.

---

<a id="ai-study-coach"></a>
## 🔮 Coming Soon: AI Study Coach

> The current Quiz Solver helps answer questions. The next step is helping students understand them.

<div align="center">

**Solve &nbsp;→&nbsp; Understand &nbsp;→&nbsp; Practice &nbsp;→&nbsp; Prepare**

</div>

<table>
  <tr>
    <td width="25%" valign="top">
      <strong>Explain</strong><br>
      Understand why an answer is correct.
    </td>
    <td width="25%" valign="top">
      <strong>Identify</strong><br>
      Find recurring weak areas.
    </td>
    <td width="25%" valign="top">
      <strong>Practice</strong><br>
      Generate targeted questions.
    </td>
    <td width="25%" valign="top">
      <strong>Prepare</strong><br>
      Turn previous questions into revision material.
    </td>
  </tr>
</table>

---

## 🔑 Enable AI Features

> The AI Quiz Solver uses your own Google Gemini API key.

1. **Open Google AI Studio:** Visit [Google AI Studio](https://aistudio.google.com/) and sign in with your Google account.
2. **Create an API key:** Click **Get API key** → **Create API key** *(free tier available, no billing required)*.
3. **Copy the key:** Copy the generated API key string.
4. **Paste into Settings:** Open the extension popup, click the **Gear icon (⚙️)**, paste your key, and click **Save**.

<div align="center">

[![How to Get a Free Gemini API Key](https://img.youtube.com/vi/Cl4XKgz6EJQ/hqdefault.jpg)](https://youtu.be/Cl4XKgz6EJQ?si=R0v42_WjSsnd_mEc)

**[▶ Watch 1-Minute Video Guide on YouTube](https://youtu.be/Cl4XKgz6EJQ?si=R0v42_WjSsnd_mEc)**

</div>

---

## 🔒 Privacy

Your Gemini API key is stored locally in your browser via `chrome.storage.local`. When you trigger the AI Quiz Solver, question text is sent directly to Google's official Gemini API endpoints to generate suggestions. The extension does not operate intermediate servers, relay proxies, or external analytics services.

---

## ⚙️ Settings

Configure extension preferences through the popup gear icon (⚙️) or Options page:

| Setting | Purpose | Default |
| :--- | :--- | :--- |
| **Gemini API Key** | Connect AI quiz features | *(None)* |
| **Gemini Model** | Choose the active Gemini model | `gemini-3-flash-preview` |
| **Discussion Delay** | Control the wait time between forum posts | `5000 ms` |
| **Auto Quiz** | Automatically initiate quiz assistance on load | `Off` |

---

<a id="troubleshooting"></a>
## 🛠️ Troubleshooting

**Videos not updated**  
Coursera updates completion status asynchronously. Refresh the page (`Ctrl + F5`) and run the feature again if needed.

**Extension asks you to open Coursera**  
Ensure your active browser tab is on `coursera.org`. Refresh the tab once if the extension was just installed.

**Gemini error**  
Verify your API key in Settings. If a `503 Service Unavailable` occurs, Google's API servers are temporarily busy—wait a few minutes and try again.

**More troubleshooting → [Troubleshooting & FAQ Guide](docs/troubleshooting.md)**

---

<a id="documentation"></a>
## 📚 Documentation

Comprehensive architectural specifications and module guides are maintained in the repository:

| Guide | Scope | Resource |
| :--- | :--- | :--- |
| **Feature Documentation** | In-depth module guides for videos, readings, discussions, and coach | [`docs/`](docs/) |
| **Troubleshooting & FAQ** | Common issues, edge cases, and resolution steps | [`docs/troubleshooting.md`](docs/troubleshooting.md) |
| **Developer Documentation** | System architecture, quiz evaluation flow, and automation lifecycle | [`docs/coursera-automation.md`](docs/coursera-automation.md) |

---

## About

**Coursera Assistant** is an independent open-source productivity tool developed by **Mayank Bisht**.

> **Disclaimer:** Coursera Assistant is developed independently for educational productivity and reference. It is not affiliated with, sponsored by, or endorsed by Coursera Inc.

[GitHub Repository](https://github.com/Cicada33016/coursera-assistant) &nbsp;•&nbsp; [MIT License](LICENSE)
