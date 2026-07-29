import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useStore } from '../../store/useStore'
import { uploadVideo } from '../../utils/api'
import './UploadStep.css'

const FORMAT_ICONS = { mp4: '🎬', mov: '🎞', avi: '📽', mkv: '🎥', webm: '🌐' }

export default function UploadStep() {
  const { setVideoFile, setJobId, setActiveStep } = useStore()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0]
    if (!file) return
    setError(null)
    setUploading(true)

    const url = URL.createObjectURL(file)
    setPreview({ url, name: file.name, size: file.size })

    try {
      const result = await uploadVideo(file)
      setJobId(result.job_id)

      // Extract basic video info from URL for display
      setVideoFile(file, url, result.info)
      setActiveStep('transcribe')
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Make sure the backend is running.')
    } finally {
      setUploading(false)
    }
  }, [setVideoFile, setJobId, setActiveStep])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] },
    maxFiles: 1,
    maxSize: 4 * 1024 * 1024 * 1024, // 4GB
  })

  const fmt = (bytes) => {
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
    return `${(bytes / 1e3).toFixed(0)} KB`
  }

  return (
    <div className="upload-step">
      <div className="upload-hero">
        <h1 className="upload-title">Drop your video to get started</h1>
        <p className="upload-subtitle">MP4, MOV, MKV, AVI, WebM · Up to 4K · Landscape or Portrait</p>
      </div>

      {!preview ? (
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="dropzone-inner">
            <div className="dropzone-icon">
              {uploading ? (
                <div className="spinner" />
              ) : (
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4L24 32M24 4L14 14M24 4L34 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 36V40C6 41.1 6.9 42 8 42H40C41.1 42 42 41.1 42 40V36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <p className="dropzone-text">
              {uploading ? 'Uploading…' : isDragActive ? 'Release to upload' : 'Drag & drop or click to browse'}
            </p>
            {!uploading && (
              <div className="format-pills">
                {Object.entries(FORMAT_ICONS).map(([fmt, icon]) => (
                  <span key={fmt} className="format-pill">{icon} {fmt.toUpperCase()}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="preview-card">
          <video className="preview-video" src={preview.url} controls muted />
          <div className="preview-meta">
            <span className="preview-name">{preview.name}</span>
            <span className="preview-size">{fmt(preview.size)}</span>
          </div>
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar"><div className="progress-fill animating" /></div>
              <span>Uploading…</span>
            </div>
          )}
        </div>
      )}

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="upload-hints">
        <div className="hint-card">
          <span className="hint-icon">🎙</span>
          <div><strong>Hinglish?</strong><br />Works best with Whisper large-v3. Select "Hinglish" in the next step.</div>
        </div>
        <div className="hint-card">
          <span className="hint-icon">📐</span>
          <div><strong>Landscape & Portrait</strong><br />Both 16:9 and 9:16 supported. Export in either orientation.</div>
        </div>
        <div className="hint-card">
          <span className="hint-icon">⚡</span>
          <div><strong>4K supported</strong><br />Whisper processes audio only. Resolution preserved on export.</div>
        </div>
      </div>
    </div>
  )
}
