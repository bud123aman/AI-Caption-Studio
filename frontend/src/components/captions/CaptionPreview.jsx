import React, { useRef, useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import './CaptionPreview.css'

export default function CaptionPreview({ videoUrl, words, style }) {
  const videoRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  // Find active line: words within 0 to 3 seconds of current time
  const activeWords = words.filter(w => w.start <= currentTime && w.end >= currentTime - 0.05)
  const currentWord = words.find(w => w.start <= currentTime && w.end >= currentTime)

  // Build current caption line (±3s window, same grouping as export)
  const lineWords = getLineForTime(words, currentTime)

  const captionStyle = buildCaptionStyle(style)
  const containerStyle = buildContainerStyle(style)

  return (
    <div className="caption-preview-wrap">
      <div className="preview-screen">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="preview-vid"
            onTimeUpdate={handleTimeUpdate}
            controls
          />
        ) : (
          <div className="preview-placeholder">
            <span>Video preview</span>
          </div>
        )}

        {lineWords.length > 0 && (
          <div className="caption-overlay" style={containerStyle}>
            <div className="caption-box" style={captionStyle}>
              {lineWords.map((w, i) => {
                const isActive = currentWord?.word === w.word &&
                  Math.abs(currentWord?.start - w.start) < 0.1
                return (
                  <span
                    key={i}
                    className={`caption-word ${isActive ? 'highlighted' : ''}`}
                    style={{
                      color: isActive ? style.highlightColor : style.fontColor,
                      fontWeight: style.bold || isActive ? 700 : 400,
                      fontStyle: style.italic ? 'italic' : 'normal',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {w.word}{' '}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {words.length === 0 && (
        <div className="preview-no-captions">
          Transcribe your video to see live caption preview here.
        </div>
      )}
    </div>
  )
}

function getLineForTime(words, currentTime, maxWords = 7, maxChars = 42) {
  // Find the line (group of words) that contains currentTime
  const lines = []
  let current = []
  let chars = 0

  for (const word of words) {
    if ((current.length >= maxWords || chars + word.word.length > maxChars) && current.length) {
      lines.push(current)
      current = []
      chars = 0
    }
    current.push(word)
    chars += word.word.length + 1
  }
  if (current.length) lines.push(current)

  for (const line of lines) {
    const start = line[0].start
    const end = line[line.length - 1].end
    if (currentTime >= start - 0.1 && currentTime <= end + 0.1) return line
  }
  return []
}

function buildContainerStyle(style) {
  const pos = style.position
  const s = { position: 'absolute', left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 16px' }
  if (pos === 'top')    { s.top = '8%' }
  if (pos === 'center') { s.top = '50%'; s.transform = 'translateY(-50%)' }
  if (pos === 'bottom') { s.bottom = '8%' }
  if (pos === 'custom' && style.positionX != null) {
    s.left = `${style.positionX * 100}%`
    s.top = `${style.positionY * 100}%`
    s.right = 'auto'
    s.transform = 'translate(-50%, -50%)'
  }
  return s
}

function buildCaptionStyle(style) {
  const bg = buildBackground(style)
  return {
    fontFamily: style.fontFamily,
    fontSize: `${Math.max(14, style.fontSize * 0.45)}px`,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    lineHeight: 1.3,
    padding: style.backgroundType !== 'none' ? '4px 10px' : '0',
    borderRadius: '4px',
    maxWidth: '90%',
    textAlign: 'center',
    wordBreak: 'break-word',
    ...bg,
  }
}

function buildBackground(style) {
  if (style.backgroundType === 'none') return {}
  if (style.backgroundType === 'solid') {
    return { backgroundColor: style.backgroundColor }
  }
  if (style.backgroundType === 'semi_transparent') {
    const hex = style.backgroundColor.replace('#', '')
    const r = parseInt(hex.slice(0,2),16)
    const g = parseInt(hex.slice(2,4),16)
    const b = parseInt(hex.slice(4,6),16)
    return { backgroundColor: `rgba(${r},${g},${b},${style.backgroundOpacity})` }
  }
  if (style.backgroundType === 'blur') {
    return { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.3)' }
  }
  return {}
}
