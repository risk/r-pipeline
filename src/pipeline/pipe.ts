/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { isThenable } from '../utils/isThenable'
import { safeEcho } from '../utils/safeEcho'

import { HandlerResult, Input, makePipeError, makePipeSuccess, PipeError, PipeResult } from './pipeTypes'

function isError<T>(x: HandlerResult<T>): x is Error {
  return x instanceof Error
}

interface PipeExecutable {
  unitStream(): PipeExecutable | null
  unitStreamAsync(): Promise<PipeExecutable | null>
}

interface PipeInterface<I, O, RootI> {
  label(stage: string): PipeInterface<I, O, RootI>
  joint<R>(fn: PipeFunction<O, R>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  repair(recover: RecoverFunction<I, O>): PipeInterface<O, O, RootI>
  branch<R>(pipe: PipeInterface<O, R, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  branchAsync<R>(pipe: PipeInterface<O, R, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI>
  window(
    fn?: (arg: Input<O>, stage: string) => void,
    errFn?: (error: Error, stage: string) => void,
    useReference?: boolean
  ): PipeInterface<O, O, RootI>
  windowAsync(
    fn?: (arg: Input<O>, stage: string) => void | Promise<void>,
    errFn?: (error: Error, stage: string) => void | Promise<void>,
    useReference?: boolean
  ): PipeInterface<O, O, RootI>
  stream(input: Input<RootI>): HandlerResult<O>
  streamAsync(input: Input<RootI>): Promise<HandlerResult<O>>
}

type PipeFunction<I, R> = (input: Input<I>) => HandlerResult<R> | Promise<HandlerResult<R>>
type RecoverFunction<PI, R> = (error: Error, parentInput: PI | null) => HandlerResult<R> | Promise<HandlerResult<R>>

const thenableError = (stage: string) =>
  makePipeError(new Error('Cannot use thenable function. Please use streamAsync'), null, stage)
const inputError = (stage: string) => makePipeError(new Error('Pipeline input data is null'), null, stage)

function errorPassthrough<I>(error: Error): HandlerResult<I> {
  return error
}

export class Pipe<I, O, PI, RootI> implements PipeInterface<I, O, RootI>, PipeExecutable {
  private start: Pipe<RootI, unknown, never, RootI> | null = null
  private entryInput: Input<I> | null = null

  private next: Pipe<O, unknown, I, RootI> | null = null

  private result: PipeResult<O, I> = {
    success: null,
    error: null,
  }

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

  static from<sI, sR>(fn: PipeFunction<sI, sR>): PipeInterface<sI, sR, sI> {
    const pipe = new Pipe<sI, sR, never, sI>(null, fn)
    pipe.start = pipe
    return pipe
  }

  label(stage: string): PipeInterface<I, O, RootI> {
    this.stage = stage
    return this
  }

  joint<R>(fn: PipeFunction<O, R>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI> {
    return new Pipe<O, R, I, RootI>(this, fn, recover)
  }

  repair(recover: RecoverFunction<I, O>): PipeInterface<O, O, RootI> {
    return this.joint(x => x, recover)
  }

  branch<R>(pipe: Pipe<O, R, never, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI> {
    return this.joint((input: Input<O>): HandlerResult<R> => pipe.stream(input), recover)
  }

  branchAsync<R>(pipe: Pipe<O, R, never, O>, recover?: RecoverFunction<I, O>): PipeInterface<O, R, RootI> {
    return this.joint(async (input: Input<O>): Promise<HandlerResult<R>> => await pipe.streamAsync(input), recover)
  }

  window(
    fn?: (arg: Input<O>, stage: string) => void,
    errFn?: (error: Error, stage: string) => void,
    useReference: boolean = false
  ): PipeInterface<O, O, RootI> {
    let errorStore: Error | null = null
    return this.joint(
      (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        const ret = fn ? fn(safeEcho(x, useReference), this.stage) : console.log(this.stage, x)
        if (isThenable(ret)) {
          console.warn('Window handler is thenable function')
        }
        return x as HandlerResult<O>
      },
      (error: Error) => {
        const ret = errFn ? errFn(safeEcho(error, useReference), this.stage) : console.error(this.stage, error)
        if (isThenable(ret)) {
          console.warn('Window handler is thenable function')
        }
        errorStore = error
        return {} as HandlerResult<O>
      }
    )
  }

  windowAsync(
    fn?: (arg: Input<O>, stage: string) => void | Promise<void>,
    errFn?: (error: Error, stage: string) => void | Promise<void>,
    useReference: boolean = false
  ): PipeInterface<O, O, RootI> {
    let errorStore: Error | null = null
    return this.joint(
      async (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        fn ? await fn(safeEcho(x, useReference), this.stage) : console.log(this.stage, x)
        return x as HandlerResult<O>
      },
      async (error: Error) => {
        errFn ? await errFn(safeEcho(error, useReference), this.stage) : console.error(this.stage, error)
        errorStore = error
        return {} as HandlerResult<O>
      }
    )
  }

  getResult(): PipeResult<O, I> {
    return this.result
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

  private resetResult() {
    this.result.success = null
    this.result.error = null
  }

  private setResult(ret: HandlerResult<O>, input: I) {
    if (ret instanceof Error) {
      this.result.error = makePipeError(ret, input, this.stage)
    } else {
      this.result.success = makePipeSuccess(ret)
    }
  }

  unitStream(): PipeExecutable | null {
    this.resetResult()

    let input: Input<I> | null = null
    let parentError: PipeError<PI> | null = null

    if (!this.parent) {
      input = this.entryInput
    } else {
      const parentResult = this.parent.getResult()

      if (parentResult.error) {
        parentError = parentResult.error
      } else if (parentResult.success) {
        input = parentResult.success.value
      } else {
        this.result.error = inputError(this.stage)
        return null
      }
    }

    if (parentError) {
      const recoverResult = this.recover(parentError.error, parentError.origin)
      if (isThenable(recoverResult)) {
        this.result.error = thenableError(this.stage)
        return null
      }
      if (isError(recoverResult)) {
        this.result.error = makePipeError(recoverResult, null, this.stage)
        return null
      }
      input = recoverResult
    }

    if (input === null) {
      this.result.error = inputError(this.stage)
      return null
    }

    const handlerResult = this.step(input)
    if (isThenable(handlerResult)) {
      this.result.error = thenableError(this.stage)
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

      if (parentResult.error) {
        parentError = parentResult.error
      } else if (parentResult.success) {
        input = parentResult.success.value
      } else {
        this.result.error = inputError(this.stage)
        return null
      }
    }

    if (parentError) {
      const recoverResult = await this.recover(parentError.error, parentError.origin)
      if (isError(recoverResult)) {
        this.result.error = makePipeError(recoverResult, null, this.stage)
        return null
      }
      input = recoverResult
    }

    if (input === null) {
      this.result.error = inputError(this.stage)
      return null
    }

    const handlerResult = await this.step(input)
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
