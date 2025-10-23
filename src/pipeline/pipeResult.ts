/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { Input } from '../types'

// import { HandlerResult } from '../types'

// // export function makePipeError<T>(message: string, value?: T, context?: string): PipeError {
// //   return new PipeError(message, value, context)
// // }

// // interface hasKind {
// //   readonly tag: string
// // }

// // export function isPipeError(obj: unknown): obj is PipeError {
// //   return typeof obj === 'object' && obj !== null && 'tag' in obj && (obj as hasKind).tag === 'PipeError'
// // }

// export class PipeResult<T> {
//   constructor(
//     private success: boolean,
//     private result: T,
//     private readonly origin?: unknown,
//     public readonly timestamp: number = Date.now()
//   ) {}

//   static make<T, I>(success: boolean, result: T, origin?: I): PipeResult<T> {
//     return new PipeResult(success, result, origin)
//   }

//   isSuccess() {
//     return this.success
//   }

//   isError() {
//     return !this.success
//   }

//   getOrigin<T>(check?: (origin: unknown) => origin is T): T | undefined {
//     if (!check) return this.origin as T
//     if (check && this.origin && check(this.origin)) return this.origin
//     return undefined
//   }

//   getResult(): T {
//     return this.result
//   }
// }

export type PipeSuccess<T> = Readonly<{
  value: Input<T>
}>

export type PipeError<T> = Readonly<{
  error: Error
  origin: T | null
  timestamp: number
}>

export function makePipeSuccess<O>(ret: Input<O>) {
  return {
    value: ret,
  }
}

export function makePipeError<O>(error: Error, origin: O | null) {
  return {
    error,
    origin,
    timestamp: Date.now(),
  }
}
