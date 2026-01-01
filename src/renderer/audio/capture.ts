export interface AudioCaptureResult {
  stream: MediaStream
  audioContext: AudioContext
  analyser: AnalyserNode
  source: MediaStreamAudioSourceNode
}

/**
 * Capture system audio using ScreenCaptureKit via getDisplayMedia.
 * Requires macOS 13.2+ - the main process enables the necessary Chromium flags.
 */
export async function captureSystemAudio(): Promise<AudioCaptureResult> {
  // Request display media with audio and video
  // Video is required by getDisplayMedia, but we only use the audio track
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true
  })

  // Stop video tracks - we only need audio
  stream.getVideoTracks().forEach(track => track.stop())

  // Check if we got an audio track
  const audioTracks = stream.getAudioTracks()
  if (audioTracks.length === 0) {
    throw new Error('NO_AUDIO_TRACK')
  }

  // Create audio context and analyser
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()

  // Configure analyser for high-resolution spectrum
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.5
  analyser.minDecibels = -90
  analyser.maxDecibels = -10

  source.connect(analyser)

  return {
    stream,
    audioContext,
    analyser,
    source
  }
}

export function stopCapture(capture: AudioCaptureResult): void {
  // Stop all tracks
  capture.stream.getTracks().forEach(track => track.stop())

  // Disconnect and close
  capture.source.disconnect()
  capture.audioContext.close()
}
