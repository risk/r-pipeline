# r-pipeline

A **Type-Safe** TypeScript utility library for creating and managing data processing pipelines.

r-pipeline is built around the idea that data should flow as types do — safely, predictably, and with responsibility.

## 🎯 Key Features

- 🔒 **Type-Safe Pipeline**: **Complete type safety** from input to output with automatic type inference
- 🚀 **Zero Runtime Errors**: Compile-time type checking prevents runtime errors
- 🔗 **Chainable Steps**: Compose complex data transformations with **type-safe** chaining
- ⚡ **IntelliSense Support**: Full TypeScript IntelliSense for better developer experience
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

## 🔒 Type-Safe API Reference

### `Pipe.from<I, O>(fn: (input: I) => O | Error)`

Creates a new **type-safe** pipeline with the given initial step.
- **I**: Input type (automatically inferred)
- **O**: Output type (automatically inferred)

### `pipe.joint<O, R>(fn: (input: O) => R | Error, recover?: (error: Error, parentInput: I | null) => R | Error)`

Adds a new **type-safe** step to the pipeline with optional error recovery.
- **O**: Previous step output type (automatically inferred)
- **R**: New step output type (automatically inferred)

### `pipe.repair(recover: (error: Error, parentInput: I | null) => O | Error)`

Adds **type-safe** error recovery to the pipeline.

### `pipe.window(fn?: (input: O) => void, errFn?: (error: Error) => void, useReference?: boolean)`

Adds **type-safe** debugging/logging to the pipeline.

### `pipe.stream(input: I): O | Error`

Executes the pipeline with **type-safe** input and returns **type-safe** output.

## 🚀 Why Type-Safe Pipelines?

- **🔒 Compile-time Safety**: Catch errors before runtime
- **⚡ IntelliSense Support**: Full autocomplete and type hints
- **🛡️ Error Prevention**: Type-safe error handling prevents runtime crashes
- **📈 Developer Experience**: Better refactoring and maintenance
- **🎯 Zero Runtime Errors**: TypeScript compiler ensures correctness

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