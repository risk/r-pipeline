# r-pipeline
[![npm version](https://img.shields.io/npm/v/r-pipeline.svg)](https://www.npmjs.com/package/r-pipeline)
[![npm downloads](https://img.shields.io/npm/dw/r-pipeline.svg)](https://www.npmjs.com/package/r-pipeline)
![Type Definitions](https://img.shields.io/badge/types-TypeScript-blue)

A **Type-Safe** TypeScript utility library for creating and managing data processing pipelines with unified sync/async support.

r-pipeline is built around the idea that data should flow as types do — safely, predictably, and with responsibility. Now with **unified sync/async pipeline support** in a single, powerful API.

## 🎯 Key Features

- 🔒 **Type-Safe Pipeline** — **Complete type safety** from input to output with automatic type inference
- ✅ **Compile-Time Guarantees** — Most mistakes are caught before runtime
- 🔗 **Chainable Steps** — Compose complex data transformations with **type-safe** chaining
- ⚡ **Unified Async Support** — **Single API** for both sync and async operations with `stream()` and `streamAsync()`
- 🔄 **Sync + Async Mix** — Seamlessly mix synchronous and asynchronous operations in the same pipeline
- 🚀 **Keyed Parallel Processing** — Execute multiple operations concurrently with meaningful keys using `keyedParallelJoint` and `keyedParallelBranch`
- 🏗️ **Layer Architecture** — Advanced middleware pattern with entry/exit hooks and context support
- 🛡️ **Advanced Error Handling** — Type-safe error handling with detailed error information and recovery
- 🔍 **Enhanced Debugging** — Built-in debugging with stage information and reference control
- 📦 **TypeScript First** — Built exclusively for TypeScript with **zero JavaScript dependencies**
- 🧩 **Zero Runtime Dependencies** — Fully self-contained, built only with TypeScript's type system and JavaScript primitives
- 🧪 **Well Tested** — Comprehensive test coverage with modular architecture


## ⚙️ Error Handling Design

r-pipeline does not use `throw` for error handling.  
Instead, errors are treated as values and passed through the pipeline just like any other data.  
This ensures deterministic, composable behavior and keeps control flow fully explicit.

Throwing an error represents a deliberate choice to exit the pipeline  
and delegate the exception to the outer world.

This design is realized through r-pipeline itself,  
enabling predictable data flow, functional-style composition,  
and resilient async orchestration.

## Installation

**Env**: Node 18+ / TS 5.3+ (ES2020 target recommended)

```bash
npm install r-pipeline
```

## Usage

### 🔒 Type-Safe Pipeline

```typescript
import { Pipe } from 'r-pipeline';

// ✅ Type-safe: Input number → Output number
const pipeline = Pipe.from((x: number) => x * 2)
  .joint(x => x + 1)      // ✅ Type inferred: number
  .joint(x => x * 3);    // ✅ Type inferred: number

const result = pipeline.stream(5);  // ✅ Type-safe: result is number
console.log(result); // 33
```

### 🚀 Automatic Type Inference

```typescript
// ✅ Type automatically inferred through the chain
const typeChain = Pipe.from((x: number) => x.toString())  // number → string
  .joint(x => x.length)                         // string → number
  .joint(x => x * 2);                          // number → number

const result = typeChain.stream(42);  // ✅ Type-safe: result is number
console.log(result); // 4
```

### 🛡️ Type-Safe Error Handling

```typescript
// ✅ Type-safe error handling with automatic type propagation
const pipeline = Pipe.from((x: number) => x * 2)
  .joint((): number | Error => new Error('error'))  // ✅ Type-safe error
  .repair((error, parentInput) => {  // ✅ Type-safe recovery
    console.log('repair from', parentInput);
    return parentInput || 0;  // ✅ Type-safe fallback
  })
  .joint(x => x + 1);  // ✅ Type inferred: number

const result = pipeline.stream(5);  // ✅ Type-safe: result is number | Error
console.log(result); // 11
```

### 🔍 Type-Safe Debugging

```typescript
// ✅ Type-safe debugging with stage information
const pipeline = Pipe.from((x: number) => x * 2)
  .joint(x => x + 1)
  .window((x, stage) => console.log(`${stage}:`, x))  // ✅ Type-safe: x is number, stage is string
  .joint(x => x * 3);

const result = pipeline.stream(5);  // ✅ Type-safe: result is number
// Output: no name: 11
console.log(result); // 33
```

### ⚡ Async Pipeline Support

```typescript
import { Pipe } from 'r-pipeline';

// ✅ Type-safe async pipeline with automatic type inference
const asyncPipeline = Pipe.from(async (x: number) => x * 2)
  .joint(async x => x + 1)      // ✅ Type inferred: number
  .joint(x => `result: ${x}`);  // ✅ Type inferred: string

const result = await asyncPipeline.streamAsync(5);  // ✅ Type-safe: result is string
console.log(result); // "result: 11"
```

### 🔄 Sync + Async Mix

```typescript
// ✅ Seamless mixing of sync and async operations in unified API
const mixedPipeline = Pipe
  .from((x: number) => x + 1)      // ✅ Sync operation
  .joint(async x => x * 2)          // ✅ Async operation
  .joint(x => `v:${x}`);            // ✅ Sync operation

const result = await mixedPipeline.streamAsync(5);  // ✅ Type-safe: result is string
console.log(result); // "v:12"
```

### 🚀 Parallel Processing (order-independent)

#### **Keyed Parallel Joint** — order-independent, key-addressable (Recommended)

```typescript
// ✅ Parallel execution with meaningful keys
const parallelPipeline = Pipe.from(async (x: number) => x)
  .keyedParallelJoint({
    doubled: async (x) => x * 2,
    added: async (x) => x + 10,
    stringified: async (x) => `value: ${x}`,
  });

const result = await parallelPipeline.streamAsync(5);
// Result: { doubled: 10, added: 15, stringified: "value: 5" }
// ✅ Access with meaningful keys: result.doubled, result.added, result.stringified
```

#### **Keyed Parallel Branch** — order-independent, key-addressable (Recommended)

```typescript
// ✅ Parallel execution of multiple pipelines with meaningful keys
const branch1 = Pipe.from(async (x: number) => x * 2);
const branch2 = Pipe.from(async (x: number) => x + 10);
const branch3 = Pipe.from(async (x: number) => `value: ${x}`);

const parallelBranchPipeline = Pipe.from(async (x: number) => x)
  .keyedParallelBranch({
    doubled: branch1,
    added: branch2,
    stringified: branch3,
  });

const result = await parallelBranchPipeline.streamAsync(5);
// Result: { doubled: 10, added: 15, stringified: "value: 5" }
// ✅ Access with meaningful keys: result.doubled, result.added, result.stringified
```

#### **Error Handling with Parallel Processing**

```typescript
// ✅ Fail-fast mode (default: stops on first error)
const failFastPipeline = Pipe.from(async (x: number) => x)
  .keyedParallelJoint({
    success: async (x) => x * 2,
    error: async () => new Error('failure'),
  });

const result1 = await failFastPipeline.streamAsync(5);
// Result: Error('failure')

// ✅ Continue mode (collects all results, including errors)
const continuePipeline = Pipe.from(async (x: number) => x)
  .keyedParallelJoint(
    {
      success: async (x) => x * 2,
      error: async () => new Error('failure'),
    },
    false // failFast = false
  );

const result2 = await continuePipeline.streamAsync(5);
// Result: { success: 10, error: Error('failure') }
```

> **Deprecated**: `parallelJoint` / `parallelBranch` are superseded by the keyed variants.  
> They may be removed in a future major release. Please migrate to `keyedParallelJoint` / `keyedParallelBranch`.

### 🛡️ Type-Safe Error Handling with Async

```typescript
// ✅ Type-safe error handling with async recovery
const asyncPipeline = Pipe.from(async (x: number) => x * 2)
  .joint(async (): Promise<number | Error> => new Error('async error'))
  .repair(async (error, parentInput) => {  // ✅ Async recovery
    console.log('async repair from', parentInput);
    return (parentInput || 0) + 10;
  })
  .joint(async x => x + 1);

const result = await asyncPipeline.streamAsync(5);
console.log(result); // 21
```

### 🔍 Type-Safe Debugging with Async

```typescript
// ✅ Type-safe debugging with async support and stage information
const asyncPipeline = Pipe.from(async (x: number) => x * 2)
  .joint(async x => x + 1)
  .windowAsync(async (x, stage) => {  // ✅ Async debugging with stage
    console.log(`${stage} async debug:`, x);
    await someAsyncOperation(x);
  })
  .joint(async x => x * 3);

const result = await asyncPipeline.streamAsync(5);
// Output: no name async debug: 11
console.log(result); // 33
```

### 🛠️ HandlerResult Type Guards

```typescript
import { isHandlerError, isHandlerSuccess, HandlerResult } from 'r-pipeline';

const result: HandlerResult<string> = await pipe.streamAsync(input);

// ✅ Type-safe error checking
if (isHandlerError(result)) {
  console.error('Pipeline failed:', result.message);
  // TypeScript knows: result is Error
  return;
}

// ✅ Type-safe success handling
if (isHandlerSuccess(result)) {
  console.log('Success:', result);
  // TypeScript knows: result is string (not Error)
  return result.toUpperCase();
}

// ✅ Usage with parallel processing
const results = await pipe.keyedParallelJoint({
  user: fetchUser,
  posts: fetchPosts,
}).streamAsync(userId);

// Type-safe result checking
if (isHandlerError(results)) {
  console.error('Error:', results.message);
} else {
  // TypeScript knows: results is { user: User, posts: Post[] }
  console.log('User:', results.user);
  console.log('Posts:', results.posts);
}
```

## 🏗️ Layer Architecture

r-pipeline includes a powerful **Layer Architecture** that provides middleware-like functionality with entry/exit hooks, context support, and **conditional control flow**.

### **Layer Concept**

Layers wrap handlers with **entry** and **exit** functions that execute before and after the main handler, enabling:
- **Logging & Monitoring**: Track data flow and performance
- **Authentication & Authorization**: Validate inputs and outputs
- **Data Transformation**: Pre/post processing
- **Error Handling**: Custom error recovery and logging
- **Conditional Control**: Skip handlers, retry operations, or override results based on conditions

### **Basic Layer Usage**

```typescript
import { Pipe, makeLayer, stackLayer } from 'r-pipeline';

// Create a logging layer
const loggingLayer = makeLayer(
  (input: number, context) => {
    console.log(`[${context?.name}] Entry:`, input);
    return input + 1; // Transform input
  },
  (output: string, context) => {
    console.log(`[${context?.name}] Exit:`, output);
    return `processed: ${output}`; // Transform output
  },
  { name: 'Logger' }, // Context
  'loggingLayer'      // Name (optional)
);

// Use with Pipe
const pipe = Pipe.from(stackLayer(loggingLayer)(x => x.toString()))
  .joint(x => x.toUpperCase());

const result = pipe.stream(5);
// Console: [Logger] Entry: 5
// Console: [Logger] Exit: 6
// Result: "processed: 6"
```

### **Multiple Layers**

```typescript
// Create multiple layers
const authLayer = makeLayer(
  (input: number) => {
    console.log('Auth check:', input);
    return input;
  },
  (output: string) => {
    console.log('Auth verified:', output);
    return output;
  }
);

const loggingLayer = makeLayer(
  (input: number) => {
    console.log('Logging:', input);
    return input;
  },
  (output: string) => {
    console.log('Logged:', output);
    return output;
  }
);

// Stack multiple layers
const pipe = Pipe.from(stackLayer([authLayer, loggingLayer])(x => x.toString()));

const result = pipe.stream(10);
// Console: Auth check: 10
// Console: Logging: 10
// Console: Logged: 10
// Console: Auth verified: 10
// Result: "10"
```

### **Async Layers**

```typescript
import { makeAsyncLayer, stackAsyncLayer } from 'r-pipeline';

// Create async layer
const asyncLayer = makeAsyncLayer(
  async (input: number) => {
    console.log('Async entry:', input);
    await new Promise(resolve => setTimeout(resolve, 100));
    return input + 1;
  },
  async (output: string) => {
    console.log('Async exit:', output);
    await new Promise(resolve => setTimeout(resolve, 100));
    return `async: ${output}`;
  }
);

// Use with async pipeline
const pipe = Pipe.from(stackAsyncLayer(asyncLayer)(async x => x.toString()));

const result = await pipe.streamAsync(5);
// Console: Async entry: 5
// Console: Async exit: 6
// Result: "async: 6"
```

### **Conditional Layers**

Layers support conditional control flow through **entry judge** and **exit judge** functions that can:
- **Skip** the handler and return a value directly
- **Retry** the operation with a new input value
- **Override** the result with an error

#### **Entry Judge - Skip Handler**

```typescript
import { entryJudgeResultContinue } from 'r-pipeline';

const conditionalLayer = makeLayer(
  (input: number) => input + 1,
  (output: string) => output,
  undefined, // Context
  'conditionalLayer',
  {
    onEntryJudge: (input: number) => {
      if (input === 2) {
        // Skip handler and return value directly
        return { kind: 'skip', value: 'skipped' };
      }
      return entryJudgeResultContinue();
    },
    onExitJudge: undefined,
  }
);

const pipe = Pipe.from(stackLayer(conditionalLayer)(x => x.toString()));
const result = pipe.stream(1);
// Result: "skipped" (handler not executed)
```

#### **Exit Judge - Retry Operation**

```typescript
import { exitJudgeResultContinue } from 'r-pipeline';

let retryCount = 0;
const retryLayer = makeLayer(
  (input: number) => {
    retryCount++;
    return input + retryCount;
  },
  (output: string) => output,
  undefined,
  'retryLayer',
  {
    onEntryJudge: undefined,
    onExitJudge: (output: string, input: number) => {
      if (retryCount < 3) {
        // Retry with new input value
        return { kind: 'retry', value: 10 };
      }
      return exitJudgeResultContinue();
    },
  }
);

const pipe = Pipe.from(stackLayer(retryLayer)(x => x.toString()));
const result = pipe.stream(1);
// Result: "13" (10 + 3, after 2 retries)
```

#### **Exit Judge - Override Result**

```typescript
const overrideLayer = makeLayer(
  (input: number) => input,
  (output: string) => output,
  undefined,
  'overrideLayer',
  {
    onEntryJudge: undefined,
    onExitJudge: (output: string) => {
      if (output.includes('error')) {
        // Override result with error
        return {
          kind: 'override',
          error: new Error('Operation failed'),
        };
      }
      return exitJudgeResultContinue();
    },
  }
);

const pipe = Pipe.from(stackLayer(overrideLayer)(x => x.toString()));
const result = pipe.stream(5);
// Result: "5"
```

### **Layer with Error Handling**

```typescript
const errorHandlingLayer = makeLayer(
  (input: number) => {
    if (input < 0) {
      return new Error('Negative input not allowed');
    }
    return input;
  },
  (output: string | Error) => {
    if (output instanceof Error) {
      console.error('Layer caught error:', output.message);
      return 'error-handled';
    }
    return output;
  }
);

const pipe = Pipe.from(stackLayer(errorHandlingLayer)(x => x.toString()));

const result1 = pipe.stream(5);  // Result: "5"
const result2 = pipe.stream(-1); // Result: "error-handled"
```

## 🔒 Type-Safe API Reference

### **Unified Pipeline API**

#### `Pipe.from<I, O>(handler: (input: I) => O | Error | Promise<O | Error>)`

Creates a new **type-safe** pipeline with the given initial step.
- **I**: Input type (automatically inferred)
- **O**: Output type (automatically inferred)
- **Supports**: Both sync and async functions

#### `pipe.joint<O, R>(handler: (input: O) => R | Error | Promise<R | Error>, recoverHandler?: (error: Error, parentInput: I | null) => R | Error | Promise<R | Error>)`

Adds a new **type-safe** step to the pipeline with optional error recovery.
- **O**: Previous step output type (automatically inferred)
- **R**: New step output type (automatically inferred)
- **Supports**: Both sync and async functions

#### `pipe.keyedParallelJoint<T>(handlers: T, failFast?: boolean, recoverHandler?: RecoverFunction<I, O>)`

Executes multiple handlers in parallel with **type-safe** keyed results. **Recommended** over `parallelJoint`.
- **T**: Object of handler functions with meaningful keys (automatically inferred)
- **Returns**: Object with same keys as input, containing each handler's result
- **failFast**: Whether to fail immediately on first error (default: true)
- **Supports**: Both sync and async handlers
- **Example**: `{ doubled: (x) => x * 2, added: (x) => x + 10 }` → `{ doubled: 10, added: 15 }`

#### `pipe.keyedParallelBranch<T>(pipes: T, failFast?: boolean, recoverHandler?: RecoverFunction<I, O>)`

Executes multiple pipelines in parallel with **type-safe** keyed results. **Recommended** over `parallelBranch`.
- **T**: Object of pipeline instances with meaningful keys (automatically inferred)
- **Returns**: Object with same keys as input, containing each pipeline's result
- **failFast**: Whether to fail immediately on first error (default: true)
- **Supports**: Both sync and async pipelines
- **Example**: `{ doubled: pipe1, added: pipe2 }` → `{ doubled: 10, added: 15 }`

#### `pipe.branch<R>(pipe: Pipe<O, R, never, O>, recoverHandler?: (error: Error, parentInput: I | null) => R | Error | Promise<R | Error>)`

Adds a **type-safe** branch pipeline for synchronous operations.

#### `pipe.branchAsync<R>(pipe: Pipe<O, R, never, O>, recoverHandler?: (error: Error, parentInput: I | null) => R | Error | Promise<R | Error>)`

Adds a **type-safe** branch pipeline for asynchronous operations.

#### `pipe.parallelJoint<T, R>(handlers: T, failFast?: boolean, recoverHandler?: RecoverFunction<I, O>)` ⚠️ Deprecated

> **Deprecated**: Use `keyedParallelJoint` instead. This method will be removed in a future version.

Executes multiple handlers in parallel with **type-safe** array results.
- **T**: Array of handler functions (automatically inferred)
- **R**: Tuple type of all handler results (automatically inferred)
- **failFast**: Whether to fail immediately on first error (default: true)
- **Supports**: Both sync and async handlers

#### `pipe.parallelBranch<T, R>(pipes: T, failFast?: boolean, recoverHandler?: RecoverFunction<I, O>)` ⚠️ Deprecated

> **Deprecated**: Use `keyedParallelBranch` instead. This method will be removed in a future version.

Executes multiple pipelines in parallel with **type-safe** array results.
- **T**: Array of pipeline instances (automatically inferred)
- **R**: Tuple type of all pipeline results (automatically inferred)
- **failFast**: Whether to fail immediately on first error (default: true)
- **Supports**: Both sync and async pipelines

### **Layer API**

#### `makeLayer<I, O, C>(entry: LayerEntry<I, C>, exit: LayerExit<O, C>, context?: C, name?: string, conditions?: LayerConditions<I, O, C>)`

Creates a **type-safe** synchronous layer with entry/exit hooks, context support, and conditional control flow.
- **I**: Input type (automatically inferred)
- **O**: Output type (automatically inferred)
- **C**: Context type (optional)
- **entry**: Function executed before the main handler
- **exit**: Function executed after the main handler
- **context**: Shared context object passed to entry/exit functions (optional)
- **name**: Layer name for error reporting (optional, default: 'layer')
- **conditions**: Conditional control flow with entry/exit judges (optional)
  - **onEntryJudge**: Determines whether to continue or skip the handler
  - **onExitJudge**: Determines whether to continue, retry, or override the result

#### `makeAsyncLayer<I, O, C>(entry: LayerEntry<I, C>, exit: LayerExit<O, C>, context?: C, name?: string, conditions?: LayerConditions<I, O, C>)`

Creates a **type-safe** asynchronous layer with entry/exit hooks, context support, and conditional control flow.
- **I**: Input type (automatically inferred)
- **O**: Output type (automatically inferred)
- **C**: Context type (optional)
- **entry**: Async function executed before the main handler
- **exit**: Async function executed after the main handler
- **context**: Shared context object passed to entry/exit functions (optional)
- **name**: Layer name for error reporting (optional, default: 'layer')
- **conditions**: Conditional control flow with entry/exit judges (optional)
  - **onEntryJudge**: Determines whether to continue or skip the handler
  - **onExitJudge**: Determines whether to continue, retry, or override the result

#### `stackLayer<I, O, C>(layer: LayerInterface<I, O, C> | LayerInterface<I, O, C>[], name?: string)`

Creates a **type-safe** synchronous layer stack that wraps a handler.
- **layer**: Single layer or array of layers to stack
- **name**: Optional name for error reporting
- **Returns**: Function that wraps a handler with the layer stack

#### `stackAsyncLayer<I, O, C>(layer: LayerInterface<I, O, C> | LayerInterface<I, O, C>[])`

Creates a **type-safe** asynchronous layer stack that wraps a handler.
- **layer**: Single layer or array of layers to stack
- **Returns**: Function that wraps an async handler with the layer stack

### **Conditional Layer Helpers**

#### `entryJudgeResultContinue<I>(): EntryJudgeResult<I>`

Returns a **continue** result for entry judge, allowing the handler to execute normally.
- **Returns**: `{ kind: 'continue' }`

#### `exitJudgeResultContinue<I>(): ExitJudgeResult<I>`

Returns a **continue** result for exit judge, allowing normal flow to continue.
- **Returns**: `{ kind: 'continue' }`

### **Execution Methods**

#### `pipe.stream(input: I): O | Error`

Executes the pipeline synchronously with **type-safe** input and returns **type-safe** output.
- **Note**: Will return an error if any step in the pipeline is asynchronous

#### `pipe.streamAsync(input: I): Promise<O | Error>`

Executes the pipeline asynchronously with **type-safe** input and returns **type-safe** output.
- **Supports**: Both sync and async operations in the same pipeline

### **Utility Methods**

#### `pipe.repair(recoverHandler: (error: Error, parentInput: I | null) => O | Error | Promise<O | Error>)`

Adds **type-safe** error recovery to the pipeline.

#### `pipe.window(normalPath?: (input: O, stage: string) => void, errorPath?: (error: Error, stage: string) => void, useReference?: boolean)`

Adds **type-safe** synchronous debugging/logging to the pipeline with stage information.
- **input**: The current pipeline value
- **stage**: The current pipeline stage name
- **useReference**: Whether to use reference or deep copy

#### `pipe.windowAsync(normalPath?: (input: O, stage: string) => void | Promise<void>, errorPath?: (error: Error, stage: string) => void | Promise<void>, useReference?: boolean)`

Adds **type-safe** asynchronous debugging/logging to the pipeline with stage information.
- **input**: The current pipeline value
- **stage**: The current pipeline stage name
- **useReference**: Whether to use reference or deep copy

#### `pipe.label(stage: string)`

Adds a label to the current pipeline step for better error reporting and debugging.

### **HandlerResult Type Guards**

#### `isHandlerError<R>(result: HandlerResult<R>): result is Error`

Type guard function to check if a `HandlerResult` is an `Error`.
- **Returns**: `true` if the result is an `Error`, `false` otherwise
- **Type narrowing**: TypeScript will narrow the type to `Error` in the `if` block
- **Example**: `if (isHandlerError(result)) { /* result is Error */ }`

#### `isHandlerSuccess<R>(result: HandlerResult<R>): result is Input<R>`

Type guard function to check if a `HandlerResult` is a successful value.
- **Returns**: `true` if the result is a successful value (not an `Error`), `false` otherwise
- **Type narrowing**: TypeScript will narrow the type to `Input<R>` in the `if` block
- **Example**: `if (isHandlerSuccess(result)) { /* result is Input<R> */ }`

## 🚀 Why Unified Type-Safe Pipelines?

- **🔒 Compile-time Safety**: Catch errors before runtime
- **⚡ IntelliSense Support**: Full autocomplete and type hints
- **🛡️ Error Prevention**: Type-safe error handling prevents runtime crashes
- **🏗️ Layer Architecture**: Advanced middleware pattern with entry/exit hooks
- **📈 Developer Experience**: Better refactoring and maintenance
- **🎯 Zero Runtime Errors**: TypeScript compiler ensures correctness
- **🔄 Unified API**: Single API for both sync and async operations
- **⚡ Performance**: Optimized for both sync and async workflows
- **🎨 Clean Code**: No need to choose between different pipeline types
- **🔍 Enhanced Debugging**: Built-in debugging with stage tracking and error details
- **🏗️ Modular Architecture**: Clean separation of concerns with comprehensive testing
- **🚀 Parallel Processing**: Execute multiple operations concurrently for maximum performance

### Why keyed parallel?

| Aspect | Tuple `Promise.all` | **Keyed parallel** |
|---|---|---|
| Addressing | by index | **by meaning (key)** |
| Order dependency | required | **none** |
| `as const` | often required | **not needed** |
| Type inference | fragile across mixes | **stable across sync/async** |
| Readability | order implies meaning | **keys express responsibility** |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

## Credits

This project was built collaboratively between human design and AI assistance.

Design and coding by risk  
Design assistance and coding support by ChatGPT  
Code review by ChatGPT and Cursor AI  
Documentation generated by ChatGPT and Cursor AI

## License

MIT