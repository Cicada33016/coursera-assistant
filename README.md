<div align="center">

# Coursera Assistant

**By Mayank Bisht**

![Version](https://img.shields.io/badge/version-1.0.0-2563eb?style=for-the-badge)
![Manifest](https://img.shields.io/badge/manifest-v3-0284c7?style=for-the-badge)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-ea580c?style=for-the-badge)](https://aistudio.google.com/)
![Status](https://img.shields.io/badge/build-verified-16a34a?style=for-the-badge)

<p align="center">
  <strong>An intuitive, high-performance Chrome extension designed to streamline Coursera lecture videos, reading assignments, discussion forum participation, interactive dialogues, and AI-assisted quiz workflows.</strong>
</p>

[Quick Start](#quick-start) • [Features](#core-features) • [Gemini API Setup](#gemini-api-setup) • [AI Models](#supported-ai-models) • [Settings](#configuration--settings)

</div>

---

> [!NOTE]
> **Educational Reference Disclaimer:** The AI Quiz Solver is designed to provide reference assistance powered by your personal Google Gemini API key. All generated responses are intended for study and practice; always review your answers before submitting.

---

<a id="quick-start"></a>
## ⚡ Quick Start

### Installation

1. **Download or Clone:** Download this repository or extract the release archive to your local drive.
2. **Open Chrome Extensions:** Navigate to `chrome://extensions/` in your browser.
3. **Enable Developer Mode:** Toggle the **Developer mode** switch in the top-right corner.
4. **Load Extension:** Click **Load unpacked** and select the folder containing `manifest.json`.
5. **Pin to Toolbar:** Click the puzzle icon in Chrome and pin **Coursera Assistant** for convenient access.

### Usage

1. Open any course page on [Coursera](https://www.coursera.org).
2. Click the **Coursera Assistant** icon in your toolbar to open the control dashboard.
3. Select your desired automation module:
   - **Video Completion**: Completes course video lectures and synchronizes viewing progress.
   - **Reading Material**: Marks supplemental reading materials as completed.
   - **Discussion**: Generates and posts contextual, constructive responses to forum prompts.
   - **Dialogue**: Automates and concludes interactive multi-turn Coach dialogue items.
   - **Solve Quiz**: Detects active quiz draft questions and fills answers using Gemini AI.

> [!IMPORTANT]
> **Important Note:**
> - Large courses may occasionally require running **Video Completion** again.
> - Coursera may take some time to reflect completed items.
> - If completion is not visible immediately, **Refresh the Coursera page first** and check again.
> - If it is still incomplete after refreshing, run **Video Completion** again.

---

<a id="gemini-api-setup"></a>
## 🔑 Gemini API Setup

The AI Quiz Solver connects directly to the Google Gemini API. Google offers a **free tier** with generous request allowances—no billing account or credit card required.

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
> **Privacy Guarantee:** Your Gemini API key is stored locally in extension storage and is transmitted to Google Gemini solely when an AI quiz action is triggered. It is never routed through third-party servers, intermediate proxies, or external analytics services.

---

<a id="core-features"></a>
## 🚀 Core Features

| Module | Purpose | Implementation Details |
| :--- | :--- | :--- |
| **Video Completion** | Course Video Lectures | Queries the course syllabus, dispatches playback events to Coursera's progress API, and verifies completed status. |
| **Reading Material** | Supplement Completion | Identifies supplement items, submits completion requests via Coursera's API, and provides real-time toast feedback. |
| **Discussion** | Forum Responses | Locates unanswered forum prompts and posts constructive answers with configurable pacing delay to preserve natural interaction. |
| **Coach Dialogue** | Interactive Sessions | Engages in contextual conversational exchanges with Coursera's Coach widget and completes the session natively. |
| **AI Quiz Solver** | Quiz Assistance | Reads quiz questions directly from the page DOM, evaluates them via Gemini AI, selects options, and tracks status in a dedicated progress window. |

---

<a id="supported-ai-models"></a>
## 🤖 Supported AI Models

Coursera Assistant supports the official free-tier Google Gemini model lineup:

| Model Identifier | Tier | Recommendation |
| :--- | :--- | :--- |
| `gemini-3-flash-preview` | Free Tier | **Default & Recommended** — Optimal balance of speed, accuracy, and reasoning. |
| `gemini-3.8-flash` | Free Tier | High-throughput multimodal model for rapid question processing. |
| `gemini-3.5-flash` | Free Tier | Stable, battle-tested fallback model. |

*You can change your active model anytime from the extension popup or the Settings interface.*

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

<div align="center">

> ⚠️ *Coursera Assistant is an independent open-source productivity tool developed by Mayank Bisht for educational optimization. It is not affiliated with, sponsored by, or endorsed by Coursera Inc.*

</div>
