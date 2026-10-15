# ADR-002: Infimium Local Memory and Semantic Retrieval Architecture

## Status
Accepted

## Context
Engineering agents need rapid, token-efficient semantic retrieval of symbols, documentation, and architecture without re-reading thousands of lines on every turn. Local memory must respect privacy, run offline, and persist across chats and IDE restarts.

## Decision
We utilize **Infimium** integrated with local **Ollama** embeddings:
1. **Embedding Provider:** Ollama running locally at `http://127.0.0.1:11434` with model `nomic-embed-text:latest` (768-dimensional dense vectors).
2. **Vector & Graph Storage:** Embedded SQLite vector store at `C:\Users\mayan\.infimium\data\vectors.db` and relational dependency graph.
3. **Workspace Configuration:** `infimium.workspace.json` in project root defines the project identity (`coursera-assistant`) and scopes indexing to prevent cross-project contamination.
4. **Parser Fallback:** To ensure stability on Windows with Smart App Control (which blocks unsigned native C++ addons like `@sengac/tree-sitter`), Infimium utilizes lazy-loading and falls back to WASM-based parsers (`web-tree-sitter`).
5. **Persistence:** Work is tracked via `project_memory` snapshots and episodic context checkpoints (`infimium update`).

## Consequences
- **Positive:** Zero cloud token costs for code search, sub-millisecond local vector retrieval, complete data privacy, durable cross-session memory.
- **Negative:** Requires local Ollama background process to be running; initial GPU/Vulkan discovery introduces a ~20s warmup on startup.
