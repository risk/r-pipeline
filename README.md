# r-pipeline

**Note**: Sorry for the confusion with the homepage and repository URLs in the previous versions. They have been corrected in the latest release.

A **Type-Safe** TypeScript utility library for creating and managing data processing pipelines with unified sync/async support.

r-pipeline is built around the idea that data should flow as types do — safely, predictably, and with responsibility. Now with **unified sync/async pipeline support** in a single, powerful API.

## 🎯 Key Features

- 🔒 **Type-Safe Pipeline**: **Complete type safety** from input to output with automatic type inference
- 🚀 **Zero Runtime Errors**: Compile-time type checking prevents runtime errors
- 🔗 **Chainable Steps**: Compose complex data transformations with **type-safe** chaining
- ⚡ **Unified Async Support**: **Single API** for both sync and async operations with `stream()` and `streamAsync()`
- 🔄 **Sync + Async Mix**: Seamlessly mix synchronous and asynchronous operations in the same pipeline
- 🚀 **Parallel Processing**: Execute multiple operations concurrently with `parallelJoint` and `parallelBranch`
- 🛡️ **Advanced Error Handling**: Type-safe error handling with detailed error information and recovery
- 🔍 **Enhanced Debugging**: Built-in debugging with stage information and reference control
- 📦 **TypeScript First**: Built exclusively for TypeScript with **zero JavaScript dependencies**
- 🧪 **Well Tested**: Comprehensive test coverage with modular architecture

## ⚙️ Error Handling Philosophy

r-pipeline does not use throw for error handling.
Instead, errors are treated as values and passed through the pipeline just like any other data.
This ensures deterministic, composable behavior and keeps control flow fully explicit.

Throwing an error represents a deliberate choice to exit the pipeline
and delegate the exception to the outer world.

This design is realized through r-pipeline itself,
enabling predictable data flow, functional-style composition,
and resilient async orchestration.

## Installation

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

### 🚀 Parallel Processing

```typescript
// ✅ Parallel execution of multiple handlers
const parallelPipeline = Pipe.from(async (x: number) => x)
  .parallelJoint([
    async (x) => x * 2,           // Handler 1
    async (x) => x + 10,          // Handler 2
    async (x) => `value: ${x}`,   // Handler 3
  ])
  .joint(([doubled, added, stringified]) => ({
    doubled,
    added,
    stringified
  }));

const result = await parallelPipeline.streamAsync(5);
// Result: { doubled: 10, added: 15, stringified: "value: 5" }
```

### 🌿 Parallel Branch Processing

```typescript
// ✅ Parallel execution of multiple pipelines
const branch1 = Pipe.from(async (x: number) => x * 2);
const branch2 = Pipe.from(async (x: number) => x + 10);
const branch3 = Pipe.from(async (x: number) => `value: ${x}`);

const parallelBranchPipeline = Pipe.from(async (x: number) => x)
  .parallelBranch([branch1, branch2, branch3])
  .joint(([doubled, added, stringified]) => ({
    doubled,
    added,
    stringified
  }));

const result = await parallelBranchPipeline.streamAsync(5);
// Result: { doubled: 10, added: 15, stringified: "value: 5" }
```

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

#### `pipe.parallelJoint<T, R>(handlers: T, failFast?: boolean, recoverHandler?: RecoverFunction<I, O>)`

Executes multiple handlers in parallel with **type-safe** results.
- **T**: Array of handler functions (automatically inferred)
- **R**: Tuple type of all handler results (automatically inferred)
- **failFast**: Whether to fail immediately on first error (default: true)
- **Supports**: Both sync and async handlers

#### `pipe.branch<R>(pipe: Pipe<O, R, never, O>, recoverHandler?: (error: Error, parentInput: I | null) => R | Error | Promise<R | Error>)`

Adds a **type-safe** branch pipeline for synchronous operations.

#### `pipe.branchAsync<R>(pipe: Pipe<O, R, never, O>, recoverHandler?: (error: Error, parentInput: I | null) => R | Error | Promise<R | Error>)`

Adds a **type-safe** branch pipeline for asynchronous operations.

#### `pipe.parallelBranch<T, R>(pipes: T, failFast?: boolean, recoverHandler?: RecoverFunction<I, O>)`

Executes multiple pipelines in parallel with **type-safe** results.
- **T**: Array of pipeline instances (automatically inferred)
- **R**: Tuple type of all pipeline results (automatically inferred)
- **failFast**: Whether to fail immediately on first error (default: true)
- **Supports**: Both sync and async pipelines

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

## 🚀 Why Unified Type-Safe Pipelines?

- **🔒 Compile-time Safety**: Catch errors before runtime
- **⚡ IntelliSense Support**: Full autocomplete and type hints
- **🛡️ Error Prevention**: Type-safe error handling prevents runtime crashes
- **📈 Developer Experience**: Better refactoring and maintenance
- **🎯 Zero Runtime Errors**: TypeScript compiler ensures correctness
- **🔄 Unified API**: Single API for both sync and async operations
- **⚡ Performance**: Optimized for both sync and async workflows
- **🎨 Clean Code**: No need to choose between different pipeline types
- **🔍 Enhanced Debugging**: Built-in debugging with stage tracking and error details
- **🏗️ Modular Architecture**: Clean separation of concerns with comprehensive testing
- **🚀 Parallel Processing**: Execute multiple operations concurrently for maximum performance

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

## License

MIT