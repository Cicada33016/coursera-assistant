# BLOCKERS — Active Blockers & Unverified State

## External Prerequisites & Unverified Constraints

1. **GitHub CLI Unauthenticated:**
   - `gh auth status` indicates no active user session.
   - Pushing context commits to GitHub remote requires valid credentials or SSH keys. If remote pushing is blocked, commits remain safe in the local Git repository.
2. **Reboot Persistence for Ollama:**
   - Startup registry key configured under `HKCU:\Software\Microsoft\Windows\CurrentVersion\Run`.
   - Conclusive verification that Ollama starts on fresh Windows sign-in requires an actual reboot/sign-in event, marked as **PENDING VERIFICATION**.
3. **Live Coursera Session Verification:**
   - End-to-end browser automation against live Coursera courses requires authenticated student credentials and an active course session, which cannot be executed automatically during offline bootstrap.
