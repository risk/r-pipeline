/*
 * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

export const safeAsync = <T>(fn: () => T | Promise<T>) => Promise.resolve(fn())
