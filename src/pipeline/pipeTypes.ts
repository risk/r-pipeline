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
/**
 * Recovery function for a pipeline stage.
 *
 * It is invoked when the previous stage returns an Error instead of a normal value.
 *
 * @typeParam PI - Input type of the parent (previous) stage.
 * @typeParam R  - Output type after recovery.
 * @param error - Error value returned from the previous stage.
 * @param parentInput - The input value that was originally passed into
 *   the stage which produced this Error. (The "parent" stage input.)
 *   This may be null if the input is not available.
 * @returns A normal value to continue the pipeline, or an Error to propagate failure.
 */
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

/**
 * Core interface representing a typed pipeline.
 *
 * @typeParam I - Input type of the current stage.
 * @typeParam O - Output type of the current stage.
 * @typeParam RootI - Root input type of the whole pipeline.
 */
export interface PipeInterface<I, O, RootI> {
  /**
   * @beta Set or overwrite the label (stage name) for the current pipe.
   * Set or overwrite the label (stage name) for the current pipe.
   * Labels are mainly used for debugging, windowing, and error reporting.
   *
   * @param stage - Human-readable name of this stage.
   * @returns A new PipeInterface with the label applied.
   */
  label(stage: string): PipeInterface<I, O, RootI>
  /**
   * Append a new handler stage in series after the current one.
   * The output of the current stage becomes the input of the handler.
   *
   * @typeParam R - Output type of the next handler.
   * @param handler - Handler function to process the current output.
   * @param recoverHandler - Optional recovery handler invoked when this stage receives an Error
   *   from the previous stage. It gets:
   *     - the Error value
   *     - the input that was passed into the failing stage (parentInput)
   *   and can either repair the Error into a normal value or re-emit an Error.
   * @returns A new PipeInterface representing the extended pipeline.
   */
  joint<R>(handler: HandlerFunction<O, R>, recoverHandler?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  /**
   * @deprecated Use `keyedParallelJoint` instead. This method will be removed in a future version.
   *
   * Run multiple handlers in parallel using the same input, then aggregate the results as an array.
   *
   * @param handlers - Array of handler functions executed in parallel.
   * @param failFast - If true, stops as soon as a handler returns an Error.
   * @param recoverHandler - Optional recovery handler invoked when this stage receives an Error; it can repair or propagate the failure.
   */
  parallelJoint<
    T extends readonly HandlerFunction<O, unknown>[],
    R = Readonly<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>,
  >(
    handlers: T,
    failFast?: boolean,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, R, RootI>
  /**
   * Run multiple named handlers in parallel using the same input, then aggregate the results
   * into an object keyed by handler name.
   *
   * @typeParam T - Record of handler functions keyed by name.
   * @param handlers - Map of handlers executed in parallel.
   * @param failFast - If true, stops as soon as a handler returns an Error.
   * @param recoverHandler - Optional recovery handler invoked when this stage receives an Error; it can repair or propagate the failure.
   * @returns A new PipeInterface whose output is a map of handler results.
   */
  keyedParallelJoint<T extends Record<keyof T, HandlerFunction<O, Awaited<ReturnType<T[keyof T]>>>>>(
    handlers: T,
    failFast?: boolean,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, ParallelFuncResultsMap<O, T>, RootI>
  /**
   * Attach a recovery handler that can repair an Error produced by the current stage.
   * If the recovery succeeds, the pipeline continues with the repaired value.
   *
   * The recovery handler receives:
   *   - the Error value
   *   - the input that was passed into the failing stage (parentInput)
   *
   * @param recoverHandler - Recovery logic invoked when this stage fails.
   * @returns A new PipeInterface with recovery behavior attached.
   */
  repair(recoverHandler: RecoverFunction<I, O>): PipeInterface<O, O, RootI>
  /**
   * Branch into another pipeline using the current output as the branch root input.
   * The branch is executed synchronously.
   *
   * @typeParam R - Output type of the branch pipeline.
   * @param pipe - Pipeline that starts from the current output type.
   * @param recover - Optional recovery handler invoked when the branch receives an Error from its parent stage.
   * @returns A new PipeInterface that continues with the branch result.
   */
  branch<R>(pipe: PipeInterface<O, R, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  /**
   * Async version of {@link branch}. Executes the branch pipeline asynchronously.
   *
   * @typeParam R - Output type of the branch pipeline.
   * @param pipe - Pipeline that starts from the current output type.
   * @param recover - Optional recovery handler invoked when the async branch receives an Error from its parent stage.
   * @returns A new PipeInterface that continues with the async branch result.
   */
  branchAsync<R>(pipe: PipeInterface<O, R, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  /**
   * @deprecated Use `keyedParallelBranch` instead. This method will be removed in a future version.
   *
   * Run multiple pipelines in parallel, each receiving the same input, and aggregate their results as an array.
   *
   * @param pipes - Array of pipelines executed in parallel.
   * @param failFast - If true, stops as soon as a pipeline returns an Error.
   * @param recoverHandler - Optional recovery handler invoked when this stage receives an Error; it can repair or propagate the failure.
   */
  parallelBranch<
    T extends readonly PipeInterface<O, unknown, O>[],
    R = Readonly<{ [K in keyof T]: Awaited<ReturnType<T[K]['streamAsync']>> }>,
  >(
    pipes: T,
    failFast?: boolean,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, R, RootI>
  /**
   * Run multiple named pipelines in parallel, each receiving the same input,
   * and aggregate their results into an object keyed by pipeline name.
   *
   * @typeParam T - Record of pipelines keyed by name.
   * @param pipes - Map of pipelines executed in parallel.
   * @param failFast - If true, stops as soon as a pipeline returns an Error.
   * @param recoverHandler - Optional recovery handler invoked when this stage receives an Error; it can repair or propagate the failure.
   * @returns A new PipeInterface whose output is a map of pipeline results.
   */
  keyedParallelBranch<T extends Record<keyof T, PipeInterface<O, Awaited<ReturnType<T[keyof T]['streamAsync']>>, O>>>(
    pipes: T,
    failFast?: boolean,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, ParallelPipeResultsMap<O, T>, RootI>
  /**
   * Attach side-effect callbacks (taps) that observe values and errors flowing through this stage.
   * This is useful for logging, debugging, or metrics.
   *
   * @param normalPath - Callback invoked on successful values.
   * @param errPath - Callback invoked on errors.
   * @param useReference - If true, passes the original object reference instead of a cloned value (if applicable).
   * @returns A new PipeInterface with observation hooks attached.
   */
  window(
    normalPath?: (arg: Input<O>, stage: string) => void,
    errPath?: (error: Error, stage: string) => void,
    useReference?: boolean
  ): PipeInterface<O, O, RootI>
  /**
   * Async version of {@link window}. Allows asynchronous side effects during observation.
   *
   * @param normalPath - Async callback invoked on successful values.
   * @param errPath - Async callback invoked on errors.
   * @param useReference - If true, passes the original object reference instead of a cloned value (if applicable).
   * @returns A new PipeInterface with async observation hooks attached.
   */
  windowAsync(
    normalPath?: (arg: Input<O>, stage: string) => void | Promise<void>,
    errPath?: (error: Error, stage: string) => void | Promise<void>,
    useReference?: boolean
  ): PipeInterface<O, O, RootI>
  /**
   * Execute the pipeline synchronously from the root input.
   *
   * @param input - Initial input value for the pipeline.
   * @returns The final handler result of the pipeline (value or Error).
   */
  stream(input: Input<RootI>): HandlerResult<O>
  /**
   * Execute the pipeline asynchronously from the root input.
   *
   * @param input - Initial input value for the pipeline.
   * @returns A promise that resolves with the final handler result of the pipeline.
   */
  streamAsync(input: Input<RootI>): Promise<HandlerResult<O>>
}

/**
 * Represents an executable unit of a pipeline.
 * Mainly used for internal stepping / iteration over pipeline stages.
 */
export interface PipeExecutable {
  /**
   * Execute a single synchronous step of the pipeline.
   *
   * @returns The next executable state, or null when the pipeline is finished.
   */
  unitStream(): PipeExecutable | null
  /**
   * Execute a single asynchronous step of the pipeline.
   *
   * @returns A promise that resolves to the next executable state, or null when finished.
   */
  unitStreamAsync(): Promise<PipeExecutable | null>
}

/**
 * Helper interface for propagating errors through nested pipeline structures.
 */
export interface PipeStreamErrorPropagator {
  /**
   * Retrieve the underlying error or nested propagator.
   *
   * @returns The Error instance, a nested propagator, or null if no error is present.
   */
  getError(): Error | PipeStreamErrorPropagator | null
  /**
   * Retrieve the leaf Error after unwrapping any nested propagators.
   *
   * @returns The final Error instance, or null if no error is present.
   */
  getStreamError(): Error | null
}
