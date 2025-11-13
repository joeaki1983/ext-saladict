import { openUrl } from '@/_helpers/browser-api'
import { sendOffscreenMessage } from './offscreen'

export async function copyTextToClipboard(text: string): Promise<void> {
  if (
    !(await browser.permissions.contains({ permissions: ['clipboardWrite'] }))
  ) {
    openUrl(
      '/options.html?menuselected=Permissions&missing_permission=clipboardWrite',
      true
    )
    return
  }

  try {
    await sendOffscreenMessage({
      type: 'OFFSCREEN_COPY_TEXT',
      payload: { text }
    })
  } catch (error) {
    if (process.env.DEBUG) {
      console.warn(error)
    }
  }
}

export async function getTextFromClipboard(): Promise<string> {
  if (
    !(await browser.permissions.contains({ permissions: ['clipboardRead'] }))
  ) {
    openUrl(
      '/options.html?menuselected=Permissions&missing_permission=clipboardRead',
      true
    )
    return ''
  }

  try {
    return (
      (await sendOffscreenMessage({ type: 'OFFSCREEN_READ_TEXT' })) || ''
    ) as string
  } catch (error) {
    if (process.env.DEBUG) {
      console.warn(error)
    }
    return ''
  }
}
