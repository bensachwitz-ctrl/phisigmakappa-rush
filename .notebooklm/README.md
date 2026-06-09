# .notebooklm — greek-stack

Local,  NotebookLM-style context for **greek-stack**. Embeddings + chat run on host **Ollama**
(`nomic-embed-text` + `qwen2.5-coder`), so no API cost.

## Build / query this notebook
- **open-notebook**: `cd "C:\Users\Bensa\working code\oss\open-notebook"` -> docker compose up; add this project's `code`/`notes` paths (see config.json) as sources; set model provider to Ollama (`http://host.docker.internal:11434`).
- **graphify**: point it at this folder's `sources` with `nomic-embed-text`.
- **notebooklm-py**: `pip install -e ..\..\oss\notebooklm-py` then script against config.json.

Sources, models, and tool paths are in `config.json`. See vault [[_SELF-HOST-STACK]] + [[machine-inventory]].
