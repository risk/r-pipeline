/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { isThenable } from './isThenable'

describe('Is thenable', () => {
  it('Normal value', async () => {
    expect(isThenable(1)).toBeFalsy()
  })
  it('Normal undefined', async () => {
    expect(isThenable(undefined)).toBeFalsy()
  })
  it('Normal null', async () => {
    expect(isThenable(null)).toBeFalsy()
  })
  it('Normal object', async () => {
    expect(isThenable({})).toBeFalsy()
  })
  it('Promise value', async () => {
    expect(isThenable(Promise.resolve(1))).toBeTruthy()
  })
  it('Awaitable value', async () => {
    expect(isThenable({ then: () => {} })).toBeTruthy()
  })
  it('Object with non-function then', async () => {
    expect(isThenable({ then: 123 })).toBeFalsy()
  })
})
