import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 min for long transcription jobs
})

export const uploadVideo = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post('/video/upload', fd)
  return data
}

export const transcribeVideo = async (file, { language, modelSize }, onProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('language', language)
  fd.append('model_size', modelSize)
  const { data } = await api.post('/transcription/transcribe', fd, {
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data
}

export const detectSilence = async (jobId, threshold, minDuration) => {
  const fd = new FormData()
  fd.append('job_id', jobId)
  fd.append('silence_threshold', threshold)
  fd.append('min_silence_duration', minDuration)
  const { data } = await api.post('/video/detect-silence', fd)
  return data
}

export const removeSilence = async (jobId, threshold, minDuration) => {
  const fd = new FormData()
  fd.append('job_id', jobId)
  fd.append('silence_threshold', threshold)
  fd.append('min_silence_duration', minDuration)
  const { data } = await api.post('/video/remove-silence', fd)
  return data
}

export const uploadFont = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post('/fonts/upload', fd)
  return data
}

export const listFonts = async () => {
  const { data } = await api.get('/fonts/list')
  return data.fonts
}

export const renderVideo = async (payload) => {
  const { data } = await api.post('/export/render', payload)
  return data
}

export const generateSubtitle = async (jobId, words, format) => {
  const { data } = await api.post('/export/subtitle', { job_id: jobId, words, format })
  return data
}

export default api
