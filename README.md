# AI Caption Studio

A full-stack AI-powered video captioning tool. Upload a video, auto-generate captions using Whisper (with Hinglish support), customize caption style, remove silences, and export a captioned MP4.

## Project Demo

<a href="https://drive.google.com/file/d/1g3pHQtR9ZnhQoaCaCoYNTNOO5m8cUxmE/view?usp=sharing">
  <img width="882" alt="Project Walkthrough Video" src="https://drive.google.com/file/d/1u-TOFkup0tZf6nxluhsn49jKStBMRGQd/view?usp=sharing">
</a>

---

## Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 18 + Vite + Zustand           |
| Backend     | Python 3.12, FastAPI, Uvicorn       |
| Speech-to-Text | Whisper (faster-whisper, large-v3) |
| Video       | FFmpeg                              |
| Storage     | Local filesystem (Supabase optional)|

---

## Prerequisites

Install these before running:

```bash
# Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# FFmpeg
brew install ffmpeg

# Node.js 18+ (https://nodejs.org or via nvm)
# Python 3.12.5 (already installed per requirements)
```

---

## Quick Start

```bash
# Clone / download the project
cd ai-caption-studio

# Run everything in one command
chmod +x start.sh
./start.sh
```

Then open **http://localhost:5173** in your browser.

---

## Manual Setup

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy .env
cp .env.example .env

# Run
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs at: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend at: http://localhost:5173

---

## Features

### 1. Video Upload
- Accepts MP4, MOV, AVI, MKV, WebM
- Landscape (16:9) and portrait (9:16)
- Up to 4K resolution

### 2. Transcription (Whisper)
- Powered by `faster-whisper` (large-v3 model)
- Word-level timestamps for karaoke-style highlighting
- Languages: English, Hindi, Hinglish (auto-detect)
- **Hinglish**: Uses `language='hi'` + an initial prompt for code-switching

### 3. Caption Styling
- Font family (system + upload custom .ttf/.otf)
- Font size, color, bold, italic
- Background: none / semi-transparent / solid / blur
- Position: top / center / bottom
- Word highlight color (karaoke-style)
- Templates: Bold Yellow, Minimal White, Neon Glow, Dark Box, Subtitle Pro
- Save custom templates

### 4. Silence Remover
- FFmpeg `silencedetect` filter
- Configurable threshold (dB) and minimum duration
- One-click removal with summary ("12s removed")

### 5. Export
- Burn captions via FFmpeg ASS subtitles (supports `\k` karaoke timing)
- 1080p and 4K
- Landscape (16:9) and portrait (9:16)
- MP4 download + SRT/VTT subtitle file

---

## Project Structure

```
ai-caption-studio/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── requirements.txt
│   ├── routers/
│   │   ├── transcription.py     # POST /api/transcription/transcribe
│   │   ├── video.py             # POST /api/video/upload, detect-silence, remove-silence
│   │   ├── export.py            # POST /api/export/render, subtitle
│   │   └── fonts.py             # POST /api/fonts/upload
│   ├── services/
│   │   ├── whisper_service.py   # faster-whisper integration
│   │   ├── silence_service.py   # FFmpeg silencedetect
│   │   ├── export_service.py    # ASS generation + FFmpeg render
│   │   ├── subtitle_service.py  # SRT/VTT generation
│   │   └── ffmpeg_service.py    # FFmpeg helpers
│   └── utils/
│       └── file_utils.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Step-based layout
│   │   ├── store/useStore.js    # Zustand global state
│   │   ├── utils/api.js         # Axios API calls
│   │   ├── components/
│   │   │   ├── editor/          # UploadStep, TranscribeStep, StyleStep, ExportStep
│   │   │   ├── captions/        # CaptionPreview (live word highlight)
│   │   │   └── ui/              # StepNav
│   │   └── styles/              # global.css, app.css
│   ├── vite.config.js
│   └── package.json
├── uploads/                     # Uploaded video files
├── outputs/                     # Rendered outputs, SRT/VTT
├── fonts/                       # Custom uploaded fonts
├── temp/                        # Whisper models, audio extracts, clips
├── start.sh                     # One-click startup
└── README.md
```

---

## Hinglish Testing

Select **"Hinglish (Hindi + English)"** in the Transcribe step. This:
1. Sets Whisper language to `hi`
2. Passes an initial prompt about code-switching
3. Uses `large-v3` for best accuracy

**Test sample**: Record or use a clip with sentences like:
> "Aaj hum dekhenge how to build a machine learning model step by step."

If accuracy is poor, try:
- `large-v3` instead of smaller models
- Provide a 2–3 sentence initial_prompt in `whisper_service.py` matching your domain

---

## Known Limitations

- **No GPU acceleration on Mac**: Whisper runs on CPU. Large-v3 takes 1–3× real-time on Apple Silicon. M1/M2 users will see better performance.
- **4K export is slow**: FFmpeg H.264 encoding at 4K takes several minutes on CPU.
- **Silence removal resets timestamps**: If you remove silence _after_ transcribing, the word timestamps may not align. Best order: remove silence → transcribe → style → export.
- **No Supabase auth**: Currently uses local filesystem. Supabase integration stubs are in `.env.example`.
- **Blur background**: ASS format doesn't support blur natively. The blur effect is simulated in preview; the export falls back to semi-transparent.

---

## API Reference

Full interactive docs at `http://localhost:8000/docs` (Swagger UI).

Key endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/video/upload | Upload video |
| POST | /api/transcription/transcribe | Run Whisper |
| POST | /api/video/detect-silence | Detect silent gaps |
| POST | /api/video/remove-silence | Remove silent gaps |
| POST | /api/fonts/upload | Upload custom font |
| POST | /api/export/render | Burn captions + export |
| POST | /api/export/subtitle | Generate SRT/VTT |
| GET  | /api/export/download/{filename} | Download output |
