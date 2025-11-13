import { timer } from '@/_helpers/promise-more'

class OffscreenAudioManager {
  private audio?: HTMLAudioElement
  private currentSrc?: string

  reset(): void {
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

  private load(src: string): HTMLAudioElement {
    this.reset()
    this.currentSrc = src
    this.audio = new Audio(src)
    return this.audio
  }

  async play(src: string): Promise<void> {
    if (!src || src === this.currentSrc) {
      this.reset()
      return
    }

    if (src.startsWith('macos-tts://')) {
      await this.playMacOSTTS(src)
      this.currentSrc = ''
      return
    }

    const audio = this.load(src)

    const onEnd = Promise.race<unknown>([
      new Promise(resolve => {
        audio.onended = resolve as () => void
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
        this.reset()

        const urlObj = new URL(url)
        const text = decodeURIComponent(urlObj.hostname)
        const params = new URLSearchParams(urlObj.search)

        const voiceURI = params.get('voice') || ''
        const rate = parseFloat(params.get('rate') || '1.0')
        const pitch = parseFloat(params.get('pitch') || '1.0')
        const volume = parseFloat(params.get('volume') || '1.0')

        if (!window.speechSynthesis) {
          reject(new Error('Web Speech API not supported'))
          return
        }

        const utterance = new SpeechSynthesisUtterance(text)
        const voices = window.speechSynthesis.getVoices()

        const setup = () =>
          this.setupUtterance(
            utterance,
            voiceURI,
            rate,
            pitch,
            volume,
            resolve,
            reject
          )

        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            setup()
            window.speechSynthesis.onvoiceschanged = null
          }
        } else {
          setup()
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

    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onend = () => resolve()
    utterance.onerror = event => reject(event.error)

    window.speechSynthesis.speak(utterance)
  }
}

const audioManager = new OffscreenAudioManager()

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.blur()
  document.body.removeChild(textarea)
}

async function readTextFromClipboard(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    return 'clipboard content'
  }

  if (navigator.clipboard?.readText) {
    try {
      return await navigator.clipboard.readText()
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(error)
      }
    }
  }

  const textarea = document.createElement('textarea')
  textarea.id = 'saladict-paste'
  document.body.appendChild(textarea)
  textarea.value = ''
  textarea.focus()
  document.execCommand('paste')
  const text = textarea.value || ''
  document.body.removeChild(textarea)
  return text
}

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'OFFSCREEN_PLAY_AUDIO':
      audioManager
        .play(msg.payload?.src || '')
        .then(() => sendResponse())
        .catch(error => {
          if (process.env.DEBUG) {
            console.warn(error)
          }
          sendResponse()
        })
      return true

    case 'OFFSCREEN_STOP_AUDIO':
      audioManager.reset()
      sendResponse()
      return false

    case 'OFFSCREEN_COPY_TEXT':
      copyTextToClipboard(msg.payload?.text || '')
        .then(() => sendResponse())
        .catch(error => {
          if (process.env.DEBUG) {
            console.warn(error)
          }
          sendResponse()
        })
      return true

    case 'OFFSCREEN_READ_TEXT':
      readTextFromClipboard()
        .then(text => sendResponse(text))
        .catch(error => {
          if (process.env.DEBUG) {
            console.warn(error)
          }
          sendResponse('')
        })
      return true
  }

  return false
})
