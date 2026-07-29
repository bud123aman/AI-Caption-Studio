import os
import re
import subprocess
from pathlib import Path
from typing import List, Optional

from services.ffmpeg_service import FFmpegService
from services.subtitle_service import SubtitleService


class ExportService:
    def __init__(self):
        self.ffmpeg = FFmpegService()
        self.subtitle_svc = SubtitleService()

    def render(
        self,
        video_path: str,
        words: List[dict],
        style: dict,
        resolution: str,
        aspect_ratio: str,
        job_id: str,
    ) -> dict:
        """
        Burn captions into video using FFmpeg ASS subtitles.
        ASS format gives us full control over styling, animations, and positioning.
        """
        width, height = self.ffmpeg.get_resolution_params(resolution, aspect_ratio)

        # Generate ASS subtitle file with absolute path (required by FFmpeg)
        ass_path = Path(f"../temp/{job_id}.ass").resolve()
        ass_path.parent.mkdir(exist_ok=True)
        self._generate_ass(words, style, str(ass_path), width, height)

        safe_ratio = aspect_ratio.replace(':', 'x')
        output_filename = f"{job_id}_captioned_{resolution}_{safe_ratio}.mp4"
        output_path = Path("../outputs").resolve() / output_filename
        output_path.parent.mkdir(exist_ok=True)

        crf = "18" if resolution == "1080p" else "20"

        # Two-pass approach to avoid FFmpeg vf filter string parsing issues on Mac:
        # Pass 1 — scale + pad to target resolution → intermediate file
        # Pass 2 — burn ASS subtitles onto the scaled video → final output
        # This sidesteps the colon-escaping conflict between scale/pad params
        # and the ass filter path when combined in a single -vf string.

        intermediate_path = Path(f"../temp/{job_id}_scaled.mp4").resolve()

        # Pass 1: scale + pad
        cmd_scale = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                   f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black",
            "-c:v", "libx264", "-crf", crf, "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            str(intermediate_path),
        ]
        self.ffmpeg.run_ffmpeg(cmd_scale, "Scale and pad video")

        # Pass 2: burn subtitles
        # Pre-flight: verify the ASS file actually exists and is non-empty
        print(f"\n[Export] ── Pre-flight checks ──")
        print(f"[Export] ASS path:          {ass_path}")
        print(f"[Export] ASS exists:        {ass_path.exists()}")
        if ass_path.exists():
            print(f"[Export] ASS size (bytes):  {ass_path.stat().st_size}")
            first_line = ass_path.read_text(encoding="utf-8").splitlines()[0]
            print(f"[Export] ASS first line:    {first_line!r}")
        print(f"[Export] Intermediate path: {intermediate_path}")
        print(f"[Export] Intermediate exists: {intermediate_path.exists()}")
        print(f"[Export] Output path:       {output_path}")

        vf_string = f"subtitles={str(ass_path)}"
        print(f"[Export] -vf string:        {vf_string!r}")

        cmd_subs = [
            "ffmpeg", "-y",
            "-i", str(intermediate_path),
            "-vf", vf_string,
            "-c:v", "libx264", "-crf", crf, "-preset", "medium",
            "-c:a", "copy",
            "-movflags", "+faststart",
            str(output_path),
        ]
        self.ffmpeg.run_ffmpeg(cmd_subs, "Render captioned video")

        # Cleanup
        intermediate_path.unlink(missing_ok=True)

        # Also generate SRT as bonus deliverable
        srt_result = self.subtitle_svc.generate(words, "srt", job_id)

        # Cleanup temp ASS
        ass_path.unlink(missing_ok=True)

        return {
            "job_id": job_id,
            "output_url": f"/outputs/{output_filename}",
            "output_path": str(output_path),
            "srt_url": srt_result.get("url"),
            "resolution": f"{width}x{height}",
            "aspect_ratio": aspect_ratio,
        }

    def _generate_ass(
        self,
        words: List[dict],
        style: dict,
        ass_path: str,
        width: int,
        height: int,
    ):
        """
        Generate ASS subtitle file with karaoke-style word highlighting.
        ASS supports {\k} tags for word-by-word timing.
        """
        # Map style to ASS values
        font_name = style.get("font_family", "Arial")
        if style.get("custom_font_path"):
            font_name = Path(style["custom_font_path"]).stem

        font_size = style.get("font_size", 48)
        font_color = self._hex_to_ass_color(style.get("font_color", "#FFFFFF"))
        highlight_color = self._hex_to_ass_color(style.get("highlight_color", "#FFD700"))
        bold = 1 if style.get("bold") else 0
        italic = 1 if style.get("italic") else 0
        bg_type = style.get("background_type", "semi_transparent")
        bg_color = self._hex_to_ass_color(
            style.get("background_color", "#000000"),
            opacity=style.get("background_opacity", 0.6) if bg_type != "none" else 0.0,
        )

        # Position mapping
        position = style.get("position", "bottom")
        alignment = {"top": 8, "center": 5, "bottom": 2}.get(position, 2)

        margin_v = max(20, int(height * 0.05))
        margin_h = max(40, int(width * 0.05))

        # ASS header
        ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{font_color},{highlight_color},&H00000000,{bg_color},{bold},{italic},0,0,100,100,0,0,1,2,0,{alignment},{margin_h},{margin_h},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        # Group words into lines (max ~6-7 words or ~40 chars per line)
        lines = self._group_words_into_lines(words, max_words=7, max_chars=42)

        for line in lines:
            if not line:
                continue
            start = line[0]["start"]
            end = line[-1]["end"]

            # Build karaoke text with {\k} timing tags
            # {\k<duration_in_cs>} = highlight that word for N centiseconds
            karaoke_text = ""
            for w in line:
                duration_cs = int((w["end"] - w["start"]) * 100)
                duration_cs = max(duration_cs, 1)
                karaoke_text += f"{{\\k{duration_cs}}}{w['word']} "

            karaoke_text = karaoke_text.rstrip()

            start_str = self._seconds_to_ass_time(start)
            end_str = self._seconds_to_ass_time(end)

            ass_content += (
                f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{karaoke_text}\n"
            )

        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)

    def _group_words_into_lines(
        self, words: List[dict], max_words: int = 7, max_chars: int = 42
    ) -> List[List[dict]]:
        """Group words into display lines for captions."""
        lines = []
        current_line = []
        current_chars = 0

        for word in words:
            word_text = word.get("word", "")
            if (
                len(current_line) >= max_words
                or current_chars + len(word_text) > max_chars
            ) and current_line:
                lines.append(current_line)
                current_line = []
                current_chars = 0
            current_line.append(word)
            current_chars += len(word_text) + 1

        if current_line:
            lines.append(current_line)

        return lines

    def _hex_to_ass_color(self, hex_color: str, opacity: float = 1.0) -> str:
        """Convert #RRGGBB hex to ASS &HAABBGGRR format."""
        hex_color = hex_color.lstrip("#")
        if len(hex_color) == 6:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
        else:
            r, g, b = 255, 255, 255

        alpha = int((1.0 - min(max(opacity, 0.0), 1.0)) * 255)
        return f"&H{alpha:02X}{b:02X}{g:02X}{r:02X}"

    def _seconds_to_ass_time(self, seconds: float) -> str:
        """Convert float seconds to ASS time format H:MM:SS.cc"""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int((seconds % 1) * 100)
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"