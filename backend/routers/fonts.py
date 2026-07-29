import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()
FONTS_DIR = Path("../fonts")


@router.post("/upload")
async def upload_font(file: UploadFile = File(...)):
    """Upload a custom font file (.ttf or .otf)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in {".ttf", ".otf"}:
        raise HTTPException(status_code=400, detail="Only .ttf and .otf fonts are supported")

    FONTS_DIR.mkdir(exist_ok=True)
    dest = FONTS_DIR / file.filename

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return JSONResponse(content={
        "filename": file.filename,
        "path": str(dest),
        "url": f"/fonts/{file.filename}",
    })


@router.get("/list")
async def list_fonts():
    """List all uploaded custom fonts."""
    FONTS_DIR.mkdir(exist_ok=True)
    fonts = [
        {"filename": f.name, "url": f"/fonts/{f.name}"}
        for f in FONTS_DIR.iterdir()
        if f.suffix.lower() in {".ttf", ".otf"}
    ]
    return JSONResponse(content={"fonts": fonts})


@router.delete("/{filename}")
async def delete_font(filename: str):
    """Delete a custom font."""
    font_path = FONTS_DIR / filename
    if not font_path.exists():
        raise HTTPException(status_code=404, detail="Font not found")
    font_path.unlink()
    return JSONResponse(content={"message": f"{filename} deleted"})
