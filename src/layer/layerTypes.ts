/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../pipeline/pipeTypes'

export type LayerEntry<I, C> = (input: Input<I>, context?: C) => HandlerResult<I> | Promise<HandlerResult<I>>
export type LayerExit<O, C> = (output: HandlerResult<O>, context?: C) => HandlerResult<O> | Promise<HandlerResult<O>>

export interface LayerInterface<I, O, C = undefined> {
  entry: LayerEntry<I, C>
  exit: LayerExit<O, C>
  // NOTE: use `C | undefined` instead of `context?: C`
  // to ensure consistency when C itself can be undefined.
  context: C | undefined
}
