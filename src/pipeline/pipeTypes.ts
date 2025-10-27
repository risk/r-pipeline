/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

export type Input<T> = Exclude<T, undefined | null>
export type HandlerResult<R> = Input<R> | Error

export type PipeResultKind = 'success' | 'error' | 'empty'

export type PipeSuccess<T> = Readonly<{
  value: Input<T>
}>

export type PipeError<T> = Readonly<{
  error: Error
  origin: T | null
  stage: string
  timestamp: number
}>

export type PipeResult<S, E> =
  | { kind: 'success'; value: PipeSuccess<S> }
  | { kind: 'error'; value: PipeError<E> }
  | { kind: 'empty' }

export function makePipeSuccess<S, E>(ret: Input<S>): PipeResult<S, E> {
  return {
    kind: 'success',
    value: {
      value: ret,
    },
  }
}

export function makePipeError<S, E>(error: Error, origin: E | null, stage: string): PipeResult<S, E> {
  return {
    kind: 'error',
    value: {
      error,
      origin,
      stage,
      timestamp: Date.now(),
    },
  }
}

export type HandlerFunction<I, R> = (input: Input<I>) => HandlerResult<R> | Promise<HandlerResult<R>>
export type RecoverFunction<PI, R> = (
  error: Error,
  parentInput: PI | null
) => HandlerResult<R> | Promise<HandlerResult<R>>

export interface PipeInterface<I, O, RootI> {
  label(stage: string): PipeInterface<I, O, RootI>
  joint<R>(handler: HandlerFunction<O, R>, recoverHandler?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  repair(recoverHandler: RecoverFunction<I, O>): PipeInterface<O, O, RootI>
  branch<R>(pipe: PipeInterface<O, R, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  branchAsync<R>(pipe: PipeInterface<O, R, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  window(
    normalPath?: (arg: Input<O>, stage: string) => void,
    errPath?: (error: Error, stage: string) => void,
    useReference?: boolean
  ): PipeInterface<O, O, RootI>
  windowAsync(
    normalPath?: (arg: Input<O>, stage: string) => void | Promise<void>,
    errPath?: (error: Error, stage: string) => void | Promise<void>,
    useReference?: boolean
  ): PipeInterface<O, O, RootI>
  stream(input: Input<RootI>): HandlerResult<O>
  streamAsync(input: Input<RootI>): Promise<HandlerResult<O>>
}

export interface PipeExecutable {
  unitStream(): PipeExecutable | null
  unitStreamAsync(): Promise<PipeExecutable | null>
}
