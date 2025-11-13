import React, { FC } from 'react'
import Speaker from '@/components/Speaker'
import { MacOSResult } from './engine'
import { ViewPorps } from '@/components/dictionaries/helpers'

export const DictMacOS: FC<ViewPorps<MacOSResult>> = ({ result }) => {
  return (
    <div className="dict-macos">
      <div className="dict-macos-title">
        <span>macOS 系统语音</span>
        {result.audio && Object.keys(result.audio).length > 0 && (
          <Speaker src={Object.values(result.audio)[0] || ''} />
        )}
      </div>
      <div className="dict-macos-content">
        <div className="dict-macos-text">{result.text}</div>
        <div className="dict-macos-lang">语言: {result.lang}</div>
      </div>
    </div>
  )
}

export default DictMacOS
