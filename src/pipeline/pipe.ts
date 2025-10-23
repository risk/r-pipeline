/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { HandlerResult, Input } from '../types'

import { makePipeError, makePipeSuccess, PipeError, PipeSuccess } from './pipeResult'

export function isError<T>(x: HandlerResult<T>): x is Error {
  return x instanceof Error
}

export interface PipeInterface {
  unitStream(): PipeInterface | null
  getResult(): unknown
}

type PipeFunction<I, R> = (input: Input<I>) => HandlerResult<R>
type RecoverFunction<PI, R> = (error: Error, parentInput: PI | null) => HandlerResult<R>

export class Pipe<I, O, PI, RootI> implements PipeInterface {
  private start: Pipe<RootI, unknown, never, RootI> | null = null
  private entryInput: Input<I> | null = null

  private next: Pipe<O, unknown, I, RootI> | null = null

  private success: PipeSuccess<O> | null = null
  private error: PipeError<I> | null = null

  static errorPassthrough<I>(error: Error): HandlerResult<I> {
    return error
  }

  constructor(
    private parent: Pipe<PI, I, never, RootI> | null,
    private step: (input: Input<I>) => HandlerResult<O>,
    private recover: RecoverFunction<PI, I> = Pipe.errorPassthrough<I>,
    private stage: string = 'no name'
  ) {
    if (this.parent) {
      this.parent.next = this
      this.start = this.parent.start
    }
  }

  static from<sI, sR>(fn: PipeFunction<sI, sR>): Pipe<sI, sR, never, sI> {
    const pipe = new Pipe<sI, sR, never, sI>(null, fn)
    pipe.start = pipe
    return pipe
  }

  label(stage: string) {
    this.stage = stage
    return this
  }

  joint<R>(fn: PipeFunction<O, R>, recover?: RecoverFunction<I, O>): Pipe<O, R, I, RootI> {
    return new Pipe<O, R, I, RootI>(this, fn, recover)
  }

  branch<R>(pipe: Pipe<O, R, I, O>, recover?: RecoverFunction<I, O>) {
    return this.joint((input: Input<O>): HandlerResult<R> => pipe.stream(input), recover)
  }

  repair(recover: RecoverFunction<I, O>): Pipe<O, O, I, RootI> {
    return this.joint(x => x, recover)
  }

  window(
    fn?: (arg: Input<O>) => void,
    errFn?: (error: Error) => void,
    useReference: boolean = false
  ): Pipe<O, O, I, RootI> {
    let errorStore: Error | null = null
    return this.joint(
      (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        fn ? fn(useReference ? x : structuredClone(x)) : console.log(this.stage, x)
        return x as HandlerResult<O>
      },
      (error: Error) => {
        errFn ? errFn(useReference ? error : structuredClone(error)) : console.error(this.stage, error)
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
      this.error = makePipeError(ret, input, this.stage)
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
      const input = this.recover(parentResult.error.error, parentResult.error.origin)
      if (isError(input)) {
        this.error = makePipeError(input, null, this.stage)
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
