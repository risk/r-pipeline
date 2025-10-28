/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../pipeline/pipeTypes'

type LayerEntry<I> = (input: Input<I>) => HandlerResult<I> | Promise<HandlerResult<I>>
type LayerExit<O> = (output: HandlerResult<O>) => HandlerResult<O> | Promise<HandlerResult<O>>

export interface LayerInterface<I, O, C = undefined> {
  entry: LayerEntry<I> | undefined
  exit: LayerExit<O> | undefined
  context: C | undefined
}
