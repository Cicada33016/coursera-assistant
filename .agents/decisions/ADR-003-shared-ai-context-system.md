# ADR-003: Shared AI Context & Continuity System

## Status
Accepted

## Context
AI agents operating across different platforms (Google Antigravity IDE, OpenAI ChatGPT, Claude Code) suffer from context drift and transient conversation memory. The project requires a shared, durable source of truth that allows any model or human engineer to resume work seamlessly.

## Decision
We establish a repository-backed context architecture with strict precedence:
1. **Source of Truth Hierarchy:**
   - Level 1: Verified source code and Git working tree.
   - Level 2: Canonical state files (`.agents/state/NOW.md`, `CURRENT.md`, `NEXT.md`, `BLOCKERS.md`).
   - Level 3: Fresh-session briefing (`AI_CONTEXT.md`).
   - Level 4: Architecture Decision Records (`.agents/decisions/`).
   - Level 5: Infimium semantic index and episodic memory.
   - Level 6: Conversation chat history.
2. **Context Compilation:** `AI_CONTEXT.md` provides a concise, high-signal briefing directly readable by any AI at the start of a session.
3. **Synchronization Protocol:** Context files and code are committed together. Synchronizing with GitHub remote provides durability across machines and chat interfaces.

## Consequences
- **Positive:** Immune to conversation context wiping, reproducible development state, explicit documentation of progress and blockers.
- **Negative:** Requires disciplined updates to state files on milestone completion.
