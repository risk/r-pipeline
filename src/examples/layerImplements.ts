/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { makeLayer, stackLayer } from '../layer/layer'
import { Pipe } from '../pipeline/pipe'
import { HandlerResult, Input } from '../pipeline/pipeTypes'

// Make layer implement
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

// Make layer implement with context
const layerImplWithContext = makeLayer(
  (input: Input<number>, context) => {
    console.log('call entry', context?.name)
    return input + 1
  },
  (output: HandlerResult<string>, context) => {
    console.log('call exit', context?.name)
    return 'data: ' + output
  },
  { name: 'test layer' }
)

// Single layer
const withSingleLayer = stackLayer(layerImpl)

const handler1 = withSingleLayer(input => {
  const result = input.toString()
  console.log('call handler', input, '->', result)
  return result
})
console.log('result:', handler1(1))
// output
// call entry
// call handler 2 -> 2
// call exit
// result: data: 2

// Multi layers
const withMultiLayer = stackLayer([layerImpl, layerImplWithContext])
const handler2 = withMultiLayer(input => {
  const result = input.toString()
  console.log('call handler', input, '->', result)
  return result
})
console.log('result(multi):', handler2(2))
// output
// call entry
// call entry test layer
// call handler 4 -> 4
// call exit test layer
// call exit
// result(multi): data: data: 4

// With r-pipeline
const withMyLayer = stackLayer([layerImplWithContext, layerImpl])

const pipe1 = Pipe.from(withMyLayer(x => x.toString()))
console.log('with r-pipeline', pipe1.stream(3))
// output
// call entry test layer
// call entry
// call exit
// call exit test layer
// with r-pipeline data: data: 5
