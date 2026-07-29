import subprocess
import json
from pathlib import Path


class FFmpegService:

    def get_video_info(self, video_path: str) -> dict:
        """Use ffprobe to get video metadata."""
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams", "-show_format",
            video_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return {"error": result.stderr}

        data = json.loads(result.stdout)
        info = {"streams": [], "duration": 0, "size": 0}

        if "format" in data:
            info["duration"] = float(data["format"].get("duration", 0))
            info["size"] = int(data["format"].get("size", 0))
            info["format_name"] = data["format"].get("format_name", "")

        for stream in data.get("streams", []):
            s = {"codec_type": stream.get("codec_type")}
            if stream.get("codec_type") == "video":
                s["width"] = stream.get("width")
                s["height"] = stream.get("height")
                s["codec_name"] = stream.get("codec_name")
                s["fps"] = self._parse_fps(stream.get("r_frame_rate", "30/1"))
                s["aspect_ratio"] = self._calc_aspect(
                    stream.get("width", 0), stream.get("height", 0)
                )
            elif stream.get("codec_type") == "audio":
                s["sample_rate"] = stream.get("sample_rate")
                s["channels"] = stream.get("channels")
                s["codec_name"] = stream.get("codec_name")
            info["streams"].append(s)

        return info

    def _parse_fps(self, fps_str: str) -> float:
        try:
            parts = fps_str.split("/")
            return round(int(parts[0]) / int(parts[1]), 2)
        except Exception:
            return 30.0

    def _calc_aspect(self, w: int, h: int) -> str:
        if not w or not h:
            return "unknown"
        ratio = w / h
        if abs(ratio - 16 / 9) < 0.1:
            return "16:9"
        if abs(ratio - 9 / 16) < 0.1:
            return "9:16"
        if abs(ratio - 1) < 0.1:
            return "1:1"
        return f"{w}:{h}"

    def get_resolution_params(self, resolution: str, aspect_ratio: str) -> tuple[int, int]:
        """Return (width, height) for given resolution + aspect ratio."""
        resolutions = {
            "1080p": {"16:9": (1920, 1080), "9:16": (1080, 1920)},
            "4k":    {"16:9": (3840, 2160), "9:16": (2160, 3840)},
            "720p":  {"16:9": (1280, 720),  "9:16": (720,  1280)},
        }
        return resolutions.get(resolution, {}).get(aspect_ratio, (1920, 1080))

    def run_ffmpeg(self, cmd: list, description: str = "") -> subprocess.CompletedProcess:
        """Run an FFmpeg command — print full command and full stderr on failure."""
        print(f"\n[FFmpeg] ── {description} ──")
        print(f"[FFmpeg] CMD: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[FFmpeg] FULL STDERR:\n{result.stderr}")
            raise RuntimeError(
                f"FFmpeg failed ({description}) exit={result.returncode}:\n{result.stderr}"
            )
        return result