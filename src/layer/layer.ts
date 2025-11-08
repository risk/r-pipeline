/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../pipeline/pipeTypes'
import { isThenable } from '../utils/isThenable'

import {
  EntryJudgeResult,
  entryJudgeResultContinue,
  ExitJudgeResult,
  exitJudgeResultContinue,
  LayerConditions,
  LayerEntry,
  LayerExit,
} from './layerTypes'

type LayerExecutableEntry<I> = (input: Input<I>) => HandlerResult<I> | Promise<HandlerResult<I>>
type LayerExecutableExit<O> = (output: HandlerResult<O>) => HandlerResult<O> | Promise<HandlerResult<O>>

type LayerExecutableEntryJudge<I, O> = (input: HandlerResult<I>) => EntryJudgeResult<O> | Promise<EntryJudgeResult<O>>
type LayerExecutableExitJudge<I, O> = (output: HandlerResult<O>) => ExitJudgeResult<I> | Promise<ExitJudgeResult<I>>

interface LayerExecuitableConditions<I, O> {
  onEntryJudge: LayerExecutableEntryJudge<I, O>
  onExitJudge: LayerExecutableExitJudge<I, O>
}

interface LayerExecutableInterface<I, O> {
  name: string
  entry: LayerExecutableEntry<I>
  exit: LayerExecutableExit<O>
  conditions: LayerExecuitableConditions<I, O>
  cleanup: () => void
}

function layerThenableError(tag: string) {
  return new Error(`[${tag}]Cannot use thenable function. Please use stackAsyncLayer()`)
}

/**
 * Compose a synchronous handler with one or more layers.
 *
 * Each layer can:
 * - run an entry hook before the handler (for validation, preprocessing, logging, etc.)
 * - run an exit hook after the handler (for postprocessing, logging, etc.)
 * - control the flow via conditional entry/exit (skip / retry / override) defined in LayerConditions.
 *
 * This variant is **synchronous-only**: if any entry/exit/judge handler returns a Promise,
 * it will throw an Error. For async layers or async handlers, use `stackAsyncLayer` instead.
 *
 * @typeParam I - Input type of the handler.
 * @typeParam O - Output type of the handler.
 * @param layer - Single layer or an array of layers. Layers are applied in the order provided
 *                on entry, and in reverse order on exit.
 * @returns A higher-order function that takes a handler and returns a layered handler.
 */
export function stackLayer<I, O>(layer: LayerExecutableInterface<I, O> | LayerExecutableInterface<I, O>[]) {
  const entryLayers: LayerExecutableInterface<I, O>[] = Array.isArray(layer) ? [...layer] : [layer]
  const exitLayers: LayerExecutableInterface<I, O>[] = []

  return (handler: (input: Input<I>) => HandlerResult<O>) => {
    return (input: Input<I>): HandlerResult<O> => {
      let layeredInput: HandlerResult<I> = input
      const output: { value: HandlerResult<O> | null } = { value: null }
      let retry = false
      do {
        output.value = null
        retry = false

        while (entryLayers.length > 0) {
          const currentlayer = entryLayers.shift()
          /* v8 ignore if -- @preserve */
          if (currentlayer === undefined) {
            // レイヤが登録されていない場合そもそもここに来れないので、到達不可
            return new Error(`[${exitLayers.length + 1}]Entry layer not found(unreached code)`)
          }
          exitLayers.push(currentlayer)

          const entryResult = currentlayer.entry(layeredInput)
          if (isThenable(entryResult)) {
            return layerThenableError(`${currentlayer.name}(${exitLayers.length}):entry`)
          }

          // entryでエラーした場合は、先に進まない
          if (entryResult instanceof Error) {
            return entryResult
          }

          const judgeResult = currentlayer.conditions.onEntryJudge(entryResult)
          if (isThenable(judgeResult)) {
            return layerThenableError(`[${currentlayer.name}:${exitLayers.length}]:onEntryJudge`)
          }
          if (judgeResult.kind === 'skip') {
            output.value = judgeResult.value
            break
          }

          layeredInput = entryResult
        }

        const handlerResult = output.value === null ? handler(layeredInput) : output.value
        output.value = handlerResult

        // Outputはエラーも処理可能（repair代替の実現）
        while (exitLayers.length > 0) {
          const currentlayer = exitLayers.pop()
          /* v8 ignore if -- @preserve */
          if (currentlayer === undefined) {
            // レイヤが登録されていない場合そもそもここに来れないので到達不可
            return new Error(`[${exitLayers.length + 1}]Exit layer not found(unreached code)`)
          }
          entryLayers.push(currentlayer)

          const exitResult = currentlayer.exit(output.value)
          if (isThenable(exitResult)) {
            return layerThenableError(`${currentlayer.name}(${exitLayers.length + 1}):exit`)
          }

          const judgeResult = currentlayer.conditions.onExitJudge(exitResult)
          if (isThenable(judgeResult)) {
            return layerThenableError(`${currentlayer.name}(${exitLayers.length + 1}):onExitJudge`)
          }
          if (judgeResult.kind === 'retry') {
            layeredInput = judgeResult.value
            retry = true
            break
          } else if (judgeResult.kind === 'override') {
            output.value = judgeResult.error
          } else {
            currentlayer.cleanup()
            output.value = exitResult
          }
        }
      } while (retry)

      // 最終結果(値 or Error)
      return output.value
    }
  }
}

