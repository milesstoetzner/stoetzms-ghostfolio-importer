import fs from 'node:fs/promises'
import path from 'node:path'
import * as yaml from 'js-yaml'
import std from '../utils/std'
import {OutputOptions} from '../options'

export type FileFormat = 'console' | 'json' | 'yaml'

export const FILE_FORMATS: FileFormat[] = ['console', 'json', 'yaml']

/**
 * Serializes data as JSON or YAML. Dates become ISO strings in both.
 */
export function serialize(data: unknown, format: 'json' | 'yaml'): string {
    if (format === 'yaml') return yaml.dump(JSON.parse(JSON.stringify(data)), {noRefs: true})
    return JSON.stringify(data, null, 4)
}

/**
 * The file to write for json and yaml output: --output-file, or output.<format> by default.
 */
export function outputFile(options: {outputFormat: string; outputFile?: string}): string {
    return path.resolve(options.outputFile ?? `output.${options.outputFormat}`)
}

/**
 * Prints data as JSON on stdout for "console", or writes it as JSON or YAML to the output file.
 */
export async function emit(data: unknown, format: FileFormat, options: OutputOptions): Promise<void> {
    if (format === 'console') {
        std.out(serialize(data, 'json'))
        return
    }
    await fs.writeFile(outputFile(options), serialize(data, format))
}
