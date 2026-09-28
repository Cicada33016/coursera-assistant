<div align="center">

# Coursera Assistant

**Made by Mayank Bisht**

[![Star on GitHub](https://img.shields.io/badge/★%20Star%20on%20GitHub-coursera--assistant-181717?style=for-the-badge&logo=github)](https://github.com/Cicada33016/coursera-assistant)
![Version](https://img.shields.io/badge/version-1.0.0-2563eb?style=for-the-badge)
![Manifest](https://img.shields.io/badge/manifest-v3-0284c7?style=for-the-badge)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-ea580c?style=for-the-badge)](https://aistudio.google.com/)
![Status](https://img.shields.io/badge/build-verified-16a34a?style=for-the-badge)

<p align="center">
  <strong>Coursera Assistant</strong> is an open-source <strong>Chrome extension for Coursera</strong> engineered to automate course progress through video completion, lecture completion, reading completion, discussion forums, Coach dialogues, and AI-assisted quiz workflows.
</p>

<p align="center">
  Built for learners seeking a reliable <strong>Coursera completion extension</strong>, <strong>Coursera video skipper</strong>, <strong>Coursera lecture completer</strong>, or all-in-one <strong>Coursera course automation</strong> companion, Coursera Assistant streamlines repetitive online course requirements while preserving complete user control.
</p>

[★ Star on GitHub](https://github.com/Cicada33016/coursera-assistant) • [Documentation](#documentation) • [Quick Start](#quick-start) • [Feature Modules](#feature-modules) • [Gemini Setup](#gemini-api-setup) • [FAQ](#troubleshooting--faq)

</div>

---

> [!NOTE]
> **Educational Reference Disclaimer:** Coursera Assistant is designed for study acceleration and practice. The AI Quiz Solver provides educational reference assistance powered by your personal Google Gemini API key. Always review answers before manual submission.

---

<a id="documentation"></a>
## 📚 Documentation

Comprehensive technical guides and usage instructions are available in the repository documentation:

- [Coursera Video Completion & Lecture Completer](docs/coursera-video-completion.md) — How the video completion and lecture skipper engines synchronize playback progress.
- [Coursera Reading Completion](docs/coursera-reading-completion.md) — Automated completion of supplement reading materials and articles.
- [Coursera Discussion Assistant](docs/coursera-discussion-assistant.md) — Forum prompt response automation with configurable delay pacing.
- [Coursera Coach Dialogue Automation](docs/coursera-coach-dialogue.md) — Interactive conversational Coach session progression and completion.
- [AI-Assisted Coursera Quiz Solver](docs/coursera-quiz-assistant.md) — DOM question parsing and Google Gemini AI solver architecture.
- [Coursera Automation Workflow](docs/coursera-automation.md) — End-to-end full-module progression strategies and technical design.
- [Troubleshooting & FAQ](docs/troubleshooting.md) — Practical solutions for progress synchronization, API keys, and setup.

---

<a id="quick-start"></a>
## ⚡ Quick Start

### Installation

1. **Download Release:** Download `Mayank-Coursera-Extension-v1.0.0.zip` from [GitHub Releases](https://github.com/Cicada33016/coursera-assistant/releases/tag/v1.0.0).
2. **Extract Archive:** Extract the ZIP file to a local directory on your drive.
3. **Open Chrome Extensions:** Open Google Chrome and navigate to `chrome://extensions/`.
4. **Enable Developer Mode:** Toggle the **Developer mode** switch located in the top-right corner.
5. **Load Unpacked:** Click **Load unpacked** and select the folder containing `manifest.json`.
6. **Pin Extension:** Click Chrome's puzzle icon and pin **Coursera Assistant** to your browser toolbar.

### Basic Usage

1. Open your enrolled course on [Coursera](https://www.coursera.org).
2. Click the **Coursera Assistant** icon in the Chrome toolbar.
3. Choose your desired action from the dashboard:
   - **Video Completion**: Synchronizes lecture video progress.
   - **Reading Material**: Marks supplemental reading items as complete.
   - **Discussion**: Submits constructive replies to course forum prompts.
   - **Dialogue**: Advances interactive Coach dialogue exercises.
   - **Solve Quiz**: Detects active quiz questions and fills evaluated answers via Gemini AI.

> [!IMPORTANT]
> **Course Synchronization Note:**
> - Large courses with dozens of lectures may occasionally require running **Video Completion** a second time.
> - Coursera's CDN edge cache may take a brief moment to update visual green checkmarks.
> - If completion is not visible immediately, **refresh the Coursera page first** (`Ctrl + F5` or `Cmd + Shift + R`).
> - If any item remains incomplete after refreshing, trigger the module again.

---

<a id="feature-modules"></a>
## 🚀 Feature Modules

### Coursera Video Completion
The **Coursera video completion** module functions as a reliable **Coursera lecture completer** and **Coursera video skipper**. It scans your course syllabus, queries Coursera's lecture metadata API to resolve internal video identifiers, and dispatches legitimate playback completion events directly to Coursera's progress endpoint. The session automatically reloads once the countdown concludes, updating your lecture status without requiring repetitive playback.
*Read the full [Coursera Video Completion Guide](docs/coursera-video-completion.md).*

### Coursera Reading Completion
The **Coursera reading completion** engine locates all text supplements, reference documentation, and reading articles across the active syllabus. It registers completion requests in batch mode with Coursera's item progress API, accompanied by real-time toast feedback so you can verify each supplement item.
*Read the full [Coursera Reading Completion Guide](docs/coursera-reading-completion.md).*

### Coursera Discussion Assistant
The **Coursera Discussion Assistant** fulfills required discussion forum prompts by submitting contextual, constructive responses. To protect your account from rate limiting and preserve natural platform interaction, the module enforces a configurable delay (default: `5000 ms`) between successive forum posts.
*Read the full [Coursera Discussion Assistant Guide](docs/coursera-discussion-assistant.md).*

### Coursera Coach Dialogue
Modern Coursera courses include multi-turn conversational AI Coach exercises. The **Coursera Coach dialogue** module connects with the embedded Coach interface, contextually progresses through conversational turns, and concludes the dialogue session natively to earn full completion credit.
*Read the full [Coursera Coach Dialogue Guide](docs/coursera-coach-dialogue.md).*

### AI-Assisted Coursera Quiz Solver
The **AI-assisted Coursera quiz solver** parses quiz draft questions directly from the page DOM (handling multiple choice, checkboxes, and text inputs), evaluates questions using Google's official Gemini AI models, and selects matching options. The extension never automatically submits the quiz; learners retain full review authority before finalizing their attempt.
*Read the full [AI Quiz Assistant Guide](docs/coursera-quiz-assistant.md).*

### Coursera Automation Workflow
Coursera Assistant offers a unified **Coursera course automation** experience by integrating video, reading, discussion, dialogue, and quiz capabilities into a single cohesive Manifest V3 extension.
*Read the full [Coursera Automation Architecture Guide](docs/coursera-automation.md).*

---

<a id="gemini-api-setup"></a>
## 🔑 Gemini API Setup

The AI Quiz Solver connects directly to the Google Gemini API. Google AI Studio currently offers a free tier with request allowances for supported models without requiring a billing account.

### Video Guide

Click the thumbnail below to view the official step-by-step setup walkthrough:

<div align="center">

[![How to Get a Free Gemini API Key](https://img.youtube.com/vi/Cl4XKgz6EJQ/hqdefault.jpg)](https://youtu.be/Cl4XKgz6EJQ?si=R0v42_WjSsnd_mEc)

**[▶ Watch Video Guide on YouTube](https://youtu.be/Cl4XKgz6EJQ?si=R0v42_WjSsnd_mEc)**

</div>

### Step-by-Step Instructions

1. **Sign In to Google AI Studio:**  
   Visit [https://aistudio.google.com/](https://aistudio.google.com/) and sign in with your Google account.
2. **Access API Keys:**  
   Click the **Get API key** tab located in the left sidebar menu.
3. **Generate Key:**  
   Click **Create API key** and select or create your Google Cloud project.
4. **Copy Your Key:**  
   Copy the generated API key string (starts with `AIzaSy...`).
5. **Configure Extension:**  
   - Open the **Coursera Assistant** popup.  
   - Click the **Gear icon (⚙️)** to open Settings (or right-click the extension icon and select **Options**).  
   - Paste your key into the **Gemini API Key** field and click **Save**.

> [!IMPORTANT]
> **Privacy Guarantee:** Your Gemini API key is stored locally in extension storage and is transmitted directly to Google's official Gemini API endpoints solely when an AI quiz action is triggered. It is never routed through third-party servers, intermediate proxies, or external analytics services.

---

<a id="supported-ai-models"></a>
## 🤖 Supported AI Models

Coursera Assistant supports Google Gemini models available via Google AI Studio:

| Model Identifier | AI Studio Tier | Recommendation | Best For |
| :--- | :--- | :--- | :--- |
| `gemini-3-flash-preview` | Free Tier Available | **Default & Recommended** | Optimal balance of speed, accuracy, and reasoning on academic questions. |
| `gemini-3.8-flash` | Free Tier Available | High Speed | High-throughput multimodal processing for long question lists. |
| `gemini-3.5-flash` | Free Tier Available | Stable Fallback | Battle-tested fallback model for standard assessments. |

*You can change your active model anytime from the extension popup or Settings.*

---

<a id="configuration--settings"></a>
## ⚙️ Configuration & Settings

Open Settings by clicking the **Gear icon (⚙️)** in the popup or navigating to `dist/settings.html`:

| Parameter | Default Value | Description |
| :--- | :--- | :--- |
| **Gemini API Key** | *(Not set)* | Personal Google AI Studio API key used for quiz question analysis. |
| **Gemini Model** | `gemini-3-flash-preview` | Selected Gemini model utilized for quiz problem evaluation. |
| **Discussion Delay** | `5000 ms` | Interval between consecutive forum submissions to maintain natural pacing. |
| **Auto Quiz** | `Off` | When enabled, automatically starts solving quizzes when you navigate to an attempt page. |

---

<a id="troubleshooting--faq"></a>
## 🛠️ Troubleshooting & FAQ

- **Checkmarks not showing after video completion?**  
  Coursera's CDN edge cache updates asynchronously. **Always refresh the Coursera page first** (`Ctrl + F5`) before running the module again.
- **Popup asks to open Coursera?**  
  The extension activates exclusively on `coursera.org`. Make sure your active browser tab is on Coursera and refresh the tab if you just installed the extension.
- **Gemini API error on quiz attempt?**  
  Verify your API key format (`AIzaSy...`) in Settings and verify your quota on Google AI Studio.

*For complete troubleshooting instructions, see the [Troubleshooting & FAQ Guide](docs/troubleshooting.md).*

---

<div align="center">

**Coursera Assistant** is developed and maintained by **Mayank Bisht** as an open-source productivity tool.  
Repository: [Cicada33016/coursera-assistant](https://github.com/Cicada33016/coursera-assistant)

> ⚠️ *Coursera Assistant is an independent open-source productivity tool developed by Mayank Bisht for educational optimization. It is not affiliated with, sponsored by, or endorsed by Coursera Inc.*

</div>
