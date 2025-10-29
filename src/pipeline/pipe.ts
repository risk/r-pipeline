/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { isThenable } from '../utils/isThenable'
import { safeEcho } from '../utils/safeEcho'

import { inputError, isError, thenableError } from './error'
import { errorPassthrough } from './helper'
import {
  HandlerFunction,
  HandlerResult,
  Input,
  makePipeError,
  makePipeSuccess,
  ParallelFuncResultsMap,
  ParallelPipeResultsMap,
  PipeError,
  PipeExecutable,
  PipeInterface,
  PipeResult,
  RecoverFunction,
} from './pipeTypes'

export class Pipe<I, O, PI, RootI> implements PipeInterface<I, O, RootI>, PipeExecutable {
  private start: Pipe<RootI, unknown, never, RootI> | null = null
  private entryInput: Input<I> | null = null

  private next: Pipe<O, unknown, I, RootI> | null = null

  private result: PipeResult<O, I> = { kind: 'empty' }

  constructor(
    private parent: Pipe<PI, I, never, RootI> | null,
    private handler: HandlerFunction<I, O>,
    private recoverHandler: RecoverFunction<PI, I> = errorPassthrough<I>,
    private stage: string = 'no name'
  ) {
    if (this.parent) {
      this.parent.next = this
      this.start = this.parent.start
    }
  }

  static from<sI, sR>(handler: HandlerFunction<sI, sR>): PipeInterface<sI, sR, sI> {
    const pipe = new Pipe<sI, sR, never, sI>(null, handler)
    pipe.start = pipe
    return pipe
  }

  label(stage: string): PipeInterface<I, O, RootI> {
    this.stage = stage
    return this
  }

  joint<R>(handler: HandlerFunction<O, R>, recoverHandler?: RecoverFunction<I, O>): PipeInterface<O, R, RootI> {
    return new Pipe<O, R, I, RootI>(this, handler, recoverHandler)
  }

  parallelJoint<
    T extends readonly HandlerFunction<O, unknown>[],
    R = Readonly<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>,
  >(handlers: T, failFast: boolean = true, recoverHandler?: RecoverFunction<I, O>): PipeInterface<O, R, RootI> {
    return this.joint(async (input: Input<O>): Promise<HandlerResult<R>> => {
      const results = await Promise.all(handlers.map(handler => handler(input)))
      if (failFast) {
        const error = Object.values(results).find(result => result instanceof Error)
        if (error !== undefined) {
          return error
        }
      }
      return results as HandlerResult<R>
    }, recoverHandler)
  }

