import React from 'react'
import { useStore } from './store/useStore'
import UploadStep from './components/editor/UploadStep'
import TranscribeStep from './components/editor/TranscribeStep'
import StyleStep from './components/editor/StyleStep'
import ExportStep from './components/editor/ExportStep'
import StepNav from './components/ui/StepNav'
import './styles/app.css'

const STEPS = [
  { id: 'upload',     label: 'Upload',      icon: '⬆' },
  { id: 'transcribe', label: 'Transcribe',  icon: '🎙' },
  { id: 'style',      label: 'Style',       icon: '✏' },
  { id: 'export',     label: 'Export',      icon: '⬇' },
]

export default function App() {
  const { activeStep } = useStore()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-mark">◈</span>
          <span className="logo-text">Caption Studio</span>
        </div>
        <StepNav steps={STEPS} />
        <div className="header-spacer" />
      </header>

      <main className="app-main">
        {activeStep === 'upload'     && <UploadStep />}
        {activeStep === 'transcribe' && <TranscribeStep />}
        {activeStep === 'style'      && <StyleStep />}
        {activeStep === 'export'     && <ExportStep />}
      </main>
    </div>
  )
}
