/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, makePipeError } from './pipeTypes'

export const thenableError = <S, E>(stage: string) =>
  makePipeError<S, E>(new Error('Cannot use thenable function. Please use streamAsync()'), null, stage)
export const inputError = <S, E>(stage: string) =>
  makePipeError<S, E>(new Error('Pipeline input data is null'), null, stage)

export function isError<T>(x: HandlerResult<T>): x is Error {
  return x instanceof Error
}
