/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { Pipe } from '../pipeline/pipe'

// Single pipe
const singlePipeNum = Pipe.from((x: number) => x)
console.log(singlePipeNum.stream(1))
// output -> 1

const singlePipeStr = Pipe.from((x: string) => x)
console.log(singlePipeStr.stream('str'))
// output -> str

// Two pipes
const twoPipes = Pipe.from((x: number) => x).joint(x => x + 1)
console.log(twoPipes.stream(1))
// output -> 2

// Type chain
const typeChain = Pipe.from((x: number) => 'str:' + x.toString()).joint(x => x + 1)
console.log(typeChain.stream(1))
// output -> str:11

const typeChainObject = Pipe
    .from((x: number) => ({ value: x}))
    .joint(x => ({
      prev: x.value,
      value: x.value + 1
    }))
console.log(typeChainObject.stream(1))
// output -> { prev: 1, value: 2}

// Pipes with window : Debug print
const pipesWithWindow = Pipe.from((x: number) => x).joint(x => x + 1).window()
console.log(pipesWithWindow.stream(1))
// output -> no name 2 -> 2

// Pipes stream error : Immediately　return
const pipesWithError = Pipe
    .from((x: number) => x)
    .joint(():number | Error => new Error('error'))
    .joint((x) => x + 1 )
    .joint((x) => x + 1 )
const ret = pipesWithError.stream(1)
console.log(ret instanceof Error ? ret.message : 'not Error')
// output -> error

// Branch pipe connect
const subPipeX2 = Pipe
  .from((x: number) => x)
  .joint(x => ({
    x2: x * 2,
    x4: x * 4,
    x8: x * 8,
  }))
const subPipeX3 = Pipe
  .from((x: number) => x)
  .joint(x => ({
    x3: x * 3,
    x6: x * 6,
    x9: x * 9,
  }))
const basePipe = Pipe
  .from((x: number) => x)

const x2Pipe = basePipe.branch(subPipeX2)
  console.log(x2Pipe.stream(2))
// output -> { x2: 4, x4: 8, x8: 16 }

const x3Pipe = basePipe.branch(subPipeX3)
console.log(x3Pipe.stream(2))
// output -> { x3: 6, x6: 12, x9: 18 }