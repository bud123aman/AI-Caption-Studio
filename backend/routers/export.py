import json
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from services.export_service import ExportService
from services.subtitle_service import SubtitleService

router = APIRouter()
export_service = ExportService()
subtitle_service = SubtitleService()


class WordSegment(BaseModel):
    word: str
    start: float
    end: float
    probability: float = 1.0


class CaptionStyle(BaseModel):
    font_family: str = "Arial"
    font_size: int = 48
    font_color: str = "#FFFFFF"
    bold: bool = False
    italic: bool = False
    background_type: str = "semi_transparent"  # none | solid | semi_transparent | blur
    background_color: str = "#000000"
    background_opacity: float = 0.6
    position: str = "bottom"  # top | center | bottom | custom
    position_x: Optional[float] = None  # 0.0 - 1.0 if custom
    position_y: Optional[float] = None
    highlight_color: str = "#FFD700"
    custom_font_path: Optional[str] = None
    template: str = "default"


class ExportRequest(BaseModel):
    job_id: str
    words: List[WordSegment]
    style: CaptionStyle
    resolution: str = "1080p"   # 1080p | 4k
    aspect_ratio: str = "16:9"  # 16:9 | 9:16
    format: str = "mp4"


@router.post("/render")
async def render_video(request: ExportRequest):
    """Burn captions into video and export final MP4."""
    upload_dir = Path("../uploads")
    matches = list(upload_dir.glob(f"{request.job_id}.*"))

    # Also check if silence-removed version exists
    output_dir = Path("../outputs")
    silence_removed = list(output_dir.glob(f"{request.job_id}_trimmed*"))
    
    source = silence_removed[0] if silence_removed else (matches[0] if matches else None)
    if not source:
        raise HTTPException(status_code=404, detail="Video not found")

    try:
        result = export_service.render(
            video_path=str(source),
            words=[w.dict() for w in request.words],
            style=request.style.dict(),
            resolution=request.resolution,
            aspect_ratio=request.aspect_ratio,
            job_id=request.job_id,
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render failed: {str(e)}")


@router.post("/subtitle")
async def generate_subtitle(
    job_id: str = Body(...),
    words: List[WordSegment] = Body(...),
    format: str = Body("srt"),  # srt | vtt
):
    """Generate SRT or VTT subtitle file from word segments."""
    try:
        result = subtitle_service.generate(
            words=[w.dict() for w in words],
            format=format,
            job_id=job_id,
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Subtitle generation failed: {str(e)}")


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download a rendered output file."""
    file_path = Path("../outputs") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="video/mp4" if filename.endswith(".mp4") else "application/octet-stream",
    )