  keyedParallelJoint<T extends Record<keyof T, HandlerFunction<O, Awaited<ReturnType<T[keyof T]>>>>>(
    handlers: T,
    failFast: boolean = true,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, ParallelFuncResultsMap<O, T>, RootI> {
    return this.joint(async (input: Input<O>): Promise<HandlerResult<ParallelFuncResultsMap<O, T>>> => {
      const keys = Object.keys(handlers) as (keyof T)[]
      const results = {} as ParallelFuncResultsMap<O, T>
      await Promise.all(
        keys.map(async key => {
          const result = await handlers[key](input)
          results[key] = result
        })
      )
      if (failFast) {
        const error = Object.values(results).find(result => result instanceof Error)
        if (error !== undefined) {
          return error
        }
      }
      return results
    }, recoverHandler)
  }

  repair(recoverHandler: RecoverFunction<I, O>): PipeInterface<O, O, RootI> {
    return this.joint(x => x, recoverHandler)
  }

  branch<R>(pipe: PipeInterface<O, R, O>, recoverHandler?: RecoverFunction<I, O>): PipeInterface<O, R, RootI> {
    return this.joint((input: Input<O>): HandlerResult<R> => pipe.stream(input), recoverHandler)
  }

  branchAsync<R>(pipe: PipeInterface<O, R, O>, recoverHandler?: RecoverFunction<I, O>): PipeInterface<O, R, RootI> {
    return this.joint(
      async (input: Input<O>): Promise<HandlerResult<R>> => await pipe.streamAsync(input),
      recoverHandler
    )
  }

  parallelBranch<
    T extends readonly PipeInterface<O, unknown, O>[],
    R = Readonly<{ [K in keyof T]: Awaited<ReturnType<T[K]['streamAsync']>> }>,
  >(pipes: T, failFast: boolean = true, recoverHandler?: RecoverFunction<I, O>): PipeInterface<O, R, RootI> {
    return this.joint(async (input: Input<O>): Promise<HandlerResult<R>> => {
      const results = await Promise.all(pipes.map(pipe => pipe.streamAsync(input)))
      if (failFast) {
        const error = Object.values(results).find(result => result instanceof Error)
        if (error !== undefined) {
          return error
        }
      }
      return results as HandlerResult<R>
    }, recoverHandler)
  }

  keyedParallelBranch<T extends Record<keyof T, PipeInterface<O, Awaited<ReturnType<T[keyof T]['streamAsync']>>, O>>>(
    pipes: T,
    failFast: boolean = true,
    recoverHandler?: RecoverFunction<I, O>
  ): PipeInterface<O, ParallelPipeResultsMap<O, T>, RootI> {
    return this.joint(async (input: Input<O>): Promise<HandlerResult<ParallelPipeResultsMap<O, T>>> => {
      const keys = Object.keys(pipes) as (keyof T)[]
      const results = {} as ParallelPipeResultsMap<O, T>
      await Promise.all(
        keys.map(async key => {
          results[key] = await pipes[key].streamAsync(input)
        })
      )
      if (failFast) {
        const error = Object.values(results).find(result => result instanceof Error)
        if (error !== undefined) {
          return error
        }
      }
      return results
    }, recoverHandler)
  }

  window(
    normalPath?: (arg: Input<O>, stage: string) => void,
    errorPath?: (error: Error, stage: string) => void,
    useReference: boolean = false
  ): PipeInterface<O, O, RootI> {
    let errorStore: Error | null = null
    return this.joint(
      (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        const ret = normalPath ? normalPath(safeEcho(x, useReference), this.stage) : console.log(this.stage, x)
        if (isThenable(ret)) {
          console.warn('Window handler is thenable function')
        }
        return x as HandlerResult<O>
      },
      (error: Error) => {
        const ret = errorPath ? errorPath(safeEcho(error, useReference), this.stage) : console.error(this.stage, error)
        if (isThenable(ret)) {
          console.warn('Window handler is thenable function')
        }
        errorStore = error
        return {} as HandlerResult<O>
      }
    )
  }

  windowAsync(
    normalPath?: (arg: Input<O>, stage: string) => void | Promise<void>,
    errorPath?: (error: Error, stage: string) => void | Promise<void>,
    useReference: boolean = false
  ): PipeInterface<O, O, RootI> {
    let errorStore: Error | null = null
    return this.joint(
      async (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        normalPath ? await normalPath(safeEcho(x, useReference), this.stage) : console.log(this.stage, x)
        return x as HandlerResult<O>
      },
      async (error: Error) => {
        errorPath ? await errorPath(safeEcho(error, useReference), this.stage) : console.error(this.stage, error)
        errorStore = error
        return {} as HandlerResult<O>
      }
    )
  }

  private resetResult() {
    this.result = {
      kind: 'empty',
    }
  }

  private setResult(result: HandlerResult<O>, input: I) {
    if (result instanceof Error) {
      this.result = makePipeError(result, input, this.stage)
    } else {
      this.result = makePipeSuccess(result)
    }
  }

  private getResult(): PipeResult<O, I> {
    return this.result
  }

  private getStreamError(): Error | null {
    const result = this.getResult()
    if (result.kind === 'error') {
      return result.value.error
    }
    /* c8 ignore next 4 */
    // なんのパイプも処理しないで null に落ちるケースはありえないので到達不可
    if (this.parent === null) {
      return null
    }
    return this.parent.getStreamError()
  }

  unitStream(): PipeExecutable | null {
    this.resetResult()

    let input: Input<I> | null = null
    let parentError: PipeError<PI> | null = null

    if (!this.parent) {
      input = this.entryInput
    } else {
      const parentResult = this.parent.getResult()

      if (parentResult.kind === 'error') {
        parentError = parentResult.value
      } else if (parentResult.kind === 'success') {
        input = parentResult.value.value
        /* c8 ignore next */
      } else {
        /* c8 ignore next 4 */
        // 前段の pipe が処理された場合、nullになることはないため到達不可
        this.result = inputError(this.stage)
        return null
      }
    }

    if (parentError) {
      const recoverResult = this.recoverHandler(parentError.error, parentError.origin)
      if (isThenable(recoverResult)) {
        this.result = thenableError(this.stage)
        return null
      }
      if (isError(recoverResult)) {
        this.result = makePipeError(recoverResult, null, this.stage)
        return null
      }
      input = recoverResult
    }

    /* c8 ignore next 5 */
    // input は null になり得ない（Pipe の接続上 null になりえない）ので、到達不可
    if (input === null) {
      this.result = inputError(this.stage)
      return null
    }

    const handlerResult = this.handler(input)
    if (isThenable(handlerResult)) {
      this.result = thenableError(this.stage)
      return null
    }
    this.setResult(handlerResult, input)
    return this.next ?? null
  }

  async unitStreamAsync(): Promise<PipeExecutable | null> {
    this.resetResult()

    let input: Input<I> | null = null
    let parentError: PipeError<PI> | null = null

    if (!this.parent) {
      input = this.entryInput
    } else {
      const parentResult = this.parent.getResult()

      if (parentResult.kind === 'error') {
        parentError = parentResult.value
      } else if (parentResult.kind === 'success') {
        input = parentResult.value.value
        /* c8 ignore next */
      } else {
        /* c8 ignore next 4 */
        // 前段の pipe が処理された場合、nullになることはないため到達不可
        this.result = inputError(this.stage)
        return null
      }
    }

    if (parentError) {
      const recoverResult = await this.recoverHandler(parentError.error, parentError.origin)
      if (isError(recoverResult)) {
        this.result = makePipeError(recoverResult, null, this.stage)
        return null
      }
      input = recoverResult
    }

    /* c8 ignore next 5 */
    // input は null になり得ない（Pipe の接続上 null になりえない）ので、到達不可
    if (input === null) {
      this.result = inputError(this.stage)
      return null
    }

    const handlerResult = await this.handler(input)
    this.setResult(handlerResult, input)
    return this.next ?? null
  }

  private doStream(input: Input<I>) {
    this.entryInput = input
    let current: PipeExecutable | null = this
    while (current !== null) {
      current = current.unitStream()
    }
  }

  private async doStreamAsync(input: Input<I>) {
    this.entryInput = input
    let current: PipeExecutable | null = this
    while (current !== null) {
      current = await current.unitStreamAsync()
    }
  }

  private getStreamResult(): HandlerResult<O> {
    const result = this.getResult()
    if (result.kind === 'success') {
      return result.value.value
    }
    const streamError = this.getStreamError()
    if (streamError) {
      return streamError
      /* c8 ignore next */
    }
    /* c8 ignore next 2 */
    // 成功も失敗もない場合は存在しない
    return new Error('Result not found')
  }

  stream(input: Input<RootI>): HandlerResult<O> {
    /* c8 ignore next 4 */
    // startがない = 実体が存在しない なので到達不可
    if (!this.start) {
      return new Error('Not executed by stream')
    }

    this.start.doStream(input)
    return this.getStreamResult()
  }

  async streamAsync(input: Input<RootI>): Promise<HandlerResult<O>> {
    /* c8 ignore next 4 */
    // startがない = 実体が存在しない なので到達不可
    if (!this.start) {
      return new Error('Not executed by stream')
    }

    await this.start.doStreamAsync(input)
    return this.getStreamResult()
  }
}
