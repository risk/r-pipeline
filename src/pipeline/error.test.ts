/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { inputError, isError, thenableError } from './error'
import { HandlerResult } from './pipeTypes'

describe('error parts', () => {
  it('make thenable error', () => {
    const error = thenableError('thenable')
    expect(error.kind).toBe('error')
    if (error.kind === 'error') {
      expect(error.value.error.message).toBe('Cannot use thenable function. Please use streamAsync()')
      expect(error.value.origin).toBeNull()
      expect(error.value.stage).toBe('thenable')
    }
  })

  it('make input error', () => {
    const error = inputError('input')
    expect(error.kind).toBe('error')
    if (error.kind === 'error') {
      expect(error.value.error.message).toBe('Pipeline input data is null')
      expect(error.value.origin).toBeNull()
      expect(error.value.stage).toBe('input')
    }
  })

  it('Handler Result is success', () => {
    const result: HandlerResult<number> = 1
    expect(result).toBe(1)
    expect(isError(result)).toBeFalsy()
  })

  it('Handler Result is error', () => {
    const result: HandlerResult<number> = new Error()
    expect(isError(result)).toBeTruthy()
  })
})
