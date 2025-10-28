/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../pipeline/pipeTypes'
import { isThenable } from '../utils/isThenable'

import { LayerInterface } from './layerTypes'

function layerThenableError(tag: string) {
  return new Error(`[${tag}]Cannot use thenable function. Please use stackAsyncLayer()`)
}

const callWithContext = <C, I extends R, R = I>(context: C | undefined, fn?: (input: I, context?: C) => R) => {
  return (input: I): R => {
    return fn ? fn(input, context) : input
  }
}

export function stackLayer<I, O, C>(
  layer: LayerInterface<I, O, C> | LayerInterface<I, O, C>[],
  name: string = 'layer'
) {
  const entris = Array.isArray(layer)
    ? layer.map(l => callWithContext(l.context, l.entry))
    : [callWithContext(layer.context, layer.entry)]
  const exits = Array.isArray(layer)
    ? layer.map(l => callWithContext(l.context, l.exit)).reverse()
    : [callWithContext(layer.context, layer.exit)]

  return (handler: (input: Input<I>) => HandlerResult<O>) => {
    return (input: Input<I>): HandlerResult<O> => {
      let layeredInput: HandlerResult<I> = input
      for (const [index, entry] of Object.entries(entris)) {
        const entryResult: HandlerResult<I> | Promise<HandlerResult<I>> = entry ? entry(layeredInput) : layeredInput
        if (isThenable(entryResult)) {
          return layerThenableError(`${name}[${index}]:entry`)
        }
        // entryでエラーした場合は、先に進まない
        if (entryResult instanceof Error) {
          return entryResult
        }
        layeredInput = entryResult
      }

      const output = handler(layeredInput)
      if (isThenable(output)) {
        return layerThenableError(`${name}:handler`)
      }

      // Outputはエラーも処理可能（repair代替の実現）
      let layeredOutput: HandlerResult<O> = output
      for (const [index, exit] of Object.entries(exits)) {
        const exitResult: HandlerResult<O> | Promise<HandlerResult<O>> = exit ? exit(layeredOutput) : layeredOutput
        if (isThenable(exitResult)) {
          return layerThenableError(`${name}[${index}]:entry`)
        }
        layeredOutput = exitResult
      }

      return layeredOutput
    }
  }
}

export function stackAsyncLayer<I, O, C>(layer: LayerInterface<I, O, C> | LayerInterface<I, O, C>[]) {
  const entris = Array.isArray(layer)
    ? layer.map(l => callWithContext(l.context, l.entry))
    : [callWithContext(layer.context, layer.entry)]
  const exits = Array.isArray(layer)
    ? layer.map(l => callWithContext(l.context, l.exit)).reverse()
    : [callWithContext(layer.context, layer.exit)]

  return (handler: (input: Input<I>) => HandlerResult<O> | Promise<HandlerResult<O>>) => {
    return async (input: Input<I>): Promise<HandlerResult<O>> => {
      let layeredInput: HandlerResult<I> = input
      for (const entry of entris) {
        const entryResult: HandlerResult<I> = entry ? await Promise.resolve(entry(layeredInput)) : layeredInput

        // entryでエラーした場合は、先に進まない
        if (entryResult instanceof Error) {
          return entryResult
        }
        layeredInput = entryResult
      }

      const output = await Promise.resolve(handler(layeredInput))

      // Outputはエラーも処理可能（repair代替の実現）
      let layeredOutput: HandlerResult<O> = output
      for (const exit of exits) {
        const exitResult: HandlerResult<O> = exit ? await exit(layeredOutput) : layeredOutput
        layeredOutput = exitResult
      }

      // 最終結果(値 or Error)
      return layeredOutput
    }
  }
}

export function makeLayer<I, O, C>(
  entry?: (input: Input<I>, context?: C) => HandlerResult<I>,
  exit?: (output: HandlerResult<O>, context?: C) => HandlerResult<O>,
  context?: C
): LayerInterface<I, O, C> {
  return { entry, exit, context }
}

export function makeAsyncLayer<I, O, C>(
  entry?: (input: Input<I>, context?: C) => HandlerResult<I> | Promise<HandlerResult<I>>,
  exit?: (output: HandlerResult<O>, context?: C) => HandlerResult<O> | Promise<HandlerResult<O>>,
  context?: C
): LayerInterface<I, O, C> {
  return { entry, exit, context }
}
