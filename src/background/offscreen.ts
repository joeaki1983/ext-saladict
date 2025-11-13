import { message } from '@/_helpers/browser-api'
import { Message, MessageResponse } from '@/typings/message'

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html'

let creatingOffscreenDocument: Promise<void> | null = null

async function createOffscreenDocument(): Promise<void> {
  const chromeAPI = (globalThis as typeof globalThis & { chrome?: any }).chrome
  const offscreen = chromeAPI?.offscreen

  if (!offscreen) {
    throw new Error('Offscreen document API is not available in this environment.')
  }

  if (creatingOffscreenDocument) {
    return creatingOffscreenDocument
  }

  creatingOffscreenDocument = (async () => {
    const hasDocument = (await offscreen.hasDocument?.()) ?? false

    if (!hasDocument) {
      await offscreen.createDocument({
        url: browser.runtime.getURL(OFFSCREEN_DOCUMENT_PATH),
        reasons: offscreen.Reason
          ? [offscreen.Reason.AUDIO_PLAYBACK, offscreen.Reason.CLIPBOARD]
          : ['AUDIO_PLAYBACK', 'CLIPBOARD'],
        justification:
          'Provide audio playback and clipboard features for Saladict in Manifest V3.'
      })
    }
  })()

  try {
    await creatingOffscreenDocument
  } finally {
    creatingOffscreenDocument = null
  }
}

export async function ensureOffscreenDocument(): Promise<void> {
  try {
    await createOffscreenDocument()
  } catch (error) {
    if (process.env.DEBUG) {
      console.warn(error)
    }
    throw error
  }
}

export async function sendOffscreenMessage<T extends Message>(
  msg: T
): Promise<MessageResponse<T['type']>> {
  await ensureOffscreenDocument()
  return message.send(msg)
}
