import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

# Ensure directories exist
for d in ["uploads", "outputs", "fonts", "temp"]:
    Path(f"../{d}").mkdir(parents=True, exist_ok=True)
    Path(d).mkdir(parents=True, exist_ok=True)

from routers import transcription, video, export, fonts as fonts_router

app = FastAPI(
    title="AI Caption Studio API",
    version="1.0.0",
    description="Backend for AI-powered video captioning tool"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for outputs and fonts
outputs_path = Path("../outputs")
outputs_path.mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory=str(outputs_path)), name="outputs")

fonts_path = Path("../fonts")
fonts_path.mkdir(exist_ok=True)
app.mount("/fonts", StaticFiles(directory=str(fonts_path)), name="fonts")

app.include_router(transcription.router, prefix="/api/transcription", tags=["Transcription"])
app.include_router(video.router, prefix="/api/video", tags=["Video"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(fonts_router.router, prefix="/api/fonts", tags=["Fonts"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
