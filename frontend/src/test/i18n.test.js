import { describe, expect, it } from 'vitest'
import { dictionaries } from '../i18n'

describe('translation dictionaries',()=>{
  it('keeps the same application keys in every supported language',()=>{
    const expected=Object.keys(dictionaries.en).sort()
    for(const code of ['hi','gu','pa'])expect(Object.keys(dictionaries[code]).sort()).toEqual(expected)
  })

  it('contains translated dashboard labels',()=>{
    expect(dictionaries.hi.dashboard).toBe('डैशबोर्ड')
    expect(dictionaries.gu.dashboard).toBe('ડેશબોર્ડ')
    expect(dictionaries.pa.dashboard).toBe('ਡੈਸ਼ਬੋਰਡ')
  })
})
