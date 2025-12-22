import os
from dataclasses import dataclass
from typing import Any, Optional

import numpy as np
from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
import io
from PIL import Image


def _env(name: str, default: Optional[str] = None) -> Optional[str]:
    v = os.environ.get(name)
    return v.strip() if v and v.strip() else default


@dataclass
class ModelPaths:
    sam3_dir: str
    peav_dir: str
    sam_audio_dir: str


def _first_existing_dir(*candidates: str) -> Optional[str]:
    for p in candidates:
        if p and os.path.isdir(p):
            return p
    return None


def get_model_paths() -> ModelPaths:
    """
    NOTE:
    - apps/webapp/Models/SAM3 is SAM3
    - apps/webapp/Models/SAM PE AV is PE-AV
    - apps/webapp/Models/SAM Audio is SAM-Audio separation
    """
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    models_root = os.path.join(repo_root, "apps", "webapp", "Models")
    default_sam3 = os.path.join(models_root, "SAM3")
    default_peav_new = os.path.join(models_root, "SAM PE AV")
    default_peav_old = os.path.join(models_root, "SAM")
    default_sam_audio = os.path.join(models_root, "SAM Audio")

    peav_dir = _first_existing_dir(default_peav_new, default_peav_old) or default_peav_new
    return ModelPaths(
        sam3_dir=_env("VOCALX_SAM3_DIR", default_sam3) or default_sam3,
        peav_dir=_env("VOCALX_PEAV_DIR", peav_dir) or peav_dir,
        sam_audio_dir=_env("VOCALX_SAM_AUDIO_DIR", default_sam_audio) or default_sam_audio,
    )


app = FastAPI(title="VocalX Worker (Local)", version="0.1.0")


_models: dict[str, Any] = {}


def _load_sam3():
    try:
        from transformers import Sam3Model, Sam3Processor
    except Exception as e:
        raise RuntimeError(
            "SAM3 is not available via your installed `transformers` build. "
            "You likely need the official SAM3 python package (per Meta docs) or a custom build that provides Sam3Model/Sam3Processor. "
            f"Import error: {e}"
        )
    import torch

    paths = get_model_paths()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if not os.path.isdir(paths.sam3_dir):
        raise RuntimeError(f"SAM3 model directory not found: {paths.sam3_dir}")
    model = Sam3Model.from_pretrained(paths.sam3_dir).to(device)
    processor = Sam3Processor.from_pretrained(paths.sam3_dir)
    model.eval()
    return {"model": model, "processor": processor, "device": device}


def _load_peav():
    # PE-AV model (not SAM-Audio)
    try:
        from transformers import PeAudioVideoModel, PeAudioVideoProcessor
    except Exception as e:
        raise RuntimeError(
            "PE-AV is not available via your installed `transformers` build. "
            "You likely need the official PE-AV python package / model code (per Meta SAM-Audio docs) or a custom build that provides PeAudioVideoModel/PeAudioVideoProcessor. "
            f"Import error: {e}"
        )
    import torch

    paths = get_model_paths()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if not os.path.isdir(paths.peav_dir):
        raise RuntimeError(f"PE-AV model directory not found: {paths.peav_dir}")
    model = PeAudioVideoModel.from_pretrained(paths.peav_dir).to(device)
    processor = PeAudioVideoProcessor.from_pretrained(paths.peav_dir)
    model.eval()
    return {"model": model, "processor": processor, "device": device}


