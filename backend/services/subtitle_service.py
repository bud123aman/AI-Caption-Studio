from pathlib import Path
from typing import List


class SubtitleService:

    def generate(self, words: List[dict], format: str, job_id: str) -> dict:
        """Generate SRT or VTT from word list. Groups into sentence-level cues."""
        sentences = self._words_to_sentences(words)

        if format == "srt":
            content = self._to_srt(sentences)
            filename = f"{job_id}.srt"
        else:
            content = self._to_vtt(sentences)
            filename = f"{job_id}.vtt"

        output_path = Path("../outputs") / filename
        output_path.parent.mkdir(exist_ok=True)
        output_path.write_text(content, encoding="utf-8")

        return {
            "format": format,
            "filename": filename,
            "url": f"/outputs/{filename}",
            "cue_count": len(sentences),
        }

    def _words_to_sentences(self, words: List[dict], max_words: int = 10) -> List[dict]:
        """Group words into subtitle cues (~sentence-sized)."""
        sentences = []
        current = []

        for word in words:
            current.append(word)
            text = word.get("word", "")
            # Break on punctuation or max length
            if (
                any(text.endswith(p) for p in [".", "!", "?", "।"])
                or len(current) >= max_words
            ):
                sentences.append({
                    "text": " ".join(w["word"] for w in current).strip(),
                    "start": current[0]["start"],
                    "end": current[-1]["end"],
                })
                current = []

        if current:
            sentences.append({
                "text": " ".join(w["word"] for w in current).strip(),
                "start": current[0]["start"],
                "end": current[-1]["end"],
            })

        return sentences

    def _to_srt(self, sentences: List[dict]) -> str:
        lines = []
        for i, s in enumerate(sentences, 1):
            lines.append(str(i))
            lines.append(
                f"{self._srt_time(s['start'])} --> {self._srt_time(s['end'])}"
            )
            lines.append(s["text"])
            lines.append("")
        return "\n".join(lines)

    def _to_vtt(self, sentences: List[dict]) -> str:
        lines = ["WEBVTT", ""]
        for i, s in enumerate(sentences, 1):
            lines.append(f"cue-{i}")
            lines.append(
                f"{self._vtt_time(s['start'])} --> {self._vtt_time(s['end'])}"
            )
            lines.append(s["text"])
            lines.append("")
        return "\n".join(lines)

    def _srt_time(self, seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    def _vtt_time(self, seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
