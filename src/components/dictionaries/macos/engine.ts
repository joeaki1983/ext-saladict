import { SearchFunction, GetSrcPageFunction } from '@/components/dictionaries/helpers'
import { DictSearchResult } from '@/typings/server'

export const getSrcPage: GetSrcPageFunction = () => {
  return 'https://support.apple.com/guide/mac-help/change-accessibility-speech-settings-mh27448/mac'
}

export interface MacOSResult {
  type: 'macos'
  text: string
  lang: string
  audio?: {
    us?: string
    uk?: string
    [key: string]: string | undefined
  }
}

type MacOSSearchResult = DictSearchResult<MacOSResult>

interface MacOSPayload {
  text: string
}

/**
 * 获取最佳匹配的系统语音
 * 优先使用系统默认语音，其次选择优化音质（Enhanced）语音
 */
function selectBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null

  // 标准化语言代码
  const normalizedLang = lang.toLowerCase().replace(/_/g, '-')
  const langPrefix = normalizedLang.split('-')[0]

  // 1. 优先使用系统默认语音（如果是英文的话）
  let voice = voices.find(v =>
    v.default && v.lang.toLowerCase().startsWith(langPrefix)
  )
  if (voice) return voice

  // 2. 选择 Ava（优化音质）- 高质量英文女声
  voice = voices.find(v =>
    v.name === 'Ava（优化音质）' ||
    v.name.toLowerCase().includes('ava') && v.name.includes('优化')
  )
  if (voice) return voice

  // 3. 选择 Evan（优化音质）- 最高质量的英文男声
  voice = voices.find(v =>
    v.name === 'Evan（优化音质）' ||
    v.name.toLowerCase().includes('evan') && v.name.includes('优化')
  )
  if (voice) return voice

  // 3. 选择任何包含"优化音质"的语音
  voice = voices.find(v =>
    v.lang.toLowerCase().startsWith(langPrefix) &&
    (v.name.includes('优化音质') || v.name.includes('优化'))
  )
  if (voice) return voice

  // 4. 选择 enhanced 或 premium 语音
  voice = voices.find(v =>
    v.lang.toLowerCase().startsWith(langPrefix) &&
    (v.voiceURI.toLowerCase().includes('enhanced') ||
     v.voiceURI.toLowerCase().includes('premium'))
  )
  if (voice) return voice

  // 5. 选择完全匹配的 compact 语音
  voice = voices.find(v =>
    v.lang.toLowerCase() === normalizedLang &&
    v.voiceURI.toLowerCase().includes('compact')
  )
  if (voice) return voice

  // 6. 选择语言前缀匹配的 compact 语音
  voice = voices.find(v =>
    v.lang.toLowerCase().startsWith(langPrefix) &&
    v.voiceURI.toLowerCase().includes('compact')
  )
  if (voice) return voice

  // 7. 选择完全匹配的任何语音
  voice = voices.find(v => v.lang.toLowerCase() === normalizedLang)
  if (voice) return voice

  // 8. 选择语言前缀匹配的任何语音
  voice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix))
  if (voice) return voice

  // 9. 默认使用英语 Samantha（如果可用）
  voice = voices.find(v =>
    v.voiceURI === 'com.apple.voice.compact.en-US.Samantha' ||
    v.name === 'Samantha'
  )
  if (voice) return voice

  // 10. 使用第一个英语语音
  voice = voices.find(v => v.lang.toLowerCase().startsWith('en'))
  if (voice) return voice

  // 11. 最后选择默认语音
  return voices[0] || null
}

/**
 * 检测文本语言
 */
function detectLanguage(text: string): string {
  // 检测中文
  if (/[\u4e00-\u9fa5]/.test(text)) {
    return 'zh-CN'
  }

  // 检测日文
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
    return 'ja-JP'
  }

  // 检测韩文
  if (/[\uac00-\ud7af]/.test(text)) {
    return 'ko-KR'
  }

  // 默认英文
  return 'en-US'
}