def _load_sam_audio():
    """
    SAM-Audio separation.

    Meta docs: `from sam_audio import SAMAudio, SAMAudioProcessor`.
    We load weights from a local folder (apps/webapp/Models/SAM Audio) via `.from_pretrained(<folder>)`.
    """
    import torch
    try:
        import psutil  # type: ignore
    except Exception:
        psutil = None

    paths = get_model_paths()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if not os.path.isdir(paths.sam_audio_dir):
        raise RuntimeError(f"SAM-Audio model directory not found: {paths.sam_audio_dir}")

    # Folder exists but is empty: fail early with a helpful message.
    has_any_files = any(True for _ in os.scandir(paths.sam_audio_dir))
    if not has_any_files:
        raise RuntimeError(
            f"SAM-Audio model directory is empty: {paths.sam_audio_dir}. "
            "Please put the SAM-Audio checkpoint files here (e.g. model.safetensors + config files)."
        )

    try:
        from sam_audio import SAMAudio, SAMAudioProcessor  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "Missing Python package `sam_audio` required for SAM-Audio separation. "
            "Install it in the worker venv and restart the worker. "
            f"Import error: {e}"
        )

    # Guardrail: SAM-Audio model load can exceed ~8GB RSS and may get OOM-killed in constrained envs
    # (especially WSL default memory limits). Fail fast with an actionable message instead of crashing.
    if psutil is not None:
        vm = psutil.virtual_memory()
        avail_gb = vm.available / (1024**3)
        total_gb = vm.total / (1024**3)
        # Empirically, the process can exceed ~7.5GB RSS on load. Be conservative.
        min_avail_gb = float(os.environ.get("VOCALX_MIN_SAM_AUDIO_AVAIL_GB", "10"))
        if avail_gb < min_avail_gb:
            raise RuntimeError(
                "Insufficient RAM to load SAM-Audio in this environment. "
                f"Available: {avail_gb:.1f}GB (total {total_gb:.1f}GB). "
                f"Need ~{min_avail_gb:.0f}GB available to avoid OOM. "
                "Fix: increase WSL2 memory/swap (or run the worker on a bigger machine / GPU cloud). "
                "You can override the threshold with VOCALX_MIN_SAM_AUDIO_AVAIL_GB."
            )

    model = SAMAudio.from_pretrained(paths.sam_audio_dir).to(device).eval()
    processor = SAMAudioProcessor.from_pretrained(paths.sam_audio_dir)
    return {"model": model, "processor": processor, "device": device}


@app.get("/health")
def health():
    paths = get_model_paths()
    return {
        "ok": True,
        "models_loaded": sorted(_models.keys()),
        "paths": {
            "sam3_dir": paths.sam3_dir,
            "peav_dir": paths.peav_dir,
            "sam_audio_dir": paths.sam_audio_dir,
        },
    }


@app.post("/load")
def load_models(
    load_sam3: bool = True,
    load_peav: bool = True,
    load_sam_audio: bool = False,
    body: Optional[dict[str, Any]] = Body(default=None),
):
    # Allow JSON body usage (the webapp calls this endpoint with JSON).
    if body:
        load_sam3 = bool(body.get("load_sam3", load_sam3))
        load_peav = bool(body.get("load_peav", load_peav))
        load_sam_audio = bool(body.get("load_sam_audio", load_sam_audio))

    loaded: list[str] = []
    errors: dict[str, str] = {}
    if load_sam3 and "sam3" not in _models:
        try:
            _models["sam3"] = _load_sam3()
            loaded.append("sam3")
        except Exception as e:
            errors["sam3"] = str(e)
    if load_peav and "peav" not in _models:
        try:
            _models["peav"] = _load_peav()
            loaded.append("peav")
        except Exception as e:
            errors["peav"] = str(e)
    if load_sam_audio and "sam_audio" not in _models:
        try:
            _models["sam_audio"] = _load_sam_audio()
            loaded.append("sam_audio")
        except Exception as e:
            errors["sam_audio"] = str(e)

    return {
        "ok": len(errors) == 0,
        "loaded": loaded,
        "errors": errors,
        "models_loaded": sorted(_models.keys()),
    }


