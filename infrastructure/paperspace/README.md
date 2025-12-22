# Paperspace (GPU Processing) – VocalX

This folder is for the GPU processing engine that will run on Paperspace.

## Where to put model files

Do **not** put large model files in git.

Place your weights locally here (ignored by git):

- `infrastructure/paperspace/models/sam-audio/`
- `infrastructure/paperspace/models/sam3/`

Recommended filenames (adjust to your actual files):

- **SAM-Audio**: `infrastructure/paperspace/models/sam-audio/model.pt` (or `.pth/.safetensors`)
- **SAM3**: `infrastructure/paperspace/models/sam3/model.pt`

In production, these should be either:
- baked into the Paperspace Docker image, or
- stored in S3 and downloaded onto the Paperspace VM at job start, or
- stored on a persistent Paperspace volume.

## Notes
- The Next.js webapp **does not need** the model weights locally.
- The webapp only submits jobs + stores metadata; the worker does inference.


