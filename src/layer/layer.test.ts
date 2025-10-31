/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../pipeline/pipeTypes'

import { makeAsyncLayer, makeLayer, stackAsyncLayer, stackLayer } from './layer'

interface TestContext {
  n: number
  s: string
}

describe('layer', () => {
  describe('Sync layer', () => {
    it('Entry and exit', () => {
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

    it('Entry and exit with context', () => {
      const context: TestContext = {
        n: 100,
        s: 'test',
      }
      const mockEntry = vi.fn((input: Input<number>, _context?): HandlerResult<number> => input)
      const mockExit = vi.fn((output: HandlerResult<string>, _context?): HandlerResult<string> => output)

      const layerWithContext = makeLayer(mockEntry, mockExit, context)
      const layerStack = stackLayer(layerWithContext)
      const handler = layerStack(x => x.toString())

      const result = handler(1)
      expect(result).toBe('1')
      expect(mockEntry).toBeCalledTimes(1)
      expect(mockEntry).toHaveBeenCalledWith(1, context)
      expect(mockExit).toBeCalledTimes(1)
      expect(mockExit).toHaveBeenCalledWith('1', context)
    })

    it('Layer stacking', () => {
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
      expect(mockHighEntry).toHaveBeenNthCalledWith(1, 1, contextHigh)
      expect(mockHandler).toHaveBeenNthCalledWith(1, 1)
      expect(mockHighExit).toHaveBeenNthCalledWith(1, '1', contextHigh)
      expect(mockLowExit).toHaveBeenNthCalledWith(1, '1', contextLow)

      expect(mockLowEntry).toHaveBeenCalledBefore(mockHighEntry)
      expect(mockHighEntry).toHaveBeenCalledBefore(mockHandler)
      expect(mockHandler).toHaveBeenCalledBefore(mockHighExit)
      expect(mockHighExit).toHaveBeenCalledBefore(mockLowExit)
    })
  })

  describe('Async layer', () => {
    it('Entry and exit', async () => {
      const mockAsyncEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => input)
      const mockAsyncExit = vi.fn(async (output: HandlerResult<string>): Promise<HandlerResult<string>> => output)

      const layer = makeAsyncLayer(mockAsyncEntry, mockAsyncExit)
      const asyncLayerStack = stackAsyncLayer(layer)
      const handler = asyncLayerStack(async x => x.toString())

      const result = await handler(1)
      expect(result).toBe('1')
      expect(mockAsyncEntry).toBeCalledTimes(1)
      expect(mockAsyncExit).toBeCalledTimes(1)
    })

    it('Entry and exit with context', async () => {
      const context: TestContext = {
        n: 100,
        s: 'test',
      }
      const mockAsyncEntry = vi.fn(async (input: Input<number>, _context?): Promise<HandlerResult<number>> => input)
      const mockAsyncExit = vi.fn(
        async (output: HandlerResult<string>, _context?): Promise<HandlerResult<string>> => output
      )

      const layerWithContext = makeAsyncLayer(mockAsyncEntry, mockAsyncExit, context)
      const asyncLayerStack = stackAsyncLayer(layerWithContext)
      const handler = asyncLayerStack(x => x.toString())

      const result = await handler(1)
      expect(result).toBe('1')
      expect(mockAsyncEntry).toBeCalledTimes(1)
      expect(mockAsyncEntry).toHaveBeenCalledWith(1, context)
      expect(mockAsyncExit).toBeCalledTimes(1)
      expect(mockAsyncExit).toHaveBeenCalledWith('1', context)
    })

    it('Layer stacking', async () => {
      const contextLow: TestContext = {
        n: 100,
        s: 'test Low',
      }
      const mockAsyncLowEntry = vi.fn(async (input: Input<number>, _context?): Promise<HandlerResult<number>> => input)
      const mockAsyncLowExit = vi.fn(
        async (output: HandlerResult<string>, _context?): Promise<HandlerResult<string>> => output
      )

      const contextHigh: TestContext = {
        n: 200,
        s: 'test high',
      }
      const mockAsyncHighEntry = vi.fn(async (input: Input<number>, _context?): Promise<HandlerResult<number>> => input)
      const mockAsyncHighExit = vi.fn(
        async (output: HandlerResult<string>, _context?): Promise<HandlerResult<string>> => output
      )

      const mockAsyncHandler = vi.fn(async x => x.toString())

      const lowAsyncLayer = makeAsyncLayer(mockAsyncLowEntry, mockAsyncLowExit, contextLow)
      const highAsyncLayer = makeAsyncLayer(mockAsyncHighEntry, mockAsyncHighExit, contextHigh)
      const asyncLayerStack = stackAsyncLayer([lowAsyncLayer, highAsyncLayer])
      const handler = asyncLayerStack(mockAsyncHandler)

      const result = await handler(1)
      expect(result).toBe('1')

      expect(mockAsyncLowEntry).toHaveBeenNthCalledWith(1, 1, contextLow)
      expect(mockAsyncHighEntry).toHaveBeenNthCalledWith(1, 1, contextHigh)
      expect(mockAsyncHandler).toHaveBeenNthCalledWith(1, 1)
      expect(mockAsyncHighExit).toHaveBeenNthCalledWith(1, '1', contextHigh)
      expect(mockAsyncLowExit).toHaveBeenNthCalledWith(1, '1', contextLow)

      expect(mockAsyncLowEntry).toHaveBeenCalledBefore(mockAsyncHighEntry)
      expect(mockAsyncHighEntry).toHaveBeenCalledBefore(mockAsyncHandler)
      expect(mockAsyncHandler).toHaveBeenCalledBefore(mockAsyncHighExit)
      expect(mockAsyncHighExit).toHaveBeenCalledBefore(mockAsyncLowExit)
    })
  })

  describe('Mix layer', () => {
    it('Low Async High Sync Layer stacking', async () => {
      const contextLow: TestContext = {
        n: 100,
        s: 'test Low',
      }
      const mockAsyncLowEntry = vi.fn(async (input: Input<number>, _context?): Promise<HandlerResult<number>> => input)
      const mockAsyncLowExit = vi.fn(
        async (output: HandlerResult<string>, _context?): Promise<HandlerResult<string>> => output
      )

      const contextHigh: TestContext = {
        n: 200,
        s: 'test high',
      }
      const mockHighEntry = vi.fn((input: Input<number>, _context?): HandlerResult<number> => input)
      const mockHighExit = vi.fn((output: HandlerResult<string>, _context?): HandlerResult<string> => output)

      const mockAsyncHandler = vi.fn(async x => x.toString())

      const lowAsyncLayer = makeAsyncLayer(mockAsyncLowEntry, mockAsyncLowExit, contextLow)
      const highLayer = makeLayer(mockHighEntry, mockHighExit, contextHigh)
      const asyncLayerStack = stackAsyncLayer([lowAsyncLayer, highLayer])
      const handler = asyncLayerStack(mockAsyncHandler)

      const result = await handler(1)
      expect(result).toBe('1')

      expect(mockAsyncLowEntry).toHaveBeenNthCalledWith(1, 1, contextLow)
      expect(mockHighEntry).toHaveBeenNthCalledWith(1, 1, contextHigh)
      expect(mockAsyncHandler).toHaveBeenNthCalledWith(1, 1)
      expect(mockHighExit).toHaveBeenNthCalledWith(1, '1', contextHigh)
      expect(mockAsyncLowExit).toHaveBeenNthCalledWith(1, '1', contextLow)

      expect(mockAsyncLowEntry).toHaveBeenCalledBefore(mockHighEntry)
      expect(mockHighEntry).toHaveBeenCalledBefore(mockAsyncHandler)
      expect(mockAsyncHandler).toHaveBeenCalledBefore(mockHighExit)
      expect(mockHighExit).toHaveBeenCalledBefore(mockAsyncLowExit)
    })
  })

  describe('Error cases', () => {
    it('Low entry return error', () => {
      const mockLowEntry = vi.fn((_input: Input<number>): HandlerResult<number> => new Error('error'))
      const mockLowExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
      const mockHighEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockHighExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)

      const mockHandler = vi.fn(x => x.toString())

      const lowLayer = makeLayer(mockLowEntry, mockLowExit)
      const highLayer = makeLayer(mockHighEntry, mockHighExit)
      const layerStack = stackLayer([lowLayer, highLayer])
      const handler = layerStack(mockHandler)

      const result = handler(1)
      expect(result).toBeInstanceOf(Error)
      if (result instanceof Error) {
        expect(result.message).toBe('error')
      }

      expect(mockLowEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHighEntry).not.toBeCalled()
      expect(mockHandler).not.toBeCalled()
      expect(mockHighExit).not.toBeCalled()
      expect(mockLowExit).not.toBeCalled()
    })

    it('High entry return thenable error', async () => {
      const mockLowEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockLowExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
      const mockHighEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => input)
      const mockHighExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)

      const mockHandler = vi.fn(x => x.toString())

      const lowLayer = makeLayer(mockLowEntry, mockLowExit)
      const highAsyncLayer = makeAsyncLayer(mockHighEntry, mockHighExit)
      const layerStack = stackLayer([lowLayer, highAsyncLayer])
      const handler = layerStack(mockHandler)

      const result = handler(1)
      expect(result).toBeInstanceOf(Error)
      console.log(result)
      if (result instanceof Error) {
        expect(result.message).toBe('[layer(2):entry]Cannot use thenable function. Please use stackAsyncLayer()')
      }

      expect(mockLowEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHighEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHandler).not.toBeCalled()
      expect(mockHighExit).not.toBeCalled()
      expect(mockLowExit).not.toBeCalled()
    })

    it('handler return error', () => {
      const mockLowEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockLowExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
      const mockHighEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockHighExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)

      const mockHandler = vi.fn(_x => new Error('error'))

      const lowLayer = makeLayer(mockLowEntry, mockLowExit)
      const highLayer = makeLayer(mockHighEntry, mockHighExit)
      const layerStack = stackLayer([lowLayer, highLayer])
      const handler = layerStack(mockHandler)

      const result = handler(1)
      expect(result).toBeInstanceOf(Error)
      console.log(result)
      if (result instanceof Error) {
        expect(result.message).toBe('error')
      }

      expect(mockLowEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHighEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHandler).toHaveBeenCalledWith(1)
      expect(mockHighExit).toHaveBeenCalledWith(new Error('error'), undefined)
      expect(mockLowExit).toHaveBeenCalledWith(new Error('error'), undefined)
    })

    it('High entry return thenable error(use layerStack)', () => {
      const mockLowEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockLowExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
      const mockHighEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockHighExit = vi.fn(async (output: HandlerResult<string>): Promise<HandlerResult<string>> => output)

      const mockHandler = vi.fn(x => x.toString())

      const lowLayer = makeLayer(mockLowEntry, mockLowExit)
      const highLayer = makeAsyncLayer(mockHighEntry, mockHighExit)
      const layerStack = stackLayer([lowLayer, highLayer])
      const handler = layerStack(mockHandler)

      const result = handler(1)
      expect(result).toBeInstanceOf(Error)
      if (result instanceof Error) {
        expect(result.message).toBe('[layer(2):entry]Cannot use thenable function. Please use stackAsyncLayer()')
      }

      expect(mockLowEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHighEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHandler).not.toBeCalled()
      expect(mockHighExit).not.toBeCalled()
      expect(mockLowExit).not.toBeCalled()
    })

    it('Async Low entry return error', async () => {
      const mockLowEntry = vi.fn(async (_input: Input<number>): Promise<HandlerResult<number>> => new Error('error'))
      const mockLowExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
      const mockHighEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockHighExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)

      const mockHandler = vi.fn(x => x.toString())

      const lowAsyncLayer = makeAsyncLayer(mockLowEntry, mockLowExit)
      const highLayer = makeLayer(mockHighEntry, mockHighExit)
      const layerStack = stackAsyncLayer([lowAsyncLayer, highLayer])
      const handler = layerStack(mockHandler)

      const result = await handler(1)
      expect(result).toBeInstanceOf(Error)
      console.log(result)
      if (result instanceof Error) {
        expect(result.message).toBe('error')
      }

      expect(mockLowEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHighEntry).not.toBeCalled()
      expect(mockHandler).not.toBeCalled()
      expect(mockHighExit).not.toBeCalled()
      expect(mockLowExit).not.toBeCalled()
    })

    it('Async handler return error', async () => {
      const mockLowEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => input)
      const mockLowExit = vi.fn(async (output: HandlerResult<string>): Promise<HandlerResult<string>> => output)
      const mockHighEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
      const mockHighExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)

      const mockHandler = vi.fn(_x => new Error('error'))

      const lowAsyncLayer = makeAsyncLayer(mockLowEntry, mockLowExit)
      const highLayer = makeLayer(mockHighEntry, mockHighExit)
      const layerStack = stackAsyncLayer([lowAsyncLayer, highLayer])
      const handler = layerStack(mockHandler)

      const result = await handler(1)
      expect(result).toBeInstanceOf(Error)
      console.log(result)
      if (result instanceof Error) {
        expect(result.message).toBe('error')
      }

      expect(mockLowEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHighEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHandler).toHaveBeenCalledWith(1)
      expect(mockHighExit).toHaveBeenCalledWith(new Error('error'), undefined)
      expect(mockLowExit).toHaveBeenCalledWith(new Error('error'), undefined)
    })
  })
})