/**
 * Compose an asynchronous handler with one or more layers.
 *
 * Each layer can:
 * - run an entry hook before the handler (for validation, preprocessing, logging, etc.)
 * - run an exit hook after the handler (for postprocessing, logging, etc.)
 * - control the flow via conditional entry/exit (skip / retry / override) defined in LayerConditions.
 *
 * This variant supports **async** entry/exit/judge/handler: any thenable is awaited internally.
 * For purely synchronous composition, or to detect accidental async usage, use `stackLayer` instead.
 *
 * @typeParam I - Input type of the handler.
 * @typeParam O - Output type of the handler.
 * @param layer - Single layer or an array of layers. Layers are applied in the order provided
 *                on entry, and in reverse order on exit.
 * @returns A higher-order function that takes a handler and returns an async layered handler.
 */
export function stackAsyncLayer<I, O>(layer: LayerExecutableInterface<I, O> | LayerExecutableInterface<I, O>[]) {
  const entryLayers: LayerExecutableInterface<I, O>[] = Array.isArray(layer) ? layer : [layer]
  const exitLayers: LayerExecutableInterface<I, O>[] = []

  return (handler: (input: Input<I>) => HandlerResult<O> | Promise<HandlerResult<O>>) => {
    return async (input: Input<I>): Promise<HandlerResult<O>> => {
      let layeredInput: HandlerResult<I> = input
      const output: { value: HandlerResult<O> | null } = { value: null }
      let retry = false
      do {
        output.value = null
        retry = false

        while (entryLayers.length > 0) {
          const currentlayer = entryLayers.shift()
          /* v8 ignore if -- @preserve */
          if (currentlayer === undefined) {
            // レイヤが登録されていない場合そもそもここに来れないので到達不可
            return new Error(`[${exitLayers.length + 1}]Entry layer not found(unreached code)`)
          }
          exitLayers.push(currentlayer)

          const entryResult: HandlerResult<I> = await Promise.resolve(currentlayer.entry(layeredInput))

          // entryでエラーした場合は、先に進まない
          if (entryResult instanceof Error) {
            return entryResult
          }

          const judgeResult: EntryJudgeResult<O> = await Promise.resolve(
            currentlayer.conditions.onEntryJudge(entryResult)
          )
          if (judgeResult.kind === 'skip') {
            output.value = judgeResult.value
            break
          }

          layeredInput = entryResult
        }

        output.value = output.value === null ? await Promise.resolve(handler(layeredInput)) : output.value

        // Outputはエラーも処理可能（repair代替の実現）
        while (exitLayers.length > 0) {
          const currentlayer = exitLayers.pop()
          /* v8 ignore if -- @preserve */
          if (currentlayer === undefined) {
            // レイヤが登録されていない場合そもそもここに来れないので到達不可
            return new Error(`[${exitLayers.length + 1}]exit layer not found(unreached code)`)
          }
          entryLayers.push(currentlayer)

          const exitResult: HandlerResult<O> = await Promise.resolve(currentlayer.exit(output.value))

          const judgeResult: ExitJudgeResult<I> = await Promise.resolve(currentlayer.conditions.onExitJudge(exitResult))
          if (judgeResult.kind === 'retry') {
            layeredInput = judgeResult.value
            retry = true
            break
          } else if (judgeResult.kind === 'override') {
            output.value = judgeResult.error
          } else {
            currentlayer.cleanup()
            output.value = exitResult
          }
        }
      } while (retry)

      // 最終結果(値 or Error)
      return output.value
    }
  }
}

