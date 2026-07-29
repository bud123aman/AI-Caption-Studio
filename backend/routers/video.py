import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from services.silence_service import SilenceService
from utils.file_utils import get_upload_path

router = APIRouter()
silence_service = SilenceService()


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file and return its job_id and metadata."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_ext = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}")

    job_id = str(uuid.uuid4())
    upload_path = get_upload_path(f"{job_id}{ext}")

    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Get basic video info via ffprobe
    from services.ffmpeg_service import FFmpegService
    ffmpeg_svc = FFmpegService()
    info = ffmpeg_svc.get_video_info(str(upload_path))

    return JSONResponse(content={
        "job_id": job_id,
        "filename": file.filename,
        "path": str(upload_path),
        "info": info,
    })


@router.post("/detect-silence")
async def detect_silence(
    job_id: str = Form(...),
    silence_threshold: float = Form(-40.0),   # dB
    min_silence_duration: float = Form(0.5),  # seconds
):
    """Analyze audio and return list of detected silent segments."""
    upload_dir = Path("../uploads")
    matches = list(upload_dir.glob(f"{job_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        segments = silence_service.detect_silence(
            video_path=str(matches[0]),
            silence_thresh_db=silence_threshold,
            min_silence_sec=min_silence_duration,
        )
        total_silence = sum(s["duration"] for s in segments)
        return JSONResponse(content={
            "job_id": job_id,
            "silent_segments": segments,
            "count": len(segments),
            "total_silence_seconds": round(total_silence, 2),
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silence detection failed: {str(e)}")


@router.post("/remove-silence")
async def remove_silence(
    job_id: str = Form(...),
    silence_threshold: float = Form(-40.0),
    min_silence_duration: float = Form(0.5),
):
    """Remove silent gaps and return trimmed video path + summary."""
    upload_dir = Path("../uploads")
    matches = list(upload_dir.glob(f"{job_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        result = silence_service.remove_silence(
            video_path=str(matches[0]),
            job_id=job_id,
            silence_thresh_db=silence_threshold,
            min_silence_sec=min_silence_duration,
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silence removal failed: {str(e)}")


@router.get("/info/{job_id}")
async def get_video_info(job_id: str):
    """Get video metadata (duration, resolution, fps, etc.)"""
    upload_dir = Path("../uploads")
    matches = list(upload_dir.glob(f"{job_id}.*"))
    if not matches:
        # also check outputs
        output_dir = Path("../outputs")
        matches = list(output_dir.glob(f"{job_id}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Video not found")

    from services.ffmpeg_service import FFmpegService
    ffmpeg_svc = FFmpegService()
    info = ffmpeg_svc.get_video_info(str(matches[0]))
    return JSONResponse(content=info)
