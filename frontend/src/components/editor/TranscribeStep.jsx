import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { transcribeVideo, removeSilence } from '../../utils/api'
import './TranscribeStep.css'

const LANGUAGES = [
  { value: 'auto',     label: 'Auto-detect' },
  { value: 'en',       label: 'English' },
  { value: 'hi',       label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish (Hindi + English)' },
]

const MODELS = [
  { value: 'tiny',     label: 'Tiny  — fastest, lower accuracy' },
  { value: 'base',     label: 'Base  — fast, decent accuracy' },
  { value: 'small',    label: 'Small — balanced' },
  { value: 'medium',   label: 'Medium — good accuracy' },
  { value: 'large-v3', label: 'Large-v3 — best accuracy (recommended for Hinglish)' },
]

export default function TranscribeStep() {
  const {
    jobId, videoFile, videoUrl,
    language, setLanguage,
    modelSize, setModelSize,
    transcriptionStatus, transcriptionError,
    setTranscription, setTranscriptionStatus, setTranscriptionError,
    words, sentences, updateWord,
    setActiveStep,
    silenceThreshold, setSilenceThreshold,
    minSilenceDuration, setMinSilenceDuration,
    silenceSummary, setSilenceResult, silenceRemoved,
  } = useStore()

  const [progress, setProgress] = useState(0)
  const [silenceLoading, setSilenceLoading] = useState(false)

  const handleTranscribe = async () => {
    if (!jobId || !videoFile) return
    setTranscriptionStatus('loading')
    setProgress(0)

    try {
      const result = await transcribeVideo(videoFile, { language, modelSize }, setProgress)
      setTranscription(result.words, result.sentences)
    } catch (e) {
      setTranscriptionError(e.response?.data?.detail || 'Transcription failed')
    }
  }

  const handleRemoveSilence = async () => {
    setSilenceLoading(true)
    try {
      const result = await removeSilence(jobId, silenceThreshold, minSilenceDuration)
      setSilenceResult(result.removed_segments || [], result.summary, result.output_url)
    } catch (e) {
      alert(e.response?.data?.detail || 'Silence removal failed')
    } finally {
      setSilenceLoading(false)
    }
  }

  const isDone = transcriptionStatus === 'done'
  const isLoading = transcriptionStatus === 'loading'

  return (
    <div className="transcribe-step">
      {/* Left: Config + Silence */}
      <div className="transcribe-sidebar">
        <section className="config-section">
          <h3 className="section-title">Transcription Settings</h3>

          <label className="field-label">Language</label>
          <select
            className="field-select"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            disabled={isLoading}
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          {language === 'hinglish' && (
            <div className="info-box">
              🔤 Whisper large-v3 handles Hinglish best. An initial prompt is automatically applied for code-switching accuracy.
            </div>
          )}

          <label className="field-label" style={{ marginTop: 16 }}>Whisper Model</label>
          <select
            className="field-select"
            value={modelSize}
            onChange={e => setModelSize(e.target.value)}
            disabled={isLoading}
          >
            {MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <button
            className={`btn-primary transcribe-btn ${isLoading ? 'loading' : ''}`}
            onClick={handleTranscribe}
            disabled={isLoading || !jobId}
          >
            {isLoading ? (
              <><span className="btn-spinner" /> Transcribing… {progress > 0 ? `(${progress}%)` : ''}</>
            ) : isDone ? '↻ Re-transcribe' : '🎙 Generate Captions'}
          </button>

          {transcriptionError && (
            <div className="error-box">⚠ {transcriptionError}</div>
          )}
        </section>

        <section className="config-section">
          <h3 className="section-title">Silence Remover</h3>

          <label className="field-label">Silence threshold (dB)</label>
          <div className="range-row">
            <input
              type="range" min="-60" max="-20" step="1"
              value={silenceThreshold}
              onChange={e => setSilenceThreshold(Number(e.target.value))}
              className="range-input"
            />
            <span className="range-val">{silenceThreshold} dB</span>
          </div>

          <label className="field-label">Min silence duration (s)</label>
          <div className="range-row">
            <input
              type="range" min="0.1" max="3" step="0.1"
              value={minSilenceDuration}
              onChange={e => setMinSilenceDuration(Number(e.target.value))}
              className="range-input"
            />
            <span className="range-val">{minSilenceDuration}s</span>
          </div>

          <button
            className="btn-secondary"
            onClick={handleRemoveSilence}
            disabled={silenceLoading || !jobId}
          >
            {silenceLoading ? <><span className="btn-spinner" /> Removing silence…</> : '✂ Remove Silence'}
          </button>

          {silenceSummary && (
            <div className="success-box">✓ {silenceSummary}</div>
          )}
        </section>
      </div>

      {/* Right: Results */}
      <div className="transcribe-main">
        {videoUrl && (
          <video className="transcribe-video-preview" src={videoUrl} controls />
        )}

        {isLoading && (
          <div className="loading-card">
            <div className="loading-pulse" />
            <p>Whisper is processing your audio…</p>
            <p className="loading-sub">Large-v3 may take 1–3 minutes for longer videos.</p>
          </div>
        )}

        {isDone && (
          <>
            <div className="transcript-stats">
              <span>{words.length} words</span>
              <span>·</span>
              <span>{sentences.length} sentences</span>
              <button
                className="btn-outline btn-sm"
                onClick={() => setActiveStep('style')}
              >
                Continue to Styling →
              </button>
            </div>

            <div className="transcript-body">
              {words.map((w, i) => (
                <EditableWordRow
                  key={i}
                  index={i}
                  word={w.word}
                  second={Math.floor(w.start)}
                  onSave={(newText) => updateWord(i, newText)}
                />
              ))}
            </div>
          </>
        )}

        {transcriptionStatus === 'idle' && !isLoading && (
          <div className="empty-state">
            <span className="empty-icon">🎙</span>
            <p>Configure settings and click "Generate Captions" to transcribe your video.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EditableWordRow({ index, word, second, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(word)
  const inputRef = useRef(null)

  // Sync if parent word changes (e.g. re-transcribe)
  useEffect(() => { setDraft(word) }, [word])

  const startEdit = () => {
    setDraft(word)
    setEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== word) onSave(trimmed)
    else setDraft(word) // revert if empty or unchanged
    setEditing(false)
  }

  const cancel = () => {
    setDraft(word)
    setEditing(false)
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  return (
    <div className={`transcript-word-row ${editing ? 'editing' : ''}`}>
      <span className="second-badge">{second}s</span>

      {editing ? (
        <input
          ref={inputRef}
          className="word-edit-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') cancel()
          }}
        />
      ) : (
        <span className="word-text">{word}</span>
      )}

      {!editing && (
        <button className="edit-btn" onClick={startEdit}>
          ✎ Edit
        </button>
      )}

      {editing && (
        <div className="edit-actions">
          <button className="edit-confirm" onMouseDown={commit} title="Save (Enter)">✓</button>
          <button className="edit-cancel"  onMouseDown={cancel} title="Cancel (Esc)">✕</button>
        </div>
      )}
    </div>
  )
}