/**
 * Create a synchronous layer implementation from entry/exit callbacks and optional conditions.
 *
 * The created layer:
 * - runs `entry` before the wrapped handler, with the current input and shared context
 * - runs `exit` after the wrapped handler, with the handler result (value or Error) and context
 * - uses `conditions` to decide skip/retry/override behavior on entry/exit
 * - shares `context` between entry/exit/conditions, managed per-layer instance
 *
 * This factory is intended to be used together with `stackLayer`.
 * For async entry/exit/conditions, use `makeAsyncLayer` + `stackAsyncLayer` instead.
 *
 * @typeParam I - Input type for the layer.
 * @typeParam O - Output type for the layer.
 * @typeParam C - Context type shared inside the layer.
 * @param entry - Entry hook called before the handler with the current input and optional context.
 * @param exit - Exit hook called after the handler with the handler result and optional context.
 * @param context - Optional shared context object for this layer instance.
 * @param name - Optional layer name used in debug/error messages. Defaults to "layer".
 * @param conditions - Optional conditional hooks to control entry/exit behavior (skip/retry/override).
 * @returns A LayerExecutableInterface that can be passed to `stackLayer`.
 */
export function makeLayer<I, O, C>(
  entry: LayerEntry<I, C>,
  exit: LayerExit<O, C>,
  context?: C,
  name: string = 'layer',
  conditions?: LayerConditions<I, O, C>
): LayerExecutableInterface<I, O> {
  const ref: { current: Input<I> | null } = { current: null }
  return {
    name,
    entry: (input: Input<I>) => {
      ref.current = input
      return entry(ref.current, context)
    },
    exit: (output: HandlerResult<O>) => {
      return exit(output, context)
    },
    conditions: {
      onEntryJudge: (input: HandlerResult<I>) => {
        return conditions?.onEntryJudge !== undefined
          ? conditions.onEntryJudge(input, context)
          : entryJudgeResultContinue<O>()
      },
      onExitJudge: (output: HandlerResult<O>) => {
        /* v8 ignore if -- @preserve */
        if (ref.current === null) {
          // entryが呼ばれずにこの関数だけ呼び出すことはないため、到達不可
          // 念の為、エラーを上書きして情報を伝える
          return {
            kind: 'override',
            error: new Error(`[${name}]Layer exit call only: ${output instanceof Error ? output.message : ''}`),
          }
        }
        return conditions?.onExitJudge !== undefined
          ? conditions.onExitJudge(output, ref.current, context)
          : exitJudgeResultContinue<I>()
      },
    },
    cleanup: () => {
      ref.current = null
    },
  }
}

/**
 * Create an asynchronous layer implementation from entry/exit callbacks and optional conditions.
 *
 * The created layer:
 * - runs `entry` before the handler, with the current input and shared context
 * - runs `exit` after the handler, with the handler result (value or Error) and context
 * - uses `conditions` to decide skip/retry/override behavior on entry/exit
 * - shares `context` between entry/exit/conditions, managed per-layer instance
 *
 * Unlike `makeLayer`, this variant is designed for async entry/exit/conditions:
 * it can safely return Promises, and is intended to be used with `stackAsyncLayer`.
 *
 * @typeParam I - Input type for the layer.
 * @typeParam O - Output type for the layer.
 * @typeParam C - Context type shared inside the layer.
 * @param entry - Async-capable entry hook called before the handler with the current input and optional context.
 * @param exit - Async-capable exit hook called after the handler with the handler result and optional context.
 * @param context - Optional shared context object for this layer instance.
 * @param name - Optional layer name used in debug/error messages. Defaults to "layer".
 * @param conditions - Optional async-capable conditional hooks to control entry/exit behavior (skip/retry/override).
 * @returns A LayerExecutableInterface that can be passed to `stackAsyncLayer`.
 */
export function makeAsyncLayer<I, O, C>(
  entry: LayerEntry<I, C>,
  exit: LayerExit<O, C>,
  context?: C,
  name: string = 'layer',
  conditions?: LayerConditions<I, O, C>
): LayerExecutableInterface<I, O> {
  const ref: { current: Input<I> | null } = { current: null }
  return {
    name,
    entry: (input: Input<I>) => {
      ref.current = input
      return entry(input, context)
    },
    exit: (output: HandlerResult<O>) => {
      return exit(output, context)
    },
    conditions: {
      onEntryJudge: (input: HandlerResult<I>) => {
        return conditions?.onEntryJudge !== undefined
          ? conditions.onEntryJudge(input, context)
          : entryJudgeResultContinue<O>()
      },
      onExitJudge: (output: HandlerResult<O>) => {
        /* v8 ignore if -- @preserve */
        if (ref.current === null) {
          // entryが呼ばれずにこの関数だけ呼び出すことはないため、到達不可
          // 念の為、エラーを上書きして情報を伝える
          return {
            kind: 'override',
            error: new Error(`[${name}]Layer exit call only: ${output instanceof Error ? output.message : ''}`),
          }
        }
        return conditions?.onExitJudge !== undefined
          ? conditions.onExitJudge(output, ref.current, context)
          : exitJudgeResultContinue<I>()
      },
    },
    cleanup: () => {
      ref.current = null
    },
  }
}
