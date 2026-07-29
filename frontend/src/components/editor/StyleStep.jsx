import React, { useRef, useState, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useStore } from '../../store/useStore'
import { uploadFont, listFonts } from '../../utils/api'
import CaptionPreview from '../captions/CaptionPreview'
import './StyleStep.css'

const SYSTEM_FONTS = ['Arial', 'Georgia', 'Helvetica', 'Impact', 'Times New Roman', 'Verdana', 'Courier New']
const BG_TYPES = [
  { value: 'none',             label: 'None' },
  { value: 'semi_transparent', label: 'Semi-transparent' },
  { value: 'solid',            label: 'Solid' },
  { value: 'blur',             label: 'Blurred' },
]
const POSITIONS = [
  { value: 'top',    label: '⬆ Top' },
  { value: 'center', label: '◉ Center' },
  { value: 'bottom', label: '⬇ Bottom' },
]

export default function StyleStep() {
  const {
    style, setStyle, templates, applyTemplate, saveCustomTemplate,
    customFonts, addCustomFont,
    setActiveStep,
    words, videoUrl,
  } = useStore()

  const [colorTarget, setColorTarget] = useState(null) // 'fontColor' | 'bgColor' | 'highlightColor'
  const [serverFonts, setServerFonts] = useState([])
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const fontInputRef = useRef(null)

  useEffect(() => {
    listFonts().then(setServerFonts).catch(() => {})
  }, [])

  const handleFontUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const result = await uploadFont(file)
      const fontFace = new FontFace(file.name.replace(/\.[^.]+$/, ''), `url(${result.url})`)
      await fontFace.load()
      document.fonts.add(fontFace)
      addCustomFont(result)
      setServerFonts(prev => [...prev, result])
      setStyle({ fontFamily: file.name.replace(/\.[^.]+$/, ''), customFontPath: result.path })
    } catch (e) {
      alert('Font upload failed: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handleSaveTemplate = () => {
    if (!saveName.trim()) return
    saveCustomTemplate(saveName.trim())
    setSaveName('')
    setShowSaveInput(false)
  }

  return (
    <div className="style-step">
      {/* Left: Style controls */}
      <div className="style-sidebar">
        {/* Templates */}
        <section className="style-section">
          <h3 className="section-title">Templates</h3>
          <div className="template-grid">
            {Object.entries(templates).map(([key, t]) => (
              <button
                key={key}
                className={`template-chip ${style.template === key ? 'active' : ''}`}
                onClick={() => applyTemplate(key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {!showSaveInput ? (
            <button className="btn-ghost" onClick={() => setShowSaveInput(true)}>+ Save current as template</button>
          ) : (
            <div className="save-row">
              <input
                className="field-input"
                placeholder="Template name…"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                autoFocus
              />
              <button className="btn-xs btn-accent" onClick={handleSaveTemplate}>Save</button>
              <button className="btn-xs" onClick={() => setShowSaveInput(false)}>✕</button>
            </div>
          )}
        </section>

        {/* Font */}
        <section className="style-section">
          <h3 className="section-title">Font</h3>

          <label className="field-label">Family</label>
          <select
            className="field-select"
            value={style.fontFamily}
            onChange={e => setStyle({ fontFamily: e.target.value, customFontPath: null })}
          >
            <optgroup label="System Fonts">
              {SYSTEM_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </optgroup>
            {serverFonts.length > 0 && (
              <optgroup label="Uploaded Fonts">
                {serverFonts.map(f => (
                  <option key={f.filename} value={f.filename.replace(/\.[^.]+$/, '')}>
                    {f.filename}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <button className="btn-ghost" onClick={() => fontInputRef.current?.click()}>
            ⬆ Upload custom font (.ttf / .otf)
          </button>
          <input ref={fontInputRef} type="file" accept=".ttf,.otf" style={{display:'none'}} onChange={handleFontUpload} />

          <label className="field-label" style={{marginTop:12}}>Size</label>
          <div className="range-row">
            <input type="range" min="20" max="120" step="2"
              value={style.fontSize}
              onChange={e => setStyle({ fontSize: Number(e.target.value) })}
              className="range-input"
            />
            <span className="range-val">{style.fontSize}px</span>
          </div>

          <div className="toggle-row">
            <label className="toggle-label">
              <input type="checkbox" checked={style.bold} onChange={e => setStyle({bold: e.target.checked})} />
              <strong>Bold</strong>
            </label>
            <label className="toggle-label">
              <input type="checkbox" checked={style.italic} onChange={e => setStyle({italic: e.target.checked})} />
              <em>Italic</em>
            </label>
          </div>

          <label className="field-label" style={{marginTop:12}}>Color</label>
          <ColorSwatch
            color={style.fontColor}
            active={colorTarget === 'fontColor'}
            onClick={() => setColorTarget(colorTarget === 'fontColor' ? null : 'fontColor')}
          />
          {colorTarget === 'fontColor' && (
            <HexColorPicker color={style.fontColor} onChange={c => setStyle({fontColor: c})} className="color-picker" />
          )}
        </section>

        {/* Background */}
        <section className="style-section">
          <h3 className="section-title">Background</h3>
          <div className="btn-group">
            {BG_TYPES.map(b => (
              <button
                key={b.value}
                className={`seg-btn ${style.backgroundType === b.value ? 'active' : ''}`}
                onClick={() => setStyle({backgroundType: b.value})}
              >
                {b.label}
              </button>
            ))}
          </div>

          {style.backgroundType !== 'none' && (
            <>
              <label className="field-label" style={{marginTop:12}}>Color</label>
              <ColorSwatch
                color={style.backgroundColor}
                active={colorTarget === 'bgColor'}
                onClick={() => setColorTarget(colorTarget === 'bgColor' ? null : 'bgColor')}
              />
              {colorTarget === 'bgColor' && (
                <HexColorPicker color={style.backgroundColor} onChange={c => setStyle({backgroundColor: c})} className="color-picker" />
              )}

              {style.backgroundType === 'semi_transparent' && (
                <>
                  <label className="field-label" style={{marginTop:10}}>Opacity</label>
                  <div className="range-row">
                    <input type="range" min="0.1" max="1" step="0.05"
                      value={style.backgroundOpacity}
                      onChange={e => setStyle({backgroundOpacity: Number(e.target.value)})}
                      className="range-input"
                    />
                    <span className="range-val">{Math.round(style.backgroundOpacity * 100)}%</span>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* Highlight */}
        <section className="style-section">
          <h3 className="section-title">Word Highlight</h3>
          <p className="hint-text">Color applied to the current word being spoken.</p>
          <ColorSwatch
            color={style.highlightColor}
            active={colorTarget === 'highlightColor'}
            onClick={() => setColorTarget(colorTarget === 'highlightColor' ? null : 'highlightColor')}
          />
          {colorTarget === 'highlightColor' && (
            <HexColorPicker color={style.highlightColor} onChange={c => setStyle({highlightColor: c})} className="color-picker" />
          )}
        </section>

        {/* Position */}
        <section className="style-section">
          <h3 className="section-title">Position</h3>
          <div className="btn-group">
            {POSITIONS.map(p => (
              <button
                key={p.value}
                className={`seg-btn ${style.position === p.value ? 'active' : ''}`}
                onClick={() => setStyle({position: p.value})}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Right: Live preview */}
      <div className="style-main">
        <CaptionPreview videoUrl={videoUrl} words={words} style={style} />

        <button
          className="btn-primary continue-btn"
          onClick={() => setActiveStep('export')}
        >
          Continue to Export →
        </button>
      </div>
    </div>
  )
}

function ColorSwatch({ color, active, onClick }) {
  return (
    <button
      className={`color-swatch ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{ '--swatch-color': color }}
    >
      <span className="swatch-dot" />
      <span className="swatch-hex">{color}</span>
      <span className="swatch-arrow">{active ? '▲' : '▼'}</span>
    </button>
  )
}