@app.post("/sam3/image")
async def sam3_image_segment(
    image: UploadFile = File(...),
    text: str = Form(...),
    threshold: float = Form(0.5),
    mask_threshold: float = Form(0.5),
):
    """
    Basic SAM3 image PCS: text prompt -> instance masks + boxes + scores.
    Returns counts + low-res masks as packed uint8 arrays for now (not PNG).
    """
    if "sam3" not in _models:
        try:
            _models["sam3"] = _load_sam3()
        except Exception as e:
            raise HTTPException(status_code=503, detail=str(e))

    m = _models["sam3"]
    model = m["model"]
    processor = m["processor"]
    device = m["device"]

    raw = await image.read()
    pil = Image.open(io.BytesIO(raw)).convert("RGB")

    inputs = processor(images=pil, text=text, return_tensors="pt").to(device)

    import torch

    with torch.no_grad():
        outputs = model(**inputs)

    results = processor.post_process_instance_segmentation(
        outputs,
        threshold=threshold,
        mask_threshold=mask_threshold,
        target_sizes=inputs.get("original_sizes").tolist(),
    )[0]

    masks = results["masks"]
    boxes = results["boxes"]
    scores = results["scores"]

    # Convert masks to compact list of uint8 arrays (0/1)
    masks_np = masks.cpu().numpy().astype(np.uint8)
    boxes_np = boxes.cpu().numpy().astype(np.float32)
    scores_np = scores.cpu().numpy().astype(np.float32)

    return {
        "ok": True,
        "prompt": text,
        "num_objects": int(masks_np.shape[0]),
        "boxes": boxes_np.tolist(),
        "scores": scores_np.tolist(),
        "mask_shapes": [list(m.shape) for m in masks_np],
        "masks": masks_np.tolist(),  # NOTE: large; replace with RLE/PNG later
    }


# NOTE: For true "SAM-Audio" separation, we still need the correct SAM-Audio weights + API.
# apps/webapp/Models/SAM PE AV is PE-AV (embeddings), not SAM-Audio separation.


@app.post("/sam_audio/separate")
async def sam_audio_separate(
    audio: UploadFile = File(...),
    description: str = Form(""),
    anchors_json: str = Form(""),
    reranking_candidates: int = Form(0),
    predict_spans: bool = Form(False),
):
    """
    Local dev separation endpoint.

    Returns JSON with base64 WAVs (target + residual) when torchaudio is available;
    otherwise returns float arrays (very large) as a fallback.
    """
    import base64
    import json
    import tempfile

    import torch

    if "sam_audio" not in _models:
        _models["sam_audio"] = _load_sam_audio()

    m = _models["sam_audio"]
    model = m["model"]
    processor = m["processor"]
    device = m["device"]

    raw = await audio.read()
    if not raw:
        return {"ok": False, "error": "Empty upload"}

    anchors = None
    if anchors_json and anchors_json.strip():
        anchors = json.loads(anchors_json)

    suffix = os.path.splitext(audio.filename or "")[1] or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name

    try:
        kwargs: dict[str, Any] = {
            "audios": [tmp_path],
            "descriptions": [description or ""],
        }
        if anchors is not None:
            kwargs["anchors"] = [anchors]

        inputs = processor(**kwargs).to(device)

        separate_kwargs: dict[str, Any] = {"predict_spans": bool(predict_spans)}
        if int(reranking_candidates) > 0:
            separate_kwargs["reranking_candidates"] = int(reranking_candidates)

        with torch.inference_mode():
            result = model.separate(inputs, **separate_kwargs)

        try:
            import torchaudio
            import io as _io

            target_buf = _io.BytesIO()
            residual_buf = _io.BytesIO()
            torchaudio.save(target_buf, result.target[0].unsqueeze(0).cpu(), processor.audio_sampling_rate, format="wav")
            torchaudio.save(
                residual_buf, result.residual[0].unsqueeze(0).cpu(), processor.audio_sampling_rate, format="wav"
            )
            return {
                "ok": True,
                "sample_rate": int(processor.audio_sampling_rate),
                "target_wav_base64": base64.b64encode(target_buf.getvalue()).decode("ascii"),
                "residual_wav_base64": base64.b64encode(residual_buf.getvalue()).decode("ascii"),
            }
        except Exception as e:
            return {
                "ok": True,
                "sample_rate": int(getattr(processor, "audio_sampling_rate", 16000)),
                "warning": f"torchaudio WAV encoding unavailable ({e}); returning float arrays instead",
                "target": result.target[0].detach().cpu().tolist(),
                "residual": result.residual[0].detach().cpu().tolist(),
            }
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


