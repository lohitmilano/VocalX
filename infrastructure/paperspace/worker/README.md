# VocalX Worker (local / Paperspace)

This is a Python worker service that loads Meta models via 🤗 Transformers.

## Model folders (your current setup)

You currently have:

- **SAM3**: `apps/webapp/Models/SAM3/`
- **PE‑AV**: `apps/webapp/Models/SAM PE AV/`
- **SAM‑Audio**: `apps/webapp/Models/SAM Audio/` (SAM‑Audio separation checkpoint files)

> Note: PE‑AV is **not** SAM‑Audio separation; it’s embeddings used by SAM‑Audio.

The worker loads from these paths by default, or you can override:

- `VOCALX_SAM3_DIR`
- `VOCALX_PEAV_DIR`
- `VOCALX_SAM_AUDIO_DIR`

## Run locally

From repo root:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r infrastructure/paperspace/worker/requirements.txt
uvicorn infrastructure.paperspace.worker.app:app --host 0.0.0.0 --port 8000
```

Health:

- `GET http://localhost:8000/health`

Load models:

- `POST http://localhost:8000/load`

SAM‑Audio separation (local dev):

- `POST http://localhost:8000/sam_audio/separate` (multipart form)
  - `audio`: file
  - `description`: text prompt
  - `anchors_json`: optional JSON (e.g. `[[\"+\", 6.3, 7.0]]`)

## Next steps

- Add job queue + S3 download/upload flow
- Implement SAM3 video endpoints (tracking, propagation)
- Wire SAM‑Audio to full job pipeline (S3 download/upload + webhook progress)




