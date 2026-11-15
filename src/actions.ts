import std from './utils/std'
import {TransformOptions} from './options'
import {inputs} from './inputs'
import {outputs} from './outputs'

/**
 * Reads transactions with the input provider and hands them to the output provider.
 */
async function transform(options: TransformOptions) {
    std.log('options', redact(options))

    const input = inputs.resolve(options.inputProvider, options.inputFormat)
    const output = outputs.resolve(options.outputProvider, options.outputFormat)

    const transactions = await input.read(options)
    await output.write(transactions, options)
}

/**
 * Returns a copy of the options safe for logging: secrets are masked.
 */
function redact<T extends {ghostfolioToken?: string}>(options: T): T {
    if (!options.ghostfolioToken) return options
    return {...options, ghostfolioToken: '***'}
}

export default {transform}
