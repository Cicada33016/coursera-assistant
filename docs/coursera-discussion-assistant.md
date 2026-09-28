# Coursera Discussion Assistant and Forum Automation

The **Discussion Assistant** module in **Coursera Assistant** helps learners complete mandatory discussion prompt requirements across Coursera course forums with natural pacing and constructive contributions.

---

## 📌 Feature Overview

Many Coursera courses require peer discussion forum participation before unlocking subsequent modules or satisfying course completion criteria. Manually locating forum prompts, opening discussion threads, and submitting replies can be time-consuming.

The **Discussion Assistant** automates this process:

1. **Prompt Discovery:** Locates active discussion prompt items within the current course week or syllabus.
2. **Contextual Response Generation:** Generates coherent, constructive contributions relevant to the course subject matter.
3. **Paced Submission:** Submits replies via Coursera's official discussion forum API while enforcing a configurable inter-request delay (default: `5000 ms`) to prevent rate-limiting and maintain natural interaction intervals.

---

## 🚀 How to Use Discussion Automation

1. Navigate to your Coursera course outline or week overview page.
2. Click the **Coursera Assistant** icon in your browser toolbar.
3. Click the **Discussion** button.
4. The extension will identify unanswered discussion prompts in your course and submit constructive responses.
5. Toast notifications in the bottom corner will keep you updated on progress:
   ```text
   Submitting discussion response (1 of 3)...
   ```
6. Once complete, refresh the forum or week outline to verify your submissions.

---

## ⚙️ Configuring Submission Delay

To ensure your forum activity adheres to Coursera's standard rate-limits and behaves naturally, you can customize the submission delay in Settings:

1. Click the **Settings (⚙️)** gear icon in the extension popup.
2. Under **Discussion Delay**, select your preferred duration:
   - `3000 ms` (Faster)
   - `5000 ms` (**Default & Recommended**)
   - `10000 ms` (Conservative)
3. Click **Save Settings**.

---

## 🛡️ Academic & Community Guidelines

- **Constructive Engagement:** Discussion automation is designed to fulfill administrative completion criteria on introductory forum prompts.
- **Substantive Inquiries:** For substantive academic questions, peer reviews, or technical inquiries requiring human feedback, learners should participate directly in the course discussion forums.

---

*Return to [Documentation Overview](../README.md#documentation) • [Coursera Automation Guide](coursera-automation.md)*
