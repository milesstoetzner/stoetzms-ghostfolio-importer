import * as reader from 'pdf-text-reader'
import path from 'node:path'
import fs from 'node:fs/promises'
import {Transaction} from '../types'
import {InputOptions} from '../options'
import std from '../utils/std'

/**
 * A PDF extractor is constructed with the extracted text of one document and yields one transaction.
 */
export type Extractor = new (raw: string, file: string) => {data: Transaction}

/**
 * Reads every PDF in the input directory with the given extractor.
 *
 * A document that cannot be parsed fails the whole run, unless --ignore-errors is set, in which case it
 * is reported on stderr and skipped. Silently dropping a transaction would produce a partial import.
 */
export async function readPdfs(options: InputOptions, extractor: Extractor): Promise<Transaction[]> {
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
