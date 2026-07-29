import { create } from 'zustand'

const DEFAULT_STYLE = {
  fontFamily: 'Arial',
  fontSize: 48,
  fontColor: '#FFFFFF',
  bold: false,
  italic: false,
  backgroundType: 'semi_transparent', // none | solid | semi_transparent | blur
  backgroundColor: '#000000',
  backgroundOpacity: 0.6,
  position: 'bottom',  // top | center | bottom | custom
  positionX: 0.5,
  positionY: 0.9,
  highlightColor: '#F5C842',
  customFontPath: null,
  template: 'default',
}

const TEMPLATES = {
  default:      { ...DEFAULT_STYLE, label: 'Default White' },
  bold_yellow:  { ...DEFAULT_STYLE, label: 'Bold Yellow', fontColor: '#FFD700', bold: true, fontSize: 56, backgroundType: 'none' },
  minimal_white:{ ...DEFAULT_STYLE, label: 'Minimal White', backgroundType: 'none', fontSize: 40 },
  neon_glow:    { ...DEFAULT_STYLE, label: 'Neon Glow', fontColor: '#00FFAA', backgroundColor: '#001A11', backgroundOpacity: 0.75, bold: true },
  dark_box:     { ...DEFAULT_STYLE, label: 'Dark Box', backgroundType: 'solid', backgroundColor: '#000000', backgroundOpacity: 1 },
  subtitle_pro: { ...DEFAULT_STYLE, label: 'Subtitle Pro', fontColor: '#FFFFFF', backgroundType: 'semi_transparent', backgroundColor: '#1A1A2E', backgroundOpacity: 0.8, fontSize: 44 },
}

export const useStore = create((set, get) => ({
  // Upload state
  jobId: null,
  videoFile: null,
  videoUrl: null,
  videoInfo: null,
  setVideoFile: (file, url, info) => set({ videoFile: file, videoUrl: url, videoInfo: info }),
  setJobId: (id) => set({ jobId: id }),

  // Transcription state
  transcriptionStatus: 'idle', // idle | loading | done | error
  words: [],
  sentences: [],
  language: 'auto',
  modelSize: 'large-v3',
  transcriptionError: null,
  setTranscriptionStatus: (s) => set({ transcriptionStatus: s }),
  setTranscription: (words, sentences) => set({ words, sentences, transcriptionStatus: 'done' }),
  setTranscriptionError: (e) => set({ transcriptionError: e, transcriptionStatus: 'error' }),
  setLanguage: (l) => set({ language: l }),
  setModelSize: (m) => set({ modelSize: m }),
  updateWord: (index, newText) => set((state) => {
    const updated = [...state.words]
    updated[index] = { ...updated[index], word: newText }
    return { words: updated }
  }),

  // Silence removal state
  silenceThreshold: -40,
  minSilenceDuration: 0.5,
  silenceSegments: [],
  silenceRemoved: false,
  silenceSummary: null,
  trimmedVideoUrl: null,
  setSilenceThreshold: (v) => set({ silenceThreshold: v }),
  setMinSilenceDuration: (v) => set({ minSilenceDuration: v }),
  setSilenceResult: (segments, summary, url) => set({
    silenceSegments: segments,
    silenceSummary: summary,
    trimmedVideoUrl: url,
    silenceRemoved: true,
  }),

  // Caption style
  style: { ...DEFAULT_STYLE },
  templates: TEMPLATES,
  setStyle: (partial) => set((state) => ({ style: { ...state.style, ...partial } })),
  applyTemplate: (key) => {
    const t = TEMPLATES[key]
    if (t) set((state) => ({ style: { ...state.style, ...t, template: key } }))
  },
  saveCustomTemplate: (name) => {
    const style = get().style
    set((state) => ({
      templates: {
        ...state.templates,
        [name]: { ...style, label: name },
      },
    }))
  },

  // Custom fonts
  customFonts: [],
  addCustomFont: (font) => set((state) => ({ customFonts: [...state.customFonts, font] })),

  // Export state
  exportStatus: 'idle', // idle | loading | done | error
  exportResult: null,
  exportResolution: '1080p',
  exportAspectRatio: '16:9',
  setExportStatus: (s) => set({ exportStatus: s }),
  setExportResult: (r) => set({ exportResult: r, exportStatus: 'done' }),
  setExportResolution: (r) => set({ exportResolution: r }),
  setExportAspectRatio: (a) => set({ exportAspectRatio: a }),

  // Active step
  activeStep: 'upload', // upload | transcribe | style | export
  setActiveStep: (s) => set({ activeStep: s }),

  // Video player state
  currentTime: 0,
  setCurrentTime: (t) => set({ currentTime: t }),
}))

export { TEMPLATES }