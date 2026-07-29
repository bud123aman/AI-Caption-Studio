import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from services.whisper_service import WhisperService
from utils.file_utils import get_upload_path, get_temp_path, cleanup_temp

router = APIRouter()
whisper_service = WhisperService()


@router.post("/transcribe")
async def transcribe_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: Optional[str] = Form("auto"),
    model_size: Optional[str] = Form("large-v3"),
):
    """
    Upload a video/audio file and get word-level transcription.
    language: 'auto', 'en', 'hi', or 'hinglish' (auto-detect + mixed)
    model_size: tiny | base | small | medium | large-v3
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_ext = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".mp3", ".wav", ".m4a"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    job_id = str(uuid.uuid4())
    upload_path = get_upload_path(f"{job_id}{ext}")

    try:
        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    try:
        result = await whisper_service.transcribe(
            video_path=str(upload_path),
            language=language,
            model_size=model_size,
            job_id=job_id,
        )
        background_tasks.add_task(cleanup_temp, job_id)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/retranscribe/{job_id}")
async def retranscribe(
    job_id: str,
    language: Optional[str] = Form("auto"),
    model_size: Optional[str] = Form("large-v3"),
):
    """Re-run transcription on an already-uploaded file."""
    upload_dir = Path("../uploads")
    matches = list(upload_dir.glob(f"{job_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        result = await whisper_service.transcribe(
            video_path=str(matches[0]),
            language=language,
            model_size=model_size,
            job_id=job_id,
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retranscription failed: {str(e)}")
