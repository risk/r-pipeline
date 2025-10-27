/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

export const safeEcho = <T>(x: T, ref: boolean) => (ref ? x : typeof x === 'object' ? JSON.parse(JSON.stringify(x)) : x)
