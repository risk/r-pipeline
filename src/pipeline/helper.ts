/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */
import { HandlerResult } from './pipeTypes'

export function errorPassthrough<I>(error: Error): HandlerResult<I> {
  return error
}
