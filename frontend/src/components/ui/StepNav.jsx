import React from 'react'
import { useStore } from '../../store/useStore'
import './StepNav.css'

export default function StepNav({ steps }) {
  const { activeStep, setActiveStep, jobId, words, transcriptionStatus } = useStore()

  const isUnlocked = (stepId) => {
    if (stepId === 'upload') return true
    if (stepId === 'transcribe') return !!jobId
    if (stepId === 'style') return transcriptionStatus === 'done'
    if (stepId === 'export') return transcriptionStatus === 'done'
    return false
  }

  const activeIdx = steps.findIndex(s => s.id === activeStep)

  return (
    <nav className="step-nav">
      {steps.map((step, idx) => {
        const unlocked = isUnlocked(step.id)
        const isActive = step.id === activeStep
        const isDone = idx < activeIdx && unlocked

        return (
          <React.Fragment key={step.id}>
            <button
              className={`step-btn ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${!unlocked ? 'locked' : ''}`}
              onClick={() => unlocked && setActiveStep(step.id)}
              disabled={!unlocked}
              title={!unlocked ? 'Complete previous steps first' : step.label}
            >
              <span className="step-icon">
                {isDone ? '✓' : step.icon}
              </span>
              <span className="step-label">{step.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`step-connector ${idx < activeIdx ? 'filled' : ''}`} />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
