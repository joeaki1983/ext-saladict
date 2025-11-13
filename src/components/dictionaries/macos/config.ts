import { DictItem } from '@/app-config/dicts'

export type MacOSConfig = DictItem

export default (): MacOSConfig => ({
  lang: '11111111',
  selectionLang: {
    english: true,
    chinese: true,
    japanese: true,
    korean: true,
    french: true,
    spanish: true,
    deutsch: true,
    others: true
  },
  defaultUnfold: {
    english: true,
    chinese: true,
    japanese: true,
    korean: true,
    french: true,
    spanish: true,
    deutsch: true,
    others: true
  },
  preferredHeight: 240,
  selectionWC: {
    min: 1,
    max: 999999999
  },
  options: {
    rate: {
      type: 'number' as const,
      default: 1.2,
      min: 0.1,
      max: 10.0,
      step: 0.1
    },
    pitch: {
      type: 'number' as const,
      default: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.1
    },
    volume: {
      type: 'number' as const,
      default: 0.9,
      min: 0.0,
      max: 1.0,
      step: 0.1
    },
    voiceURI: {
      type: 'string' as const,
      default: ''
    }
  }
})
