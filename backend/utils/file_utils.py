import shutil
from pathlib import Path

UPLOAD_DIR = Path("../uploads")
TEMP_DIR = Path("../temp")
OUTPUT_DIR = Path("../outputs")


def get_upload_path(filename: str) -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR / filename


def get_temp_path(filename: str) -> Path:
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    return TEMP_DIR / filename


def get_output_path(filename: str) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR / filename


def cleanup_temp(job_id: str):
    """Remove all temp files for a job_id."""
    for f in TEMP_DIR.glob(f"{job_id}*"):
        try:
            f.unlink()
        except Exception:
            pass
