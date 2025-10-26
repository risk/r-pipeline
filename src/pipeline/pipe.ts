/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { isThenable } from '../utils/isThenable'

import { HandlerResult, Input, makePipeError, makePipeSuccess, PipeError, PipeSuccess } from './pipeTypes'

function isError<T>(x: HandlerResult<T>): x is Error {
  return x instanceof Error
}

interface PipeExecutable {
  unitStream(): PipeExecutable | null
  unitStreamAsync(): Promise<PipeExecutable | null>
}

interface PipeAction<I, O, RootI> {
  label(stage: string): void
  joint<R>(fn: PipeFunction<O, R>, recover?: RecoverFunction<I, O>): PipeAction<O, R, RootI>
  repair(recover: RecoverFunction<I, O>): PipeAction<O, O, RootI>
  branch<R>(pipe: PipeAction<O, R, O>, recover?: RecoverFunction<I, O>): PipeAction<O, R, RootI>
  branchAsync<R>(pipe: PipeAction<O, R, O>, recover?: RecoverFunction<I, O>): PipeAction<O, R, RootI>
  window(fn?: (arg: Input<O>) => void, errFn?: (error: Error) => void, useReference?: boolean): PipeAction<O, O, RootI>
  windowAsync(
    fn?: (arg: Input<O>) => void | Promise<void>,
    errFn?: (error: Error) => void | Promise<void>,
    useReference?: boolean
  ): PipeAction<O, O, RootI>
  stream(input: Input<RootI>): HandlerResult<O>
  streamAsync(input: Input<RootI>): Promise<HandlerResult<O>>
}

type PipeFunction<I, R> = (input: Input<I>) => HandlerResult<R> | Promise<HandlerResult<R>>
type RecoverFunction<PI, R> = (error: Error, parentInput: PI | null) => HandlerResult<R> | Promise<HandlerResult<R>>

const safeEcho = <T>(x: T, ref: boolean) => (ref ? x : typeof x === 'object' ? JSON.parse(JSON.stringify(x)) : x)

const thenableError = (stage: string) => makePipeError(new Error(`Cannot use thenable function`), null, stage)

function errorPassthrough<I>(error: Error): HandlerResult<I> {
  return error
}

export class Pipe<I, O, PI, RootI> implements PipeAction<I, O, RootI>, PipeExecutable {
  private start: Pipe<RootI, unknown, never, RootI> | null = null
  private entryInput: Input<I> | null = null

  private next: Pipe<O, unknown, I, RootI> | null = null

  private success: PipeSuccess<O> | null = null
  private error: PipeError<I> | null = null

  constructor(
    private parent: Pipe<PI, I, never, RootI> | null,
    private step: PipeFunction<I, O>,
    private recover: RecoverFunction<PI, I> = errorPassthrough<I>,
    private stage: string = 'no name'
  ) {
    if (this.parent) {
      this.parent.next = this
      this.start = this.parent.start
    }
  }

  static from<sI, sR>(fn: PipeFunction<sI, sR>): PipeAction<sI, sR, sI> {
    const pipe = new Pipe<sI, sR, never, sI>(null, fn)
    pipe.start = pipe
    return pipe
  }

  label(stage: string) {
    this.stage = stage
    return this
  }

  joint<R>(fn: PipeFunction<O, R>, recover?: RecoverFunction<I, O>): PipeAction<O, R, RootI> {
    return new Pipe<O, R, I, RootI>(this, fn, recover)
  }

  repair(recover: RecoverFunction<I, O>): PipeAction<O, O, RootI> {
    return this.joint(x => x, recover)
  }

  branch<R>(pipe: Pipe<O, R, never, O>, recover?: RecoverFunction<I, O>): PipeAction<O, R, RootI> {
    return this.joint((input: Input<O>): HandlerResult<R> => pipe.stream(input), recover)
  }

  branchAsync<R>(pipe: Pipe<O, R, never, O>, recover?: RecoverFunction<I, O>): PipeAction<O, R, RootI> {
    return this.joint(async (input: Input<O>): Promise<HandlerResult<R>> => await pipe.streamAsync(input), recover)
  }

  window(
    fn?: (arg: Input<O>) => void,
    errFn?: (error: Error) => void,
    useReference: boolean = false
  ): PipeAction<O, O, RootI> {
    let errorStore: Error | null = null
    return this.joint(
      (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        const ret = fn ? fn(safeEcho(x, useReference)) : console.log(this.stage, x)
        if (isThenable(ret)) {
          console.warn('Window handler is thenable function')
        }
        return x as HandlerResult<O>
      },
      (error: Error) => {
        const ret = errFn ? errFn(safeEcho(error, useReference)) : console.error(this.stage, error)
        if (isThenable(ret)) {
          console.warn('Window handler is thenable function')
        }
        errorStore = error
        return {} as HandlerResult<O>
      }
    )
  }

