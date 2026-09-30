<div align="center">

# Coursera Assistant

### Automate repetitive Coursera tasks. Study more, click less.

<p align="center">
  A Chrome extension that helps complete repetitive Coursera tasks like lectures, readings, discussions, Coach activities, and quizzes.
</p>

[![Star on GitHub](https://img.shields.io/badge/★%20Star%20on%20GitHub-coursera--assistant-181717?style=for-the-badge&logo=github)](https://github.com/Cicada33016/coursera-assistant)
![Version](https://img.shields.io/badge/version-1.0.0-2563eb?style=for-the-badge)
![Manifest](https://img.shields.io/badge/manifest-v3-0284c7?style=for-the-badge)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-ea580c?style=for-the-badge)](https://aistudio.google.com/)
![Status](https://img.shields.io/badge/build-verified-16a34a?style=for-the-badge)

<br>

**Built by Mayank Bisht**

</div>

---

## What can it do?

| | Feature | What it does |
| :---: | :--- | :--- |
| 🎥 | **Videos** | Complete lecture progress |
| 📖 | **Readings** | Complete reading material |
| 💬 | **Discussions** | Handle required discussions |
| 🤖 | **Coach** | Complete Coach activities |
| 🧠 | **Quiz Solver** | Get AI-assisted quiz answers |

---

## How to use it

**Open Coursera → Open Extension → Choose a task → Done**

For quizzes:

**Open Quiz → Solve with AI → Review → Submit**

> **You stay in control:** The extension suggests answers, but **never automatically submits quizzes**. You review and submit every attempt yourself.

---

## Get Started

**1. Download**  
[Download the latest release](https://github.com/Cicada33016/coursera-assistant/releases/latest).

**2. Extract**  
Unzip the downloaded `.zip` file.

**3. Open Chrome Extensions**  
Go to `chrome://extensions` in your browser.

**4. Enable Developer Mode**  
Toggle the switch in the top-right corner.

**5. Load Unpacked**  
Click **Load unpacked** and select the extracted folder.

**6. Pin Coursera Assistant**  
Click Chrome's puzzle icon (🧩) and pin it to your toolbar.

---

### First use

**Coursera → Extension → Choose feature → Run**

---

## 🧠 AI Quiz Solver

> Uses Google Gemini to analyze quiz questions and suggest answers.

**Supports**
* Multiple choice
* Checkboxes
* Text input

**You stay in control**
* Review the answer
* Submit the quiz yourself

---

## 🔮 Coming Soon: AI Study Coach

### Solve → Understand → Practice → Prepare

> Turn solved quiz questions into explanations, targeted practice, and exam preparation.

* **Explain** → Understand why
* **Identify** → Find weak areas
* **Practice** → Generate targeted questions
* **Prepare** → Review before exams

---

## 🔑 Enable AI Quiz Solver

**1. Get a Gemini API key** — Free from [Google AI Studio](https://aistudio.google.com/) (no credit card needed).  
**2. Open Coursera Assistant Settings** — Click the gear icon (⚙️) in the popup.  
**3. Paste the key** — Add it to the Gemini API Key field.  
**4. Save** — Click Save.

<div align="center">

[![How to Get a Free Gemini API Key](https://img.youtube.com/vi/Cl4XKgz6EJQ/hqdefault.jpg)](https://youtu.be/Cl4XKgz6EJQ?si=R0v42_WjSsnd_mEc)

**[▶ Watch 1-Minute Video Guide on YouTube](https://youtu.be/Cl4XKgz6EJQ?si=R0v42_WjSsnd_mEc)**

</div>

---

## 🔒 Privacy

> Your Gemini API key is stored locally and sent directly to Google's Gemini API when AI features are used.

---

## ⚙️ Settings

| Setting | Description | Default |
| :--- | :--- | :--- |
| **Gemini API Key** | Your personal Google AI Studio key | *(None)* |
| **Gemini Model** | AI model for quiz evaluation | `gemini-3-flash-preview` |
| **Discussion Delay** | Wait time between forum posts | `5000 ms` |
| **Auto Quiz** | Automatically start quiz assistance | `Off` |

---

## 🛠️ Troubleshooting

### ❌ Videos not updated
Refresh Coursera and run again.

### ❌ Extension says "Open Coursera"
Make sure the active tab is on Coursera.

### ❌ Gemini error
Check your API key and try again later.

---

## 📚 More Documentation

* [Feature Guides & Module Specs](docs/)
* [Troubleshooting & FAQ](docs/troubleshooting.md)
* [Developer Architecture](docs/coursera-automation.md)

---

<div align="center">

**Coursera Assistant** is an independent open-source productivity tool developed by **Mayank Bisht**.  
It is not affiliated with, sponsored by, or endorsed by Coursera Inc.

[GitHub Repository](https://github.com/Cicada33016/coursera-assistant) • MIT License

</div>
