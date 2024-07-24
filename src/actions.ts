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

async function transform(options: {
    inputDir: string
    inputFile?: string
    inputFilter?: string
    inputProvider: string
    inputFormat: string
    outputProvider: string
    outputFormat: string
    outputFile: string
    ghostfolioAccountId?: string
    ghostfolioMap?: string
    ghostfolioEndpoint?: string
    ghostfolioToken?: string
}) {
    console.log(options)
    const transactions = await input(options)
    await output(transactions, options)
}

async function input(options: {
    inputDir: string
    inputFile?: string
    inputFilter?: string
    inputProvider: string
    inputFormat: string
}): Promise<Transaction[]> {
    switch (options.inputProvider) {
        /**
         * Scalable Capital
         */
        case 'scalable-capital': {
            if (options.inputFormat !== 'pdf')
                throw new Error(
                    `input provider "${options.inputProvider}" does not support input format "${options.inputFormat}"`
                )

            const transactions: Transaction[] = []
            const files = await fs.readdir(path.resolve(options.inputDir))
            for (const file of files) {
                if (!file.endsWith('.pdf')) continue
                if (options.inputFilter) if (!file.includes(options.inputFilter)) continue
                try {
                    const joined = path.join(options.inputDir, file)
                    const raw = await reader.readPdfText({url: joined} as reader.ReadPdfTextParams)
                    const extractor = new ScalableCapital(raw, joined)
                    transactions.push(extractor.data)
                } catch (e) {
                    console.log(file, e)
                }
            }
            return transactions
        }

        /**
         * Trade Republic
         */
        case 'trade-republic': {
            if (options.inputFormat !== 'pdf')
                throw new Error(
                    `input provider "${options.inputProvider}" does not support input format "${options.inputFormat}"`
                )

            const transactions: Transaction[] = []
            const files = await fs.readdir(path.resolve(options.inputDir))
            for (const file of files) {
                if (!file.endsWith('.pdf')) continue
                if (options.inputFilter) if (!file.includes(options.inputFilter)) continue
                try {
                    const joined = path.join(options.inputDir, file)
                    const raw = await reader.readPdfText({url: joined} as reader.ReadPdfTextParams)
                    const extractor = new TradeRepublic(raw, joined)
                    transactions.push(extractor.data)
                } catch (e) {
                    console.log(file, e)
                }
            }
            return transactions
        }

        /**
         * None
         */
        case 'none':
            switch (options.inputFormat) {
                case 'json':
                    // TODO: this
                    break
                case 'yaml':
                    // TODO: this
                    break
                default:
                    throw new Error(
                        `input provider "${options.inputProvider}" does not support input format "${options.inputFormat}"`
                    )
            }
            break

        /**
         * Throw
         */
        default:
            throw new Error(`input provider "${options.inputProvider}" unknown`)
    }
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
                map: {
                    IE00B1FZS798: 'IUSM.DE',
                    IE00B1TXK627: 'IQQQ.DE',
                    IE00B4L5Y983: 'EUNL.DE',
                    IE00B4WXJJ64: 'EUNH.DE',
                    IE00BYX2JD69: 'SUSW.L',
                    LU0908500753: 'MEUD.PA',
                    LU1681048804: '500.PA',
                    LU1829221024: 'UST.PA',
                    LU2089238203: 'PRAW.DE',
                    ...map,
                },
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
         * None
         */
        case 'none':
            std.out(JSON.stringify(transactions, null, 4))
            break

        /**
         * Throw
         */
        default:
            throw new Error(`unknown output format: ${options.outputFormat}`)
    }
}

export default {transform}
