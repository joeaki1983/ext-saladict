import { timer } from '@/_helpers/promise-more'

/**
 * To make sure only one audio plays at a time
 */
export class AudioManager {
  private static instance: AudioManager

  static getInstance() {
    return AudioManager.instance || (AudioManager.instance = new AudioManager())
  }

  // singleton
  // eslint-disable-next-line no-useless-constructor
  private constructor() {}

  private audio?: HTMLAudioElement

  currentSrc?: string

  reset() {
    // Stop Web Speech API
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.audio.src = ''
      this.audio.onended = null
    }
    this.currentSrc = ''
  }

  load(src: string): HTMLAudioElement {
    this.reset()
    this.currentSrc = src
    return (this.audio = new Audio(src))
  }

  async play(src?: string): Promise<void> {
    if (!src || src === this.currentSrc) {
      this.reset()
      return
    }

    // Check if this is a macOS TTS URL
    if (src.startsWith('macos-tts://')) {
      return this.playMacOSTTS(src)
    }

    const audio = this.load(src)

    const onEnd = Promise.race([
      new Promise(resolve => {
        audio.onended = resolve
      }),
      timer(20000)
    ])

    await audio.play()
    await onEnd

    this.currentSrc = ''
  }

  private async playMacOSTTS(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop current audio
        this.reset()

        // Parse URL
        const urlObj = new URL(url)
        const text = decodeURIComponent(urlObj.hostname)
        const params = new URLSearchParams(urlObj.search)

        const voiceURI = params.get('voice') || ''
        const rate = parseFloat(params.get('rate') || '1.0')
        const pitch = parseFloat(params.get('pitch') || '1.0')
        const volume = parseFloat(params.get('volume') || '1.0')

        // Check if Web Speech API is supported
        if (!window.speechSynthesis) {
          reject(new Error('Web Speech API not supported'))
          return
        }

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text)

        // Get voices and select the specified one
        const voices = window.speechSynthesis.getVoices()

        // If voices list is empty, wait for it to load
        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            this.setupUtterance(utterance, voiceURI, rate, pitch, volume, resolve, reject)
          }
        } else {
          this.setupUtterance(utterance, voiceURI, rate, pitch, volume, resolve, reject)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private setupUtterance(
    utterance: SpeechSynthesisUtterance,
    voiceURI: string,
    rate: number,
    pitch: number,
    volume: number,
    resolve: () => void,
    reject: (error: any) => void
  ): void {
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.voiceURI === voiceURI)

    if (voice) {
      utterance.voice = voice
    }

    // Set parameters
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    // Event listeners
    utterance.onend = () => resolve()
    utterance.onerror = (event) => reject(event.error)

    // Play
    window.speechSynthesis.speak(utterance)
  }
}
