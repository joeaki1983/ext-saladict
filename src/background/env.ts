export {}

const globalScope = globalThis as typeof globalThis &
  Window & {
    __SALADICT_INTERNAL_PAGE__?: boolean
    __SALADICT_BACKGROUND_PAGE__?: boolean
  }

if (typeof globalScope.window === 'undefined') {
  ;(globalScope as any).window = globalScope
}

globalScope.__SALADICT_INTERNAL_PAGE__ = true
globalScope.__SALADICT_BACKGROUND_PAGE__ = true
