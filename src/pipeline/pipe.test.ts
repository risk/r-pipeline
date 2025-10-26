/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { Pipe } from './pipe'

describe('Async Pipeline', () => {
  describe('Pipe', () => {
    it('Create pipe entry', () => {
      const pipe = Pipe.from((x: boolean) => !x)
      expect(pipe).toBeDefined()
      expect(pipe.stream(true)).toBe(false)
    })

    it('From only', () => {
      const pipe = Pipe.from((x: boolean) => !x)
      expect(pipe.stream(true)).toBe(false)
    })

    it('Joint a pipe', () => {
      const pipe = Pipe.from((x: string) => `${x}-`).joint((x: string) => `${x}-`)
      expect(pipe).toBeDefined()
      expect(pipe.stream('S')).toBe('S--')
    })

    it('Joint two pipes', () => {
      const f = (x: number) => x + 1
      const pipe = Pipe.from(f).joint(f).joint(f)
      expect(pipe).toBeDefined()
      expect(pipe.stream(1)).toBe(4)
    })

    it('branch pipe', () => {
      const f = (x: string) => `${x}+`
      const branchPipe = Pipe.from(f).joint(f)
      const pipe = Pipe.from(f).joint(f).branch(branchPipe)

      expect(pipe).toBeDefined()
      expect(pipe.stream('S')).toBe('S++++')
    })

    it('Window pipe', () => {
      const f = (x: number) => x + 1
      const pipe = Pipe.from(f).joint(f).window().joint(f)
      expect(pipe).toBeDefined()
      expect(pipe.stream(1)).toBe(4)
    })

    it('Window pipe with func', () => {
      let actual: number | null = null
      const f = (x: number) => x + 1
      const pipe = Pipe.from(f)
        .joint(f)
        .window(x => {
          actual = x
          return 100
        })
        .joint(f)
      expect(pipe).toBeDefined()
      expect(pipe.stream(1)).toBe(4)
      expect(actual).toBe(3)
    })

    it('Window pipe with object', () => {
      let actual: number | null = null
      const f = (x: { v: number }) => ({ v: x.v + 1 })
      const pipe = Pipe.from(f)
        .joint(f)
        .window(x => {
          actual = x.v
          x.v = 1000
          return 100
        })
        .joint(f)
      expect(pipe).toBeDefined()
      expect(pipe.stream({ v: 1 })).toStrictEqual({ v: 4 })
      expect(actual).toBe(3)
    })

    it('Errror interruption repair', () => {
      const f = (x: number) => x + 1
      const pipe = Pipe.from(f)
        .joint((): number | Error => new Error('error'))
        .repair((error, parentInput) => {
          if (parentInput === null) {
            return error
          }
          console.log('repair from', parentInput)
          return parentInput
        })
        .joint(f)
      expect(pipe).toBeDefined()
      const ret = pipe.stream(1)
      expect(ret).toBe(3)
    })
  })

  describe('Error cases', () => {
    it('Window pipe with error', () => {
      const f = (x: { v: number }) => ({ v: x.v + 1 })
      const pipe = Pipe.from(f)
        .joint(f)
        .joint((): { v: number } | Error => new Error('error'))
        .window(undefined, e => {
          e.message = 'change'
        })
        .joint(f)
        .joint(f)
        .joint(f)
      expect(pipe).toBeDefined()
      const ret = pipe.stream({ v: 1 })
      expect(ret).toBeInstanceOf(Error)
      if (ret instanceof Error) {
        expect(ret.message).toBe('error')
      }
    })

    it('Errror interruption', () => {
      const f = (x: number) => x + 1
      const pipe = Pipe.from(f)
        .joint((): number | Error => new Error('error'))
        .joint(f)
      expect(pipe).toBeDefined()
      const ret = pipe.stream(1)
      expect(ret).toBeInstanceOf(Error)
      if (ret instanceof Error) {
        expect(ret.message).toBe('error')
      }
    })

    it('should handle recover function error', () => {
      const pipe = Pipe.from((x: number) => x)
        .joint(() => new Error('test'))
        .repair(() => new Error('recover failed'))
      expect(pipe.stream(1)).toBeInstanceOf(Error)
    })
  })

  describe('use pipeline', () => {
    it('Multi step', () => {
      const ret = Pipe.from((x: string) => x + 'start')
        .joint(x => x + ' 1st')
        .joint(x => x + ' 2nd')
        .joint((): string | Error => {
          return new Error('error')
        })
        .window(undefined, x => console.log('window error', x))
        .joint(
          x => ({ str: x + ' 3rd', num: 1 }),
          () => 'recover error'
        )
        .joint(x => ({ str: x.str + ' 4th', num: x.num + 2 }))
        .branch(
          Pipe.from((x: { str: string; num: number }) => ({ str: x.str + ' 4th(Inject1)', num: x.num + 2 }))
            .joint(x => ({ str: x.str + ' 4th(Inject2)', num: x.num + 2 }))
            .joint(x => ({ str: x.str + ' 4th(Inject3)', num: x.num + 2, b: true }))
        )
        .window(x => console.log('window', x))
        .joint(x => ({ str: x.str + ' 5th', num: x.num + 2 }))
        .stream('')

      expect(ret).toStrictEqual({
        str: 'recover error 3rd 4th 4th(Inject1) 4th(Inject2) 4th(Inject3) 5th',
        num: 11,
      })
    })
  })

  describe('Pipe', () => {
    it('Create pipe entry', async () => {
      const pipe = Pipe.from(async (x: boolean) => ({ b: !x }))
      expect(pipe).toBeDefined()
      expect(await pipe.streamAsync(false)).toStrictEqual({ b: true })
    })

    it('From only', async () => {
      const pipe = Pipe.from(async (x: boolean) => ({ b: !x }))
      expect(await pipe.streamAsync(true)).toStrictEqual({ b: false })
    })

    it('Joint a pipe', async () => {
      const pipe = Pipe.from(async (x: string) => `${x}-`).joint(async (x: string) => `${x}-`)
      expect(pipe).toBeDefined()
      expect(await pipe.streamAsync('S')).toBe('S--')
    })

    it('Joint two pipes', async () => {
      const f = async (x: number) => x + 1
      const pipe = Pipe.from(f).joint(f).joint(f)
      expect(pipe).toBeDefined()
      expect(await pipe.streamAsync(1)).toBe(4)
    })

    it('branch pipe', async () => {
      const f = async (x: string) => `${x}+`
      const branchPipe = Pipe.from(f).joint(f)
      const pipe = Pipe.from(f).joint(f).branchAsync(branchPipe)

      expect(pipe).toBeDefined()
      expect(await pipe.streamAsync('S')).toBe('S++++')
    })

    it('Window pipe', async () => {
      const f = async (x: number) => x + 1
      const pipe = Pipe.from(f).joint(f).windowAsync().joint(f)
      expect(pipe).toBeDefined()
      expect(await pipe.streamAsync(1)).toBe(4)
    })

    it('Window pipe with func', async () => {
      let actual: number | null = null
      const f = async (x: number) => x + 1
      const pipe = Pipe.from(f)
        .joint(f)
        .windowAsync(async x => {
          actual = x
        })
        .joint(f)
      expect(pipe).toBeDefined()
      expect(await pipe.streamAsync(1)).toBe(4)
      expect(actual).toBe(3)
    })

    it('Window pipe with object', async () => {
      let actual: number | null = null
      const f = async (x: { v: number }) => ({ v: x.v + 1 })
      const pipe = Pipe.from(f)
        .joint(f)
        .windowAsync(async x => {
          actual = x.v
          x.v = 1000
        })
        .joint(f)
      expect(pipe).toBeDefined()
      expect(await pipe.streamAsync({ v: 1 })).toStrictEqual({ v: 4 })
      expect(actual).toBe(3)
    })

    it('Errror interruption repair', async () => {
      const f = async (x: number) => x + 1
      const pipe = Pipe.from(f)
        .joint(async (): Promise<number | Error> => new Error('error'))
        .repair(async (error, parentInput) => {
          if (parentInput === null) {
            return error
          }
          console.log('repair from', parentInput)
          return parentInput
        })
        .joint(f)
      expect(pipe).toBeDefined()
      const ret = await pipe.streamAsync(1)
      expect(ret).toBe(3)
    })
  })

  describe('Error cases', () => {
    it('Window pipe with error', async () => {
      const f = async (x: { v: number }) => ({ v: x.v + 1 })
      const pipe = Pipe.from(f)
        .joint(f)
        .joint(async (): Promise<{ v: number } | Error> => new Error('error'))
        .windowAsync(undefined, async e => {
          e.message = 'change'
        })
        .joint(f)
        .joint(f)
        .joint(f)
      expect(pipe).toBeDefined()
      const ret = await pipe.streamAsync({ v: 1 })
      expect(ret).toBeInstanceOf(Error)
      if (ret instanceof Error) {
        expect(ret.message).toBe('error')
      }
    })

    it('Errror interruption', async () => {
      const f = async (x: number) => x + 1
      const pipe = Pipe.from(f)
        .joint(async (): Promise<number | Error> => new Error('error'))
        .joint(f)
      expect(pipe).toBeDefined()
      const ret = await pipe.streamAsync(1)
      expect(ret).toBeInstanceOf(Error)
      if (ret instanceof Error) {
        expect(ret.message).toBe('error')
      }
    })

    it('should handle recover function error', async () => {
      const pipe = Pipe.from((x: number) => x)
        .joint(async () => new Error('test'))
        .repair(async () => new Error('recover failed'))
      expect(await pipe.streamAsync(1)).toBeInstanceOf(Error)
    })

    it('Pipe has async function but call stream (not async)', async () => {
      const mockFn = vi.fn()
      const pipe = Pipe.from((x: number) => x)
        .joint(async x => x + 1)
        .joint(mockFn)
      expect(await pipe.stream(1)).toBeInstanceOf(Error)
      expect(mockFn).not.toBeCalled()
    })
  })

  describe('Pipe mix', () => {
    it('sync + sync', async () => {
      const p = Pipe.from((x: number) => x + 1).joint(x => x * 2)
      const out = await p.streamAsync(5)
      expect(out).toBe(12)
    })

    it('sync + async + sync', async () => {
      const p = Pipe.from((x: number) => x + 1)
        .joint(async x => x * 2)
        .joint(x => `v:${x}`)
      const out = await p.streamAsync(5)
      expect(out).toBe('v:12')
    })

    it('error -> recover -> continue', async () => {
      const p = Pipe.from((x: number) => x)
        .joint<number>(() => new Error('boom'))
        .repair((_err, parent) => (parent ?? 0) + 10)
        .joint(x => x + 1)

      const out = await p.streamAsync(1)
      expect(out).toBe(12)
    })
  })

  describe('use async pipeline', () => {
    it('Multi step', async () => {
      const ret = await Pipe.from(async (x: string) => x + 'start')
        .joint(async x => x + ' 1st')
        .joint(async x => x + ' 2nd')
        .joint(async (): Promise<string | Error> => {
          return new Error('error')
        })
        .windowAsync(undefined, async x => console.log('window error', x))
        .joint(
          async x => ({ str: x + ' 3rd', num: 1 }),
          async () => 'recover error'
        )
        .joint(async x => ({ str: x.str + ' 4th', num: x.num + 2 }))
        .branchAsync(
          Pipe.from(async (x: { str: string; num: number }) => ({ str: x.str + ' 4th(Inject1)', num: x.num + 2 }))
            .joint(async x => ({ str: x.str + ' 4th(Inject2)', num: x.num + 2 }))
            .joint(async x => ({ str: x.str + ' 4th(Inject3)', num: x.num + 2, b: true }))
        )
        .windowAsync(async x => console.log('window', x))
        .joint(async x => ({ str: x.str + ' 5th', num: x.num + 2 }))
        .streamAsync('')

      expect(ret).toStrictEqual({
        str: 'recover error 3rd 4th 4th(Inject1) 4th(Inject2) 4th(Inject3) 5th',
        num: 11,
      })
    })
  })
})
