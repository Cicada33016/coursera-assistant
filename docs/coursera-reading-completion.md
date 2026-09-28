# Coursera Reading Completion and Supplement Materials

The **Reading Material** automation module in **Coursera Assistant** enables learners to quickly mark all reading assignments, documentation supplements, and reference articles as completed within any enrolled Coursera course.

---

## 📌 Feature Overview

Most Coursera modules interleave video lectures with reading assignments ("supplement" items). Reading items require navigating to each individual article page and clicking an acknowledgment button. 

The **Coursera reading completion** engine streamlines this workflow:

1. **Supplement Item Identification:** Scans the active course syllabus for items classified under the `supplement` or `reading` schema.
2. **Batch Progress Registration:** Communicates with Coursera's item completion endpoint to submit completion records for each detected reading item.
3. **Real-Time Notification:** Emits descriptive toast alerts informing you of the exact number of supplement items completed.

---

## 🚀 How to Use Reading Completion

1. Open your course on [Coursera](https://www.coursera.org) (at the course syllabus or outline level).
2. Click the **Coursera Assistant** icon in your browser toolbar.
3. Select the **Reading Material** action button.
4. The extension will discover all eligible reading items and process them sequentially:
   ```text
   Completing X reading items...
   ```
5. A confirmation notification will appear when the batch operation succeeds:
   ```text
   All reading materials completed successfully!
   ```
6. Refresh the page to view the updated progress checkmarks in your course overview.

---

## ⚠️ Notes & Limitations

- **Interactive Third-Party Tools:** Some reading items contain embedded third-party external tools (such as external Jupyter notebooks, external sandbox environments, or graded LTI integrations). These items require external vendor verification and cannot be marked completed via reading endpoints alone.
- **Refresh Verification:** As with video lectures, Coursera's client-side cache may take a brief moment to update visual checkmarks. Always refresh the page after running the module.

---

*Return to [Documentation Overview](../README.md#documentation) • [Coursera Automation Guide](coursera-automation.md)*
