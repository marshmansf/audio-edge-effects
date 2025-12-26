export interface AudioCaptureResult {
  stream: MediaStream
  audioContext: AudioContext
  analyser: AnalyserNode
  source: MediaStreamAudioSourceNode
}

export async function getAudioDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter(device => device.kind === 'audioinput')
}

export async function findBlackHoleDevice(): Promise<MediaDeviceInfo | null> {
  const devices = await getAudioDevices()

  // Look for BlackHole device
  const blackhole = devices.find(d =>
    d.label.toLowerCase().includes('blackhole')
  )

  if (blackhole) {
    return blackhole
  }

  // Fallback: look for any virtual audio device or loopback
  const virtualDevice = devices.find(d =>
    d.label.toLowerCase().includes('loopback') ||
    d.label.toLowerCase().includes('virtual') ||
    d.label.toLowerCase().includes('soundflower')
  )

  return virtualDevice || null
}

export async function captureAudio(deviceId?: string): Promise<AudioCaptureResult> {
  // If no device specified, try to find BlackHole
  let targetDeviceId = deviceId

  if (!targetDeviceId) {
    const blackhole = await findBlackHoleDevice()
    if (blackhole) {
      targetDeviceId = blackhole.deviceId
      console.log('Found audio device:', blackhole.label)
    }
  }

  // Request audio stream
  const constraints: MediaStreamConstraints = {
    audio: targetDeviceId
      ? { deviceId: { exact: targetDeviceId } }
      : true,
    video: false
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints)

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
