/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { makePipeError, makePipeSuccess } from './pipeTypes'

describe('pipeTypes helper function', () => {
  it('makePipeSuccess', () => {
    const success = makePipeSuccess('success data')
    expect(success.kind).toBe('success')
    if (success.kind === 'success') {
      expect(success.value.value).toBe('success data')
    }
  })

  it('makePipeError', () => {
    const error = makePipeError(new Error('error'), 'input value', 'stage label')
    expect(error.kind).toBe('error')
    if (error.kind === 'error') {
      expect(error.value.error.message).toBe('error')
      expect(error.value.origin).toBe('input value')
      expect(error.value.stage).toBe('stage label')
    }
  })
})
