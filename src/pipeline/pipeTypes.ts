/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { Input } from '../types'

export type PipeSuccess<T> = Readonly<{
  value: Input<T>
}>

export type PipeError<T> = Readonly<{
  error: Error
  origin: T | null
  stage: string
  timestamp: number
}>

export function makePipeSuccess<O>(ret: Input<O>) {
  return {
    value: ret,
  }
}

export function makePipeError<O>(error: Error, origin: O | null, stage: string) {
  return {
    error,
    origin,
    stage,
    timestamp: Date.now(),
  }
}
