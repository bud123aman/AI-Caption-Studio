import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { renderVideo, generateSubtitle } from '../../utils/api'
import './ExportStep.css'

const RESOLUTIONS = [
  { value: '1080p', label: '1080p HD', desc: '1920×1080 / 1080×1920' },
  { value: '4k',    label: '4K UHD',   desc: '3840×2160 / 2160×3840' },
]

const RATIOS = [
  { value: '16:9', label: '16:9 Landscape', icon: '🖥' },
  { value: '9:16', label: '9:16 Portrait',  icon: '📱' },
]

export default function ExportStep() {
  const {
    jobId, words, style,
    exportResolution, setExportResolution,
    exportAspectRatio, setExportAspectRatio,
    exportStatus, setExportStatus,
    exportResult, setExportResult,
    silenceSummary,
  } = useStore()

  const [subtitleLoading, setSubtitleLoading] = useState(false)
  const [subtitleResult, setSubtitleResult] = useState(null)
  const [error, setError] = useState(null)

  const handleRender = async () => {
    if (!jobId || words.length === 0) return
    setExportStatus('loading')
    setError(null)

    try {
      const result = await renderVideo({
        job_id: jobId,
        words: words.map(w => ({
          word: w.word,
          start: w.start,
          end: w.end,
          probability: w.probability ?? 1.0,
        })),
        style: {
          font_family: style.fontFamily,
          font_size: style.fontSize,
          font_color: style.fontColor,
          bold: style.bold,
          italic: style.italic,
          background_type: style.backgroundType,
          background_color: style.backgroundColor,
          background_opacity: style.backgroundOpacity,
          position: style.position,
          position_x: style.positionX,
          position_y: style.positionY,
          highlight_color: style.highlightColor,
          custom_font_path: style.customFontPath,
          template: style.template,
        },
        resolution: exportResolution,
        aspect_ratio: exportAspectRatio,
        format: 'mp4',
      })
      setExportResult(result)
    } catch (e) {
      setError(e.response?.data?.detail || 'Render failed. Check that FFmpeg is installed.')
      setExportStatus('idle')
    }
  }

  const handleSubtitle = async (format) => {
    setSubtitleLoading(true)
    try {
      const result = await generateSubtitle(jobId, words, format)
      setSubtitleResult(result)
    } catch (e) {
      alert('Subtitle generation failed')
    } finally {
      setSubtitleLoading(false)
    }
  }

  const isLoading = exportStatus === 'loading'
  const isDone = exportStatus === 'done'

  return (
    <div className="export-step">
      <div className="export-config">
        <h2 className="export-heading">Export Settings</h2>

        {silenceSummary && (
          <div className="export-info-banner">✓ Silence removed: {silenceSummary}</div>
        )}

        <div className="export-group">
          <h3 className="group-title">Aspect Ratio</h3>
          <div className="ratio-cards">
            {RATIOS.map(r => (
              <button
                key={r.value}
                className={`ratio-card ${exportAspectRatio === r.value ? 'active' : ''}`}
                onClick={() => setExportAspectRatio(r.value)}
              >
                <span className="ratio-icon">{r.icon}</span>
                <span className="ratio-label">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="export-group">
          <h3 className="group-title">Resolution</h3>
          <div className="res-cards">
            {RESOLUTIONS.map(r => (
              <button
                key={r.value}
                className={`res-card ${exportResolution === r.value ? 'active' : ''}`}
                onClick={() => setExportResolution(r.value)}
              >
                <span className="res-label">{r.label}</span>
                <span className="res-desc">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="export-group">
          <h3 className="group-title">Subtitle Files</h3>
          <div className="subtitle-row">
            <button className="btn-outline-sm" onClick={() => handleSubtitle('srt')} disabled={subtitleLoading}>
              {subtitleLoading ? '…' : '⬇ SRT'}
            </button>
            <button className="btn-outline-sm" onClick={() => handleSubtitle('vtt')} disabled={subtitleLoading}>
              {subtitleLoading ? '…' : '⬇ VTT'}
            </button>
          </div>
          {subtitleResult && (
            <a href={subtitleResult.url} className="download-link" download>
              Download {subtitleResult.filename} ({subtitleResult.cue_count} cues)
            </a>
          )}
        </div>

        <button
          className={`export-btn ${isLoading ? 'loading' : ''}`}
          onClick={handleRender}
          disabled={isLoading || !jobId || words.length === 0}
        >
          {isLoading ? (
            <><span className="btn-spinner white" /> Rendering video…</>
          ) : isDone ? '↻ Re-render' : '🎬 Export Video'}
        </button>

        {error && <div className="error-box">⚠ {error}</div>}
      </div>

      {/* Result */}
      {isDone && exportResult && (
        <div className="export-result">
          <h3 className="result-heading">Export Complete ✓</h3>
          <p className="result-meta">{exportResult.resolution} · {exportResult.aspect_ratio}</p>

          <video
            className="result-video"
            src={exportResult.output_url}
            controls
            autoPlay={false}
          />

          <div className="result-actions">
            <a
              className="download-btn"
              href={exportResult.output_url}
              download
            >
              ⬇ Download MP4
            </a>
            {exportResult.srt_url && (
              <a className="download-btn secondary" href={exportResult.srt_url} download>
                ⬇ Download SRT
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
