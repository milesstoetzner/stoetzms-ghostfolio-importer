import path from 'node:path'
import std from './utils/std'
import {TransformOptions} from './options'
import {inputs} from './inputs'
import {outputs} from './outputs'
import {watchDirectory} from './watch'

/**
 * Reads transactions with the input provider and hands them to the output provider.
 */
async function transform(options: TransformOptions) {
    std.log('options', redact(options))

    const input = inputs.resolve(options.inputProvider, options.inputFormat)
    const output = outputs.resolve(options.outputProvider, options.outputFormat)

    const run = async () => {
        const transactions = await input.read(options)
        await output.write(transactions, options)
    }

    if (!options.watch) return run()

    if (options.outputFormat === 'endpoint' && !options.sync)
        throw new Error(
            `--watch with the endpoint format requires --sync, otherwise every change would import everything again`
        )

    const dir = options.inputFile ? path.dirname(path.resolve(options.inputFile)) : path.resolve(options.inputDir)
    const only = options.inputFile ? path.basename(options.inputFile) : undefined
    await run().catch(error => std.error(error instanceof Error ? error.message : error))
    await watchDirectory(
        dir,
        {debounceMs: options.watchDebounce ?? 1000, filter: only ? file => file === only : undefined},
        run
    )
}

/**
 * Returns a copy of the options safe for logging: secrets are masked.
 */
function redact<T extends {ghostfolioToken?: string}>(options: T): T {
    if (!options.ghostfolioToken) return options
    return {...options, ghostfolioToken: '***'}
}

export default {transform}