/**
 * 使用 Web Speech API 进行语音合成
 * 返回一个特殊的 audio URL，后续会被拦截处理
 */
export const search: SearchFunction<MacOSResult, MacOSPayload> = (
  text,
  config,
  profile,
  payload
) => {
  const targetText = payload?.text || text

  return new Promise((resolve, reject) => {
    // 检查浏览器是否支持 Web Speech API
    if (!window.speechSynthesis) {
      reject(new Error('Web Speech API not supported'))
      return
    }

    // 限制文本长度：只为单词或短语发音，不为长段落发音
    // 单词：一般不超过 20 个字符
    // 短语：一般不超过 5 个单词（约 50 个字符）
    const trimmedText = targetText.trim()
    const wordCount = trimmedText.split(/\s+/).length
    const charCount = trimmedText.length

    // 如果是长文本（超过 5 个单词或 50 个字符），不发音
    if (wordCount > 5 || charCount > 50) {
      // 返回空结果，不触发发音
      resolve({
        result: null,
        audio: undefined
      })
      return
    }

    // 检测语言
    const detectedLang = detectLanguage(targetText)

    // 获取可用的语音列表
    let voices = window.speechSynthesis.getVoices()

    // 如果语音列表为空，等待加载完成
    // 但在 background 页面中可能永远不会触发，所以添加超时
    if (voices.length === 0) {
      let resolved = false

      // 设置超时，如果 1 秒后还没有语音列表，使用默认配置
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          processVoiceWithFallback()
        }
      }, 1000)

      window.speechSynthesis.onvoiceschanged = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)
          voices = window.speechSynthesis.getVoices()
          processVoice()
        }
      }
    } else {
      processVoice()
    }

    function processVoiceWithFallback() {
      // 如果没有语音列表，使用配置中的 voiceURI 或默认值（优先 Evan 优化音质）
      const voiceURI = config.voiceURI || 'Evan（优化音质）'
      const lang = detectedLang

      const audioUrl = `macos-tts://${encodeURIComponent(targetText)}?` +
        `voice=${encodeURIComponent(voiceURI)}&` +
        `lang=${encodeURIComponent(lang)}&` +
        `rate=${config.rate || 1.0}&` +
        `pitch=${config.pitch || 1.0}&` +
        `volume=${config.volume || 1.0}`

      const result: MacOSSearchResult = {
        result: {
          type: 'macos',
          text: targetText,
          lang: lang,
          audio: {
            us: audioUrl,
            uk: audioUrl
          }
        },
        audio: {
          us: audioUrl,
          uk: audioUrl
        }
      }

      resolve(result)
    }

    function processVoice() {
      // 选择最佳语音
      const voice = config.voiceURI
        ? voices.find(v => v.voiceURI === config.voiceURI) || selectBestVoice(voices, detectedLang)
        : selectBestVoice(voices, detectedLang)

      if (!voice) {
        // 如果找不到合适的语音，使用 fallback
        processVoiceWithFallback()
        return
      }

      // 创建特殊的 URL 标记，包含所有必要的信息
      // 这个 URL 会被后续的音频播放逻辑识别并处理
      const audioUrl = `macos-tts://${encodeURIComponent(targetText)}?` +
        `voice=${encodeURIComponent(voice.voiceURI)}&` +
        `lang=${encodeURIComponent(voice.lang)}&` +
        `rate=${config.rate || 1.0}&` +
        `pitch=${config.pitch || 1.0}&` +
        `volume=${config.volume || 1.0}`

      const result: MacOSSearchResult = {
        result: {
          type: 'macos',
          text: targetText,
          lang: voice.lang,
          audio: {
            us: audioUrl,
            uk: audioUrl
          }
        },
        audio: {
          us: audioUrl,
          uk: audioUrl
        }
      }

      resolve(result)
    }
  })
}
