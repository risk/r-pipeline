/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../pipeline/pipeTypes'

export type EntryJudgeResult<O> =
  | {
      kind: 'continue'
    }
  | {
      kind: 'skip'
      value: HandlerResult<O>
    }

export type ExitJudgeResult<I> =
  | {
      kind: 'continue'
    }
  | {
      kind: 'retry'
      value: Input<I>
    }
  | {
      kind: 'override'
      error: Error
    }

export function entryJudgeResultContinue<I>(): EntryJudgeResult<I> {
  return { kind: 'continue' }
}
export function exitJudgeResultContinue<I>(): ExitJudgeResult<I> {
  return { kind: 'continue' }
}

export type LayerEntry<I, C> = (input: Input<I>, context?: C) => HandlerResult<I> | Promise<HandlerResult<I>>
export type LayerExit<O, C> = (output: HandlerResult<O>, context?: C) => HandlerResult<O> | Promise<HandlerResult<O>>

export type LayerEntryJudge<I, O, C> = (
  input: HandlerResult<I>,
  context?: C
) => EntryJudgeResult<O> | Promise<EntryJudgeResult<O>>
export type LayerExitJudge<I, O, C> = (
  output: HandlerResult<O>,
  input: Input<I>,
  context?: C
) => ExitJudgeResult<I> | Promise<ExitJudgeResult<I>>

export interface LayerConditions<I, O, C> {
  onEntryJudge: LayerEntryJudge<I, O, C> | undefined
  onExitJudge: LayerExitJudge<I, O, C> | undefined
}

export interface LayerInterface<I, O, C = undefined> {
  entry: LayerEntry<I, C>
  exit: LayerExit<O, C>
  conditions: LayerConditions<I, O, C>
  // NOTE: use `C | undefined` instead of `context?: C`
  // to ensure consistency when C itself can be undefined.
  context: C | undefined
}
