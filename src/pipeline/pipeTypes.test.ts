/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, isHandlerError, isHandlerSuccess, makePipeError, makePipeSuccess } from './pipeTypes'

describe('pipeTypes helper function', () => {
  describe('isHandlerError', () => {
    it('isHandlerError return true', () => {
      const result: HandlerResult<string> = new Error('test')
      expect(isHandlerError(result)).toBeTruthy()
    })
    it('isHandlerError return false', () => {
      const result: HandlerResult<string> = 'test'
      expect(isHandlerError(result)).toBeFalsy()
    })
  })

  describe('isHandlerSuccess', () => {
    it('isHandlerError return true', () => {
      const result: HandlerResult<string> = new Error('test')
      expect(isHandlerSuccess(result)).toBeFalsy()
    })
    it('isHandlerError return false', () => {
      const result: HandlerResult<string> = 'test'
      expect(isHandlerSuccess(result)).toBeTruthy()
    })
  })

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
