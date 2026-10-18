import * as reader from 'pdf-text-reader'
import path from 'path'
import fs from 'node:fs/promises'
import ScalableCapital from './inputs/scalable-capital'
import Ghostfolio, {GhostfolioMap} from './outputs/ghostfolio'
import std from './utils/std'
import {Transaction} from './types'
import * as yaml from 'js-yaml'
import axios from 'axios'
import TradeRepublic from './inputs/trade-republic'
import {parseTransactions} from './inputs/internal'
import {serializeTransactions} from './outputs/internal'

async function transform(options: {
    inputDir: string
    inputFile?: string
    inputFilter?: string
    inputProvider: string
    inputFormat: string
    ignoreErrors?: boolean
    outputProvider: string
    outputFormat: string
    outputFile: string
    ghostfolioAccountId?: string
    ghostfolioMap?: string
    ghostfolioEndpoint?: string
    ghostfolioToken?: string
}) {
    std.log('options', redact(options))
    const transactions = await input(options)
    await output(transactions, options)
}

async function input(options: {
    inputDir: string
    inputFile?: string
    inputFilter?: string
    inputProvider: string
    inputFormat: string
    ignoreErrors?: boolean
}): Promise<Transaction[]> {
    switch (options.inputProvider) {
        /**
         * Scalable Capital
         */
        case 'scalable-capital':
            return readPdfs(options, ScalableCapital)

        /**
         * Trade Republic
         */
        case 'trade-republic':
            return readPdfs(options, TradeRepublic)

        /**
         * Internal format ("none" is the former name)
         */
        case 'internal':
        case 'none': {
            if (options.inputFormat !== 'json' && options.inputFormat !== 'yaml')
                throw new Error(
                    `input provider "${options.inputProvider}" does not support input format "${options.inputFormat}"`
                )
            if (!options.inputFile) throw new Error(`no input file`)

            const text = await fs.readFile(path.resolve(options.inputFile), 'utf-8')
            return parseTransactions(text, options.inputFormat)
        }

        /**
         * Throw
         */
        default:
            throw new Error(`input provider "${options.inputProvider}" unknown`)
    }
}

type Extractor = new (raw: string, file: string) => {data: Transaction}

/**
 * Reads every PDF in the input directory with the given extractor.
 *
 * A document that cannot be parsed fails the whole run, unless --ignore-errors is set, in which case it
 * is reported on stderr and skipped. Silently dropping a transaction would produce a partial import.
 */
async function readPdfs(
    options: {
        inputDir: string
        inputFilter?: string
        inputProvider: string
        inputFormat: string
        ignoreErrors?: boolean
    },
    extractor: Extractor
): Promise<Transaction[]> {
    if (options.inputFormat !== 'pdf')
        throw new Error(
            `input provider "${options.inputProvider}" does not support input format "${options.inputFormat}"`
        )

    const dir = path.resolve(options.inputDir)
    const files = (await fs.readdir(dir))
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .filter(file => !options.inputFilter || file.includes(options.inputFilter))
        .sort()

    const transactions: Transaction[] = []
    const failures: {file: string; error: unknown}[] = []
    for (const file of files) {
        const joined = path.join(dir, file)
        try {
            const raw = await reader.readPdfText({url: joined} as reader.ReadPdfTextParams)
            transactions.push(new extractor(raw, joined).data)
        } catch (error) {
            failures.push({file: joined, error})
        }
    }

    for (const failure of failures) std.error(`failed to read "${failure.file}"`, failure.error)
    if (failures.length > 0 && !options.ignoreErrors)
        throw new Error(
            `${failures.length} of ${files.length} PDF files could not be read (see above). ` +
                `Use --input-filter to select files or --ignore-errors to skip them.`
        )
    if (files.length === 0) std.log(`no PDF files found in "${dir}"`)

    return transactions
}

async function output(
    transactions: Transaction[],
    options: {
        outputProvider: string
        outputFormat: string
        outputFile: string
        ghostfolioAccountId?: string
        ghostfolioMap?: string
        ghostfolioEndpoint?: string
        ghostfolioToken?: string
    }
) {
    switch (options.outputProvider) {
        /**
         * Ghostfolio
         */
        case 'ghostfolio': {
            if (!options.ghostfolioAccountId) throw new Error(`no ghostfolio account id`)

            const map: GhostfolioMap = options.ghostfolioMap
                ? JSON.parse(await fs.readFile(path.resolve(options.ghostfolioMap), 'utf-8'))
                : {}

            const ghost = new Ghostfolio({
                accountId: options.ghostfolioAccountId,
                transactions,
                map,
            })

            switch (options.outputFormat) {
                /**
                 * Console
                 */
                case 'console':
                    std.log(ghost.data)
                    break

                /**
                 * JSON
                 */
                case 'json':
                    await fs.writeFile(path.resolve(options.outputFile), JSON.stringify(ghost.data, null, 4))
                    break

                /**
                 * YAML
                 */
                case 'yaml':
                    await fs.writeFile(
                        path.resolve(options.outputFile),
                        yaml.dump(ghost.data, {
                            noRefs: true,
                            styles: {
                                '!!null': 'empty',
                            },
                        })
                    )
                    break

                /**
                 * Endpoint
                 */
                case 'endpoint': {
                    if (!options.ghostfolioEndpoint) throw new Error(`no ghostfolio endpoint`)
                    if (!options.ghostfolioToken) throw new Error(`no ghostfolio token`)

                    const response = await axios.post(options.ghostfolioEndpoint, ghost.data, {
                        headers: {
                            Authorization: `Bearer ${options.ghostfolioToken}`,
                        },
                    })
                    std.log(response.data)
                    break
                }

                default:
                    throw new Error(
                        `output provider "${options.outputProvider}" does not support output format "${options.outputFormat}"`
                    )
            }
            break
        }

        /**
         * Internal format ("none" is the former name)
         */
        case 'internal':
        case 'none':
            switch (options.outputFormat) {
                case 'console':
                    std.out(serializeTransactions(transactions, 'json'))
                    break

                case 'json':
                case 'yaml':
                    await fs.writeFile(
                        path.resolve(options.outputFile),
                        serializeTransactions(transactions, options.outputFormat)
                    )
                    break

                default:
                    throw new Error(
                        `output provider "${options.outputProvider}" does not support output format "${options.outputFormat}"`
                    )
            }
            break

        /**
         * Throw
         */
        default:
            throw new Error(`output provider "${options.outputProvider}" unknown`)
    }
}

/**
 * Returns a copy of the options safe for logging: secrets are masked.
 */
function redact<T extends {ghostfolioToken?: string}>(options: T): T {
    if (!options.ghostfolioToken) return options
    return {...options, ghostfolioToken: '***'}
}

export default {transform}
