/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */

import { Pipe } from '../pipeline/pipe'

const pipe = Pipe.from((x: number) => x)
console.log(pipe.stream(1))
