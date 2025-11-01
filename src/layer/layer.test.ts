/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../pipeline/pipeTypes'

import { makeAsyncLayer, makeLayer, stackAsyncLayer, stackLayer } from './layer'
import {
  EntryJudgeResult,
  entryJudgeResultContinue,
  ExitJudgeResult,
  exitJudgeResultContinue,
  LayerConditions,
} from './layerTypes'

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

    describe('onEntryJudge - sync', () => {
      it('continue: normal flow continues', () => {
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input + 1)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockEntryJudge = vi.fn(
          (_input: HandlerResult<number>): EntryJudgeResult<string> => entryJudgeResultContinue()
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBe('2')
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockEntry).toHaveBeenCalledWith(1, undefined)
        expect(mockEntryJudge).toBeCalledTimes(1)
        expect(mockEntryJudge).toHaveBeenCalledWith(2, undefined)
        expect(mockExit).toBeCalledTimes(1)
      })

      it('skip: skip handler and return value directly', () => {
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input + 1)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockHandler = vi.fn((x: number) => x.toString())
        const mockEntryJudge = vi.fn(
          (_input: HandlerResult<number>): EntryJudgeResult<string> => ({
            kind: 'skip',
            value: 'skipped',
          })
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(mockHandler)

        const result = handler(1)
        expect(result).toBe('skipped')
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockEntryJudge).toBeCalledTimes(1)
        expect(mockHandler).not.toBeCalled() // Handler should be skipped
        expect(mockExit).toBeCalledTimes(1)
        expect(mockExit).toHaveBeenCalledWith('skipped', undefined)
      })

      it('skip with error: skip handler and return error directly', () => {
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input + 1)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockHandler = vi.fn((x: number) => x.toString())
        const error = new Error('entry judge error')
        const mockEntryJudge = vi.fn(
          (_input: HandlerResult<number>): EntryJudgeResult<string> => ({
            kind: 'skip',
            value: error,
          })
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(mockHandler)

        const result = handler(1)
        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
          expect(result.message).toBe('entry judge error')
        }
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockEntryJudge).toBeCalledTimes(1)
        expect(mockHandler).not.toBeCalled() // Handler should be skipped
        expect(mockExit).toBeCalledTimes(1)
        expect(mockExit).toHaveBeenCalledWith(error, undefined)
      })

      it('entry judge receives error from entry', () => {
        const error = new Error('entry error')
        const mockEntry = vi.fn((_input: Input<number>): HandlerResult<number> => error)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockEntryJudge = vi.fn(
          (_input: HandlerResult<number>): EntryJudgeResult<string> => entryJudgeResultContinue()
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
          expect(result.message).toBe('entry error')
        }
        // Entry judge should not be called when entry returns error
        expect(mockEntryJudge).not.toBeCalled()
      })
    })

    describe('onExitJudge', () => {
      it('continue: normal flow continues', () => {
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
        const mockExit = vi.fn(
          (output: HandlerResult<string>): HandlerResult<string> =>
            !(output instanceof Error) ? output.toUpperCase() : output
        )
        const mockExitJudge = vi.fn(
          (_output: HandlerResult<string>, _input: Input<number>): ExitJudgeResult<number> => exitJudgeResultContinue()
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBe('1')
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockExit).toBeCalledTimes(1)
        expect(mockExitJudge).toBeCalledTimes(1)
        expect(mockExitJudge).toHaveBeenCalledWith('1', 1, undefined)
      })

      it('retry: retry from entry with new value', () => {
        let retryCount = 0
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => {
          retryCount++
          return input + retryCount
        })
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockExitJudge = vi.fn(
          (_output: HandlerResult<string>, _input: Input<number>): ExitJudgeResult<number> => {
            if (retryCount < 3) {
              return {
                kind: 'retry',
                value: 10, // New input value for retry
              }
            }
            return exitJudgeResultContinue()
          }
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBe('13') // 10 + 3 (retryCount = 3)
        expect(mockEntry).toBeCalledTimes(3) // Initial + 2 retries
        expect(mockExit).toBeCalledTimes(3)
        expect(mockExitJudge).toBeCalledTimes(3)
      })

      it('override: override output with error', () => {
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const overrideError = new Error('override error')
        const mockExitJudge = vi.fn(
          (_output: HandlerResult<string>, _input: Input<number>): ExitJudgeResult<number> => ({
            kind: 'override',
            error: overrideError,
          })
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
          expect(result.message).toBe('override error')
        }
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockExit).toBeCalledTimes(1)
        expect(mockExitJudge).toBeCalledTimes(1)
      })
    })

    describe('conditions with context', () => {
      it('onEntryJudge receives context', () => {
        const context: TestContext = {
          n: 100,
          s: 'test',
        }
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockEntryJudge = vi.fn(
          (_input: HandlerResult<number>, _context?: TestContext): EntryJudgeResult<string> => {
            expect(_context).toEqual(context)
            return entryJudgeResultContinue()
          }
        )

        const conditions: LayerConditions<number, string, TestContext> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeLayer(mockEntry, mockExit, context, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBe('1')
        expect(mockEntryJudge).toBeCalledTimes(1)
        expect(mockEntryJudge).toHaveBeenCalledWith(1, context)
      })

      it('onExitJudge receives context and original input', () => {
        const context: TestContext = {
          n: 100,
          s: 'test',
        }
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockExitJudge = vi.fn(
          (_output: HandlerResult<string>, input: Input<number>, _context?: TestContext): ExitJudgeResult<number> => {
            expect(_context).toEqual(context)
            expect(input).toBe(1)
            return exitJudgeResultContinue()
          }
        )

        const conditions: LayerConditions<number, string, TestContext> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeLayer(mockEntry, mockExit, context, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBe('1')
        expect(mockExitJudge).toBeCalledTimes(1)
        expect(mockExitJudge).toHaveBeenCalledWith('1', 1, context)
      })
    })

    describe('multiple layers with conditions', () => {
      it('entry judge skip in middle layer', () => {
        const lowLayer = makeLayer(
          (input: Input<number>) => input,
          (output: HandlerResult<string>) => output,
          undefined,
          'lowLayer'
        )
        const middleLayer = makeLayer(
          (input: Input<number>) => input + 1,
          (output: HandlerResult<string>) => output,
          undefined,
          'middleLayer',
          {
            onEntryJudge: (input: HandlerResult<number>): EntryJudgeResult<string> => {
              if (input === 2) {
                return { kind: 'skip', value: 'skipped at middle' }
              }
              return entryJudgeResultContinue()
            },
            onExitJudge: undefined,
          }
        )
        const highLayer = makeLayer(
          (input: Input<number>) => input,
          (output: HandlerResult<string>) => output,
          undefined,
          'highLayer'
        )

        const layerStack = stackLayer([lowLayer, middleLayer, highLayer])
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBe('skipped at middle')
      })

      it('exit judge override in one layer stops processing', () => {
        const lowLayer = makeLayer(
          (input: Input<number>) => input,
          (output: HandlerResult<string>) => output,
          undefined,
          'lowLayer',
          {
            onEntryJudge: undefined,
            onExitJudge: (_output: HandlerResult<string>, _input: Input<number>): ExitJudgeResult<number> => ({
              kind: 'override',
              error: new Error('overridden by low layer'),
            }),
          }
        )
        const highLayer = makeLayer(
          (input: Input<number>) => input,
          (output: HandlerResult<string>) => output,
          undefined,
          'highLayer'
        )

        const layerStack = stackLayer([lowLayer, highLayer])
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
          expect(result.message).toBe('overridden by low layer')
        }
      })
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

    describe('onEntryJudge', () => {
      it('continue: normal flow continues', async () => {
        const mockEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => input + 1)
        const mockExit = vi.fn(async (output: HandlerResult<string>): Promise<HandlerResult<string>> => output)
        const mockEntryJudge = vi.fn(
          async (_input: HandlerResult<number>): Promise<EntryJudgeResult<string>> => entryJudgeResultContinue()
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeAsyncLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackAsyncLayer(layer)
        const handler = layerStack(async x => x.toString())

        const result = await handler(1)
        expect(result).toBe('2')
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockEntryJudge).toBeCalledTimes(1)
        expect(mockExit).toBeCalledTimes(1)
      })

      it('skip: skip handler and return value directly', async () => {
        const mockEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => input + 1)
        const mockExit = vi.fn(async (output: HandlerResult<string>): Promise<HandlerResult<string>> => {
          console.log('exit', output)
          return output
        })
        const mockHandler = vi.fn(async (x: number) => x.toString())
        const mockEntryJudge = vi.fn(async (_input: HandlerResult<number>): Promise<EntryJudgeResult<string>> => {
          console.log('EJ', _input)
          return {
            kind: 'skip',
            value: 'skipped',
          }
        })

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeAsyncLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackAsyncLayer(layer)
        const handler = layerStack(mockHandler)

        const result = await handler(1)
        expect(result).toBe('skipped')
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockEntryJudge).toBeCalledTimes(1)
        expect(mockHandler).not.toBeCalled() // Handler should be skipped
        expect(mockExit).toBeCalledTimes(1)
      })
    })

    describe('onExitJudge', () => {
      it('continue: normal flow continues', async () => {
        const mockEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => input)
        const mockExit = vi.fn(
          async (output: HandlerResult<string>): Promise<HandlerResult<string>> =>
            !(output instanceof Error) ? output.toUpperCase() : output
        )
        const mockExitJudge = vi.fn(
          async (_output: HandlerResult<string>, _input: Input<number>): Promise<ExitJudgeResult<number>> =>
            exitJudgeResultContinue()
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeAsyncLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackAsyncLayer(layer)
        const handler = layerStack(async x => x.toString())

        const result = await handler(1)
        expect(result).toBe('1')
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockExit).toBeCalledTimes(1)
        expect(mockExitJudge).toBeCalledTimes(1)
      })

      it('retry: retry from entry with new value', async () => {
        let retryCount = 0
        const mockEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => {
          retryCount++
          return input + retryCount
        })
        const mockExit = vi.fn(async (output: HandlerResult<string>): Promise<HandlerResult<string>> => output)
        const mockExitJudge = vi.fn(
          async (_output: HandlerResult<string>, _input: Input<number>): Promise<ExitJudgeResult<number>> => {
            if (retryCount < 3) {
              console.log('test', _input, retryCount)
              return {
                kind: 'retry',
                value: 10, // New input value for retry
              }
            }
            return exitJudgeResultContinue()
          }
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeAsyncLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackAsyncLayer(layer)
        const handler = layerStack(async x => x.toString())

        const result = await handler(1)
        expect(result).toBe('13') // 10 + 3 (retryCount = 3)
        expect(mockEntry).toBeCalledTimes(3) // Initial + 2 retries
        expect(mockExit).toBeCalledTimes(3)
        expect(mockExitJudge).toBeCalledTimes(3)
      })

      it('override: override output with error', async () => {
        const mockEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => input)
        const mockExit = vi.fn(async (output: HandlerResult<string>): Promise<HandlerResult<string>> => output)
        const overrideError = new Error('override error')
        const mockExitJudge = vi.fn(
          async (_output: HandlerResult<string>, _input: Input<number>): Promise<ExitJudgeResult<number>> => ({
            kind: 'override',
            error: overrideError,
          })
        )

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeAsyncLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackAsyncLayer(layer)
        const handler = layerStack(async x => x.toString())

        const result = await handler(1)
        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
          expect(result.message).toBe('override error')
        }
        expect(mockEntry).toBeCalledTimes(1)
        expect(mockExit).toBeCalledTimes(1)
        expect(mockExitJudge).toBeCalledTimes(1)
      })
    })

    describe('conditions with context', () => {
      it('onEntryJudge receives context', async () => {
        const context: TestContext = {
          n: 100,
          s: 'test',
        }
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockEntryJudge = vi.fn(
          async (_input: HandlerResult<number>, _context?: TestContext): Promise<EntryJudgeResult<string>> => {
            expect(_context).toEqual(context)
            return entryJudgeResultContinue()
          }
        )

        const conditions: LayerConditions<number, string, TestContext> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeAsyncLayer(mockEntry, mockExit, context, 'testLayer', conditions)
        const layerStack = stackAsyncLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = await handler(1)
        expect(result).toBe('1')
        expect(mockEntryJudge).toBeCalledTimes(1)
        expect(mockEntryJudge).toHaveBeenCalledWith(1, context)
      })

      it('onExitJudge receives context and original input', async () => {
        const context: TestContext = {
          n: 100,
          s: 'test',
        }
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockExitJudge = vi.fn(
          async (
            _output: HandlerResult<string>,
            input: Input<number>,
            _context?: TestContext
          ): Promise<ExitJudgeResult<number>> => {
            expect(_context).toEqual(context)
            expect(input).toBe(1)
            return exitJudgeResultContinue()
          }
        )

        const conditions: LayerConditions<number, string, TestContext> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeAsyncLayer(mockEntry, mockExit, context, 'testLayer', conditions)
        const layerStack = stackAsyncLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = await handler(1)
        expect(result).toBe('1')
        expect(mockExitJudge).toBeCalledTimes(1)
        expect(mockExitJudge).toHaveBeenCalledWith('1', 1, context)
      })
    })

    describe('multiple layers with conditions', () => {
      it('entry judge skip in middle layer', async () => {
        const lowLayer = makeLayer(
          (input: Input<number>) => input,
          (output: HandlerResult<string>) => output,
          undefined,
          'lowLayer'
        )
        const middleLayer = makeLayer(
          (input: Input<number>) => input + 1,
          (output: HandlerResult<string>) => output,
          undefined,
          'middleLayer',
          {
            onEntryJudge: async (input: HandlerResult<number>): Promise<EntryJudgeResult<string>> => {
              if (input === 2) {
                return { kind: 'skip', value: 'skipped at middle' }
              }
              return entryJudgeResultContinue()
            },
            onExitJudge: undefined,
          }
        )
        const highLayer = makeAsyncLayer(
          (input: Input<number>) => input,
          (output: HandlerResult<string>) => output,
          undefined,
          'highLayer'
        )

        const layerStack = stackAsyncLayer([lowLayer, middleLayer, highLayer])
        const handler = layerStack(x => x.toString())

        const result = await handler(1)
        expect(result).toBe('skipped at middle')
      })

      it('exit judge override in one layer stops processing', () => {
        const lowLayer = makeLayer(
          (input: Input<number>) => input,
          (output: HandlerResult<string>) => output,
          undefined,
          'lowLayer',
          {
            onEntryJudge: undefined,
            onExitJudge: (_output: HandlerResult<string>, _input: Input<number>): ExitJudgeResult<number> => ({
              kind: 'override',
              error: new Error('overridden by low layer'),
            }),
          }
        )
        const highLayer = makeLayer(
          (input: Input<number>) => input,
          (output: HandlerResult<string>) => output,
          undefined,
          'highLayer'
        )

        const layerStack = stackLayer([lowLayer, highLayer])
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
          expect(result.message).toBe('overridden by low layer')
        }
      })
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
      const mockHighEntry = vi.fn(async (input: Input<number>): Promise<HandlerResult<number>> => input)
      const mockHighExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)

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

    it('High exit return thenable error(use layerStack)', () => {
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
        expect(result.message).toBe('[layer(2):exit]Cannot use thenable function. Please use stackAsyncLayer()')
      }

      expect(mockLowEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHighEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHandler).toHaveBeenCalledWith(1)
      expect(mockHighExit).toHaveBeenCalledWith('1', undefined)
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
      if (result instanceof Error) {
        expect(result.message).toBe('error')
      }

      expect(mockLowEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHighEntry).toHaveBeenCalledWith(1, undefined)
      expect(mockHandler).toHaveBeenCalledWith(1)
      expect(mockHighExit).toHaveBeenCalledWith(new Error('error'), undefined)
      expect(mockLowExit).toHaveBeenCalledWith(new Error('error'), undefined)
    })

    describe('conditions', () => {
      it('entry judge with thenable in sync layer should error', () => {
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockEntryJudge = vi.fn(async (): Promise<EntryJudgeResult<string>> => entryJudgeResultContinue())

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: mockEntryJudge,
          onExitJudge: undefined,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
          expect(result.message).toContain('Cannot use thenable function')
          expect(result.message).toContain('onEntryJudge')
        }
      })

      it('exit judge with thenable in sync layer should error', () => {
        const mockEntry = vi.fn((input: Input<number>): HandlerResult<number> => input)
        const mockExit = vi.fn((output: HandlerResult<string>): HandlerResult<string> => output)
        const mockExitJudge = vi.fn(async (): Promise<ExitJudgeResult<number>> => exitJudgeResultContinue())

        const conditions: LayerConditions<number, string, undefined> = {
          onEntryJudge: undefined,
          onExitJudge: mockExitJudge,
        }

        const layer = makeLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
        const layerStack = stackLayer(layer)
        const handler = layerStack(x => x.toString())

        const result = handler(1)
        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
          expect(result.message).toContain('onExitJudge')
        }
      })
    })
  })
})
