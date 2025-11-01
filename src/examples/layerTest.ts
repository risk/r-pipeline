/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { makeAsyncLayer, stackAsyncLayer } from '../layer/layer'
import { ExitJudgeResult, exitJudgeResultContinue, LayerConditions } from '../layer/layerTypes'
import { HandlerResult, Input } from '../pipeline/pipeTypes'

let retryCount = 0
const mockEntry = async (input: Input<number>): Promise<HandlerResult<number>> => {
  retryCount++
  return input + retryCount
}
const mockExit = async (output: HandlerResult<string>): Promise<HandlerResult<string>> => output
const mockExitJudge = async (
  _output: HandlerResult<string>,
  _input: Input<number>
): Promise<ExitJudgeResult<number>> => {
  console.log('test', _output, _input, retryCount, '???')
  if (retryCount < 3) {
    return {
      kind: 'retry',
      value: 10, // New input value for retry
    }
  }
  return exitJudgeResultContinue()
}

const conditions: LayerConditions<number, string, undefined> = {
  onEntryJudge: undefined,
  onExitJudge: mockExitJudge,
}

const layer = makeAsyncLayer(mockEntry, mockExit, undefined, 'testLayer', conditions)
const layerStack = stackAsyncLayer(layer)
const handler = layerStack(async x => {
  console.log('handler', x)
  return x.toString()
})

const result = await handler(1)
console.log(result)
// import { makeLayer, stackLayer } from '../layer/layer'
// import { entryJudgeResultContinue, exitJudgeResultContinue } from '../layer/layerTypes'
// import { HandlerResult, Input, isHandlerError } from '../pipeline/pipeTypes'

// // Make layer implement
// const layerImpl = makeLayer(
//   (input: Input<number>) => {
//     console.log('call entry')
//     return input + 1
//   },
//   (output: HandlerResult<string>) => {
//     console.log('call exit')
//     return 'data: ' + output
//   },
//   { name: 'test layer' }
// )

// // Make layer implement with context
// const layerImplWithContext = makeLayer(
//   (input: Input<number>, context) => {
//     console.log('call entry', context?.name)
//     return input + 1
//   },
//   (output: HandlerResult<string>, context) => {
//     console.log('call exit', context?.name)
//     return 'data: ' + output
//   },
//   { name: 'test layer' }
// )

// const layerSkip = makeLayer(
//   (input: Input<number>, context) => {
//     console.log('call entry', context?.name)
//     return input + 1
//   },
//   (output: HandlerResult<string>, context) => {
//     console.log('call exit', context?.name)
//     return output
//   },
//   { name: 'skip layer' },
//   'skip',
//   {
//     onEntryJudge: (input: HandlerResult<number>, context) => {
//       console.log('Call entry judge', context?.name, input)
//       return {
//         kind: 'skip',
//         value: 'test',
//       }
//     },
//     onExitJudge: (output: HandlerResult<string>, input: Input<number>, context) => {
//       console.log('Call exit judge', context?.name, input)
//       if (isHandlerError(output)) {
//         return exitJudgeResultContinue()
//       }
//       return exitJudgeResultContinue()
//     },
//   }
// )

// const layerRetry = makeLayer(
//   (input: Input<number>, context) => {
//     console.log('call entry', context?.name)
//     return input + 1
//   },
//   (output: HandlerResult<string>, context) => {
//     console.log('call exit', context?.name)
//     return output
//   },
//   { name: 'retry layer' },
//   'retry',
//   {
//     onEntryJudge: (input: HandlerResult<number>, context) => {
//       console.log('Call entry judge', context?.name, input)
//       return entryJudgeResultContinue()
//     },
//     onExitJudge: (output: HandlerResult<string>, input: Input<number>, context) => {
//       console.log('Call exit judge', context?.name, input)
//       if (isHandlerError(output)) {
//         return exitJudgeResultContinue()
//       }
//       const num = parseInt(output, 10)
//       if (num < 10) {
//         console.log('retry!', num)
//         return {
//           kind: 'retry',
//           value: input + 1,
//         }
//       }
//       return exitJudgeResultContinue()
//     },
//   }
// )

// const layerOverride = makeLayer(
//   (input: Input<number>, context) => {
//     console.log('call entry', context?.name)
//     return input + 1
//   },
//   (output: HandlerResult<string>, context) => {
//     console.log('call exit', context?.name)
//     return output
//   },
//   { name: 'override layer' },
//   'override',
//   {
//     onEntryJudge: (input: HandlerResult<number>, context) => {
//       console.log('Call entry judge', context?.name, input)
//       return entryJudgeResultContinue()
//     },
//     onExitJudge: (output: HandlerResult<string>, input: Input<number>, context) => {
//       console.log('Call exit judge', context?.name, input)
//       return {
//         kind: 'override',
//         error: new Error(`Error override! value is [${output}]`),
//       }
//     },
//   }
// )

// // Multi layers
// const withMultiLayer = stackLayer([layerImpl, layerOverride, layerImplWithContext, layerSkip, layerRetry])
// const handler2 = withMultiLayer(input => {
//   const result = input.toString()
//   console.log('call handler', input, '->', result)
//   return result
// })
// console.log('result(multi):', handler2(2))
