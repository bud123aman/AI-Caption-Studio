import os
import subprocess
import json
from pathlib import Path
from typing import Optional

# faster-whisper is the recommended package for Python 3.12
# It uses CTranslate2 under the hood — much faster than openai-whisper

class WhisperService:
    def __init__(self):
        self._models: dict = {}

    def _get_model(self, model_size: str):
        """Lazy-load and cache Whisper models."""
        if model_size not in self._models:
            try:
                from faster_whisper import WhisperModel
                # Use CPU with int8 quantization for Mac compatibility (no CUDA)
                # On Mac, use device="cpu" or "mps" (Apple Silicon)
                device = "cpu"
                compute_type = "int8"

                print(f"[Whisper] Loading model: {model_size} on {device}")
                self._models[model_size] = WhisperModel(
                    model_size,
                    device=device,
                    compute_type=compute_type,
                    download_root=str(Path("../temp/whisper_models")),
                )
                print(f"[Whisper] Model {model_size} loaded.")
            except ImportError:
                raise RuntimeError(
                    "faster-whisper not installed. Run: pip install faster-whisper"
                )
        return self._models[model_size]

    async def transcribe(
        self,
        video_path: str,
        language: Optional[str] = "auto",
        model_size: str = "large-v3",
        job_id: str = "",
    ) -> dict:
        """
        Transcribe a video file using Whisper.
        Returns word-level segments with timestamps.

        For Hinglish: use language='hi' with Whisper large-v3.
        Whisper large-v3 handles code-switching (Hinglish) significantly better
        than smaller models or other providers.
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        # Extract audio first (speeds up Whisper significantly)
        audio_path = Path(f"../temp/{job_id}_audio.wav")
        audio_path.parent.mkdir(parents=True, exist_ok=True)
        self._extract_audio(str(video_path), str(audio_path))

        model = self._get_model(model_size)

        # Language handling:
        # - 'auto': let Whisper detect
        # - 'en': force English
        # - 'hi': Hindi (also picks up Hinglish reasonably well with large-v3)
        # - 'hinglish': use 'hi' with initial_prompt for best Hinglish accuracy
        whisper_lang = None
        initial_prompt = None

        if language == "auto":
            whisper_lang = None
        elif language == "hinglish":
            whisper_lang = "hi"
            # Prompt helps Whisper understand it will see mixed script
            initial_prompt = (
                "This audio contains a mix of Hindi and English (Hinglish). "
                "Transcribe naturally, switching between scripts as needed."
            )
        elif language in ("en", "hi"):
            whisper_lang = language
        else:
            whisper_lang = language

        print(f"[Whisper] Transcribing: {video_path.name}, lang={whisper_lang or 'auto'}")

        segments_raw, info = model.transcribe(
            str(audio_path),
            language=whisper_lang,
            word_timestamps=True,
            initial_prompt=initial_prompt,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500
            ),
            beam_size=5,
            best_of=5,
            temperature=0.0,
        )
        # Convert generator to list so we can inspect it
        segments_raw = list(segments_raw)
        print("=" * 80)
        print(f"Segments returned: {len(segments_raw)}")

        for i, seg in enumerate(segments_raw):
            print(f"[{i}] {seg.start:.2f}s -> {seg.end:.2f}s | {seg.text}")
            print("=" * 80)

        words = []
        sentences = []
        current_sentence_words = []

        for segment in segments_raw:
            sentence_text = segment.text.strip()

            if segment.words:
                for w in segment.words:
                    word_obj = {
                        "word": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 3),
                    }
                    words.append(word_obj)
                    current_sentence_words.append(word_obj)

            if current_sentence_words:
                sentences.append({
                    "text": sentence_text,
                    "start": current_sentence_words[0]["start"],
                    "end": current_sentence_words[-1]["end"],
                    "words": current_sentence_words.copy(),
                })
                current_sentence_words = []

        # Clean up temp audio
        if audio_path.exists():
            audio_path.unlink()

        return {
            "job_id": job_id,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
            "words": words,
            "sentences": sentences,
            "word_count": len(words),
            "sentence_count": len(sentences),
        }

    def _extract_audio(self, video_path: str, audio_path: str):
        """Extract audio track from video as 16kHz mono WAV (optimal for Whisper)."""
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            audio_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Audio extraction failed: {result.stderr}")
