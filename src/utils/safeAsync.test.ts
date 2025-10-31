/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { safeAsync } from './safeAsync'

describe('safeAsync', () => {
  it('async function', async () => {
    expect(await safeAsync(async () => 'async')).toBe('async')
  })
  it('sync function', async () => {
    expect(await safeAsync(() => 'sync')).toBe('sync')
  })
})
