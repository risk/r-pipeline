/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../types'

import { makePipeError, makePipeSuccess, PipeError, PipeSuccess } from './pipeResult'

export function isError(obj: unknown): obj is Error {
  return obj instanceof Error
}

export interface PipeInterface {
  unitStream(): PipeInterface | null
  getResult(): unknown
}

type PipeFunction<I, R> = (input: Input<I>) => HandlerResult<R>
type RecoverFunction<Recover> = (error: Error) => HandlerResult<Recover>

export class Pipe<I, O, PI, RootI, RootO> implements PipeInterface {
  private start: Pipe<RootI, unknown, PI, RootI, RootO> | null = null
  private entryInput: Input<I> | null = null

  private next: Pipe<O, unknown, I, RootI, RootO> | null = null

  private success: PipeSuccess<O> | null = null
  private error: PipeError<I> | null = null

  static errorPassthrough<I>(error: Error): HandlerResult<I> {
    return error
  }

  constructor(
    private parent: Pipe<PI, I, never, RootI, RootO> | null,
    private step: (input: Input<I>) => HandlerResult<O>,
    private recover: RecoverFunction<I> = Pipe.errorPassthrough<I>
  ) {
    if (this.parent) {
      this.parent.next = this
      this.start = this.parent.start
    }
  }

  static from<sI, sR>(fn: PipeFunction<sI, sR>): Pipe<sI, sR, never, sI, sR> {
    const pipe = new Pipe<sI, sR, never, sI, sR>(null, fn)
    pipe.start = pipe
    return pipe
  }

  joint<R>(fn: PipeFunction<O, R>, recover?: RecoverFunction<O>): Pipe<O, R, I, RootI, RootO> {
    return new Pipe<O, R, I, RootI, RootO>(this, fn, recover)
  }

  branch<R>(pipe: Pipe<O, R, I, O, R>, recover?: RecoverFunction<O>) {
    return this.joint((input: Input<O>): HandlerResult<R> => pipe.stream(input), recover)
  }

  window(
    fn?: (arg: Input<O>) => void,
    errFn?: (error: Error) => void,
    useReference: boolean = false
  ): Pipe<O, O, I, RootI, RootO> {
    let errorStore: Error | null = null
    return this.joint(
      (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        fn ? fn(useReference ? x : structuredClone(x)) : console.log(x)
        return x as HandlerResult<O>
      },
      (error: Error) => {
        errFn ? errFn(useReference ? error : structuredClone(error)) : console.error(error)
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

  private setResult(ret: HandlerResult<O>, input: I) {
    if (ret instanceof Error) {
      this.error = makePipeError(ret, input)
    } else {
      this.success = makePipeSuccess(ret)
    }
  }

  unitStream(): PipeInterface | null {
    this.success = null
    this.error = null

    if (!this.parent) {
      const input = this.entryInput
      if (input === null) {
        console.error('Pipeline stream data is null')
        return null
      }
      const ret = this.step(input)
      this.setResult(ret, input)
      return this.next ?? null
    }

    const parentResult = this.parent.getResult()

    if (parentResult.error) {
      const input = this.recover(parentResult.error.error)
      if (isError(input)) {
        this.error = makePipeError(input, null)
        return null
      }
      const ret = this.step(input)
      this.setResult(ret, input)
    } else {
      if (parentResult.success === null) {
        console.error('Pipeline input data is null')
        return null
      }
      const ret = this.step(parentResult.success.value)
      this.setResult(ret, parentResult.success.value)
    }
    return this.next ?? null
  }

  private doStream(input: Input<I>) {
    this.entryInput = input
    let current: PipeInterface | null = this
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
    if (result.error) {
      return result.error.error
    }
    if (result.success) {
      return result.success.value
    }
    return new Error('Result not found')
  }
}
