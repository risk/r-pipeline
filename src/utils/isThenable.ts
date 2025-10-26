/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

export function isThenable<T>(x: unknown): x is Promise<T> | { then: Function } {
  return !!x && (typeof x === 'object' || typeof x === 'function') && typeof (x as any).then === 'function'
}
