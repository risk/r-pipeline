# r-pipeline

A **Type-Safe** TypeScript utility library for creating and managing data processing pipelines.

r-pipeline is built around the idea that data should flow as types do — safely, predictably, and with responsibility.

## 🎯 Key Features

- 🔒 **Type-Safe Pipeline**: **Complete type safety** from input to output with automatic type inference
- 🚀 **Zero Runtime Errors**: Compile-time type checking prevents runtime errors
- 🔗 **Chainable Steps**: Compose complex data transformations with **type-safe** chaining
- ⚡ **Async Support**: **Seamless async/await** support with type-safe async pipelines
- 🔄 **Sync + Async Mix**: Mix synchronous and asynchronous operations in the same pipeline
- 🛡️ **Error Handling**: Type-safe error handling with automatic type propagation
- 📦 **TypeScript First**: Built exclusively for TypeScript with **zero JavaScript dependencies**
- 🧪 **Well Tested**: Comprehensive test coverage with 90%+ coverage

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
// ✅ Type-safe debugging with full IntelliSense support
const pipeline = Pipe.from((x: number) => x * 2)
  .joint(x => x + 1)
  .window(x => console.log('debug:', x))  // ✅ Type-safe: x is number
  .joint(x => x * 3);

const result = pipeline.stream(5);  // ✅ Type-safe: result is number
// Output: debug: 11
console.log(result); // 33
```

### ⚡ Async Pipeline Support

```typescript
import { AsyncPipe } from 'r-pipeline';

// ✅ Type-safe async pipeline with automatic type inference
const asyncPipeline = AsyncPipe.from(async (x: number) => x * 2)
  .joint(async x => x + 1)      // ✅ Type inferred: number
  .joint(x => `result: ${x}`);  // ✅ Type inferred: string

const result = await asyncPipeline.stream(5);  // ✅ Type-safe: result is string
console.log(result); // "result: 11"
```

### 🔄 Sync + Async Mix

```typescript
// ✅ Seamless mixing of sync and async operations
const mixedPipeline = AsyncPipe
  .from((x: number) => x + 1)      // ✅ Sync operation
  .joint(async x => x * 2)          // ✅ Async operation
  .joint(x => `v:${x}`);            // ✅ Sync operation

const result = await mixedPipeline.stream(5);  // ✅ Type-safe: result is string
console.log(result); // "v:12"
```

## 🔒 Type-Safe API Reference

### **Sync Pipeline**

#### `Pipe.from<I, O>(fn: (input: I) => O | Error)`

Creates a new **type-safe** synchronous pipeline with the given initial step.
- **I**: Input type (automatically inferred)
- **O**: Output type (automatically inferred)

#### `pipe.joint<O, R>(fn: (input: O) => R | Error, recover?: (error: Error, parentInput: I | null) => R | Error)`

Adds a new **type-safe** step to the synchronous pipeline with optional error recovery.
- **O**: Previous step output type (automatically inferred)
- **R**: New step output type (automatically inferred)

### **Async Pipeline**

#### `AsyncPipe.from<I, O>(fn: (input: I) => O | Error | Promise<O | Error>)`

Creates a new **type-safe** asynchronous pipeline with the given initial step.
- **I**: Input type (automatically inferred)
- **O**: Output type (automatically inferred)
- **Supports**: Both sync and async functions

#### `asyncPipe.joint<O, R>(fn: (input: O) => R | Error | Promise<R | Error>, recover?: (error: Error, parentInput: I | null) => R | Error | Promise<R | Error>)`

Adds a new **type-safe** step to the async pipeline with optional error recovery.
- **O**: Previous step output type (automatically inferred)
- **R**: New step output type (automatically inferred)
- **Supports**: Both sync and async functions

### **Common Methods**

#### `pipe.repair(recover: (error: Error, parentInput: I | null) => O | Error | Promise<O | Error>)`

Adds **type-safe** error recovery to the pipeline.

#### `pipe.window(fn?: (input: O) => void | Promise<void>, errFn?: (error: Error) => void | Promise<void>, useReference?: boolean)`

Adds **type-safe** debugging/logging to the pipeline.

#### `pipe.stream(input: I): O | Error | Promise<O | Error>`

Executes the pipeline with **type-safe** input and returns **type-safe** output.

## 🚀 Why Type-Safe Pipelines?

- **🔒 Compile-time Safety**: Catch errors before runtime
- **⚡ IntelliSense Support**: Full autocomplete and type hints
- **🛡️ Error Prevention**: Type-safe error handling prevents runtime crashes
- **📈 Developer Experience**: Better refactoring and maintenance
- **🎯 Zero Runtime Errors**: TypeScript compiler ensures correctness
- **🔄 Async/Sync Harmony**: Seamlessly mix synchronous and asynchronous operations
- **⚡ Performance**: Optimized for both sync and async workflows

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