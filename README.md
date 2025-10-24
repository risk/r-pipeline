# r-pipeline

A TypeScript utility library for creating and managing data processing pipelines.

## Features

- 🚀 **Simple Pipeline Creation**: Easy-to-use API for creating data processing pipelines
- 🔗 **Chainable Steps**: Compose complex data transformations with simple chaining
- ⚡ **Async Support**: Full support for asynchronous operations
- 🔄 **Parallel Processing**: Execute multiple steps in parallel for better performance
- 📦 **TypeScript First**: Built with TypeScript for excellent type safety and developer experience
- 🧪 **Well Tested**: Comprehensive test coverage

## Installation

```bash
npm install r-pipeline
```

## Usage

### Basic Pipeline

```typescript
import { Pipe } from 'r-pipeline';

const pipeline = Pipe.from((x: number) => x * 2)
  .joint((x: number) => x + 1)
  .joint((x: number) => x * 3);

const result = pipeline.stream(5);
console.log(result); // 33
```

### Error Handling

```typescript
const pipeline = Pipe.from((x: number) => x * 2)
  .joint(() => new Error('error'))
  .repair((error, parentInput) => {
    console.log('repair from', parentInput);
    return parentInput;
  })
  .joint((x: number) => x + 1);

const result = pipeline.stream(5);
console.log(result); // 11
```

### Window (Debugging)

```typescript
const pipeline = Pipe.from((x: number) => x * 2)
  .joint((x: number) => x + 1)
  .window(x => console.log('debug:', x))
  .joint((x: number) => x * 3);

const result = pipeline.stream(5);
// Output: debug: 11
console.log(result); // 33
```

## API Reference

### `Pipe.from<I, O>(fn: (input: I) => O | Error)`

Creates a new pipeline with the given initial step.

### `pipe.joint<O, R>(fn: (input: O) => R | Error, recover?: (error: Error, parentInput: I | null) => R | Error)`

Adds a new step to the pipeline with optional error recovery.

### `pipe.repair(recover: (error: Error, parentInput: I | null) => O | Error)`

Adds error recovery to the pipeline.

### `pipe.window(fn?: (input: O) => void, errFn?: (error: Error) => void, useReference?: boolean)`

Adds debugging/logging to the pipeline.

### `pipe.stream(input: I): O | Error`

Executes the pipeline with the given input.

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