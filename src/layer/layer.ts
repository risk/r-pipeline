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
