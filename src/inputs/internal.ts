import * as yaml from 'js-yaml'
import fs from 'node:fs/promises'
import path from 'node:path'
import {Transaction, TransactionType} from '../types'
import {InputProvider} from '../providers'
import {InputOptions} from '../options'

export type InternalInputFormat = 'json' | 'yaml'

/**
 * Parses transactions in the internal format, as written by the "internal" output provider.
 */
export function parseTransactions(text: string, format: InternalInputFormat): Transaction[] {
    const parsed = format === 'json' ? JSON.parse(text) : yaml.load(text)
    if (!Array.isArray(parsed)) throw new Error(`expected a list of transactions`)
    return parsed.map((entry, index) => parseTransaction(entry, index))
}

function parseTransaction(entry: unknown, index: number): Transaction {
    const where = `transaction #${index + 1}`
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry))
        throw new Error(`${where}: expected an object`)
    const it = entry as Record<string, unknown>

    if (typeof it.type !== 'string' || !Object.values<string>(TransactionType).includes(it.type))
        throw new Error(`${where}: type must be one of ${Object.values(TransactionType).join(', ')}`)
    if (typeof it.ISIN !== 'string' || it.ISIN === '') throw new Error(`${where}: ISIN must be a non-empty string`)
    if (typeof it.quantity !== 'number' || !Number.isFinite(it.quantity))
        throw new Error(`${where}: quantity must be a number`)
    if (typeof it.price !== 'number' || !Number.isFinite(it.price)) throw new Error(`${where}: price must be a number`)
    if (typeof it.currency !== 'string' || it.currency === '')
        throw new Error(`${where}: currency must be a non-empty string`)

    const date = it.date instanceof Date ? it.date : new Date(String(it.date))
    if (typeof it.date === 'undefined' || isNaN(date.getTime())) throw new Error(`${where}: date must be a date`)

    const transaction: Transaction = {
        type: it.type as TransactionType,
        ISIN: it.ISIN,
        quantity: it.quantity,
        price: it.price,
        currency: it.currency,
        date,
    }
    if (typeof it._meta !== 'undefined') transaction._meta = it._meta
    return transaction
}

export class InternalInput implements InputProvider {
    readonly name = 'internal'
    /** The provider was called "none" before. */
    readonly aliases = ['none']
    readonly formats: InternalInputFormat[] = ['json', 'yaml']

    async read(options: InputOptions): Promise<Transaction[]> {
        if (!options.inputFile) throw new Error(`no input file`)
        const text = await fs.readFile(path.resolve(options.inputFile), 'utf-8')
        return parseTransactions(text, options.inputFormat as InternalInputFormat)
    }
}
