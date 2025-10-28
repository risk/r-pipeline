/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { makeAsyncLayer, makeLayer, stackAsyncLayer, stackLayer } from '../layer/layer'
import { Pipe } from '../pipeline/pipe'
import { HandlerResult, Input } from '../pipeline/pipeTypes'

async function main() {
  // Make async layer implement
  const asyncSingleLayerImpl = makeAsyncLayer(
    async (input: Input<number>) => {
      console.log('call async entry')
      return input + 1
    },
    async (output: HandlerResult<string>) => {
      console.log('call async exit')
      return 'data: ' + output
    }
  )

  // Make async layer implement with context
  const asyncSingleLayerImplWithContext = makeAsyncLayer(
    async (input: Input<number>, context) => {
      console.log('call entry', context?.name)
      return input + 1
    },
    async (output: HandlerResult<string>, context) => {
      console.log('call exit', context?.name)
      return 'data: ' + output
    },
    { name: 'test async layer' }
  )

  // Sigle layer
  const withSingleAsyncLayer = stackAsyncLayer(asyncSingleLayerImpl)
  const asyncHandler1 = withSingleAsyncLayer(async input => {
    const result = input.toString()
    console.log('call handler', input, '->', result)
    return result
  })
  console.log('result:', await asyncHandler1(1))
  // output
  // call async entry
  // call handler 2 -> 2
  // call async exit
  // result: data: 2

  // Multi layers
  const withMultiAsyncLayer = stackAsyncLayer([asyncSingleLayerImpl, asyncSingleLayerImplWithContext])
  const asyncHandler2 = withMultiAsyncLayer(async input => {
    const result = input.toString()
    console.log('call handler', input, '->', result)
    return result
  })
  console.log('result:', await asyncHandler2(2))
  // output
  // call async entry
  // call entry test async layer
  // call handler 4 -> 4
  // call exit test async layer
  // call async exit
  // result: data: data: 4

  // Mix(sync/async) layers
  const layerImpl = makeLayer(
    (input: Input<number>) => {
      console.log('call entry')
      return input + 1
    },
    (output: HandlerResult<string>) => {
      console.log('call exit')
      return 'data: ' + output
    },
    { name: 'test layer' }
  )

  const withMixLayer = stackAsyncLayer([layerImpl, asyncSingleLayerImpl])
  const mixHandler = withMixLayer(async input => {
    const result = input.toString()
    console.log('call handler', input, '->', result)
    return result
  })
  console.log('result:', await mixHandler(2))
  // output
  // call entry
  // call async entry
  // call handler 4 -> 4
  // call async exit
  // call exit
  // result: data: data: 4

  // With r-pipeline
  const withMyLayer = stackAsyncLayer([asyncSingleLayerImpl, layerImpl])
  const pipe2 = Pipe.from(withMyLayer(x => x.toString())).joint(x => x + '+')
  console.log('with r-pipeline', await pipe2.streamAsync(2))
  // output
  // call async entry
  // call entry
  // call exit
  // call async exit
  // with r-pipeline data: data: 4+

  // Layer thenable fall-back
  const errorLayer = stackLayer([asyncSingleLayerImpl, layerImpl])
  const pipe3 = Pipe.from(errorLayer(x => x.toString())).joint(x => x + '+')
  console.log('errorLayer result', await pipe3.streamAsync(3))
  // output
  // call async entry
  // errorLayer result Error: [layer[0]:entry]Cannot use thenable function. Please use stackAsyncLayer()
}
main()
