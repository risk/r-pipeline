/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../pipeline/pipeTypes'

import { makeLayer, stackLayer } from './layer'

interface TestContext {
  n: number
  s: string
}

describe('layer', () => {
  describe('sync layer', () => {
    it('entry and exit', () => {
      const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)

      const layer = makeLayer(mockEntry, mockExit)
      const layerStack = stackLayer(layer)
      const handler = layerStack(x => x.toString())

      const result = handler(1)
      expect(result).toBe('1')
      expect(mockEntry).toBeCalledTimes(1)
      expect(mockExit).toBeCalledTimes(1)
    })

    it('entry and exit with context', () => {
      const context: TestContext = {
        n: 100,
        s: 'test',
      }
      const mockEntry = vi.fn((input: Input<number>, _context?): HandlerResult<number> => input)
      const mockExit = vi.fn((output: HandlerResult<string>, _context?): HandlerResult<string> => output)

      const layer = makeLayer(mockEntry, mockExit, context)
      const layerStack = stackLayer(layer)
      const handler = layerStack(x => x.toString())

      const result = handler(1)
      expect(result).toBe('1')
      expect(mockEntry).toBeCalledTimes(1)
      expect(mockEntry).toHaveBeenCalledWith(1, context)
      expect(mockExit).toBeCalledTimes(1)
      expect(mockExit).toHaveBeenCalledWith('1', context)
    })

    it('layer stacking', () => {
      const contextLow: TestContext = {
        n: 100,
        s: 'test Low',
      }
      const mockLowEntry = vi.fn((input: Input<number>, _context?): HandlerResult<number> => input)
      const mockLowExit = vi.fn((output: HandlerResult<string>, _context?): HandlerResult<string> => output)

      const contextHigh: TestContext = {
        n: 200,
        s: 'test high',
      }
      const mockHighEntry = vi.fn((input: Input<number>, _context?): HandlerResult<number> => input)
      const mockHighExit = vi.fn((output: HandlerResult<string>, _context?): HandlerResult<string> => output)

      const mockHandler = vi.fn(x => x.toString())

      const lowLayer = makeLayer(mockLowEntry, mockLowExit, contextLow)
      const highLayer = makeLayer(mockHighEntry, mockHighExit, contextHigh)
      const layerStack = stackLayer([lowLayer, highLayer])
      const handler = layerStack(mockHandler)

      const result = handler(1)
      expect(result).toBe('1')

      expect(mockLowEntry).toHaveBeenNthCalledWith(1, 1, contextLow)
      expect(mockHighExit).toHaveBeenNthCalledWith(1, '1', contextHigh)
      expect(mockHandler).toHaveBeenNthCalledWith(1, 1)
      expect(mockHighEntry).toHaveBeenNthCalledWith(1, 1, contextHigh)
      expect(mockLowExit).toHaveBeenNthCalledWith(1, '1', contextLow)

      expect(mockLowEntry).toHaveBeenCalledBefore(mockHighEntry)
      expect(mockLowEntry).toHaveBeenCalledBefore(mockHighEntry)
      expect(mockHighEntry).toHaveBeenCalledBefore(mockHandler)
      expect(mockHandler).toHaveBeenCalledBefore(mockHighExit)
      expect(mockHighExit).toHaveBeenCalledBefore(mockLowExit)
    })
  })
})
