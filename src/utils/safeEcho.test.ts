/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { safeEcho } from './safeEcho'

describe('Is thenable', () => {
  it('use literal', async () => {
    const num = 1
    expect(safeEcho(num, true)).toBe(1)
    expect(safeEcho(num, false)).toBe(1)
  })

  it('use object', async () => {
    const obj = { v: 100, s: 'string' }
    expect(safeEcho(obj, true)).toStrictEqual(obj)
    expect(safeEcho(obj, false)).toStrictEqual(obj)
  })

  it('use class object', async () => {
    const obj = new (class {
      v: number = 100
      s: string = 'string'
      test(): string {
        return this.s
      }
    })()

    expect(safeEcho(obj, true)).toStrictEqual(obj)

    const copyObject = safeEcho(obj, false)
    expect(copyObject.v).toBe(100)
    expect(copyObject.s).toBe('string')
    expect(Object.keys(copyObject).length).toBe(2)
  })
})
