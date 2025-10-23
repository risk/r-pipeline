/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { isError, Pipe } from './pipe'

describe('Pipeline', () => {
  describe('Pipe', () => {
    // it('Create pipe entry', () => {
    //   const pipe = Pipe.from((x: boolean) => !x)
    //   expect(pipe).toBeDefined()
    //   expect(pipe.stream(true)).toBe(false)
    // })

    // it('Joint a pipe', () => {
    //   const pipe = Pipe.from((x: string) => `${x}-`).joint((x: string) => `${x}-`)
    //   expect(pipe).toBeDefined()
    //   expect(pipe.stream('S')).toBe('S--')
    // })

    // it('Joint two pipes', () => {
    //   const f = (x: number) => x + 1
    //   const pipe = Pipe.from(f).joint(f).joint(f)
    //   expect(pipe).toBeDefined()
    //   expect(pipe.stream(1)).toBe(4)
    // })

    // it('branch pipe', () => {
    //   const f = (x: string) => `${x}+`
    //   const branchPipe = Pipe.from(f).joint(f)
    //   const pipe = Pipe.from(f).joint(f).branch(branchPipe)

    //   expect(pipe).toBeDefined()
    //   expect(pipe.stream('S')).toBe('S++++')
    // })

    // it('Window pipe', () => {
    //   let actual: number | null = null
    //   const f = (x: number) => x + 1
    //   const pipe = Pipe.from(f)
    //     .joint(f)
    //     .window(x => {
    //       actual = x
    //       return 100
    //     })
    //     .joint(f)
    //   expect(pipe).toBeDefined()
    //   expect(pipe.stream(1)).toBe(4)
    //   expect(actual).toBe(3)
    // })

    // it('Window pipe with object', () => {
    //   let actual: number | null = null
    //   const f = (x: { v: number }) => ({ v: x.v + 1 })
    //   const pipe = Pipe.from(f)
    //     .joint(f)
    //     .window(x => {
    //       actual = x.v
    //       x.v = 1000
    //       return 100
    //     })
    //     .joint(f)
    //   expect(pipe).toBeDefined()
    //   expect(pipe.stream({ v: 1 })).toStrictEqual({ v: 4 })
    //   expect(actual).toBe(3)
    // })

    it('Window pipe with error', () => {
      const f = (x: { v: number }) => ({ v: x.v + 1 })
      const pipe = Pipe.from(f)
        .joint(f)
        .joint((): { v: number } | Error => new Error('error'))
        .window(undefined, (e: Error) => (e.message = 'change'))
        .joint(f)
      expect(pipe).toBeDefined()
      const ret = pipe.stream({ v: 1 })
      console.log(ret)
      expect(isError(ret)).toBeTruthy()
      if (isError(ret)) {
        expect(ret.message).toBe('error')
      }
    })

    // it('Errror interruption', () => {
    //   const f = (x: number) => x + 1
    //   const pipe = Pipe.from(f)
    //     .joint((): number | Error => new Error('error'))
    //     .joint(f)
    //   expect(pipe).toBeDefined()
    //   const ret = pipe.stream(1)
    //   expect(isError(ret)).toBeTruthy()
    //   if (isError(ret)) {
    //     expect(ret.message).toBe('error')
    //   }
    // })

    // it('Errror interruption repair', () => {
    //   const f = (x: number) => x + 1
    //   const pipe = Pipe.from(f)
    //     .joint((x): PipeResult<number> => makePipeError('error', x))
    //     .repair(error => {
    //       console.log('entries', Object.entries(error))
    //       if (isPipeError(error)) {
    //         console.log('repair!', error.getOrigin<number>())
    //         return error.getOrigin<number>() ?? error
    //       } else {
    //         console.log('error!')
    //         return error
    //       }
    //     })
    //     .joint(f)
    //   expect(pipe).toBeDefined()
    //   const ret = pipe.stream(1)
    //   expect(ret).toBe(3)
    // })
  })

  // describe('use pipeline', () => {
  //   it('Multi step', () => {
  //     const ret = Pipe.from((x: string) => x + 'start')
  //       .joint(x => x + ' 1st')
  //       .joint(x => x + ' 2nd')
  //       .joint((): PipeResult<string> => {
  //         return makePipeError('error')
  //       })
  //       .window(undefined, x => console.log('window error', x))
  //       .joint(
  //         x => ({ str: x + ' 3rd', num: 1 }),
  //         () => 'recover error'
  //       )
  //       .joint(x => ({ str: x.str + ' 4th', num: x.num + 2 }))
  //       .branch(
  //         Pipe.from((x: { str: string; num: number }) => ({ str: x.str + ' 4th(Inject1)', num: x.num + 2 }))
  //           .joint(x => ({ str: x.str + ' 4th(Inject2)', num: x.num + 2 }))
  //           .joint(x => ({ str: x.str + ' 4th(Inject3)', num: x.num + 2, b: true }))
  //       )
  //       .window(x => console.log('window', x))
  //       .joint(x => ({ str: x.str + ' 5th', num: x.num + 2 }))
  //       .stream('')

  //     console.log('execute result', ret)
  //     return true
  //   })
  // })
})
