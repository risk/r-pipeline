/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { Pipe } from '../pipeline/pipe'

async function main() {
  // Single pipe
  const singlePipeNum = Pipe.from(async (x: number) => x)
  console.log(await singlePipeNum.streamAsync(1))
  // output -> 1

  const singlePipeStr = Pipe.from(async (x: string) => x)
  console.log(await singlePipeStr.streamAsync('str'))
  // output -> str

  // Two pipes
  const twoPipes = Pipe.from(async (x: number) => x).joint(async x => x + 1)
  console.log(await twoPipes.streamAsync(1))
  // output -> 2

  // Type chain
  const typeChain = Pipe.from(async (x: number) => 'str:' + x.toString()).joint(async x => x + 1)
  console.log(await typeChain.streamAsync(1))
  // output -> str:11

  const typeChainObject = Pipe.from(async (x: number) => ({ value: x })).joint(async x => ({
    prev: x.value,
    value: x.value + 1,
  }))
  console.log(await typeChainObject.streamAsync(1))
  // output -> { prev: 1, value: 2}

  // Pipes with window : Debug print
  const pipesWithWindow = Pipe.from(async (x: number) => x)
    .joint(x => x + 1)
    .windowAsync()
  console.log(await pipesWithWindow.streamAsync(1))
  // output -> no name 2 -> 2

  // Pipes stream error : Immediately return
  const pipesWithError = Pipe.from(async (x: number) => x)
    .joint(async (): Promise<number | Error> => new Error('error'))
    .joint(async x => x + 1)
    .joint(async x => x + 1)
  const ret = await pipesWithError.streamAsync(1)
  console.log(ret instanceof Error ? ret.message : 'not Error')
  // output -> error

  // Branch pipe connect
  const subPipeX2 = Pipe.from(async (x: number) => x).joint(async x => ({
    x2: x * 2,
    x4: x * 4,
    x8: x * 8,
  }))
  const subPipeX3 = Pipe.from(async (x: number) => x).joint(async x => ({
    x3: x * 3,
    x6: x * 6,
    x9: x * 9,
  }))
  const basePipe = Pipe.from(async (x: number) => x)

  const x2Pipe = basePipe.branchAsync(subPipeX2)
  console.log(await x2Pipe.streamAsync(2))
  // output -> { x2: 4, x4: 8, x8: 16 }

  const x3Pipe = basePipe.branchAsync(subPipeX3)
  console.log(await x3Pipe.streamAsync(2))
  // output -> { x3: 6, x6: 12, x9: 18 }

  // Sync Async Mix pipes
  const mixPpipes = Pipe.from(async (x: number) => x)
    .joint(x => x + 1)
    .joint(async x => x + 1)
    .joint(x => x + 1)
  console.log(await mixPpipes.streamAsync(1))
  // output -> 4

  // Mix pipe error (must be called streamAsync but called stream)
  const mixPpipesError = Pipe.from(async (x: number) => x)
    .joint(x => x + 1)
    .joint(async x => x + 1)
    .joint(x => x + 1)
  console.log(await mixPpipesError.stream(1))
  // output -> Error: Cannot use thenable function

  // Branch pipe connect (mix)
  const subSyncPipeX2 = Pipe.from((x: number) => x).joint(x => ({
    x2: x * 2,
    x4: x * 4,
    x8: x * 8,
  }))
  const subAsyncPipeX3 = Pipe.from(async (x: number) => x).joint(async x => ({
    x3: x * 3,
    x6: x * 6,
    x9: x * 9,
  }))
  const baseAsyncPipe = Pipe.from(async (x: number) => x)

  const x2MixPipe = baseAsyncPipe.branch(subSyncPipeX2)
  console.log(await x2MixPipe.streamAsync(2))
  // output -> { x2: 4, x4: 8, x8: 16 }

  const x3MixPipe = baseAsyncPipe.branchAsync(subAsyncPipeX3)
  console.log(await x3MixPipe.streamAsync(2))
  // output -> { x3: 6, x6: 12, x9: 18 }
}
main()
