import path from 'node:path'
import fs from 'node:fs/promises'
import {InputProvider} from '../providers'
import {InputOptions} from '../options'
import {readPdfs} from './pdf'
import {Transaction, TransactionType} from '../types'
import {convertPrice, isUndefined, parseDate, parseNumber} from '../utils/utils'
import config from '../config'
import std from '../utils/std'

export default class ScalableCapital {
    private readonly raw
    private readonly file

    constructor(raw: string, file: string) {
        this.raw = raw
        this.file = file
    }

    get data(): Transaction {
        return {
            type: this.type,
            ISIN: this.ISIN,
            quantity: this.quantity,
            price: convertPrice(this.price, this.conversion),
            currency: this.conversion ? 'EUR' : this.currency,
            date: this.date,
            _meta: {
                provider: 'scalable-capital',
                format: 'pdf',
                file: this.file,
                version: config.version,
            },
        }
    }

    private _type?: TransactionType
    get type(): TransactionType {
        if (isUndefined(this._type)) {
            const {raw} = this.extract<{raw: string}>(/Wertpapierabrechnung: (?<raw>\S+)/)

            /**
             * Dividend
             */
            if (this.contains('Dividendenabrechnung') || this.contains('Fondsausschüttung')) {
                this._type = TransactionType.DIVIDEND
                return this._type
            }

            /**
             * Buy
             */
            if (raw === 'Kauf') {
                this._type = TransactionType.BUY
                return this._type
            }

            /**
             * Sell
             */
            if (raw === 'Verkauf') {
                this._type = TransactionType.SELL
                return this._type
            }

            throw new Error(`unknown type "${raw}"`)
        }
        return this._type
    }

    private _quantity?: number
    get quantity(): number {
        if (isUndefined(this._quantity)) {
            const {raw} = this.extract<{raw: string}>(/STK (?<raw>\S+)/)
            if (isUndefined(raw)) throw new Error('no quantity')
            this._quantity = parseNumber(raw, ',')
        }
        return this._quantity
    }

    private _conversion?: number
    private _conversion_extracted = false

    get conversion(): number | undefined {
        if (!this._conversion_extracted) {
            /**
             * Umrechnungskurs: EUR/USD1,01234
             */
            const {raw} = this.extract<{raw: string}>(/Umrechnungskurs:\s+EUR\/USD\s*(?<raw>\S+)/)
            if (raw) this._conversion = parseNumber(raw, ',')
            this._conversion_extracted = true
        }
        return this._conversion
    }

    private _price?: number
    get price(): number {
        if (isUndefined(this._price)) {
            const {raw: a} = this.extract<{raw: string}>(new RegExp(`Kurs\\n${this.currency}\\n(?<raw>\\S+)`))

            /**
             * SomeCompany AG             EUR 1,23 p.STK
             */
            const {raw: b} = this.extract<{raw: string}>(/(?<raw>\S+) p.STK/)

            const raw = a ?? b
            if (isUndefined(raw)) throw new Error('no price')
            this._price = parseNumber(raw, ',')
        }
        return this._price
    }

    private _currency?: string
    get currency(): string {
        if (isUndefined(this._currency)) {
            const {raw: a} = this.extract<{raw: string}>(/Kurswert (?<raw>\S+)/)

            /**
             * SomeCompany AG             EUR 1,23 p.STK
             */
            const {raw: b} = this.extract<{raw: string}>(/(?<raw>\S+)\s+\S+\s+p.STK/)

            const raw = a ?? b
            if (raw === 'EUR') {
                this._currency = 'EUR'
                return this._currency
            }

            if (raw === 'USD') {
                this._currency = 'USD'
                return this._currency
            }

            throw new Error(`unknown currency: ${raw}`)
        }
        return this._currency
    }

    private _date?: Date
    get date(): Date {
        if (isUndefined(this._date)) {
            type t = {day: string; month: string; year: string}

            /**
             * Handelsdatum Handelsuhrzeit
             * 01.01.2024 11:11:11:11
             */
            const a = this.extract<t>(/Handelsdatum Handelsuhrzeit\n(?<day>\d\d)\.(?<month>\d\d)\.(?<year>\d\d\d\d)/)

            /**
             * Details zur Ausführung:
             * Handels-  Handels-
             * datum   uhrzeit
             * Nominale Kurs Ausführungsplatz
             * STK 50 EUR GETTEX - MM Munich 01.01.2024 11:11:11:11
             */
            const b = this.extract<t>(
                /Handels-\s+Handels-\ndatum\s+uhrzeit\nNominale\s+Kurs\s+Ausführungsplatz\n.*(?<day>\d\d)\.(?<month>\d\d)\.(?<year>\d\d\d\d)/
            )

            /**
             * Zahltag: 01.01.2024
             */
            const c = this.extract<t>(/Zahltag:\s+(?<day>\d\d)\.(?<month>\d\d)\.(?<year>\d\d\d\d)/)

            let raw: t | undefined
            if (a.day && a.month && a.year) raw = a as t
            if (b.day && b.month && b.year) raw = b as t
            if (c.day && c.month && c.year) raw = c as t
            if (raw === undefined) throw new Error(`no date`)

            this._date = parseDate(raw.day, raw.month, raw.year)
        }
        return this._date
    }

    private _ISIN?: string
    get ISIN(): string {
        if (isUndefined(this._ISIN)) {
            const {raw} = this.extract<{raw: string}>(/ISIN: (?<raw>\S+)/)
            if (isUndefined(raw)) throw new Error(`no ISIN`)
            this._ISIN = raw
        }
        return this._ISIN
    }

