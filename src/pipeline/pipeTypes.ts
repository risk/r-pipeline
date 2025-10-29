/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

export type Input<T> = Exclude<T, undefined | null>
export type HandlerResult<R> = Input<R> | Error

export function isHandlerError<R>(result: HandlerResult<R>): result is Error {
  return result instanceof Error
}
export function isHandlerSuccess<R>(result: HandlerResult<R>): result is Input<R> {
  return !isHandlerError(result)
}

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

export type ParallelFuncResultsMap<
  I,
  TA extends Record<keyof TA, HandlerFunction<I, Awaited<ReturnType<TA[keyof TA]>>>>,
> = {
  [Key in keyof TA]: HandlerResult<Awaited<ReturnType<TA[Key]>>>
}

export type ParallelPipeResultsMap<
  I,
  TA extends Record<keyof TA, PipeInterface<I, Awaited<ReturnType<TA[keyof TA]['streamAsync']>>, I>>,
> = {
  [K in keyof TA]: HandlerResult<Awaited<ReturnType<TA[K]['streamAsync']>>>
}

export interface PipeInterface<I, O, RootI> {
  label(stage: string): PipeInterface<I, O, RootI>
  joint<R>(handler: HandlerFunction<O, R>, recoverHandler?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  /**
   * @deprecated Use `keyedParallelJoint` instead. This method will be removed in a future version.
   */
  parallelJoint<
    T extends readonly HandlerFunction<O, unknown>[],
    R = Readonly<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>,
  >(
    handlers: T,
    failFast?: boolean,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, R, RootI>
  keyedParallelJoint<T extends Record<keyof T, HandlerFunction<O, Awaited<ReturnType<T[keyof T]>>>>>(
    handlers: T,
    failFast?: boolean,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, ParallelFuncResultsMap<O, T>, RootI>
  repair(recoverHandler: RecoverFunction<I, O>): PipeInterface<O, O, RootI>
  branch<R>(pipe: PipeInterface<O, R, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  branchAsync<R>(pipe: PipeInterface<O, R, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  /**
   * @deprecated Use `keyedParallelBranch` instead. This method will be removed in a future version.
   */
  parallelBranch<
    T extends readonly PipeInterface<O, unknown, O>[],
    R = Readonly<{ [K in keyof T]: Awaited<ReturnType<T[K]['streamAsync']>> }>,
  >(
    pipes: T,
    failFast?: boolean,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, R, RootI>
  keyedParallelBranch<T extends Record<keyof T, PipeInterface<O, Awaited<ReturnType<T[keyof T]['streamAsync']>>, O>>>(
    pipes: T,
    failFast?: boolean,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, ParallelPipeResultsMap<O, T>, RootI>
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
