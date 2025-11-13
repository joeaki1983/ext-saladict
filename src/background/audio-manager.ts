import { sendOffscreenMessage } from './offscreen'

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

  currentSrc?: string

  async reset(): Promise<void> {
    if (!this.currentSrc) {
      try {
        await sendOffscreenMessage({ type: 'OFFSCREEN_STOP_AUDIO' })
      } catch (error) {
        if (process.env.DEBUG) {
          console.warn(error)
        }
      }
      return
    }

    this.currentSrc = ''

    try {
      await sendOffscreenMessage({ type: 'OFFSCREEN_STOP_AUDIO' })
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(error)
      }
    }
  }

  async play(src?: string): Promise<void> {
    if (!src || src === this.currentSrc) {
      await this.reset()
      return
    }

    this.currentSrc = src

    try {
      await sendOffscreenMessage({
        type: 'OFFSCREEN_PLAY_AUDIO',
        payload: { src }
      })
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(error)
      }
      throw error
    } finally {
      this.currentSrc = ''
    }
  }
}
