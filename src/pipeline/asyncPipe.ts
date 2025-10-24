/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */


import { HandlerResult, Input, makePipeError, makePipeSuccess, PipeError, PipeSuccess } from './pipeTypes'

function isError<T>(x: HandlerResult<T>): x is Error {
  return x instanceof Error
}

interface PipeInterface {
  unitStream(): Promise<PipeInterface | null>
}

type PipeFunction<I, R> = (input: Input<I>) => HandlerResult<R> | Promise<HandlerResult<R>>
type RecoverFunction<PI, R> = (error: Error, parentInput: PI | null) => HandlerResult<R> | Promise<HandlerResult<R>>

export class AsyncPipe<I, O, PI, RootI> implements PipeInterface {
  private start: AsyncPipe<RootI, unknown, never, RootI> | null = null
  private entryInput: Input<I> | null = null

  private next: AsyncPipe<O, unknown, I, RootI> | null = null

  private success: PipeSuccess<O> | null = null
  private error: PipeError<I> | null = null

  static errorPassthrough<I>(error: Error): HandlerResult<I> {
    return error
  }

  constructor(
    private parent: AsyncPipe<PI, I, never, RootI> | null,
    private step: PipeFunction<I, O>,
    private recover: RecoverFunction<PI, I> = AsyncPipe.errorPassthrough<I>,
    private stage: string = 'no name'
  ) {
    if (this.parent) {
      this.parent.next = this
      this.start = this.parent.start
    }
  }

  static from<sI, sR>(fn: PipeFunction<sI, sR>): AsyncPipe<sI, sR, never, sI> {
    const pipe = new AsyncPipe<sI, sR, never, sI>(null, fn)
    pipe.start = pipe
    return pipe
  }

  label(stage: string) {
    this.stage = stage
    return this
  }

  joint<R>(fn: PipeFunction<O, R>, recover?: RecoverFunction<I, O>): AsyncPipe<O, R, I, RootI> {
    return new AsyncPipe<O, R, I, RootI>(this, fn, recover)
  }

  branch<R>(pipe: AsyncPipe<O, R, never, O>, recover?: RecoverFunction<I, O>) {
    return this.joint(async (input: Input<O>): Promise<HandlerResult<R>> => await pipe.stream(input), recover)
  }

  repair(recover: RecoverFunction<I, O>): AsyncPipe<O, O, I, RootI> {
    return this.joint(x => x, recover)
  }

  window(
    fn?: (arg: Input<O>) => void,
    errFn?: (error: Error) => void,
    useReference: boolean = false
  ): AsyncPipe<O, O, I, RootI> {
    let errorStore: Error | null = null
    return this.joint(
      async (x: Input<O>) => {
        if (errorStore !== null) {
          return errorStore
        }
        fn ? await fn(useReference ? x : structuredClone(x)) : console.log(this.stage, x)
        return x as HandlerResult<O>
      },
      async (error: Error) => {
        errFn ? await errFn(useReference ? error : structuredClone(error)) : console.error(this.stage, error)
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
    if(ret.success === null && ret.error !== null) {
      return ret.error.error
    }
    if(this.parent === null) {
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

  async unitStream(): Promise<PipeInterface | null> {
    this.success = null
    this.error = null

    if (!this.parent) {
      const input = this.entryInput
      if (input === null) {
        console.error('Pipeline stream data is null')
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
        console.error('Pipeline input data is null')
        return null
      }
      const ret = await this.step(parentResult.success.value)
      this.setResult(ret, parentResult.success.value)
    }
    return this.next ?? null
  }

  private async doStream(input: Input<I>) {
    this.entryInput = input
    let current: PipeInterface | null = this
    while (current !== null) {
      current = await current.unitStream()
    }
  }

  async stream(input: Input<RootI>): Promise<HandlerResult<O>> {
    if (!this.start) {
      return new Error('Not executed by stream')
    }

    await this.start.doStream(input)
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