    private contains(value: string) {
        return this.raw.includes(value)
    }

    private extract<T>(regex: RegExp) {
        const result = regex.exec(this.raw)
        if (!result) return {} as Partial<T>
        return result.groups as Partial<T>
    }
}

/**
 * Reads the JSON printed by the official Scalable Capital CLI:
 *
 *   sc broker transactions --json --page-size 100
 *
 * The CLI prints an envelope {ok, command, data: {cursor, total, count, items}}. Each item is a
 * transaction summary; security trades carry isin, side, quantity and amount, cash transactions carry
 * cash_transaction_type and related_isin. Only filled or settled buys, sells and distributions become
 * transactions, everything else (deposits, fees, taxes, pending orders, cancellations) is skipped and
 * reported.
 *
 * The summary has no price per share; it is derived as amount / quantity. A distribution has no share
 * count, so it is imported with quantity 1 and the paid amount as price, which gives Ghostfolio the
 * right dividend value.
 */

type Item = Record<string, unknown>

export type Skipped = {id: string; reason: string}

export type ScalableCapitalJsonResult = {transactions: Transaction[]; skipped: Skipped[]}

const ACCEPTED_STATUS = ['FILLED', 'SETTLED', 'CONFIRMED']

export function parseScalableCapitalJson(text: string, file: string): ScalableCapitalJsonResult {
    const items = unwrap(JSON.parse(text))
    const transactions: Transaction[] = []
    const skipped: Skipped[] = []

    items.forEach((item, index) => {
        const id = str(item.id) ?? `#${index + 1}`
        try {
            const transaction = convert(item, file, id)
            if (typeof transaction === 'string') skipped.push({id, reason: transaction})
            else transactions.push(transaction)
        } catch (error) {
            throw new Error(`transaction ${id}: ${error instanceof Error ? error.message : error}`, {cause: error})
        }
    })

    return {transactions, skipped}
}

/**
 * Accepts the CLI envelope, its bare data object, or a bare list of items.
 */
function unwrap(parsed: unknown): Item[] {
    if (Array.isArray(parsed)) return parsed as Item[]
    if (typeof parsed !== 'object' || parsed === null)
        throw new Error('expected the JSON printed by "sc broker transactions --json"')
    const object = parsed as Item

    if ('ok' in object) {
        if (object.ok !== true) {
            const error = object.error as Item | undefined
            throw new Error(`the CLI reported an error: ${str(error?.message) ?? JSON.stringify(object.error)}`)
        }
        return unwrap(object.data)
    }

    if (Array.isArray(object.items)) return object.items as Item[]
    throw new Error('expected the JSON printed by "sc broker transactions --json"')
}

function convert(item: Item, file: string, id: string): Transaction | string {
    const status = str(item.status)
    if (item.is_cancellation === true) return 'cancellation'
    if (status && !ACCEPTED_STATUS.includes(status)) return `status ${status}`

    const summary = str(item.summary_type)
    const currency = str(item.currency)
    if (!currency) throw new Error('no currency')
    const date = parseEventDate(item.last_event_datetime)

    const meta = {
        provider: 'scalable-capital',
        format: 'json',
        file,
        id,
        version: config.version,
        status,
        description: str(item.description),
    }

    if (summary === 'BrokerSecurityTransactionSummary') {
        const side = str(item.side)
        const type = side === 'BUY' ? TransactionType.BUY : side === 'SELL' ? TransactionType.SELL : undefined
        if (!type) return `side ${side}`
        const ISIN = str(item.isin)
        if (!ISIN) throw new Error('no ISIN')
        const quantity = decimal(item.quantity, 'quantity')
        const amount = decimal(item.amount, 'amount')
        if (quantity <= 0) throw new Error(`quantity ${quantity} is not positive`)
        return {type, ISIN, quantity, price: Math.abs(amount) / quantity, currency, date, _meta: meta}
    }

    if (summary === 'BrokerCashTransactionSummary') {
        const cashType = str(item.cash_transaction_type)
        if (cashType !== 'DISTRIBUTION') return `cash transaction ${cashType}`
        const ISIN = str(item.related_isin)
        if (!ISIN) throw new Error('distribution without related ISIN')
        const amount = decimal(item.amount, 'amount')
        return {
            type: TransactionType.DIVIDEND,
            ISIN,
            quantity: 1,
            price: Math.abs(amount),
            currency,
            date,
            _meta: meta,
        }
    }

    return `summary type ${summary}`
}

function parseEventDate(raw: unknown): Date {
    const value = typeof raw === 'object' && raw !== null ? (raw as Item).time : raw
    if (typeof value !== 'string') throw new Error('no last_event_datetime')
    const date = new Date(value)
    if (isNaN(date.getTime())) throw new Error(`invalid last_event_datetime "${value}"`)
    return date
}

/**
 * The CLI prints decimals as strings ("1.23") to keep precision; numbers are accepted too.
 */
function decimal(raw: unknown, field: string): number {
    const value = typeof raw === 'string' ? Number(raw.trim()) : raw
    if (typeof value !== 'number' || !Number.isFinite(value) || (typeof raw === 'string' && raw.trim() === ''))
        throw new Error(`${field} "${raw}" is not a number`)
    return value
}

function str(raw: unknown): string | undefined {
    return typeof raw === 'string' ? raw : undefined
}

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
