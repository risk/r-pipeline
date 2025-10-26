/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

export function isThenable<T = unknown>(x: unknown): x is Promise<T> | { then: (...args: unknown[]) => unknown } {
  return (
    !!x &&
    (typeof x === 'object' || typeof x === 'function') &&
    'then' in x &&
    typeof (x as { then: unknown }).then === 'function'
  )
}
