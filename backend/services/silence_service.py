import re
import subprocess
from pathlib import Path
from typing import List

from services.ffmpeg_service import FFmpegService


class SilenceService:
    def __init__(self):
        self.ffmpeg = FFmpegService()

    def detect_silence(
        self,
        video_path: str,
        silence_thresh_db: float = -40.0,
        min_silence_sec: float = 0.5,
    ) -> List[dict]:
        """
        Use ffmpeg silencedetect filter to find silent segments.
        Returns list of {start, end, duration}.
        """
        cmd = [
            "ffmpeg", "-i", video_path,
            "-af", f"silencedetect=noise={silence_thresh_db}dB:d={min_silence_sec}",
            "-f", "null", "-"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        # silencedetect outputs to stderr
        stderr = result.stderr

        segments = []
        start_times = re.findall(r"silence_start: ([\d.]+)", stderr)
        end_times = re.findall(r"silence_end: ([\d.]+)", stderr)
        durations = re.findall(r"silence_duration: ([\d.]+)", stderr)

        for i, (s, e, d) in enumerate(zip(start_times, end_times, durations)):
            segments.append({
                "index": i,
                "start": round(float(s), 3),
                "end": round(float(e), 3),
                "duration": round(float(d), 3),
            })

        return segments

    def remove_silence(
        self,
        video_path: str,
        job_id: str,
        silence_thresh_db: float = -40.0,
        min_silence_sec: float = 0.5,
    ) -> dict:
        """
        Remove silent segments and concatenate remaining clips.
        Returns path to trimmed video + summary.
        """
        video_info = self.ffmpeg.get_video_info(video_path)
        total_duration = video_info.get("duration", 0)

        silent_segments = self.detect_silence(
            video_path, silence_thresh_db, min_silence_sec
        )

        if not silent_segments:
            return {
                "job_id": job_id,
                "message": "No silence detected",
                "removed_seconds": 0,
                "output_path": video_path,
                "output_url": None,
            }

        # Build keep segments (inverse of silence segments)
        keep_segments = []
        prev_end = 0.0

        for seg in silent_segments:
            if seg["start"] > prev_end:
                keep_segments.append((prev_end, seg["start"]))
            prev_end = seg["end"]

        if prev_end < total_duration:
            keep_segments.append((prev_end, total_duration))

        # Clip each keep segment
        temp_dir = Path("../temp")
        temp_dir.mkdir(exist_ok=True)
        clip_paths = []

        for i, (start, end) in enumerate(keep_segments):
            clip_path = temp_dir / f"{job_id}_clip_{i:04d}.mp4"
            duration = end - start
            if duration < 0.1:
                continue
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(start),
                "-i", video_path,
                "-t", str(duration),
                "-c:v", "libx264", "-c:a", "aac",
                "-avoid_negative_ts", "make_zero",
                str(clip_path),
            ]
            self.ffmpeg.run_ffmpeg(cmd, f"Clip {i}")
            clip_paths.append(clip_path)

        if not clip_paths:
            raise RuntimeError("No valid segments found after silence removal")

        # Concatenate all clips
        concat_list = temp_dir / f"{job_id}_concat.txt"
        with open(concat_list, "w") as f:
            for cp in clip_paths:
                f.write(f"file '{cp.resolve()}'\n")

        output_path = Path("../outputs") / f"{job_id}_trimmed.mp4"
        output_path.parent.mkdir(exist_ok=True)

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            str(output_path),
        ]
        self.ffmpeg.run_ffmpeg(cmd, "Concatenate clips")

        # Cleanup temp clips
        for cp in clip_paths:
            cp.unlink(missing_ok=True)
        concat_list.unlink(missing_ok=True)

        total_removed = sum(s["duration"] for s in silent_segments)
        new_info = self.ffmpeg.get_video_info(str(output_path))
        new_duration = new_info.get("duration", 0)

        return {
            "job_id": job_id,
            "removed_segments": len(silent_segments),
            "removed_seconds": round(total_removed, 2),
            "original_duration": round(total_duration, 2),
            "new_duration": round(new_duration, 2),
            "output_path": str(output_path),
            "output_url": f"/outputs/{job_id}_trimmed.mp4",
            "summary": f"{len(silent_segments)} silent segments removed · {round(total_removed, 1)}s cut",
        }