  windowAsync(
    fn?: (arg: Input<O>) => void | Promise<void>,
    errFn?: (error: Error) => void | Promise<void>,
    useReference: boolean = false
  ): PipeAction<O, O, RootI> {
    let errorStore: Error | null = null
    return this.joint(
      async (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        fn ? await fn(safeEcho(x, useReference)) : console.log(this.stage, x)
        return x as HandlerResult<O>
      },
      async (error: Error) => {
        errFn ? await errFn(safeEcho(error, useReference)) : console.error(this.stage, error)
        errorStore = error
        return {} as HandlerResult<O>
      }
    )
  }

  getResult(): {
    success: PipeSuccess<O> | null
    error: PipeError<I> | null
  } {
    return {
      success: this.success,
      error: this.error,
    }
  }

  getStreamError(): Error | null {
    const ret = this.getResult()
    if (ret.success === null && ret.error !== null) {
      return ret.error.error
    }
    if (this.parent === null) {
      return null
    }
    return this.parent.getStreamError()
  }

  private setResult(ret: HandlerResult<O>, input: I) {
    if (ret instanceof Error) {
      this.error = makePipeError(ret, input, this.stage)
    } else {
      this.success = makePipeSuccess(ret)
    }
  }

  unitStream(): PipeExecutable | null {
    this.success = null
    this.error = null

    if (!this.parent) {
      const input = this.entryInput
      if (input === null) {
        this.error = makePipeError(new Error('Pipeline stream data is null'), null, this.stage)
        return null
      }
      const ret = this.step(input)
      if (isThenable(ret)) {
        this.error = thenableError(this.stage)
        return null
      }
      this.setResult(ret, input)
      return this.next ?? null
    }

    const parentResult = this.parent.getResult()

    if (parentResult.error) {
      const input = this.recover(parentResult.error.error, parentResult.error.origin)
      if (isThenable(input)) {
        this.error = thenableError(this.stage)
        return null
      }
      if (isError(input)) {
        this.error = makePipeError(input, null, this.stage)
        return null
      }
      const ret = this.step(input)
      if (isThenable(ret)) {
        this.error = thenableError(this.stage)
        return null
      }
      this.setResult(ret, input)
    } else {
      if (parentResult.success === null) {
        this.error = makePipeError(new Error('Pipeline input data is null'), null, this.stage)
        return null
      }
      const ret = this.step(parentResult.success.value)
      if (isThenable(ret)) {
        this.error = thenableError(this.stage)
        return null
      }
      this.setResult(ret, parentResult.success.value)
    }
    return this.next ?? null
  }

  private doStream(input: Input<I>) {
    this.entryInput = input
    let current: PipeExecutable | null = this
    while (current !== null) {
      current = current.unitStream()
    }
  }

  stream(input: Input<RootI>): HandlerResult<O> {
    if (!this.start) {
      return new Error('Not executed by stream')
    }

    this.start.doStream(input)
    const result = this.getResult()
    if (result.success) {
      return result.success.value
    }
    const streamError = this.getStreamError()
    if (streamError) {
      return streamError
    }
    return new Error('Result not found')
  }

  async unitStreamAsync(): Promise<PipeExecutable | null> {
    this.success = null
    this.error = null

    if (!this.parent) {
      const input = this.entryInput
      if (input === null) {
        this.error = makePipeError(new Error('Pipeline stream data is null'), null, this.stage)
        return null
      }
      const ret = await this.step(input)
      this.setResult(ret, input)
      return this.next ?? null
    }

    const parentResult = this.parent.getResult()

    if (parentResult.error) {
      const input = await this.recover(parentResult.error.error, parentResult.error.origin)
      if (isError(input)) {
        this.error = makePipeError(input, null, this.stage)
        return null
      }
      const ret = await this.step(input)
      this.setResult(ret, input)
    } else {
      if (parentResult.success === null) {
        this.error = makePipeError(new Error('Pipeline input data is null'), null, this.stage)
        return null
      }
      const ret = await this.step(parentResult.success.value)
      this.setResult(ret, parentResult.success.value)
    }
    return this.next ?? null
  }

  private async doStreamAsync(input: Input<I>) {
    this.entryInput = input
    let current: PipeExecutable | null = this
    while (current !== null) {
      current = await current.unitStreamAsync()
    }
  }

  async streamAsync(input: Input<RootI>): Promise<HandlerResult<O>> {
    if (!this.start) {
      return new Error('Not executed by stream')
    }

    await this.start.doStreamAsync(input)
    const result = this.getResult()
    if (result.success) {
      return result.success.value
    }
    const streamError = this.getStreamError()
    if (streamError) {
      return streamError
    }
    return new Error('Result not found')
  }
}
