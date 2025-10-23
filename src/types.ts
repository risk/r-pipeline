/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

export type Input<T> = Exclude<T, undefined | null>
export type HandlerResult<R> = Input<R> | Error
