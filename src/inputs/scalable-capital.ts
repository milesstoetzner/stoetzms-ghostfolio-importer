import path from 'node:path'
import fs from 'node:fs/promises'
import {InputProvider} from '../providers'
import {InputOptions} from '../options'
import {Transaction} from '../types'
import std from '../utils/std'
import {readPdfs} from './pdf'
import ScalableCapital from '../extractors/scalable-capital'
import {parseScalableCapitalJson} from './scalable-capital-json'

export class ScalableCapitalInput implements InputProvider {
    readonly name = 'scalable-capital'
    readonly formats = ['pdf', 'json']

    read(options: InputOptions): Promise<Transaction[]> {
        if (options.inputFormat === 'json') return readJson(options)
        return readPdfs(options, ScalableCapital)
    }
}

/**
 * Reads the JSON printed by "sc broker transactions --json", either one --input-file or every .json
 * file in --input-dir (one per page of the CLI's pagination).
 */
async function readJson(options: InputOptions): Promise<Transaction[]> {
    const files: string[] = []
    if (options.inputFile) {
        files.push(path.resolve(options.inputFile))
    } else {
        const dir = path.resolve(options.inputDir)
        for (const file of (await fs.readdir(dir)).sort()) {
            if (!file.toLowerCase().endsWith('.json')) continue
            if (options.inputFilter && !file.includes(options.inputFilter)) continue
            files.push(path.join(dir, file))
        }
        if (files.length === 0) std.log(`no JSON files found in "${dir}"`)
    }

    const transactions: Transaction[] = []
    for (const file of files) {
        const result = parseScalableCapitalJson(await fs.readFile(file, 'utf-8'), file)
        transactions.push(...result.transactions)
        if (result.skipped.length > 0)
            std.log(
                `"${file}": skipped ${result.skipped.length} of ${result.skipped.length + result.transactions.length} entries ` +
                    `(${summarize(result.skipped.map(it => it.reason))})`
            )
    }
    return transactions
}

function summarize(reasons: string[]): string {
    const counts = new Map<string, number>()
    for (const reason of reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1)
    return [...counts.entries()].map(([reason, count]) => `${count}× ${reason}`).join(', ')
}
